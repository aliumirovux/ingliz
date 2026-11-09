// «Tushuntir»: xatoni o'zbekcha tushuntiradi (mode: fix; gap tuzishda har bir farqni qadam-baqadam — mode: xato), o'quvchi gapini tekshiradi (mode: check), Tinglash bo'limida gapni (sentence) va so'zni (word) tushuntiradi,
// gap skeleti (mode: bolak) — gaplarni ma'no bo'laklariga ajratadi; saytdagi yordamchi (mode: chat) — tarjima, gapni tekshirish, so'z ma'nosi va savollar.
// Faqat kirgan foydalanuvchi (verify_jwt), kuniga LIMIT ta (barcha rejimlar uchun umumiy). Kalit: Edge Function secret ANTHROPIC_API_KEY.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LIMIT = 120;
const MODEL = "claude-haiku-5-5";
// «Nega xato?» va yordamchi faqat shu hisoblar uchun (Ali'ning API krediti boshqalarga sarflanmasin). Qo'shish: shu ro'yxatga email.
const ALLOW = ["aliumirov.me@gmail.com"];
const ORIGINS = ["https://easywords.uz", "https://www.easywords.uz", "https://aliumirovux.github.io", "http://localhost:8766"];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

const SYSTEM = `Sen ingliz tilini noldan o'rganayotgan o'zbek kattalar uchun mehribon, aniq o'qituvchisan. O'quvchi darajasi: A1 (Navigate Beginner).
Qoidalar:
- Faqat o'zbek tilida, faqat lotin yozuvida yoz (kirill harflari umuman bo'lmasin, ismlar ham lotincha: Ali, Aziz). Inglizcha so'zlarni «» ichida ber.
- Misol gaplarni kundalik hayotdan ol (oila, uy, shahar, xarid, ovqat, sayohat, o'qish, sport). O'quvchining ishi yoki kasbi (dizayn, IT, ofis, ilova yaratish) haqida misol berma.
- O'quvchiga doim «siz» deb murojaat qil; o'zbekcha tarjimalarda ham «siz» ishlat.
- Grammatik atamalardan qoch (Past Simple, auxiliary, ega, kesim kabi so'zlarni ishlatma). O'rniga oddiy so'zlar bilan ayt: «o'tgan ish haqida», «savolda», «fe'l o'zgarmaydi».
- Qisqa bo'l: izoh 1–3 ta qisqa gap. Faqat eng muhim xatoni ayt.
- Bitta oddiy misol gap ber (A1 so'zlari bilan) va uning o'zbekcha tarjimasini ber. Misol topshiriqdagi gapdan ham, o'quvchining gapidan ham BOSHQA gap bo'lsin, lekin aynan shu qoidani ko'rsatsin.
- Javobni FAQAT JSON obyekt qilib qaytar, boshqa matn qo'shma.`;

// yordamchi: o'quvchi ishdagi xabarlarini tarjima qildiradi, gapini tekshiradi, so'z so'raydi yoki savol beradi
function chatPrompt(b: Record<string, unknown>) {
  const hist = Array.isArray(b.history) ? (b.history as Record<string, unknown>[]).slice(-4) : [];
  const h = hist.map((x) => `O'quvchi: ${clip(x.q, 300)}\nSen: ${clip(x.a, 300)}`).join("\n");
  return (b.page ? `O'quvchi hozir saytning shu sahifasida: ${clip(b.page, 600)}\n` : "") +
    (h ? `Oldingi suhbat:\n${h}\n\n` : "") +
    `O'quvchining yangi xabari: ${clip(b.text, 600)}\n\n` +
    `Avval xabar turini aniqla:\n` +
    `- «tarjima» — o'zbekcha (yoki ruscha) gap/so'zni inglizchaga o'girish kerak. Ish yozishmasi uchun tabiiy, xushmuomala, oddiy inglizcha ber.\n` +
    `- «tekshirish» — o'quvchi inglizcha gap yozgan: to'g'rimi? Xato bo'lsa eng kam o'zgartirish bilan tuzat.\n` +
    `- «soz» — inglizcha so'z yoki iboraning ma'nosi so'ralgan.\n` +
    `- «savol» — til haqida boshqa savol (farqi, qachon ishlatiladi va h.k.). Bunda izoh 4 gapgacha bo'lishi mumkin.\n` +
    `pron — «en» ning o'qilishi o'zbek lotin harflarida, urg'uli bo'g'in katta harfda (masalan: «ayl SEND»).\n` +
    `qosh — o'quvchi lug'atiga qo'shishga arziydigan 0–3 ta inglizcha so'z yoki qisqa ibora (A1–A2 uchun foydali, «en» dan olingan), o'zbekcha ma'nosi bilan.\n` +
    `JSON: {"tur": "tarjima|tekshirish|soz|savol", "en": "inglizcha gap/so'z (tarjima, tuzatilgan gap yoki so'zning o'zi; savolda bo'sh bo'lishi mumkin)", "togri": true|false (faqat tekshirishda), ` +
    `"pron": "...", "uz": "o'zbekcha ma'nosi (soz va tarjimada qisqa)", "izoh": "...", "misol": {"en": "...", "uz": "..."}, "qosh": [{"w": "...", "u": "..."}]}`;
}

