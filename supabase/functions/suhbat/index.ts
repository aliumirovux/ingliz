// «Repetitorga qo'ng'iroq»: 5 daqiqalik ovozli suhbat (faqat egasi).
//   POST /suhbat/start — { goal? }                         → { id, say, uz, hint, topic }   (repetitorning birinchi gapi)
//   POST /suhbat/turn  — { id, audio (base64), mime, turns, left } yoki { id, text, turns, left }
//                        → { heard, unclear[], say, uz, hint, fix|null, end }  yoki { empty: true }
//   POST /suhbat/end   — { id, turns, fixes, secs }        → { ok: true }
// Har gap: Gemini ovozni SO'ZMA-SO'Z matnga aylantiradi (xatoni tuzatmasdan, noaniq so'zlarni belgilab),
// Claude javob yozadi va xato bo'lsa tuzatadi. Ovoz hech qayerda saqlanmaydi.
// Chegaralar: kuniga MAX_CALLS ta qo'ng'iroq, har birida MAX_TURNS ta gap. verify_jwt = false: token shu yerda tekshiriladi.
// Kalitlar (Edge Function secrets): GEMINI_API_KEY, ANTHROPIC_API_KEY (ikkalasi ham bor).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { clip, cors, CYR, db, enText as en, json, Row, tashkentDay, uzText as uz, who } from "../_shared/common.ts";

const OWNER = Deno.env.get("OWNER_ID") || "6cc7d3c7-d237-486e-94f8-3f951a0437c2";
const A_API = Deno.env.get("ANTHROPIC_API") || "https://api.anthropic.com";
const MODEL = Deno.env.get("SUHBAT_MODEL") || "claude-opus-5-5";
const G_API = Deno.env.get("GEMINI_API") || "https://generativelanguage.googleapis.com";
const G_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const G_MODELS = [G_MODEL, ...(Deno.env.get("GEMINI_FALLBACK") ?? "gemini-3.7-flash,gemini-3.5-flash").split(",").map((x) => x.trim()).filter((x) => x && x !== G_MODEL)];
const MAX_CALLS = +(Deno.env.get("SUHBAT_MAX_CALLS") || 3), MAX_TURNS = 24, MAX_AUDIO = 1_400_000; // base64 belgilar (~1 MB ovoz, 25 soniyaga bemalol)
const TTS_VOICE = Deno.env.get("SUHBAT_VOICE") || "en-US-Chirp3-HD-Charon";
const TOPICS = ["uz", "be-ing", "wh-q", "past", "art", "prep", "be", "do", "s3", "plural", "pron", "order", "word", "other"];

async function tts(text: string): Promise<string | null> {
  const key = Deno.env.get("GOOGLE_TTS_KEY") || "";
  if (!key || !text) return null;
  try {
    const lang = TTS_VOICE.split("-").slice(0, 2).join("-");
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: text.slice(0, 300) },
        voice: { languageCode: lang, name: TTS_VOICE },
        audioConfig: { audioEncoding: "MP3" },
      }),
      signal: AbortSignal.timeout(4500),
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => ({}));
    return typeof d.audioContent === "string" ? d.audioContent : null;
  } catch {
    return null;
  }
}

// --- Gemini: «quloq». Aytilganini aynan yozadi; grammatikani tuzatmaydi. ---
const HEAR = `This is a short recording of an adult beginner (A1) English learner whose first language is Uzbek, answering a tutor's question.
Transcribe EXACTLY what the learner says, word for word.
- Do NOT correct grammar, do NOT add missing words (am/is/are, a/the, -ed, -s), do NOT fix word order. If they say "I go yesterday", write "I go yesterday".
- Leave out fillers (um, eh, mm) and false starts.
- If the learner speaks Uzbek, write the Uzbek in Latin script and set lang to "uz". Mixed → "mix".
- unclear: words you are NOT sure you heard correctly (as written in text). Empty list if everything was clear.
- If there is no speech (silence, noise only), return text "" and lang "none".
Return only JSON: {"text": "...", "lang": "en" | "uz" | "mix" | "none", "unclear": ["..."]}`;

