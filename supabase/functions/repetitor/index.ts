// «Repetitor»: Claude Console'dagi Managed Agent uchun ikki eshik.
//   GET  /repetitor/data   — egasining (Ali) natijalari xulosasi: kurs, seriya, oxirgi 14 kun, xatolar, qiyin va kechikkan so'zlar, oxirgi darslar va javoblar.
//   POST /repetitor/lesson — agent tayyorlagan darsni yozadi ({ day?, lesson }), bir kunga bitta (qayta yozilsa almashtiriladi).
// Kirish faqat «x-agent-key» sarlavhasi bilan (Edge Function secret AGENT_KEY; agentga Console vault orqali beriladi, sandboxda ochiq turmaydi).
// verify_jwt = false (agentda Supabase hisobi yo'q). Egasi: OWNER_ID secret yoki OWNER_DEFAULT.
// Telegram (ixtiyoriy, secret TELEGRAM_BOT_TOKEN bo'lsa):
//   dars yozilganda — ertalabki xabar; POST /repetitor/remind (pg_cron, 20:00) — dars bajarilmagan bo'lsa kuniga bitta eslatma;
//   GET /repetitor/tg-setup — botga webhook o'rnatadi; POST /repetitor/tg — Telegram webhook: birinchi /start yozgan chat egasiniki deb saqlanadi.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const OWNER_DEFAULT = "6cc7d3c7-d237-486e-94f8-3f951a0437c2"; // Ali (aliumirov.me@gmail.com); OWNER_ID secret bilan almashtirsa bo'ladi
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