// gap tuzish: o'quvchi javobidagi HAR BIR farqni alohida, qadam-baqadam tushuntiradi (qoida varag'idagi chat)
function xatoPrompt(b: Record<string, unknown>) {
  const hist = Array.isArray(b.history) ? (b.history as Record<string, unknown>[]).slice(-4) : [];
  const h = hist.map((x) => `O'quvchi: ${clip(x.q, 300)}\nSen: ${clip(x.a, 400)}`).join("\n");
  return `Gap tuzish mashqi.\nO'zbekcha topshiriq: ${clip(b.uz, 240)}\nTo'g'ri inglizcha javob: ${clip(b.target, 240)}\nO'quvchi javobi: ${clip(b.answer, 240)}\n` +
    (b.steps ? `Sayt aniqlagan farqlar (ishonchli, shularga tayan): ${clip(b.steps, 600)}\n` : "") +
    (b.rule ? `Saytda ko'rsatilgan qoida: ${clip(b.rule, 240)}\n` : "") +
    (h ? `Oldingi suhbat:\n${h}\n` : "") +
    (clip(b.text, 600) ? `O'quvchining savoli: ${clip(b.text, 600)}\n\n` : `O'quvchi so'radi: «Xatoimni to'liq tushuntiring».\n\n`) +
    `BU REJIMDA «qisqa bo'l, faqat eng muhim xato» qoidasi amal qilmaydi. O'quvchi javobidagi HAR BIR farqni alohida qadam qilib, gapdagi tartibda tushuntir:\n` +
    `- xato: o'quvchi aynan nima yozgan (inglizcha bo'lak, qisqa);\n- togri: qanday bo'lishi kerak (inglizcha bo'lak, kerak bo'lsa atrofidagi 1–2 so'z bilan, masalan «We talk about»);\n` +
    `- nega: 1–2 oddiy gap — nega shunday. So'z joyi almashgan bo'lsa, inglizcha tartibni ayt: kim → nima qiladi → nimani → qayerda → qachon. So'z tushib qolgan bo'lsa — u nima uchun kerakligini ayt.\n` +
    `Faqat haqiqiy farqlarni ayt; to'g'ri qismni xato dema; vergul va katta harfni farq hisoblama. Savol berilgan bo'lsa — izohda avval aynan savolga javob ber, qadamlar savolga tegishli bo'lsin (kerak bo'lmasa bo'sh ro'yxat).\n` +
    `eslatma — keyingi safar eslab qolish uchun bitta qisqa qoida. misol — shu qoidani ko'rsatadigan BOSHQA oddiy gap.\n` +
    `JSON: {"izoh": "1–2 gap umumiy xulosa yoki savolga javob", "qadamlar": [{"xato": "...", "togri": "...", "nega": "..."}], "eslatma": "...", "misol": {"en": "...", "uz": "..."}}`;
}

