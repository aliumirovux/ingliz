// «Dars tahlili»: Inter Nation darsining yozuvi (siz + o'qituvchi, ~80 daqiqa) → xatolar va dars mazmuni.
//   POST /dars/new    (sayt, egasi) — yozuv uchun qator ochadi, yuklash yo'lini beradi; {photo: true} — yozuvsiz dars (faqat doska rasmlari)
//   POST /dars/start  (sayt, egasi) — fayl yuklangach navbatga qo'yadi
//   POST /dars/retry  (sayt, egasi) — xato bilan to'xtagan yoki bekor qilingan ishni qayta navbatga qo'yadi
//   POST /dars/cancel (sayt, egasi) — ishlovni to'xtatadi (status = cancelled); yozuv va rasmlar 3 kun turadi, qayta boshlasa bo'ladi
//   POST /dars/delete (sayt, egasi) — tugamagan (xato / bekor qilingan / yuklanmagan) darsni yozuvi va rasmlari bilan o'chiradi
//   POST /dars/tick   (pg_cron har daqiqa + o'zini o'zi) — navbatdan bitta bosqichni bajaradi
// Bosqichlar (har biri alohida chaqiruvda, 150 s chegarasiga sig'ishi uchun):
//   queued → audio Gemini Files API'ga → transcribing → Gemini: matn + ikki ovoz (S = Ali, T = o'qituvchi) → audio o'chiriladi
//   → analyzing → Claude: xatolar, mazmun va gapirish (uchta parallel so'rov) → done → Telegram xabari.
// Gemini bepul rejimda bo'laklar bittadan (62 s oraliq) o'giriladi; billing ulansa GEMINI_PARALLEL=1 secret bilan parallel.
// Yozuvsiz dars (kind = "photo"): faqat doska rasmlari. Gemini ishlatilmaydi — start'dan keyin darhol analyzing → Claude rasmlarni
//   o'qiydi (konspekt, so'zlar, qoidalar) → done. So'zlarni Ali saytda tasdiqlaydi (answers.review), keyin ular «Mening so'zlarim»ga tushadi.
// Kalitlar (Edge Function secrets): GEMINI_API_KEY (Ali kiritadi), ANTHROPIC_API_KEY (bor), TELEGRAM_BOT_TOKEN (bor).
// verify_jwt = false: sayt so'rovlari foydalanuvchi tokeni bilan shu yerda tekshiriladi, tick ochiq (faqat navbatdagi ishni suradi).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const OWNER = Deno.env.get("OWNER_ID") || "6cc7d3c7-d237-486e-94f8-3f951a0437c2";
const BUCKET = "dars-audio";
const PHOTOS = "dars-rasm", MAX_PHOTOS = 8;
const MAX_BYTES = 50 * 1024 * 1024;
const PER_DAY = 4;
const MAX_TRIES = 3;
// Gemini bepul rejimi: daqiqasiga 250K token, kuniga 20 so'rov. Har so'rov butun audioni o'qiydi (80 daq ≈ 157K token),
// shuning uchun bo'laklar bittadan, kamida 62 s oraliq bilan yuboriladi. Pullik rejimda GEMINI_PARALLEL=1 — hammasi birga.
const G_PARALLEL = Deno.env.get("GEMINI_PARALLEL") === "1";
const G_GAP = +(Deno.env.get("GEMINI_GAP_MS") || 62e3), G_WIN_FREE = 20 * 60, G_MAX_WAITS = +(Deno.env.get("GEMINI_MAX_WAITS") || 20), MAX_WAITS = 15;
const G_API = Deno.env.get("GEMINI_API") || "https://generativelanguage.googleapis.com";
const G_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
// asosiy model band (503) yoki limiti tugagan (429) bo'lsa — navbatdagi model (bepul limit har modelda alohida)
const G_MODELS = [G_MODEL, ...(Deno.env.get("GEMINI_FALLBACK") ?? "gemini-3.7-flash,gemini-3.5-flash").split(",").map((x) => x.trim()).filter((x) => x && x !== G_MODEL)];
// vaqtinchalik xatolar: limit, server band yoki ishlamay turibdi — kutib qayta urinamiz, urinish sanalmaydi
const TRANSIENT = new Set([429, 500, 502, 503, 504, 529]);
const isTransient = (e: unknown) => TRANSIENT.has(+(e as Row)?.status) || /\b(gemini|anthropic|storage)[^:]{0,24}\b(429|50[0234]|529)\b|overloaded|UNAVAILABLE|high demand/i.test(String((e as Error)?.message || e));
const backoff = (n: number) => G_GAP * Math.min(2 ** Math.max(0, n - 1), 5);
const A_API = Deno.env.get("ANTHROPIC_API") || "https://api.anthropic.com";
const C_MODEL = Deno.env.get("DARS_MODEL") || "claude-opus-5-5";
const TG_API = Deno.env.get("TG_API") || "https://api.telegram.org";
const SITE = "https://easywords.uz/#dars";
const ORIGINS = ["https://easywords.uz", "https://www.easywords.uz", "https://aliumirovux.github.io", "http://localhost:8766"];

const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status = 200, o: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), "Content-Type": "application/json; charset=utf-8" } });
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
// fon ishi: Supabase'da EdgeRuntime.waitUntil, lokal testda oddiy promise
const bg = (p: Promise<unknown>) => { const E = (globalThis as Record<string, any>).EdgeRuntime; if (E && E.waitUntil) E.waitUntil(p); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tashkentDay = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);

type Row = Record<string, any>;

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`db ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
// bekor qilingan qatorni ishlovchi qayta yozmasin: oddiy patch «cancelled» qatorni o'zgartirmaydi; any = true — faqat cancel/retry/o'chirish uchun
const patch = (id: string, v: Row, any = false) => db(`class_lessons?id=eq.${id}${any ? "" : "&status=neq.cancelled"}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ...v, updated_at: new Date().toISOString() }) });
// natijani yozadi va qator hali bekor qilinmaganmi — shuni qaytaradi (bekor qilingan bo'lsa Telegram xabari yuborilmaydi)
const patchDone = async (id: string, v: Row) => ((await db(`class_lessons?id=eq.${id}&status=neq.cancelled&select=id`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...v, updated_at: new Date().toISOString() }) })) || []).length > 0;
async function storage(method: string, path: string, body?: BodyInit) {
  return fetch(`${SB_URL}/storage/v1/${path}`, { method, headers: { apikey: SRV, Authorization: `Bearer ${SRV}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body });
}
async function dropAudio(row: Row) {
  if (!row.audio_path) return;
  const r = await storage("DELETE", `object/${BUCKET}`, JSON.stringify({ prefixes: [row.audio_path] }));
  if (!r.ok) throw new Error(`storage delete ${r.status}`);
  await patch(row.id, { audio_path: null, audio_deleted_at: new Date().toISOString() }, true);
}

// --- foydalanuvchi: faqat egasi ---
async function who(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: ANON || SRV, Authorization: auth } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? String(u.id) : null;
}

// --- Telegram ---
const TG = () => Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
async function tgSend(html: string, button: string, url: string) {
  if (!TG()) return "no_token";
  const st = await db(`agent_settings?user_id=eq.${OWNER}&select=tg_chat_id`);
  const chat = st && st[0] && st[0].tg_chat_id; if (!chat) return "no_chat";
  const r = await fetch(`${TG_API}/bot${TG()}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: button, url }]] } }) });
  return r.ok ? "sent" : "fail";
}

