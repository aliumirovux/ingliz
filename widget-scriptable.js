// Ingliz tili — «Takror» widgeti (Scriptable, iPhone).
// O'rnatish: ilovadagi Sozlamalar → «Telefon widgeti» → «Skriptni nusxalash». Kalit avtomatik qo'yiladi.
// Widget faqat raqamlarni oladi: bugungi takror soni, seriya va hafta kunlari.
const KEY = "__KEY__";
const API = "https://rqeirdempadfwirefyit.supabase.co/functions/v1/widget";
const APP = "https://easywords.uz/#quiz";
const dyn = (l, d) => Color.dynamic(new Color(l), new Color(d));
const C = {
  bg: dyn("#FFFFFF", "#1C1C20"), ink: dyn("#17171B", "#F2F2EE"), mut: dyn("#6B6C73", "#9C9DA4"),
  acc: dyn("#B9441F", "#E27A4E"), onAcc: dyn("#FFFFFF", "#1C1A16"), track: dyn("#DADBD5", "#3A3A42"),
};
const DAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const fm = FileManager.local(), cache = fm.joinPath(fm.documentsDirectory(), "ingliz-takror.json");

async function load() {
  const df = new DateFormatter(); df.dateFormat = "yyyy-MM-dd";
  try {
    const r = new Request(`${API}?k=${KEY}&d=${df.string(new Date())}`); r.timeoutInterval = 12;
    const d = await r.loadJSON();
    if (r.response.statusCode === 404 || d.error === "key") return { error: "key" };
    if (typeof d.due !== "number") throw new Error("bad");
    fm.writeString(cache, JSON.stringify(d));
    return d;
  } catch (e) {
    if (fm.fileExists(cache)) { const d = JSON.parse(fm.readString(cache)); d.stale = true; return d; }
    return { error: "net" };
  }
}

const font = (s, w) => w === "b" ? Font.boldSystemFont(s) : w === "s" ? Font.semiboldSystemFont(s) : Font.systemFont(s);
function txt(st, s, size, w, color) { const t = st.addText(String(s)); t.font = font(size, w); t.textColor = color || C.ink; t.lineLimit = 2; t.minimumScaleFactor = .7; return t; }
function sym(st, name, size, color) { const i = st.addImage(SFSymbol.named(name).image); i.imageSize = new Size(size, size); i.tintColor = color; return i; }

function header(w, d, title) {
  const h = w.addStack(); h.centerAlignContent();
  const b = h.addStack(); b.size = new Size(15, 15); b.cornerRadius = 4; b.backgroundColor = C.acc; b.centerAlignContent();
  txt(b, "I", 9, "b", C.onAcc);
  h.addSpacer(6); txt(h, title, 11, "s", C.mut);
  h.addSpacer();
  if (d && d.streak) { sym(h, "flame.fill", 12, C.acc); h.addSpacer(3); txt(h, d.streak + (w.__medium ? " kun" : ""), 13, "b", C.acc); }
}

function week(st, d) {
  const row = st.addStack(); row.spacing = 5;
  d.week.forEach((on, i) => {
    const c = row.addStack(); c.layoutVertically(); c.centerAlignContent();
    const now = i === d.today;
    sym(c, on ? "checkmark.circle.fill" : now ? "circle" : "circle.fill", 18, on || now ? C.acc : C.track);
    c.addSpacer(3); txt(c, DAYS[i], 9, "s", C.mut);
  });
}

function pill(st, label) {
  const p = st.addStack(); p.backgroundColor = C.acc; p.cornerRadius = 14; p.setPadding(6, 11, 6, 12); p.centerAlignContent();
  sym(p, "play.fill", 10, C.onAcc); p.addSpacer(5); txt(p, label, 13, "s", C.onAcc);
}

// asosiy matn: holatga qarab
function main(d) {
  const late = new Date().getHours() >= 20;
  if (d.due > 0 && !d.done && late && d.streak) return { big: null, title: "Bugun hali\no'qilmadi", sub: `Seriya ${d.streak} kun · saqlab qoling`, btn: true };
  if (d.due > 0) return { big: d.due, title: "so'z takrorga tayyor", sub: `~${d.min} daqiqa`, btn: true };
  if (d.done) return { big: null, title: "Bugungisi\ntayyor", sub: d.tom ? `Ertaga ${d.tom} ta` : "Ertaga takror yo'q", btn: false };
  return { big: null, title: "Takror yo'q", sub: "Yangi so'z o'rganish vaqti", btn: true };
}

function build(d) {
  const fam = config.widgetFamily || "medium";
  const w = new ListWidget(); w.backgroundColor = C.bg; w.url = APP; w.__medium = fam !== "small";
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

  if (fam === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true; const s = w.addStack(); s.layoutVertically(); s.centerAlignContent();
    txt(s, d.error ? "–" : d.due, 20, "b"); txt(s, "takror", 9, "s"); return w;
  }
  if (fam === "accessoryRectangular") {
    const s = w.addStack(); s.layoutVertically();
    txt(s, "Ingliz · takror", 12, "s"); txt(s, d.error ? "Ilovani oching" : d.due ? `${d.due} so'z · ~${d.min} daq` : "Bugungisi tayyor", 15, "b");
    if (!d.error && d.streak) txt(s, `Seriya ${d.streak} kun`, 12); return w;
  }
  if (fam === "accessoryInline") { w.addText(d.error ? "Ingliz tili" : d.due ? `${d.due} so'z takrorga` : "Takror tayyor ✓"); return w; }

  w.setPadding(14, 15, 14, 15);
  if (d.error) {
    header(w, null, "Ingliz tili"); w.addSpacer();
    txt(w, d.error === "key" ? "Kalit eskirgan. Ilovadan skriptni qayta nusxalang." : "Internet yo'q. Keyinroq yangilanadi.", 14, "s");
    w.addSpacer(); txt(w, "Sozlamalar → Telefon widgeti", 11, "", C.mut);
    w.url = "https://easywords.uz/#sozlama"; return w;
  }
  const m = main(d);
  if (fam === "small") {
    header(w, d, "Takror"); w.addSpacer();
    if (m.big !== null) { txt(w, m.big, 44, "b"); txt(w, m.big !== null ? "so'z tayyor" : m.title, 13, "s"); }
    else txt(w, m.title, 21, "b");
    w.addSpacer(); txt(w, m.sub, 12, "", C.mut);
    return w;
  }
  // o'rta (va katta)
  const row = w.addStack();
  const L = row.addStack(); L.layoutVertically();
  header(L, null, "Takror"); L.addSpacer();
  if (m.big !== null) { txt(L, m.big, 44, "b"); L.addSpacer(2); txt(L, m.title, 14, "s"); }
  else txt(L, m.title, 21, "b");
  txt(L, m.sub, 12, "", C.mut);
  row.addSpacer();
  const R = row.addStack(); R.layoutVertically();
  const top = R.addStack(); top.addSpacer();
  if (d.streak) { sym(top, "flame.fill", 13, C.acc); top.addSpacer(3); txt(top, d.streak + " kun", 14, "b", C.acc); }
  R.addSpacer(); week(R, d); R.addSpacer();
  const bot = R.addStack(); bot.addSpacer();
  if (m.btn) pill(bot, "Boshlash"); else if (d.stale) txt(bot, "oflayn", 11, "", C.mut);
  return w;
}

const data = await load();
const widget = build(data);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