// gap skeleti: inglizcha gapni ma'no bo'laklariga ajratadi va har bo'lakka o'zbekcha gapdagi mos qismni beradi
function bolakPrompt(b: Record<string, unknown>) {
  const items = (Array.isArray(b.items) ? (b.items as Record<string, unknown>[]) : []).slice(0, 10);
  const list = items.map((x, i) => `${i + 1}. O'zbekcha: ${clip(x.uz, 240)}\n   Inglizcha: ${clip(x.en, 240)}`).join("\n");
  return `Gap tuzish mashqi uchun har bir inglizcha gapni ma'no bo'laklariga ajrat (gapga qarab 2–6 bo'lak; masalan: «There are» | «two beds» | «a desk» | «and a lot of toys»).\n` +
    `Qoidalar:\n- Bo'laklar inglizcha gapdagi so'zlarni AYNAN shu tartibda, hech narsa qo'shmasdan va tashlamasdan qamrab olsin (vergul va nuqtani yozma).\n` +
    `- uz — shu bo'lakka mos qism, o'zbekcha gapdan AYNAN o'sha so'zlar bilan ko'chirib ol (o'zgartirma); mos qism bo'lmasa (masalan «the»), qisqa ma'nosini yoz.\n` +
    `- Kim, nima qiladi, nimani, qayerda, qachon kabi ma'no qismlariga ajrat; artikl va predlogni o'z otidan ajratma.\n\n${list}\n\n` +
    `JSON: {"bolaklar": [[{"en": "...", "uz": "..."}], ...]} — gaplar tartibida, har gap uchun bitta ro'yxat.`;
}

