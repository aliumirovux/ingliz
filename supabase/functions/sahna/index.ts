// Daily speaking scenario generator (dialog, key phrases, 3-step roleplay).
// Endpoint: POST /sahna/today (owner JWT).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AI_EFFORT, AI_MODEL, clip, cors, CYR, db, json, Row, tashkentDay, who } from "../_shared/common.ts";

const OWNER = Deno.env.get("OWNER_ID") || "6cc7d3c7-d237-486e-94f8-3f951a0437c2";
const A_API = Deno.env.get("ANTHROPIC_API") || "https://api.anthropic.com";
const MODEL = AI_MODEL;

const SYS = `Sen ingliz tilini o'rganayotgan o'zbek kattalar uchun mohir o'qituvchisan. O'quvchi — Ali, darajasi A1–A2 (Navigate Beginner).
Har kuni unga bitta qisqa hayotiy sahna yozasan: u avval dialogni tinglaydi, keyin 2 ta kalit gapni ovoz chiqarib aytadi, oxirida sahnadagi boshqa odam bilan o'zi gaplashadi.
Qoidalar:
- Inglizcha gaplar qisqa va oddiy (A1–A2), tabiiy kundalik ingliz tili. Har gap 12 so'zdan oshmasin.
- O'zbekcha matn faqat lotin yozuvida, «siz» bilan, grammatik atamalarsiz.
- Sahna Alining ishi yoki kasbi (dizayner, ofis, kompaniya) haqida bo'lmasin. Kundalik hayot: do'kon, restoran, transport, mehmonxona, shifokor, qo'shni, sayohat, telefon qo'ng'irog'i, dam olish.
- Javobni FAQAT JSON obyekt qilib qaytar, boshqa matn qo'shma.`;