// --- Gemini ---
const GK = () => Deno.env.get("GEMINI_API_KEY") || "";
const MIME: Record<string, string> = { m4a: "audio/m4a", mp4: "audio/m4a", aac: "audio/aac", mp3: "audio/mp3", wav: "audio/wav", ogg: "audio/ogg", opus: "audio/ogg", webm: "audio/webm", flac: "audio/flac" };
const extOf = (p: string) => (p.split(".").pop() || "").toLowerCase();
async function gem(path: string, init: RequestInit = {}) {
  const r = await fetch(`${G_API}${path}`, { ...init, headers: { "x-goog-api-key": GK(), ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw Object.assign(new Error(`gemini ${r.status}: ${t.slice(0, 300)}`), { status: r.status, body: t });
  return t ? JSON.parse(t) : null;
}

async function stageSend(row: Row) {
  if (!row.audio_path) throw new Error("audio yo'q");
  const a = await storage("GET", `object/${BUCKET}/${row.audio_path}`);
  if (!a.ok) throw new Error(`storage ${a.status}`);
  const buf = new Uint8Array(await a.arrayBuffer());
  const mime = MIME[extOf(row.audio_path)] || "audio/m4a";
  const st = await fetch(`${G_API}/upload/v1beta/files`, {
    method: "POST",
    headers: { "x-goog-api-key": GK(), "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(buf.length), "X-Goog-Upload-Header-Content-Type": mime, "Content-Type": "application/json" },
    body: JSON.stringify({ file: { display_name: `dars-${row.id}` } }),
  });
  const url = st.headers.get("x-goog-upload-url");
  if (!st.ok || !url) throw new Error(`gemini upload start ${st.status}: ${(await st.text()).slice(0, 200)}`);
  const up = await fetch(url, { method: "POST", headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: buf });
  const d = await up.json().catch(() => ({}));
  if (!up.ok || !d.file || !d.file.name) throw new Error(`gemini upload ${up.status}: ${JSON.stringify(d).slice(0, 200)}`);
  await patch(row.id, { gemini_file: d.file.name, gemini_uri: d.file.uri, mime, status: "transcribing", attempts: 0, waits: 0, error: null, locked_until: null });
  return "next";
}

const TX_SCHEMA = {
  type: "OBJECT",
  properties: {
    turns: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { t: { type: "STRING", description: "boshlanish vaqti MM:SS (yoki H:MM:SS)" }, s: { type: "STRING", enum: ["S", "T"] }, l: { type: "STRING", enum: ["en", "uz", "mix"], description: "gap tili" }, x: { type: "STRING" } },
        required: ["t", "s", "l", "x"],
      },
    },
  },
  required: ["turns"],
};
const mmss = (s: number) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(x).padStart(2, "0"); };
const toSec = (t: string) => String(t || "").split(":").map(Number).reduce((a, b) => a * 60 + (isFinite(b) ? b : 0), 0);

function txPrompt(from: number, to: number | null) {
  const range = !from && to == null ? "Butun yozuvni" : `Faqat ${mmss(from)} dan ${to == null ? "yozuv oxirigacha" : mmss(to) + " gacha"} bo'lgan qismni (shu oraliqda boshlangan gaplarni)`;
  return `Bu — ingliz tili darsining yozuvi. Xonada ikki kishi bor:
- T — o'qituvchi: darsni olib boradi, tushuntiradi, savol beradi, xatolarni tuzatadi. Ingliz tilida yaxshi gapiradi.
- S — o'quvchi (Ali): ingliz tilini boshlang'ich darajada (A1–A2) o'rganayotgan o'zbek. Inglizchasida xatolar bor, ba'zan o'zbekcha gapiradi.

${range} matnga o'gir va har bir gapni kim aytganini belgila.
Qoidalar:
1. O'quvchining (S) gaplarini AYNAN aytilganidek yoz, xatolari bilan. Grammatikani, so'zni, so'z tartibini TUZATMA — bu yozuvdan keyin uning xatolari va gapirish odatlari tahlil qilinadi. O'quvchining «ee», «mm», «aa» kabi to'xtalishlarini ham, boshlab tashlab qo'ygan gaplarini ham yoz («I go… I went…»). 3 soniyadan uzun jimlikni «[pauza N s]» deb yoz. O'qituvchining to'xtalishlarini yozma.
2. O'zbekcha aytilgan gaplarni o'zbek lotin yozuvida yoz (kirill emas). Ruscha bo'lsa — ruscha.
3. O'qituvchining (T) uzun tushuntirishlarini qisqartirib yozsa bo'ladi, lekin inglizcha misol gaplar, yangi so'zlar, o'quvchiga aytgan tuzatishlar va uy vazifasini aynan yoz.
4. Kitobdan yoki audiodan o'qilgan matnlar (o'quvchi yoki o'qituvchi ovoz chiqarib o'qisa) — bitta qisqa qator: «[kitobdan o'qidi: …birinchi 8 so'z…]».
5. Eshitilmagan joyni to'qima — «[eshitilmadi]» deb yoz.
6. t — gap boshlangan vaqt, yozuv boshidan hisoblanadi (MM:SS yoki H:MM:SS).
7. l — gapning tili: en (inglizcha), uz (o'zbekcha yoki ruscha), mix (aralash).
Javob faqat JSON.`;
}
async function transcribeWindow(row: Row, from: number, to: number | null, thinking: boolean): Promise<Row[]> {
  let last: unknown = null, limited = false;
  for (const model of G_MODELS) {
    try { return await transcribeWith(model, row, from, to, thinking); } catch (e) {
      const st = +(e as Row).status;
      // model topilmasa (404) yoki band/limit bo'lsa — keyingi model; boshqa xato — darhol
      if (!(isTransient(e) || st === 404)) throw e;
      if (st === 429) limited = true;
      console.error("gemini", model, st);
      last = e;
    }
  }
  throw Object.assign(last as Error, { status: limited ? 429 : +(last as Row).status || 503 });
}
async function transcribeWith(model: string, row: Row, from: number, to: number | null, thinking: boolean): Promise<Row[]> {
  const body: Row = {
    contents: [{ role: "user", parts: [{ file_data: { mime_type: row.mime, file_uri: row.gemini_uri } }, { text: txPrompt(from, to) }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: TX_SCHEMA, maxOutputTokens: 32768, ...(thinking ? { thinkingConfig: { thinkingLevel: "low" } } : {}) },
  };
  let d: Row;
  try {
    d = await gem(`/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch (e) {
    // modelda «thinkingLevel» bo'lmasa — usiz qayta
    if (thinking && (e as Row).status === 400 && /thinking/i.test(String((e as Row).body))) return transcribeWith(model, row, from, to, false);
    throw e;
  }
  const c = d.candidates && d.candidates[0];
  const text = c && c.content && (c.content.parts || []).map((p: Row) => p.text || "").join("");
  if (!text) throw new Error(`gemini bo'sh javob: ${clip(c && c.finishReason, 40)} ${clip(JSON.stringify(d.promptFeedback || ""), 120)}`);
  let o: Row;
  try { o = JSON.parse(text); } catch { throw new Error(`gemini JSON buzuq (${clip(c.finishReason, 20)})`); }
  return (Array.isArray(o.turns) ? o.turns : [])
    .filter((x: Row) => x && (x.s === "S" || x.s === "T") && clip(x.x, 2000))
    .map((x: Row) => ({ t: clip(x.t, 10), s: x.s, l: ["en", "uz", "mix"].includes(x.l) ? x.l : "en", x: clip(x.x, 2000) }))
    .filter((x: Row) => toSec(x.t) >= from - 5 && (to == null || toSec(x.t) < to + 5));
}
async function stageTranscribe(row: Row) {
  // fayl tayyor bo'lishini kutamiz (odatda bir necha soniya)
  let f: Row = {};
  for (let i = 0; i < 8; i++) {
    f = await gem(`/v1beta/${row.gemini_file}`);
    if (f.state === "ACTIVE") break;
    if (f.state === "FAILED") throw new Error("gemini fayl FAILED");
    await sleep(4000);
  }
  if (f.state !== "ACTIVE") return { wait: 15e3 };
  const dur = row.duration_s || Math.round((row.audio_bytes || 0) / 8000);
  const split = (win: number) => { const n = Math.max(1, Math.ceil(dur / win)); return Array.from({ length: n }, (_, i) => [Math.round(i * dur / n), i === n - 1 ? null : Math.round((i + 1) * dur / n)] as [number, number | null]); };
  let res: Row[][];
  if (G_PARALLEL) {
    // pullik rejim: bo'laklar parallel (har biri 150 s ichida tugashi uchun); qayta urinishda bo'laklar kichrayadi
    res = await Promise.all(split((row.attempts > 1 ? 20 : 40) * 60).map(([a, b]) => transcribeWindow(row, a, b, true)));
  } else {
    // bepul rejim: har chaqiruvda bitta bo'lak, oraliq natija transcript.pending da saqlanadi
    const pend: Row = row.transcript && row.transcript.pending ? row.transcript : { pending: true, parts: [], waits: 0, last: 0 };
    const parts = split(G_WIN_FREE);
    const since = Date.now() - (pend.last || 0);
    if (since < G_GAP) return { wait: G_GAP - since };
    const i = parts.findIndex((_, k) => !pend.parts[k]);
    if (i >= 0) {
      try {
        pend.parts[i] = await transcribeWindow(row, parts[i][0], parts[i][1], true);
        pend.waits = 0;
      } catch (e) {
        if (!isTransient(e)) throw e;
        // limit yoki server band: kutib qayta (1, 2, 4, 5, 5… daqiqa); juda uzoq cho'zilsa — to'xtaymiz
        const lim = +(e as Row).status === 429;
        pend.waits = (pend.waits || 0) + 1;
        if (pend.waits > G_MAX_WAITS) throw Object.assign(new Error(lim ? "Gemini bepul limiti tugadi (kunlik 20 so'rov) — ertaga «Qayta urinish»" : "Gemini serverlari uzoq vaqt band — keyinroq «Qayta urinish»"), { final: true });
        pend.last = Date.now();
        await patch(row.id, { transcript: pend, error: lim ? "kutilmoqda: Gemini limiti" : "kutilmoqda: Gemini band" });
        return { wait: backoff(pend.waits) };
      }
      pend.last = Date.now();
      if (parts.some((_, k) => !pend.parts[k])) { await patch(row.id, { transcript: pend, attempts: 0, waits: 0, error: null }); return { wait: G_GAP }; }
    }
    res = pend.parts;
  }
  const turns = res.flat();
  // bo'laklar chegarasidagi takrorlarni olib tashlaymiz
  const seen = new Set<string>(), out: Row[] = [];
  for (const x of turns.sort((p, q) => toSec(p.t) - toSec(q.t))) { const k = x.s + "|" + x.x.toLowerCase().slice(0, 80); if (seen.has(k)) continue; seen.add(k); out.push(x); }
  if (out.filter((x) => x.s === "S").length < 3) throw new Error("yozuvda o'quvchi gaplari topilmadi");
  await patch(row.id, { transcript: { turns: out, model: G_MODELS.join("|"), parts: res.length }, status: "analyzing", attempts: 0, waits: 0, error: null, locked_until: null });
  // audio endi kerak emas: Gemini'dagi nusxa va bucket'dagi fayl o'chiriladi
  try { await gem(`/v1beta/${row.gemini_file}`, { method: "DELETE" }); } catch (e) { console.error("gemini delete", e); }
  await patch(row.id, { gemini_file: null, gemini_uri: null });
  await dropAudio(row);
  return "next";
}

// --- Claude ---
const SYS = `Sen ingliz tilini o'rganayotgan o'zbek kattalar uchun aniq va mehribon o'qituvchisan. O'quvchi — Ali, darajasi A1–A2 (Navigate Beginner), Inter Nation o'quv markazida o'qituvchi bilan yakkama-yakka o'qiydi.
Qoidalar:
- Izohlar faqat o'zbek tilida, faqat lotin yozuvida. O'quvchiga «siz» deb murojaat qil.
- Grammatik atamalardan qoch (Past Simple, auxiliary, article kabi so'zlarni ishlatma). O'rniga oddiy so'zlar: «o'tgan ish haqida», «savolda», «bitta narsa bo'lsa — a». Shakl o'zgarishini strelka bilan ko'rsat: go → went.
- Qisqa yoz: izoh 1–2 qisqa gap.
- Yozuv avtomatik matnga o'girilgan: unda o'girish xatolari bo'lishi mumkin. Shubhali joyni xato deb hisoblama.
- Javobni FAQAT JSON obyekt qilib qaytar, boshqa matn qo'shma.`;

function txText(row: Row) {
  return (row.transcript.turns as Row[]).map((x) => `[${x.t}] ${x.s === "S" ? "Ali" : "O'qituvchi"}${x.l && x.l !== "en" ? " (" + x.l + ")" : ""}: ${x.x}`).join("\n").slice(0, 160000);
}
function promptMistakes(row: Row, ctx: string) {
  return `${ctx}Quyida darsning matni. Alining gaplaridagi xatolarni top.

<dars>
${txText(row)}
</dars>

Nimani xato deb olasan:
- Alining inglizcha gapidagi aniq xato: fe'l shakli, so'z tartibi, kerakli so'z tushib qolgani (a/the, is/are, do/does, predlog), noto'g'ri so'z.
- Ali o'zbekcha aytgan gap, agar uni inglizcha aytishi kerak bo'lgan bo'lsa (o'qituvchiga javob, savol, fikr) — kind: "uz", you: o'zbekcha gap, fix: shu fikrning oddiy inglizchasi.
Nimani olmaysan: «ee/mm», boshlab qo'yib tashlangan gap, o'zi darhol tuzatgan xato, o'girishdagi shubhali joy, talaffuz (faqat o'qituvchi talaffuzni aniq tuzatgan bo'lsa — kind: "say").

JSON shakli:
{
  "rules": [{"key": "qisqa nom, masalan: O'tgan ishda fe'l", "title": "qalin qism, masalan: O'tgan ish haqida fe'l o'zgaradi:", "text": "1–2 gap izoh", "ex": "go → went, lose → lost", "count": son, "topic": "${TOPICS.join(" | ")}"}],
  "mistakes": [{"t": "MM:SS", "kind": "gram" | "word" | "uz" | "say", "rule": "rules[].key dan biri", "you": "Ali aytgani, aynan", "fix": "to'g'risi — Alining gapiga eng kam o'zgartirish bilan, tabiiy inglizcha", "why": "1–2 gap, o'zbekcha", "teacher": true agar o'qituvchi darsda tuzatgan bo'lsa}]
}
- topic: qoidaning turi — uz (inglizcha aytishi kerak bo'lgan gapni o'zbekcha aytdi), be-ing (am/is/are + -ing), wh-q (so'roq so'zli savol), past (o'tgan zamon fe'li), art (a/an/the), prep (in/on/at va boshqa predloglar), be (am/is/are tushib qolishi), do (do/does savol va inkor), s3 (he/she dan keyin -s), plural (ko'plik), pron (he/she/it), order (so'z tartibi), word (noto'g'ri so'z), say (talaffuz), other (boshqasi).
- rules: eng ko'p takrorlangan qoida birinchi; count — darsdagi shu xatolarning hammasi (kartaga chiqmaganlari ham).
- mistakes: eng foydalilari, ko'pi bilan 14 ta; tartib: eng ko'p takrorlangan qoidaning xatolari birinchi, keyin vaqt bo'yicha. Bir xil xatoni ikki marta karta qilma.
- fix faqat bitta gap; yangi ma'no qo'shma. Xato bo'lmasa: {"rules": [], "mistakes": []}.`;
}
function promptContent(row: Row, ctx: string, imgs: Row[] = []): string | Row[] {
  const text = promptContentText(row, ctx, imgs.length);
  if (!imgs.length) return text;
  // rasmlar avval, har biri olingan vaqti bilan
  return [...imgs.flatMap((im, i) => [{ type: "text", text: `Doska rasmi ${i + 1}${im.t != null ? ` (darsning ${mmss(im.t)} da olingan)` : ""}:` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: im.data } }]), { type: "text", text }];
}
function promptContentText(row: Row, ctx: string, nImg: number) {
  const mk = (Array.isArray(row.marks) ? row.marks : []) as number[];
  const marks = mk.length ? `\nAli dars paytida shu daqiqalarda «Muhim» tugmasini bosgan: ${mk.map(mmss).join(", ")}. Har biri uchun shu vaqtdan taxminan 1 daqiqa oldin va keyin o'qituvchi nimani tushuntirganini "marked" ga yoz.\n` : "";
  const board = nImg ? `\nYuqorida o'qituvchi doskaga yozganlarining ${nImg} ta rasmi bor. Ularni o'qi: "board" ga yoz, yangi so'zlar va qoidalarni "words"/"phrases" ga ham qo'sh. Rasmda o'qib bo'lmaydigan joyni to'qima.\n` : "";
  return `${ctx}Quyida darsning matni. Darsda nima o'tilganini Ali uchun qisqa yozib ber.${marks}${board}

<dars>
${txText(row)}
</dars>

JSON shakli:
{
  "unit": "darslikdagi unit, masalan «Unit 9», aniq bo'lmasa null",
  "summary": "2–3 gap: darsda nima qilindi",
  "topics": ["mavzu", …] (ko'pi bilan 5),
  "words": [{"en": "so'z yoki ibora", "uz": "tarjima"}] — o'qituvchi tushuntirgan yangi so'zlar, ko'pi bilan 16,
  "phrases": [{"en": "darsdagi foydali gap", "uz": "tarjima"}] — ko'pi bilan 6,
  "tips": ["o'qituvchining maslahati yoki eslatmasi, o'zbekcha"] — ko'pi bilan 4,
  "homework": "uy vazifasi (bet, mashq) yoki null",
  "board": [{"photo": rasm raqami, "text": "doskada yozilgani — aynan, inglizcha qismi o'zgarmasin", "uz": "bu nima: 1 gap, o'zbekcha"}] — rasm bo'lmasa [],
  "marked": [{"t": "MM:SS", "note": "o'sha joyda o'qituvchi nimani tushuntirdi — 1–2 gap, o'zbekcha; inglizcha misol bo'lsa «» ichida"}] — faqat belgilangan joylar bo'lsa, aks holda []
}
Faqat darsda bor narsani yoz, to'qima.`;
}
function promptCoach(row: Row, ctx: string, dur: number) {
  return `${ctx}Quyida darsning matni (dars ${mmss(dur)} davom etgan). Sen Alining gapirish murabbiyisan: grammatikaga emas, QANDAY gapirganiga qara.
Ali o'zi aytgan muammo: dars paytida mavzudan boshqa narsalarni gapirib ketadi va gapirganda tili aylanmay qoladi. Unga hammasini tushuntirib, nima qilsa yaxshilanishini ayt.
Belgilar: (uz) — o'zbekcha gap, (mix) — aralash; «[pauza N s]» — jimlik; «ee», «mm» — to'xtalish.

<dars>
${txText(row)}
</dars>

JSON shakli:
{
  "off": [{"from": "MM:SS", "to": "MM:SS", "about": "nima haqida, 2–5 so'z", "lang": "en" | "uz" | "mix", "by": "S" | "T", "before": "chetga chiqishdan oldin nima bo'ldi, 1 gap (masalan: o'qituvchi «ago» bilan gap so'radi, Ali 2 marta to'xtab qoldi)", "useful": true agar inglizcha erkin suhbat bo'lib, gapirish mashqi bo'lgan bo'lsa, "why": "ehtimoliy sabab — faqat matndagi dalil bilan, 1 gap", "tip": "keyingi safar nima qilish, 1 gap"}],
  "stuck": [{"t": "MM:SS", "kind": "pause" | "uz" | "drop" | "filler", "q": "shu joydan oldin o'qituvchi bergan savol yoki aytgan gap, aynan, inglizcha (bo'lmasa null)", "gap": jim qolgan soniyalar (matndagi «[pauza N s]» bo'yicha, bo'lmasa 0), "you": "Ali aytgan (yoki aytmoqchi bo'lgan) gap, aynan", "en": "shuni oddiy inglizcha qanday aytsa bo'lardi"}],
  "patterns": ["takrorlangan odat — dalil soni bilan, masalan: 3 ta chetga chiqishning 2 tasi qiyin savoldan keyin boshlandi"],
  "rescue": ["gapni to'xtatmay davom ettirish uchun 3 ta qisqa inglizcha ibora, Alining aynan shu darsdagi holatlariga mos"],
  "plan": {"class": ["keyingi darsda qiladigan 2–3 aniq ish"], "home": ["uyda har kuni 5–10 daqiqalik 2 ta mashq, daqiqasi bilan"]},
  "good": "darsdagi eng yaxshi gapirish lahzasi, 1 gap, vaqti bilan"
}
Qoidalar:
- off: dars mavzusidan (darslik, mashq, o'qituvchi rejasi) tashqaridagi 1 daqiqadan uzun suhbatlar. Mavzu ichidagi qisqa savollar emas. Bo'lmasa [].
- Inglizcha erkin suhbat ham mashq: uni ayblama, useful: true.
- why: Alining fikrini o'qima, faqat matnda ko'ringanini ayt («ehtimol …»). Dalil bo'lmasa — null.
- stuck: eng muhim 6 tagacha joy. Ali bu joylarni uyda ovoz chiqarib qayta mashq qiladi: q — o'qituvchining o'sha savoli, en — A1–A2 darajadagi qisqa, aytish oson javob (12 so'zdan oshmasin).
- patterns: 1–3 ta. Hech biri dangasalik yoki xarakter haqida emas — faqat holat va natija.
- Hamma o'zbekcha matn lotin yozuvida, «siz» bilan, grammatik atamalarsiz.`;
}
// gapirish raqamlari: kod hisoblaydi (AI taxmini emas)
const FILL = /\b(e+|ee+|mm+|uh+|um+|eh+|aa+|hmm+)\b/gi;
function speechMetrics(turns: Row[]) {
  const words = (x: string) => x.replace(/\[[^\]]*\]/g, " ").replace(FILL, " ").split(/\s+/).filter((w) => /[A-Za-z'ʻʼ]/.test(w)).length;
  let sw = 0, tw = 0, en = 0, fill = 0, pauses = 0, ans = 0, ansW = 0, talk = 0;
  // siz gapirgan vaqt: har bir S gapining boshidan keyingi gapgacha (ko'pi bilan 60 s)
  turns.forEach((x, i) => { if (x.s === "S" && turns[i + 1]) talk += Math.max(0, Math.min(60, toSec(turns[i + 1].t) - toSec(x.t))); });
  for (const x of turns) {
    const n = words(x.x);
    if (x.s === "S") {
      sw += n; en += x.l === "en" ? n : x.l === "mix" ? n / 2 : 0;
      fill += (x.x.match(FILL) || []).length; pauses += (x.x.match(/\[pauza\s*\d+/gi) || []).length;
      if (x.l !== "uz" && n > 0) { ans++; ansW += n; }
    } else tw += n;
  }
  return { share: sw + tw ? Math.round(sw / (sw + tw) * 100) : 0, en: sw ? Math.round(en / sw * 100) : 0, avg: ans ? Math.round(ansW / ans * 10) / 10 : 0, stops: fill + pauses, words: sw, talk_s: Math.round(talk) };
}
function b64(buf: Uint8Array) {
  let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
async function boardImages(row: Row) {
  const out: Row[] = [];
  for (const p of (Array.isArray(row.photos) ? row.photos : []).slice(0, MAX_PHOTOS) as Row[]) {
    try {
      const r = await storage("GET", `object/${PHOTOS}/${p.path}`);
      if (!r.ok) continue;
      out.push({ t: p.t, data: b64(new Uint8Array(await r.arrayBuffer())) });
    } catch (e) { console.error("photo", e); }
  }
  return out;
}
async function claude(prompt: string | Row[], maxTokens: number, effort: string) {
  const r = await fetch(`${A_API}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: C_MODEL, max_tokens: maxTokens, output_config: { effort }, system: SYS, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const text = (d.content || []).filter((c: Row) => c.type === "text").map((c: Row) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : text); } catch { throw new Error(`claude JSON buzuq (${d.stop_reason})`); }
}
const TOPICS = ["uz", "be-ing", "wh-q", "past", "art", "prep", "be", "do", "s3", "plural", "pron", "order", "word", "say", "other"];
const CYR = /[Ѐ-ӿ]/;
const uzOk = (s: string) => !!s && !CYR.test(s);
function clean(A: Row, B: Row, row: Row) {
  const rules = (Array.isArray(A.rules) ? A.rules : []).map((r: Row) => ({ key: clip(r.key, 60), title: clip(r.title, 120), text: clip(r.text, 300), ex: clip(r.ex, 120), count: Math.max(1, Math.min(99, +r.count || 1)), topic: TOPICS.includes(r.topic) ? r.topic : "other" }))
    .filter((r: Row) => r.key && uzOk(r.title + r.text)).slice(0, 8);
  const keys = new Set(rules.map((r: Row) => r.key));
  const mistakes = (Array.isArray(A.mistakes) ? A.mistakes : []).map((m: Row) => ({
    t: clip(m.t, 10), kind: ["gram", "word", "uz", "say"].includes(m.kind) ? m.kind : "gram", rule: keys.has(clip(m.rule, 60)) ? clip(m.rule, 60) : "",
    you: clip(m.you, 300), fix: clip(m.fix, 300), why: clip(m.why, 300), teacher: m.teacher === true,
  })).filter((m: Row) => m.you && m.fix && m.fix !== m.you && uzOk(m.why) && !CYR.test(m.fix)).slice(0, 14);
  rules.sort((a: Row, b: Row) => b.count - a.count);
  const total = Math.max(mistakes.length, rules.reduce((a: number, r: Row) => a + r.count, 0));
  const top = rules[0];
  const headline = !mistakes.length ? "Xato topilmadi" : top && top.count >= 3 && rules.length > 1 ? `${total} ta xato, ${top.count} tasi bitta qoidada` : `${total} ta xato`;
  const pairs = (v: unknown, n: number) => (Array.isArray(v) ? v : []).map((x: Row) => ({ en: clip(x && x.en, 120), uz: clip(x && x.uz, 160) })).filter((x) => x.en && uzOk(x.uz)).slice(0, n);
  const strs = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v : []).map((x) => clip(x, len)).filter(uzOk).slice(0, n);
  const said = (row.transcript.turns as Row[]).filter((x) => x.s === "S" && (x.x.match(/[A-Za-z]{2,}/g) || []).length >= 3).length;
  return {
    headline, total, said, rules, mistakes,
    content: {
      unit: B.unit ? clip(B.unit, 30) : null, summary: uzOk(clip(B.summary, 500)) ? clip(B.summary, 500) : "",
      topics: strs(B.topics, 5, 80), words: pairs(B.words, 16), phrases: pairs(B.phrases, 6), tips: strs(B.tips, 4, 200),
      homework: B.homework && uzOk(clip(B.homework, 200)) ? clip(B.homework, 200) : null,
      board: (Array.isArray(B.board) ? B.board : []).map((x: Row) => ({ photo: Math.max(1, Math.round(+x.photo || 1)), text: clip(x && x.text, 500), uz: clip(x && x.uz, 300) })).filter((x: Row) => x.text && uzOk(x.uz)).slice(0, 16),
      marked: (Array.isArray(B.marked) ? B.marked : []).map((x: Row) => ({ t: clip(x && x.t, 10), note: clip(x && x.note, 400) })).filter((x: Row) => x.t && uzOk(x.note)).slice(0, 50),
    },
    model: C_MODEL, at: new Date().toISOString(),
  };
}
function cleanSpeech(C: Row, m: Row, prev: Row | null, dur: number) {
  const tm = (t: unknown) => { const v = clip(t, 10); return /^\d{1,2}(:\d{2}){1,2}$/.test(v) ? v : ""; };
  const off = (Array.isArray(C.off) ? C.off : []).map((o: Row) => ({
    from: tm(o.from), to: tm(o.to), about: clip(o.about, 60), lang: ["en", "uz", "mix"].includes(o.lang) ? o.lang : "uz", by: o.by === "T" ? "T" : "S",
    before: clip(o.before, 240), useful: o.useful === true, why: o.why ? clip(o.why, 240) : "", tip: clip(o.tip, 240),
  })).filter((o: Row) => o.from && o.to && toSec(o.to) > toSec(o.from) && o.about && uzOk(o.about + o.before + o.why + o.tip)).sort((a: Row, b: Row) => toSec(a.from) - toSec(b.from)).slice(0, 8);
  const stuck = (Array.isArray(C.stuck) ? C.stuck : []).map((x: Row) => ({ t: tm(x.t), kind: ["pause", "uz", "drop", "filler"].includes(x.kind) ? x.kind : "pause", q: x.q && !CYR.test(String(x.q)) ? clip(x.q, 200) : "", gap: Math.max(0, Math.min(120, Math.round(+x.gap || 0))), you: clip(x.you, 240), en: clip(x.en, 240) }))
    .filter((x: Row) => x.t && x.you && x.en && !CYR.test(x.you + x.en)).slice(0, 6);
  const strs = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v : []).map((x) => clip(x, len)).filter((x) => x && !CYR.test(x)).slice(0, n);
  const P = C.plan || {};
  m.off_min = Math.round(off.reduce((a: number, o: Row) => a + (toSec(o.to) - toSec(o.from)), 0) / 60);
  return { metrics: m, prev, dur, off, stuck, patterns: strs(C.patterns, 3, 240), rescue: strs(C.rescue, 3, 60), plan: { class: strs(P.class, 3, 200), home: strs(P.home, 2, 200) }, good: uzOk(clip(C.good, 240)) ? clip(C.good, 240) : "" };
}
async function courseCtx(row: Row) {
  try {
    const p = await db(`progress?user_id=eq.${row.user_id}&select=state->course,state->level`);
    if (p && p[0] && p[0].course) return `Ali hozir kursda: Unit ${p[0].course}${p[0].level ? " (" + p[0].level + ")" : ""}.\n`;
  } catch (e) { console.error("ctx", e); }
  return "";
}

// --- yozuvsiz dars: faqat doska rasmlari ---
function promptBoard(ctx: string, imgs: Row[]): Row[] {
  const text = `${ctx}Yuqorida o'qituvchi darsda doskaga yozganlarining ${imgs.length} ta rasmi bor (Inter Nation, yakkama-yakka dars). Dars ovozi yozilmagan — faqat shu rasmlar bor.
Rasmlarni o'qi va Ali uchun darsning qisqa konspektini yoz.

JSON shakli:
{
  "headline": "darsning mavzusi, 2–5 so'z, masalan «Sanalar va was / were»",
  "unit": "darslikdagi unit, masalan «Unit 8», aniq bo'lmasa null",
  "summary": "1–2 gap: doskaga qarab darsda nima o'tilgan",
  "board": [{"photo": rasm raqami, "text": "doskada yozilgani — aynan, inglizcha qismi o'zgarmasin", "uz": "bu nima: 1 gap, o'zbekcha"}],
  "words": [{"en": "so'z yoki qisqa ibora — to'g'ri yozilishi", "uz": "tarjima", "photo": rasm raqami, "seen": "doskada boshqacha (xato) yozilgan bo'lsa — o'sha yozuv, aks holda null", "sure": true agar aniq o'qilgan bo'lsa}],
  "phrases": [{"en": "doskadagi foydali gap", "uz": "tarjima"}],
  "rules": [{"key": "qisqa nom", "title": "qalin qism, masalan: Sanadan oldin «on»:", "text": "1–2 gap izoh", "ex": "on the 10th of November"}],
  "homework": "uy vazifasi (bet, mashq) yoki null",
  "unread": [o'qib bo'lmagan rasm raqamlari]
}
Qoidalar:
- Faqat rasmda bor narsani yoz. O'qib bo'lmagan joyni to'qima: so'z yarim o'qilsa — sure: false; butun rasm o'qilmasa — unread ga qo'sh.
- words: Ali uchun yangi bo'lishi mumkin bo'lgan so'zlar, ko'pi bilan 16. Juda oddiy so'zlarni (I, is, the, and) qo'shma.
- rules: doskadagi qoida yoki qoliplar, ko'pi bilan 4. Ertangi repetitor darsida takrorlanadi.
- phrases: ko'pi bilan 6.`;
  return [...imgs.flatMap((im, i) => [{ type: "text", text: `Doska rasmi ${i + 1}:` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: im.data } }]), { type: "text", text }];
}
function cleanBoard(B: Row, n: number) {
  const ph = (v: unknown) => Math.max(1, Math.min(n, Math.round(+(v as number) || 1)));
  const pairs = (v: unknown, k: number) => (Array.isArray(v) ? v : []).map((x: Row) => ({ en: clip(x && x.en, 120), uz: clip(x && x.uz, 160) })).filter((x) => x.en && uzOk(x.uz) && !CYR.test(x.en)).slice(0, k);
  const seenW = new Set<string>();
  const words = (Array.isArray(B.words) ? B.words : []).map((x: Row) => ({ en: clip(x && x.en, 80), uz: clip(x && x.uz, 120), photo: ph(x && x.photo), seen: x && x.seen && clip(x.seen, 80) !== clip(x.en, 80) ? clip(x.seen, 80) : null, sure: !(x && x.sure === false) }))
    .filter((x: Row) => x.en && uzOk(x.uz) && !CYR.test(x.en) && !seenW.has(x.en.toLowerCase()) && seenW.add(x.en.toLowerCase())).slice(0, 16);
  const rules = (Array.isArray(B.rules) ? B.rules : []).map((r: Row) => ({ key: clip(r.key, 60), title: clip(r.title, 120), text: clip(r.text, 300), ex: clip(r.ex, 120), count: 1 }))
    .filter((r: Row) => r.key && r.title && uzOk(r.title + r.text)).slice(0, 4);
  const board = (Array.isArray(B.board) ? B.board : []).map((x: Row) => ({ photo: ph(x && x.photo), text: clip(x && x.text, 500), uz: clip(x && x.uz, 300) })).filter((x: Row) => x.text && uzOk(x.uz)).slice(0, 16);
  const unread = [...new Set((Array.isArray(B.unread) ? B.unread : []).map(ph))].sort((a, b) => a - b);
  const headline = clip(B.headline, 60);
  return {
    kind: "photo", headline: headline && !CYR.test(headline) ? headline : "Doskadan konspekt", total: 0, said: 0, rules, mistakes: [], unread,
    content: {
      unit: B.unit ? clip(B.unit, 30) : null, summary: uzOk(clip(B.summary, 400)) ? clip(B.summary, 400) : "",
      topics: [], words, phrases: pairs(B.phrases, 6), tips: [],
      homework: B.homework && uzOk(clip(B.homework, 200)) ? clip(B.homework, 200) : null, board, marked: [],
    },
    model: C_MODEL, at: new Date().toISOString(),
  };
}
async function stagePhotos(row: Row) {
  const imgs = await boardImages(row);
  if (!imgs.length) throw Object.assign(new Error("rasmlar topilmadi"), { final: true });
  const B = await claude(promptBoard(await courseCtx(row), imgs), 6000, row.attempts > 1 ? "low" : "medium");
  const an = cleanBoard(B, imgs.length);
  if (!an.content.board.length && !an.content.words.length) throw Object.assign(new Error("rasmda yozuv topilmadi"), { final: true });
  if (!await patchDone(row.id, { analysis: an, status: "done", done_at: new Date().toISOString(), attempts: 0, waits: 0, error: null, locked_until: null })) return "done";
  const w = an.content.words.length, r = an.rules.length;
  const line = [w ? `${w} ta so'z` : "", r ? `${r} ta qoida` : "", an.unread.length ? `${an.unread.length} ta rasm o'qilmadi` : ""].filter(Boolean).join(" · ");
  try { await tgSend(`<b>Doskadan konspekt tayyor: ${esc(an.headline)}</b>\n${esc(line)}\nQaysi so'zlar qo'shilishini saytda tasdiqlang.`, "Tasdiqlash", `${SITE}-${row.id}`); } catch (e) { console.error("tg", e); }
  return "done";
}

async function stageAnalyze(row: Row) {
  const ctx = await courseCtx(row);
  // qayta urinishda tezroq (150 s chegarasi uchun)
  const effort = row.attempts > 1 ? "low" : "medium";
  const turns = row.transcript.turns as Row[];
  const dur = row.duration_s || (turns.length ? toSec(turns[turns.length - 1].t) + 30 : 0);
  const imgs = await boardImages(row);
  const [A, B, C] = await Promise.all([claude(promptMistakes(row, ctx), 9000, effort), claude(promptContent(row, ctx, imgs), 5000, effort), claude(promptCoach(row, ctx, dur), 6000, effort)]);
  const an: Row = clean(A, B, row);
  let prev = null;
  try {
    const p = await db(`class_lessons?user_id=eq.${row.user_id}&status=eq.done&id=neq.${row.id}&select=analysis->speech->metrics&order=created_at.desc&limit=1`);
    prev = p && p[0] && p[0].metrics || null;
  } catch (e) { console.error("prev", e); }
  an.speech = cleanSpeech(C, speechMetrics(turns), prev, dur);
  if (!await patchDone(row.id, { analysis: an, status: "done", done_at: new Date().toISOString(), attempts: 0, waits: 0, error: null, locked_until: null })) return "done";
  const top = an.rules[0];
  const mins = Math.max(3, Math.round(an.mistakes.length * 0.6));
  const sm = an.speech.metrics;
  const line = (an.mistakes.length ? (top ? `${top.title} ${top.ex}`.trim() : "") + `\nTuzatish ~${mins} daqiqa.` : an.content.summary) +
    `\nGapirish: inglizcha ${sm.en}%${sm.off_min ? ` · ${sm.off_min} daqiqa mavzudan chetda` : ""}.`;
  try { await tgSend(`<b>Dars tahlili tayyor: ${esc(an.headline)}</b>\n${esc(line)}`, "Ochish", `${SITE}-${row.id}`); } catch (e) { console.error("tg", e); }
  return "done";
}

// --- ishlovchi ---
async function fail(row: Row, e: unknown) {
  const msg = clip(String((e as Error)?.message || e), 300);
  console.error("dars", row.id, row.status, msg);
  // vaqtinchalik (server band, limit): urinish sanalmaydi, kutib qayta — MAX_WAITS gacha
  if (!(e as Row)?.final && isTransient(e) && (row.waits || 0) < MAX_WAITS) {
    const w = (row.waits || 0) + 1;
    await patch(row.id, { attempts: Math.max(0, row.attempts - 1), waits: w, error: `kutilmoqda: ${msg}`, locked_until: new Date(Date.now() + backoff(w)).toISOString() });
    return;
  }
  if (row.attempts >= MAX_TRIES || (e as Row)?.final) {
    if (!await patchDone(row.id, { status: "error", error: `${row.status}: ${msg}`, locked_until: null })) return;
    const m = String(msg);
    const why = row.kind === "photo" ? (/yozuv topilmadi|rasmlar topilmadi/.test(m) ? "Rasmlarda yozuv o'qilmadi — juda xira yoki yaltiroq. Saytda qayta suratga oling." : "Rasmlarni o'qishda xato. Saytda «Qayta urinish» bor.")
      : /bepul limiti/.test(m) ? "Gemini'ning bugungi bepul limiti tugadi. Yozuv saqlanib turibdi — ertaga saytda «Qayta urinish»ni bosing."
      : /uzoq vaqt band/.test(m) || isTransient(e) ? "Gemini serverlari uzoq vaqt band bo'ldi (bu Google tomonida). Yozuv saqlanib turibdi — keyinroq saytda «Qayta urinish»ni bosing."
      : `${stageName(row.status)} bosqichida xato. Saytda «Qayta urinish» bor.`;
    try { await tgSend(`<b>Dars tahlili chiqmadi</b>\n${esc(why)}`, "Ochish", `${SITE}-${row.id}`); } catch { /* */ }
  } else {
    await patch(row.id, { error: msg, locked_until: new Date(Date.now() + 30e3 * row.attempts).toISOString() });
  }
}
const stageName = (s: string) => ({ queued: "Yuborish", transcribing: "Matnga o'girish", analyzing: "Tahlil" }[s] || s);
const kick = () => fetch(`${SB_URL}/functions/v1/dars/tick`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.body?.cancel()).catch(() => {});

async function work() {
  const got = await db("rpc/dars_claim", { method: "POST", body: "{}" });
  const row = got && got[0];
  if (!row) return cleanup();
  if (!GK() && row.status !== "analyzing" && row.kind !== "photo") return fail({ ...row, attempts: MAX_TRIES }, new Error("GEMINI_API_KEY kiritilmagan"));
  let r: string | Row = "";
  try {
    r = row.kind === "photo" ? await stagePhotos(row) : row.status === "queued" ? await stageSend(row) : row.status === "transcribing" ? await stageTranscribe(row) : await stageAnalyze(row);
  } catch (e) { return fail(row, e); }
  if (r && typeof r === "object") await patch(row.id, { attempts: Math.max(0, row.attempts - 1), locked_until: new Date(Date.now() + r.wait).toISOString() });
  if (r === "next") await kick();
}
// 3 kundan eski, ishlanmay qolgan audio (masalan, xato bilan to'xtagan) o'chiriladi
async function cleanup() {
  const old = await db(`class_lessons?audio_path=not.is.null&created_at=lt.${new Date(Date.now() - 3 * 864e5).toISOString()}&select=id,audio_path,status&limit=5`);
  for (const row of old || []) { try { await dropAudio(row); if (row.status === "uploading") await patch(row.id, { status: "error", error: "yuklash tugamadi" }); } catch (e) { console.error("cleanup", e); } }
}

Deno.serve(async (req) => {
  const o = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
  if (req.method !== "POST") return json({ error: "method" }, 405, o);
  const p = new URL(req.url).pathname.replace(/\/+$/, "").split("/").pop();
  try {
    if (p === "tick") {
      bg(work().catch((e) => console.error("tick", e)));
      return json({ ok: true }, 202, o);
    }
    const uid = await who(req);
    if (!uid) return json({ error: "auth" }, 401, o);
    if (uid !== OWNER) return json({ error: "not_allowed" }, 403, o);
    const b = await req.json().catch(() => ({}));
    if (p === "new" && b.photo === true) {
      // yozuvsiz dars: faqat doska rasmlari (sayt «<uid>/<id>/N.jpg» ga yuklaydi, keyin /start)
      const today = await db(`class_lessons?user_id=eq.${uid}&day=eq.${tashkentDay()}&status=neq.uploading&select=id`);
      if ((today || []).length >= PER_DAY) return json({ error: "limit", per_day: PER_DAY }, 429, o);
      const ins = await db("class_lessons", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: uid, status: "uploading", kind: "photo" }) });
      return json({ id: ins[0].id, bucket: PHOTOS, prefix: `${uid}/${ins[0].id}` }, 200, o);
    }
    if (p === "new") {
      const bytes = Math.round(+b.bytes || 0), ext = String(b.ext || "").toLowerCase();
      if (!MIME[ext]) return json({ error: "format", detail: "m4a, mp3, wav, aac, ogg, webm yoki flac" }, 422, o);
      if (!(bytes > 0) || bytes > MAX_BYTES) return json({ error: "size", max: MAX_BYTES }, 413, o);
      const today = await db(`class_lessons?user_id=eq.${uid}&day=eq.${tashkentDay()}&status=neq.uploading&select=id`);
      if ((today || []).length >= PER_DAY) return json({ error: "limit", per_day: PER_DAY }, 429, o);
      const dur = Math.round(+b.duration_s || 0);
      const marks = (Array.isArray(b.marks) ? b.marks : []).map((x: unknown) => Math.round(+(x as number))).filter((x: number) => x >= 0 && x < 6 * 3600).slice(0, 50);
      const ins = await db("class_lessons", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: uid, status: "uploading", audio_bytes: bytes, duration_s: dur > 0 && dur < 6 * 3600 ? dur : null, marks }) });
      const id = ins[0].id, path = `${uid}/${id}.${ext}`;
      await patch(id, { audio_path: path });
      return json({ id, bucket: BUCKET, path }, 200, o);
    }
    const id = String(b.id || "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "id" }, 400, o);
    const rows = await db(`class_lessons?id=eq.${id}&user_id=eq.${uid}&select=id,status,kind,audio_path,transcript,gemini_file,photos`);
    const row = rows && rows[0]; if (!row) return json({ error: "not_found" }, 404, o);
    if (p === "start") {
      if (row.status !== "uploading") return json({ ok: true, status: row.status }, 200, o);
      if (row.kind === "photo") {
        const lp = await storage("POST", `object/list/${PHOTOS}`, JSON.stringify({ prefix: `${uid}/${id}`, limit: 50 }));
        const have = new Set(lp.ok ? (await lp.json()).map((x: Row) => `${uid}/${id}/${x.name}`) : []);
        const photos = (Array.isArray(b.photos) ? b.photos as Row[] : []).map((x) => String(x && x.path || "")).filter((x) => have.has(x)).slice(0, MAX_PHOTOS).map((path) => ({ path, t: null }));
        if (!photos.length) return json({ error: "not_uploaded" }, 409, o);
        await patch(id, { status: "analyzing", attempts: 0, waits: 0, error: null, locked_until: null, photos });
        bg(kick());
        return json({ ok: true, status: "analyzing" }, 200, o);
      }
      const name = String(row.audio_path).split("/").pop();
      const ls = await storage("POST", `object/list/${BUCKET}`, JSON.stringify({ prefix: uid, search: name, limit: 2 }));
      const found = ls.ok ? (await ls.json()).some((x: Row) => x.name === name) : false;
      if (!found) return json({ error: "not_uploaded" }, 409, o);
      // doska rasmlari: faqat shu darsning papkasidagi, bucket'da haqiqatan bor fayllar
      let photos: Row[] = [];
      if (Array.isArray(b.photos) && b.photos.length) {
        const lp = await storage("POST", `object/list/${PHOTOS}`, JSON.stringify({ prefix: `${uid}/${id}`, limit: 50 }));
        const have = new Set(lp.ok ? (await lp.json()).map((x: Row) => `${uid}/${id}/${x.name}`) : []);
        photos = (b.photos as Row[]).map((x) => ({ path: String(x && x.path || ""), t: Math.round(+(x && x.t) || -1) }))
          .filter((x) => have.has(x.path)).slice(0, MAX_PHOTOS).map((x) => ({ path: x.path, t: x.t >= 0 && x.t < 6 * 3600 ? x.t : null }));
      }
      await patch(id, { status: "queued", attempts: 0, error: null, locked_until: null, photos });
      bg(kick());
      return json({ ok: true, status: "queued" }, 200, o);
    }
    if (p === "retry") {
      if (row.status !== "error" && row.status !== "cancelled") return json({ ok: true, status: row.status }, 200, o);
      const done = row.kind === "photo" || (row.transcript && !row.transcript.pending);
      const next = done ? "analyzing" : row.audio_path ? "queued" : "";
      if (!next) return json({ error: "no_audio", detail: "Audio o'chirilgan — yozuvni qayta yuklang." }, 409, o);
      await patch(id, { status: next, attempts: 0, waits: 0, error: null, locked_until: null, gemini_file: null, gemini_uri: null, ...(done ? {} : { transcript: null }) }, true);
      bg(kick());
      return json({ ok: true, status: next }, 200, o);
    }
    if (p === "cancel") {
      if (!["uploading", "queued", "transcribing", "analyzing"].includes(row.status)) return json({ ok: true, status: row.status }, 200, o);
      await patch(id, { status: "cancelled", error: "bekor qilindi", locked_until: null, gemini_file: null, gemini_uri: null }, true);
      // Gemini'dagi nusxa kerak emas (qayta boshlansa, yozuv qaytadan yuboriladi); bucket'dagi yozuv 3 kun turadi
      if (row.gemini_file) { try { await gem(`/v1beta/${row.gemini_file}`, { method: "DELETE" }); } catch (e) { console.error("gemini delete", e); } }
      return json({ ok: true, status: "cancelled" }, 200, o);
    }
    if (p === "delete") {
      // tugagan tahlil o'chirilmaydi (xatolar va mashqlar unga bog'langan); faqat to'xtagan yoki yuklanmagan dars
      if (!["error", "cancelled", "uploading"].includes(row.status)) return json({ error: "not_allowed", status: row.status }, 409, o);
      if (row.gemini_file) { try { await gem(`/v1beta/${row.gemini_file}`, { method: "DELETE" }); } catch (e) { console.error("gemini delete", e); } }
      if (row.audio_path) { const r = await storage("DELETE", `object/${BUCKET}`, JSON.stringify({ prefixes: [row.audio_path] })); if (!r.ok) throw new Error(`storage delete ${r.status}`); }
      const lp = await storage("POST", `object/list/${PHOTOS}`, JSON.stringify({ prefix: `${uid}/${id}`, limit: 50 }));
      const ph = lp.ok ? (await lp.json()).map((x: Row) => `${uid}/${id}/${x.name}`) : [];
      if (ph.length) { const r = await storage("DELETE", `object/${PHOTOS}`, JSON.stringify({ prefixes: ph })); if (!r.ok) throw new Error(`storage delete ${r.status}`); }
      await db(`class_lessons?id=eq.${id}&user_id=eq.${uid}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return json({ ok: true, deleted: true }, 200, o);
    }
    return json({ error: "not_found", use: ["POST /dars/new", "POST /dars/start", "POST /dars/retry", "POST /dars/cancel", "POST /dars/delete", "POST /dars/tick"] }, 404, o);
  } catch (e) {
    console.error(e);
    return json({ error: "server", detail: clip(String(e), 200) }, 500, o);
  }
});