async function hear(audio: string, mime: string) {
  const body = {
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: audio } }, { text: HEAR }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 800, temperature: 0 },
  };
  let last: Row = new Error("gemini");
  for (const m of G_MODELS) {
    try {
      const r = await fetch(`${G_API}/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") || "", "Content-Type": "application/json" }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const t = await r.text();
      if (!r.ok) { last = Object.assign(new Error(`gemini ${r.status}: ${t.slice(0, 200)}`), { status: r.status }); if ([429, 500, 503, 404].includes(r.status)) continue; throw last; }
      const d = JSON.parse(t), c = d.candidates && d.candidates[0];
      const text = c && c.content && (c.content.parts || []).map((p: Row) => p.text || "").join("");
      const o = JSON.parse((text || "").match(/\{[\s\S]*\}/)?.[0] || "{}");
      const heard = clip(o.text, 300), lang = ["en", "uz", "mix", "none"].includes(o.lang) ? o.lang : "en";
      const low = heard.toLowerCase();
      const unclear = (Array.isArray(o.unclear) ? o.unclear : []).map((x: unknown) => clip(x, 30)).filter((x: string) => x && low.includes(x.toLowerCase())).slice(0, 5);
      return { heard: CYR.test(heard) ? "" : heard, lang: heard ? lang : "none", unclear };
    } catch (e) { last = e as Row; if ((e as Row).name === "TimeoutError" || (e as Row).status == null) continue; throw e; }
  }
  throw Object.assign(last, { busy: true });
}

// --- Claude: repetitor ---
const SYS = `You are a warm, patient English tutor on a short voice call with Ali, an adult Uzbek beginner (A1–A2, Navigate Beginner). Your replies are read aloud by a phone voice.
Rules for "say" (English, spoken):
- At most 2 short sentences, each 12 words or fewer, simple everyday words. Always end with exactly one easy question, unless you are ending the call.
- Talk about everyday life: family, home, food, weekend, city, shopping, travel, sport, weather. Never about his job, profession, office or company.
- If his last sentence has one clear grammar or word mistake: first say the whole corrected sentence naturally, then ask him to say it again ("Say it again?"). Correct only the most important mistake, and only once: if he repeats it (right or still wrong), say "Good" or the sentence one more time and move on with a new question.
- If he answered in Uzbek: give the simple English for what he said and ask him to say it.
- Never correct pronunciation. Never build a correction on a word listed as unclear.
- If his answer is correct: react briefly and naturally (Nice. / Great. / Oh, really?) and ask the next question. Do not praise every time.
Other fields:
- "uz": Uzbek translation of "say", Latin script only, polite «siz».
- "hint": the first 2–4 English words of a possible answer to your question, ending with "…".
- "fix": null when there is no mistake. Otherwise {"you": his sentence exactly as heard, "fix": the corrected sentence with the smallest change, "why": 1 short sentence in Uzbek (Latin, «siz», no grammar terms), "topic": one of ${TOPICS.join(" | ")}}.
  topic: uz (said in Uzbek), be-ing (am/is/are + -ing), wh-q (question word), past (past verb), art (a/an/the), prep (in/on/at…), be (missing am/is/are), do (do/does), s3 (he/she + -s), plural, pron (he/she/it), order (word order), word (wrong word), other.
- "end": true only when told the call must end now; then "say" is one warm goodbye sentence with no question.
Return only a JSON object: {"say": "...", "uz": "...", "hint": "...", "fix": null | {...}, "end": false}`;

async function claude(user: string) {
  const r = await fetch(`${A_API}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYS, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw Object.assign(new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: r.status });
  const d = await r.json();
  const text = (d.content || []).filter((c: Row) => c.type === "text").map((c: Row) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : text); } catch { throw new Error(`claude JSON buzuq (${d.stop_reason})`); }
}
function cleanReply(R: Row, heard: string, mustEnd: boolean) {
  const say = en(R.say, 240);
  if (!say) throw new Error("javob bo'sh");
  let fix: Row | null = null;
  if (R.fix && typeof R.fix === "object" && heard) {
    const f = { you: clip(heard, 300), fix: en(R.fix.fix, 300), why: uz(R.fix.why, 240), topic: TOPICS.includes(R.fix.topic) ? R.fix.topic : "other" };
    if (f.fix && f.fix.toLowerCase().replace(/[^a-z' ]/g, "") !== f.you.toLowerCase().replace(/[^a-z' ]/g, "")) fix = f;
  }
  return { say, uz: uz(R.uz, 260), hint: en(R.hint, 40), fix, end: mustEnd || R.end === true };
}
const cleanTurns = (v: unknown, n: number) => (Array.isArray(v) ? v : []).slice(-n)
  .map((t: Row) => ({ r: t && t.r === "S" ? "S" : "T", x: clip(t && t.x, 300), ...(t && t.uz ? { uz: uz(t.uz, 260) } : {}) })).filter((t: Row) => t.x && !CYR.test(t.x));