function prompt(b: Record<string, unknown>) {
  if (b.mode === "chat") return chatPrompt(b);
  if (b.mode === "bolak") return bolakPrompt(b);
  if (b.mode === "xato") return xatoPrompt(b);
  if (b.mode === "sentence") {
    // Tinglash: video darsdagi gapni tushuntirish
    return `Video darsdagi (VOA, A1) inglizcha gap: ${clip(b.answer, 240)}\n` +
      (b.uz ? `Uning o'zbekcha tarjimasi: ${clip(b.uz, 240)}\n` : "") +
      `Shu gapni A1 o'quvchiga tushuntir: eng muhim so'z yoki qolip nima va qanday ma'no beradi (qisqartmalar bo'lsa — ochib ber).\n` +
      `JSON: {"izoh": "...", "misol": {"en": "...", "uz": "..."}}`;
  }
  if (b.mode === "word") {
    // Tinglash: lug'atda yo'q so'zning shu gapdagi ma'nosi
    return `Video darsdagi gap: ${clip(b.answer, 240)}\nShu gapdagi so'z: ${clip(b.word, 40)}\n` +
      `So'zning shu gapdagi ma'nosini ber. pron — o'qilishi o'zbek lotin harflarida, urg'uli bo'g'in katta harfda (masalan: «EA-poot»).\n` +
      `JSON: {"tarjima": "1–3 so'z o'zbekcha", "pron": "...", "izoh": "shu gapdagi ma'nosi, 1 qisqa gap"}`;
  }
  if (b.mode === "check") {
    return `O'quvchi o'zi inglizcha gap tuzdi.\n` +
      (b.word ? `Ishlatishi kerak bo'lgan so'z yoki qoida: ${clip(b.word, 80)}\n` : "") +
      (b.uz ? `U nima demoqchi edi (o'zbekcha, bo'lishi mumkin): ${clip(b.uz, 200)}\n` : "") +
      `O'quvchining gapi: ${clip(b.answer, 240)}\n\n` +
      `Gap to'g'rimi? Agar xato bo'lsa — eng kam o'zgartirish bilan tuzat.\nJSON: {"togri": true|false, "tuzatilgan": "to'g'ri inglizcha gap (to'g'ri bo'lsa o'zi)", "izoh": "...", "misol": {"en": "...", "uz": "..."}}`;
  }
  return `O'zbekcha topshiriq: ${clip(b.uz, 200)}\nTo'g'ri inglizcha javob: ${clip(b.target, 200)}\n` +
    (b.rule ? `Saytdagi qisqa qoida: ${clip(b.rule, 160)}\n` : "") +
    `O'quvchi yozgan javob: ${clip(b.answer, 240)}\n\n` +
    `O'quvchi aynan nimani xato qildi va nega? Uning javobidagi xato so'zni aniq ayt.\nJSON: {"izoh": "...", "misol": {"en": "...", "uz": "..."}}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "bad_request" }, 400, origin); }
  const chat = b.mode === "chat", bolak = b.mode === "bolak";
  if (bolak ? !(Array.isArray(b.items) && b.items.length) : chat ? !clip(b.text, 600) : (!clip(b.answer, 240) || (b.mode === "fix" || b.mode === "xato" || !b.mode ? !clip(b.target, 240) : false) || (b.mode === "word" && !clip(b.word, 40)))) return json({ error: "bad_request" }, 400, origin);

  // tokenni gateway tekshirgan (verify_jwt) — bu yerda faqat emailni o'qiymiz
  const auth0 = req.headers.get("Authorization") || "";
  let email = "";
  try { const pl = JSON.parse(atob(auth0.split(" ")[1].split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); email = String(pl.email || "").toLowerCase(); } catch { /* anon */ }
  if (!email) return json({ error: "auth" }, 401, origin);
  if (!ALLOW.includes(email)) return json({ error: "not_allowed" }, 403, origin);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "no_key" }, 503, origin);

  // kunlik limit: foydalanuvchi o'z tokeni bilan ai_take() ni chaqiradi (kirmagan bo'lsa — 401)
  const sbUrl = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  const t = await fetch(`${sbUrl}/rest/v1/rpc/ai_take`, {
    method: "POST", headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ p_limit: LIMIT }),
  });
  if (!t.ok) return json({ error: "auth" }, 401, origin);
  const used = await t.json();
  if (typeof used !== "number" || used < 0) return json({ error: "limit", limit: LIMIT }, 429, origin);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, output_config: { effort: "low" }, system: SYSTEM, messages: [{ role: "user", content: prompt(b) }] }),
  });
  if (!r.ok) { console.error("anthropic", r.status, (await r.text()).slice(0, 300)); return json({ error: "upstream" }, 502, origin); }
  const data = await r.json();
  const text = (data.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  let out: Record<string, unknown>;
  try { out = JSON.parse(m ? m[0] : text); } catch { out = { izoh: text.trim().slice(0, 600) }; }
  if (bolak) return Array.isArray(out.bolaklar) ? json({ bolaklar: out.bolaklar, left: LIMIT - used }, 200, origin) : json({ error: "empty" }, 502, origin);
  if (!String(out.izoh || "").trim() && !(chat && String(out.en || "").trim())) { console.error("empty", data.stop_reason, JSON.stringify(data.content).slice(0, 500)); return json({ error: "empty" }, 502, origin); }
  // kirill harfi tushib qolgan tarjimani ko'rsatmaymiz (o'quvchi lotin yozuvida o'qiydi)
  const cyr = /[Ѐ-ӿ]/;
  const mis = out.misol as Record<string, unknown> | undefined;
  if (mis && cyr.test(String(mis.uz || ""))) delete mis.uz;
  if (out.tarjima && cyr.test(String(out.tarjima))) return json({ error: "empty" }, 502, origin);
  if (cyr.test(String(out.izoh || "")) || cyr.test(String(out.uz || ""))) return json({ error: "empty" }, 502, origin);
  if (Array.isArray(out.qadamlar)) out.qadamlar = (out.qadamlar as Record<string, unknown>[]).filter((x) => x && !cyr.test(String(x.nega || "")) && (clip(x.togri, 200) || clip(x.nega, 400))).slice(0, 6);
  if (out.eslatma && cyr.test(String(out.eslatma))) delete out.eslatma;
  if (chat && Array.isArray(out.qosh)) out.qosh = (out.qosh as Record<string, unknown>[]).filter((x) => x && clip(x.w, 60) && clip(x.u, 80) && !cyr.test(String(x.u))).slice(0, 3);
  return json({ ...out, left: LIMIT - used }, 200, origin);
});
