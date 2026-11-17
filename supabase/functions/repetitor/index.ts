// «Repetitor»: Claude Console'dagi Managed Agent uchun ikki eshik.
//   GET  /repetitor/data   — egasining (Ali) natijalari xulosasi: kurs, seriya, oxirgi 14 kun, xatolar, qiyin va kechikkan so'zlar, oxirgi darslar va javoblar.
//   POST /repetitor/lesson — agent tayyorlagan darsni yozadi ({ day?, lesson }), bir kunga bitta (qayta yozilsa almashtiriladi).
// Kirish faqat «x-agent-key» sarlavhasi bilan (Edge Function secret AGENT_KEY; agentga Console vault orqali beriladi, sandboxda ochiq turmaydi).
// verify_jwt = false (agentda Supabase hisobi yo'q). Egasi: OWNER_ID secret yoki OWNER_DEFAULT.
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
  return {
    today: day,
    note: "id formati: «unit|so'z» (masalan «9|come»). Unit 1–10 — Beginner, 101+ — Pre-intermediate, «vb» — so'z boyligi bazasi. So'zlarning tarjimasi va misollari: https://easywords.uz/data/beginner.js (UNITS). mis kalitlari: w: — so'z, g: — grammatika qolipi, b: — gap tuzish gapi.",
    course: S.course ?? null, level: S.level ?? null, streak: S.streak ?? null,
    log, // a — javoblar, ok — to'g'ri, t — soniya, sp/sw — yozib javoblar (to'g'ri/jami)
    srs: { total: all.length, overdue: overdue.length, hard: hard.length, hardest: pick(hard, 40), oldest_overdue: pick(overdue, 60) },
    mistakes_21d: mis,
    confusions: Object.values(S.conf || {}),
    grammar: { scores: S.pat || {}, review: S.gr || {} },
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
  const secs = L.sections as Record<string, unknown>[];
  if (!Array.isArray(secs) || secs.length < 1 || secs.length > 6) return "sections: 1–6 ta";
  let n = 0;
  for (const [si, s] of secs.entries()) {
    if (!str(s.t, 60) || (s.s !== undefined && !str(s.s, 120))) return `sections[${si}]: t (≤60), s (≤120)`;
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

Deno.serve(async (req) => {
  const key = Deno.env.get("AGENT_KEY") || "", owner = Deno.env.get("OWNER_ID") || OWNER_DEFAULT;
  if (!key || !owner) return json({ error: "not_configured" }, 503);
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
      await db("agent_lessons?on_conflict=user_id,day", {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: owner, day, lesson: L, answers: {}, done_at: null }),
      });
      return json({ ok: true, day });
    }
    return json({ error: "not_found", use: ["GET /repetitor/data", "POST /repetitor/lesson"] }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "server", detail: String(e).slice(0, 200) }, 500);
  }
});