async function context(uid: string) {
  const out: string[] = [];
  try {
    const c = await db(`class_lessons?user_id=eq.${uid}&status=eq.done&day=gte.${tashkentDay(-10)}&select=analysis->rules&order=day.desc&limit=2`);
    const rules = (c || []).flatMap((r: Row) => r.rules || []).slice(0, 4).map((x: Row) => `- ${clip(x.title, 100)} ${clip(x.ex, 60)}`);
    if (rules.length) out.push(`His recent mistakes in class (ask questions where these come up naturally):\n${rules.join("\n")}`);
  } catch (e) { console.error("ctx class", e); }
  try {
    const p = await db(`calls?user_id=eq.${uid}&done_at=not.is.null&select=topic,fixes,off&order=created_at.desc&limit=3`);
    const topics = (p || []).map((x: Row) => clip(x.topic, 60)).filter(Boolean);
    const fx = (p || []).flatMap((x: Row) => (x.fixes || []).filter((_: Row, i: number) => !(x.off || []).includes(i))).slice(0, 4).map((f: Row) => `- ${clip(f.you, 80)} → ${clip(f.fix, 80)}`);
    if (topics.length) out.push(`Topics of the last calls (choose a different one): ${topics.join("; ")}`);
    if (fx.length) out.push(`Mistakes from the last calls (give him a chance to say these right):\n${fx.join("\n")}`);
  } catch (e) { console.error("ctx calls", e); }
  return out.join("\n\n");
}