function prompt(b: Row, ctx: Row) {
  const words = (Array.isArray(b.words) ? b.words : []).slice(0, 40).map((w: Row) => `${clip(w.en, 40)} — ${clip(w.uz, 60)}`).join("\n");
  return `Kursdagi joyi: Unit ${clip(b.unit, 6)}${b.unit_title ? ` «${clip(b.unit_title, 60)}»` : ""}.
Unitning so'zlari (kamida 4 tasini sahnada ishlat, eng muhimlari ro'yxat boshida):
${words || "(ro'yxat yo'q)"}
${ctx.rules ? `\nAlining o'qituvchi bilan darsdagi xatolari (sahnada shu qoidalar to'g'ri ishlatilsin):\n${ctx.rules}\n` : ""}${ctx.stuck ? `\nDarsda tutilib qolgan gaplari (bittasi sahnaga tabiiy tushsa yaxshi):\n${ctx.stuck}\n` : ""}${ctx.recent ? `\nOxirgi kunlardagi sahnalar (takrorlama, boshqa vaziyat tanla): ${ctx.recent}\n` : ""}
JSON shakli:
{
  "title": "sahna nomi, o'zbekcha, masalan: Restoranda hisobni so'rash",
  "where": "joy, o'zbekcha, 1–2 so'z",
  "role": "sahnadagi boshqa odam, o'zbekcha (masalan: Ofitsiant)",
  "role_en": "shu odam inglizcha (masalan: Waiter)",
  "minutes": 6–10,
  "words": [{"en": "sahnadagi so'z yoki ibora", "uz": "tarjima"}] — 5–8 ta,
  "pattern": {"en": "sahnaning asosiy qolipi, masalan: Can I have …, please?", "uz": "ma'nosi"},
  "dialog": [{"s": "T" (boshqa odam) | "S" (Ali), "en": "gap", "uz": "tarjima"}] — 6–8 ta, T bilan boshlansin,
  "say": [{"en": "dialogdagi eng foydali gap", "uz": "tarjima"}] — aniq 2 ta,
  "play": [{"t": "boshqa odamning gapi (inglizcha)", "t_uz": "tarjima", "task": "Ali nima qilishi kerak, o'zbekcha buyruq, masalan: Ichimlik so'rang", "ok": ["to'g'ri javob variantlari, 1–4 ta, eng oddiyi birinchi"], "hint": "javob boshlanishi, masalan: Can I have…"}] — aniq 3 ta, dialogdan farqli vaziyat davomida,
  "end": "boshqa odamning yakuniy gapi", "end_uz": "tarjima",
  "next": "ertangi sahna nomi, o'zbekcha (shu unit mavzusida, boshqa vaziyat)"
}`;
}

async function claude(p: string, effort: string, ms: number) {
  const r = await fetch(`${A_API}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 32000, output_config: { effort }, system: SYS, messages: [{ role: "user", content: p }] }),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw Object.assign(new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`), { status: r.status });
  const d = await r.json();
  const text = (d.content || []).filter((c: Row) => c.type === "text").map((c: Row) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : text); } catch { throw new Error(`claude JSON buzuq (${d.stop_reason})`); }
}

function clean(S: Row) {
  const uz = (v: unknown, n: number) => { const s = clip(v, n); return s && !CYR.test(s) ? s : ""; };
  const en = (v: unknown, n: number) => { const s = clip(v, n); return s && /[A-Za-z]/.test(s) && !CYR.test(s) ? s : ""; };
  const pair = (x: Row, a: number, b: number) => ({ en: en(x && x.en, a), uz: uz(x && x.uz, b) });
  const out: Row = {
    title: uz(S.title, 60), where: uz(S.where, 30), role: uz(S.role, 24), role_en: en(S.role_en, 24) || "Partner",
    minutes: Math.max(5, Math.min(12, Math.round(+S.minutes || 8))),
    words: (Array.isArray(S.words) ? S.words : []).map((x: Row) => pair(x, 40, 60)).filter((x: Row) => x.en && x.uz).slice(0, 8),
    pattern: pair(S.pattern || {}, 60, 80),
    dialog: (Array.isArray(S.dialog) ? S.dialog : []).map((x: Row) => ({ s: x && x.s === "S" ? "S" : "T", ...pair(x, 140, 160) })).filter((x: Row) => x.en && x.uz).slice(0, 8),
    say: (Array.isArray(S.say) ? S.say : []).map((x: Row) => pair(x, 100, 120)).filter((x: Row) => x.en && x.uz).slice(0, 2),
    play: (Array.isArray(S.play) ? S.play : []).map((x: Row) => ({
      t: en(x && x.t, 120), t_uz: uz(x && x.t_uz, 140), task: uz(x && x.task, 60),
      ok: (Array.isArray(x && x.ok) ? x.ok : []).map((y: unknown) => en(y, 100)).filter(Boolean).slice(0, 4), hint: en(x && x.hint, 40),
    })).filter((x: Row) => x.t && x.task && x.ok.length).slice(0, 3),
    end: en(S.end, 120), end_uz: uz(S.end_uz, 140), next: uz(S.next, 60),
  };
  if (!out.title || out.dialog.length < 4 || out.say.length < 2 || out.play.length < 3 || out.words.length < 3) throw new Error("sahna chala: " + JSON.stringify({ t: !!out.title, d: out.dialog.length, s: out.say.length, p: out.play.length, w: out.words.length }));
  return out;
}

async function context(uid: string) {
  const ctx: Row = {};
  try {
    const c = await db(`class_lessons?user_id=eq.${uid}&status=eq.done&day=gte.${tashkentDay(-10)}&select=analysis->rules,analysis->speech->stuck&order=day.desc&limit=2`);
    const rules = (c || []).flatMap((r: Row) => r.rules || []).slice(0, 4).map((x: Row) => `- ${clip(x.title, 100)} ${clip(x.ex, 60)}`);
    const stuck = (c || []).flatMap((r: Row) => r.stuck || []).slice(0, 4).map((x: Row) => `- ${clip(x.en, 100)}`);
    if (rules.length) ctx.rules = rules.join("\n");
    if (stuck.length) ctx.stuck = stuck.join("\n");
  } catch (e) { console.error("ctx class", e); }
  try {
    const s = await db(`scenes?user_id=eq.${uid}&day=gte.${tashkentDay(-14)}&select=scene->>title&order=day.desc&limit=14`);
    const t = (s || []).map((x: Row) => x.title).filter(Boolean);
    if (t.length) ctx.recent = t.join("; ");
  } catch (e) { console.error("ctx scenes", e); }
  return ctx;
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
    const b = await req.json().catch(() => ({}));
    if (p !== "today") return json({ error: "not_found", use: ["POST /sahna/today"] }, 404, o);

    const day = typeof b.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.day) && [tashkentDay(-1), tashkentDay(), tashkentDay(1)].includes(b.day) ? b.day : tashkentDay();
    const have = await db(`scenes?user_id=eq.${uid}&day=eq.${day}&select=day,scene,progress,done_at`);
    if (have && have[0]) return json(have[0], 200, o);
    let scene: Row | null = null, last: unknown = null;
    const ctx = await context(uid);
    for (let i = 0; i < 2 && !scene; i++) { try { scene = clean(await claude(prompt(b, ctx), i ? "medium" : AI_EFFORT, i ? 45000 : 95000)); } catch (e) { last = e; console.error("sahna", e); } }
    if (!scene) return json({ error: "generate", detail: clip(String(last), 200) }, 502, o);

    await db("scenes?on_conflict=user_id,day", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ user_id: uid, day, scene, model: MODEL }) });
    const row = await db(`scenes?user_id=eq.${uid}&day=eq.${day}&select=day,scene,progress,done_at`);
    return json(row[0], 200, o);
  } catch (e) {
    console.error(e);
    return json({ error: "server", detail: clip(String(e), 200) }, 500, o);
  }
});