const tashkentDay = (offset = 0) => {
  const d = new Date(Date.now() + 5 * 3600e3 + offset * 864e5);
  return d.toISOString().slice(0, 10);
};
const safeEq = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
};
async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`db ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

type Rec = { b?: number; ok?: number; bad?: number; due?: string; ls?: string };

async function data(owner: string) {
  const rows = await db(`progress?user_id=eq.${owner}&select=state,updated_at`);
  const S = (rows && rows[0] && rows[0].state) || {};
  const day = tashkentDay(), from14 = tashkentDay(-14), from21 = tashkentDay(-21);
  const srs: Record<string, Rec> = S.srs || {};
  const all = Object.entries(srs);
  const overdue = all.filter(([, r]) => r.due && r.due < day).sort((a, b) => (a[1].due! < b[1].due! ? -1 : 1));
  const hard = all.filter(([, r]) => (r.bad || 0) >= 2).sort((a, b) => (b[1].bad || 0) - (a[1].bad || 0));
  const pick = (l: [string, Rec][], n: number) => l.slice(0, n).map(([id, r]) => ({ id, bad: r.bad || 0, ok: r.ok || 0, box: r.b || 0, due: r.due || "", last: r.ls || "" }));
  const log = Object.fromEntries(Object.entries(S.log || {}).filter(([d]) => d >= from14).sort());
  const mis = Object.entries(S.mis || {}).filter(([, d]) => String(d) >= from21).sort((a, b) => (String(a[1]) < String(b[1]) ? 1 : -1)).map(([k, d]) => ({ k, d }));
  const lessons = await db(`agent_lessons?user_id=eq.${owner}&day=gte.${tashkentDay(-7)}&select=day,lesson,answers,done_at&order=day.desc`);
  // Inter Nation darslari (dars funksiyasi tahlil qilgan): oxirgi 10 kun, ko'pi bilan 3 ta
  let cls: Record<string, unknown>[] = [];
  try {
    const c = await db(`class_lessons?user_id=eq.${owner}&status=eq.done&day=gte.${tashkentDay(-10)}&select=id,day,analysis,answers&order=day.desc&limit=3`);
    // saytda ovoz chiqarib mashq: har gap uchun eng oxirgi urinish
    let sp: Record<string, any>[] = [];
    try { sp = await db(`speak_log?user_id=eq.${owner}&src=eq.dars&day=gte.${tashkentDay(-10)}&select=lesson_id,item,lat_ms,hints,score,at&order=at.desc&limit=200`) || []; } catch (e) { console.error("speak_log", e); }
    cls = (c || []).map((r: Record<string, any>) => {
      const a = r.analysis || {}, ct = a.content || {}, ans = r.answers || {};
      // yozuvsiz dars (faqat doska rasmlari): Ali saytda tasdiqlagan so'z va qoidalar (answers.review); tasdiqlanmagan bo'lsa — hammasi
      const photo = a.kind === "photo", rv = photo && ans.review ? ans.review : null;
      const pickI = (list: unknown[], keep: number[] | undefined) => rv && Array.isArray(keep) ? list.filter((_, i) => keep.includes(i)) : list;
      return {
        day: r.day, unit: ct.unit || null, headline: a.headline, source: photo ? "doska rasmlari (dars yozilmagan, xatolar yo'q)" : "dars yozuvi",
        rules: pickI(a.rules || [], rv && rv.r).map((x: Record<string, any>) => photo ? ({ key: x.key, title: x.title, text: x.text, ex: x.ex }) : ({ key: x.key, ex: x.ex, count: x.count })),
        // retyped: sayt sahifasida xatoni qayta to'g'ri yozdimi (null — hali urinmagan)
        mistakes: (a.mistakes || []).map((m: Record<string, unknown>, i: number) => ({ kind: m.kind, rule: m.rule, you: m.you, fix: m.fix, why: m.why, retyped: ans["m" + i] ? !!ans["m" + i].ok : null })),
        words: pickI(ct.words || [], rv && rv.w).map((w: Record<string, unknown>) => ({ en: w.en, uz: w.uz })), homework: ct.homework || null,
        // gapirish: tutilib qolgan gaplar (siz aytgan → oddiy inglizchasi), qutqaruvchi iboralar, raqamlar
        speaking: a.speech ? { metrics: a.speech.metrics, stuck: (a.speech.stuck || []).map((x: Record<string, unknown>) => ({ kind: x.kind, you: x.you, en: x.en })), rescue: a.speech.rescue || [], patterns: a.speech.patterns || [],
          // practice: uyda ovoz bilan aytgani — lat_ms gapni boshlagungacha, hints 0–3, score aytilgan so'zlar %
          practice: (a.speech.stuck || []).map((x: Record<string, unknown>) => { const p = sp.find((y) => y.lesson_id === r.id && y.item === x.en); return p ? { en: x.en, lat_ms: p.lat_ms, hints: p.hints, score: p.score, at: p.at } : null; }).filter(Boolean) } : null,
      };
    });
  } catch (e) { console.error("class_lessons", e); }
  return {
    today: day,
    note: "id formati: «unit|so'z» (masalan «9|come»). Unit 1–10 — Beginner, 101+ — Pre-intermediate, «vb» — so'z boyligi bazasi. So'zlarning tarjimasi va misollari: https://easywords.uz/data/beginner.js (UNITS). mis kalitlari: w: — so'z, g: — grammatika qolipi, b: — gap tuzish gapi.",
    course: S.course ?? null, level: S.level ?? null, streak: S.streak ?? null,
    log, // a — javoblar, ok — to'g'ri, t — soniya, sp/sw — yozib javoblar (to'g'ri/jami)
    srs: { total: all.length, overdue: overdue.length, hard: hard.length, hardest: pick(hard, 40), oldest_overdue: pick(overdue, 60) },
    mistakes_21d: mis,
    confusions: Object.values(S.conf || {}),
    grammar: { scores: S.pat || {}, review: S.gr || {} },
    class_lessons: cls,
    lessons: (lessons || []).map((l: Record<string, unknown>) => ({ day: l.day, done_at: l.done_at, answers: l.answers, lesson: l.lesson })),
    progress_updated_at: rows && rows[0] ? rows[0].updated_at : null,
  };
}

// --- darsni tekshirish: sayt shu shaklni chiza oladi ---
const TYPES = new Set(["choice", "type", "story", "write"]);
const str = (v: unknown, n: number) => typeof v === "string" && v.trim().length > 0 && v.length <= n;
function check(L: Record<string, unknown>): string | null {
  if (!str(L.title, 80) || !str(L.why, 400)) return "title (≤80) va why (≤400) kerak";
  if (typeof L.minutes !== "number" || L.minutes < 3 || L.minutes > 30) return "minutes 3–30 oralig'ida bo'lsin";
  if (L.focus !== undefined && !(Array.isArray(L.focus) && L.focus.length <= 60 && L.focus.every((x) => str(x, 60)))) return "focus: ≤60 ta id";
  if (L.feedback !== undefined && !(Array.isArray(L.feedback) && L.feedback.length <= 6 && L.feedback.every((f: Record<string, unknown>) => str(f.you, 300) && str(f.fix, 300) && str(f.izoh, 400)))) return "feedback: [{you, fix, izoh}] ≤6";
  if (L.plan !== undefined) {
    const P = L.plan as Record<string, unknown>;
    if (!P || typeof P !== "object" || ![10, 20, 30].includes(P.recommend as number) || !Array.isArray(P.order) || P.order.length > 24 || !P.order.every((x) => typeof x === "string" && /^(rep\d|esla|rev|new|fel|gram|tuz|gap|kech|story|tl)$/.test(x))) return "plan: {recommend: 10|20|30, order: [rep0.., esla, rev, new, fel, gram, tuz, gap, kech, story, tl]}";
  }
  const secs = L.sections as Record<string, unknown>[];
  if (!Array.isArray(secs) || secs.length < 1 || secs.length > 6) return "sections: 1–6 ta";
  let n = 0;
  for (const [si, s] of secs.entries()) {
    if (!str(s.t, 60) || (s.s !== undefined && !str(s.s, 120))) return `sections[${si}]: t (≤60), s (≤120)`;
    if (s.m !== undefined && !(typeof s.m === "number" && s.m >= 1 && s.m <= 15)) return `sections[${si}].m: 1–15 daqiqa`;
    const items = s.items as Record<string, unknown>[];
    if (!Array.isArray(items) || !items.length || items.length > 10) return `sections[${si}].items: 1–10 ta`;
    for (const [ii, it] of items.entries()) {
      n++; const p = `sections[${si}].items[${ii}]`;
      if (!TYPES.has(it.type as string)) return `${p}.type: choice | type | story | write`;
      if (it.type === "choice") {
        const o = it.o as unknown[];
        if (!str(it.q, 200) || !Array.isArray(o) || o.length < 2 || o.length > 4 || !o.every((x) => str(x, 120)) || typeof it.a !== "number" || it.a < 0 || it.a >= o.length || !str(it.izoh, 400)) return `${p}: choice {q, o[2–4], a, izoh}`;
      } else if (it.type === "type") {
        if (!str(it.q, 200) || !str(it.a, 120) || !str(it.izoh, 400) || (it.acc !== undefined && !(Array.isArray(it.acc) && it.acc.length <= 6 && it.acc.every((x) => str(x, 120))))) return `${p}: type {q, a, acc?, izoh}`;
      } else if (it.type === "story") {
        const ln = it.lines as Record<string, unknown>[];
        if (!str(it.t, 80) || !Array.isArray(ln) || ln.length < 2 || ln.length > 10 || !ln.every((x) => str(x.en, 200) && str(x.uz, 240))) return `${p}: story {t, lines[2–10]{en, uz}}`;
      } else if (!str(it.q, 240) || (it.w !== undefined && !str(it.w, 40))) return `${p}: write {q, w?}`;
    }
  }
  if (n > 30) return "jami savollar ≤30";
  return null;
}

// --- Telegram ---
const TG = () => Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TG_API = Deno.env.get("TG_API") || "https://api.telegram.org";
const SITE = "https://easywords.uz/#repetitor";
async function tgSecret() {
  const k = new TextEncoder().encode((Deno.env.get("AGENT_KEY") || "") + "|tg");
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", k));
  return Array.from(h.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function tg(method: string, body: unknown) {
  const r = await fetch(`${TG_API}/bot${TG()}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(`tg ${method} ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d.result;
}
async function settings(owner: string) {
  const rows = await db(`agent_settings?user_id=eq.${owner}&select=tg_chat_id,reminded_on`);
  return (rows && rows[0]) || null;
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
async function send(chat: number, html: string, button: string) {
  return tg("sendMessage", { chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: button, url: SITE }]] } });
}
async function notifyLesson(owner: string, L: Record<string, unknown>) {
  if (!TG()) return "no_token";
  const st = await settings(owner); if (!st || !st.tg_chat_id) return "no_chat";
  const secs = (L.sections as Record<string, unknown>[]).map((s) => s.t).slice(0, 4).join(", ");
  await send(st.tg_chat_id, `<b>Bugungi dars tayyor · ${esc(L.minutes)} daqiqa</b>\n${esc(secs)}`, "Boshlash");
  return "sent";
}
async function remind(owner: string) {
  if (!TG()) return { skip: "no_token" };
  const day = tashkentDay(), hour = new Date(Date.now() + 5 * 3600e3).getUTCHours();
  if (hour < 19) return { skip: "early" };
  const st = await settings(owner); if (!st || !st.tg_chat_id) return { skip: "no_chat" };
  if (st.reminded_on === day) return { skip: "already" };
  const rows = await db(`agent_lessons?user_id=eq.${owner}&day=eq.${day}&select=lesson,answers,done_at`);
  const l = rows && rows[0]; if (!l) return { skip: "no_lesson" };
  if (l.done_at) return { skip: "done" };
  const started = Object.keys(l.answers || {}).filter((k) => k !== "fb").length > 0;
  const text = started ? "Bugungi dars yarmida qoldi. Oxirigacha bir necha daqiqa qoldi." : "Bugun hali mashq bo'lmadi. Darsning birinchi bo'limi 2–3 daqiqa oladi.";
  await send(st.tg_chat_id, text, started ? "Davom etish" : "Ochish");
  await db(`agent_settings?user_id=eq.${owner}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ reminded_on: day }) });
  return { sent: true };
}