Deno.serve(async (req) => {
  const o = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== "POST") return json({ error: "method" }, 405, o);
  const p = new URL(req.url).pathname.replace(/\/+$/, "").split("/").pop();
  try {
    const uid = await who(req);
    if (!uid) return json({ error: "auth" }, 401, o);
    if (uid !== OWNER) return json({ error: "not_allowed" }, 403, o);
    const b: Row = await req.json().catch(() => ({}));

    if (p === "start") {
      const today = await db(`calls?user_id=eq.${uid}&day=eq.${tashkentDay()}&select=id,n_turns`);
      if ((today || []).filter((c: Row) => c.n_turns > 0).length >= MAX_CALLS) return json({ error: "limit", max: MAX_CALLS }, 429, o);
      const ctx = await context(uid);
      const goal = clip(b.goal, 80);
      const R = await claude(`Start the call now. Greet Ali in one short sentence and ask one easy opening question about everyday life.\n` +
        (goal ? `This week he is working on: ${goal}. Choose a topic where this comes up naturally.\n` : "") + (ctx ? `\n${ctx}\n` : "") +
        `\nAlso return "topic": the call topic in Uzbek (Latin), 2–4 words, for example: O'tgan dam olish kuni.`);
      const first = cleanReply(R, "", false);
      const topic = uz(R.topic, 60) || "Erkin suhbat";
      const row = await db("calls", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: uid, topic, model: MODEL, turns: [{ r: "T", x: first.say, uz: first.uz }] }) });
      const audio = await tts(first.say);
      return json({ id: row[0].id, say: first.say, uz: first.uz, hint: first.hint, topic, ...(audio ? { audio } : {}) }, 200, o);
    }

    const id = clip(b.id, 40);
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad_id" }, 400, o);
    const rows = await db(`calls?id=eq.${id}&user_id=eq.${uid}&select=id,n_turns,done_at,topic`);
    const call = rows && rows[0];
    if (!call) return json({ error: "not_found" }, 404, o);

    if (p === "turn") {
      if (call.done_at) return json({ error: "ended" }, 409, o);
      if (call.n_turns >= MAX_TURNS) return json({ error: "limit_turns" }, 429, o);
      let heard = "", lang = "en", unclear: string[] = [];
      if (typeof b.text === "string" && b.text.trim()) heard = clip(b.text, 300); // yozib gaplashish (mikrofon yo'q bo'lsa)
      else {
        const audio = typeof b.audio === "string" ? b.audio : "";
        if (!audio || audio.length > MAX_AUDIO) return json({ error: "bad_audio" }, 400, o);
        const mime = clip(b.mime, 40).split(";")[0] || "audio/webm";
        if (!/^audio\/(webm|mp4|m4a|aac|ogg|wav|mpeg|mp3)$/.test(mime)) return json({ error: "bad_mime" }, 400, o);
        try { const h = await hear(audio, mime === "audio/mp4" ? "audio/m4a" : mime); heard = h.heard; lang = h.lang; unclear = h.unclear; }
        catch (e) { console.error("hear", e); return json({ error: "hear", busy: !!(e as Row).busy, detail: clip(String(e), 160) }, 503, o); }
        if (!heard || lang === "none") return json({ empty: true }, 200, o);
      }
      const left = Math.max(0, Math.min(MAX_TURNS, Math.round(+b.left || 0)));
      const mustEnd = left <= 0 || call.n_turns + 1 >= MAX_TURNS;
      const hist = cleanTurns(b.turns, 12).map((t: Row) => `${t.r === "T" ? "Tutor" : "Ali"}: ${t.x}`).join("\n");
      const R = await claude(`Call topic: ${clip(call.topic, 60)}\nConversation so far:\n${hist || "(just started)"}\n\n` +
        `Ali just said${lang === "uz" ? " (in Uzbek)" : lang === "mix" ? " (mixing Uzbek and English)" : ""}: "${heard}"\n` +
        (unclear.length ? `Words the speech recognition was NOT sure about (do not correct these): ${unclear.join(", ")}\n` : "") +
        (mustEnd ? `The call must end now: respond to what he said in a few words, then say goodbye. Set "end": true. Still return "fix" if there is a clear mistake.` : `About ${left} more exchange(s) are left.`));
      const reply = cleanReply(R, heard, mustEnd);
      const [audio] = await Promise.all([
        tts(reply.say),
        db(`calls?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ n_turns: call.n_turns + 1 }) }),
      ]);
      return json({ heard, unclear, ...reply, ...(audio ? { audio } : {}) }, 200, o);
    }

    if (p === "end") {
      if (call.done_at) return json({ ok: true }, 200, o);
      const turns = cleanTurns(b.turns, 60);
      const fixes = (Array.isArray(b.fixes) ? b.fixes : []).slice(0, 24).map((f: Row) => ({ you: clip(f && f.you, 300), fix: en(f && f.fix, 300), why: uz(f && f.why, 240), topic: TOPICS.includes(f && f.topic) ? f.topic : "other" })).filter((f: Row) => f.you && f.fix);
      const secs = Math.max(0, Math.min(3600, Math.round(+b.secs || 0)));
      await db(`calls?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ turns, fixes, secs, done_at: new Date().toISOString() }) });
      return json({ ok: true }, 200, o);
    }
    return json({ error: "not_found", use: ["POST /suhbat/start", "POST /suhbat/turn", "POST /suhbat/end"] }, 404, o);
  } catch (e) {
    console.error(e);
    const st = +(e as Row).status || 0;
    return json({ error: st === 429 || st === 529 ? "busy" : "server", detail: clip(String(e), 200) }, st === 429 || st === 529 ? 503 : 500, o);
  }
});