Deno.serve(async (req) => {
  const key = Deno.env.get("AGENT_KEY") || "", owner = Deno.env.get("OWNER_ID") || OWNER_DEFAULT;
  if (!key || !owner) return json({ error: "not_configured" }, 503);
  const p0 = new URL(req.url).pathname.replace(/\/+$/, "").split("/").pop();
  try {
    // Telegram webhook: maxfiy sarlavha bilan; birinchi /start yozgan chat saqlanadi, keyingilari e'tiborsiz
    if (req.method === "POST" && p0 === "tg") {
      if (req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== await tgSecret()) return json({ error: "auth" }, 401);
      const u = await req.json().catch(() => ({}));
      const m = u.message; if (!m || !m.chat || m.chat.type !== "private" || !String(m.text || "").startsWith("/start")) return json({ ok: true });
      const st = await settings(owner);
      if (st && st.tg_chat_id && st.tg_chat_id !== m.chat.id) return json({ ok: true });
      await db("agent_settings?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: owner, tg_chat_id: m.chat.id }) });
      await send(m.chat.id, "Ulandi. Har kuni ertalab dars tayyor bo'lganda shu yerga xabar keladi. Kechqurun, dars qilinmagan bo'lsa, bitta eslatma keladi.", "Saytni ochish");
      return json({ ok: true });
    }
    // webhookni o'rnatish (takror chaqirilsa ham zararsiz)
    if (req.method === "GET" && p0 === "tg-setup") {
      if (!TG()) return json({ error: "no_token" }, 503);
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/repetitor/tg`;
      await tg("setWebhook", { url, secret_token: await tgSecret(), allowed_updates: ["message"], drop_pending_updates: false });
      const st = await settings(owner);
      return json({ ok: true, webhook: url, linked: !!(st && st.tg_chat_id) });
    }
    // kechki eslatma: kuniga bitta, 19:00 dan keyin, dars bajarilmagan bo'lsa
    if (req.method === "POST" && p0 === "remind") return json(await remind(owner));
  } catch (e) {
    console.error(e);
    return json({ error: "server", detail: String(e).slice(0, 200) }, 500);
  }
  if (!safeEq(req.headers.get("x-agent-key") || "", key)) return json({ error: "auth" }, 401);
  const path = new URL(req.url).pathname.replace(/\/+$/, "").split("/").pop();
  try {
    if (req.method === "GET" && path === "data") return json(await data(owner));
    if (req.method === "POST" && path === "lesson") {
      let b: Record<string, unknown>;
      try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
      const day = typeof b.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.day) ? b.day : tashkentDay();
      const L = b.lesson as Record<string, unknown>;
      const err = L && typeof L === "object" ? check(L) : "lesson obyekti kerak";
      if (err) return json({ error: "invalid", detail: err }, 422);
      if (JSON.stringify(L).length > 60000) return json({ error: "too_big" }, 413);
      // boshlangan darsning ustiga yozilmaydi (javoblar o'chib ketmasin); majburan — {force: true}
      const ex = await db(`agent_lessons?user_id=eq.${owner}&day=eq.${day}&select=answers`);
      if (ex && ex[0] && Object.keys(ex[0].answers || {}).length && b.force !== true) return json({ error: "already_started", detail: "Bu kungi dars boshlangan, ustiga yozilmadi." }, 409);
      await db("agent_lessons?on_conflict=user_id,day", {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: owner, day, lesson: L, answers: {}, done_at: null }),
      });
      let tgr = "skip";
      try { tgr = await notifyLesson(owner, L); } catch (e) { console.error(e); tgr = "fail"; }
      return json({ ok: true, day, telegram: tgr });
    }
    return json({ error: "not_found", use: ["GET /repetitor/data", "POST /repetitor/lesson"] }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "server", detail: String(e).slice(0, 200) }, 500);
  }
});
