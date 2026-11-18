// «Widget»: telefon widgeti (Android ilova / Scriptable) uchun bugungi takror soni, seriya va hafta kunlari.
// Kirish: ?k=<widget kaliti>&d=YYYY-MM-DD (telefondagi bugungi sana). Kalit widget_keys jadvalida, foydalanuvchi o'zi oladi.
// Faqat hisoblangan raqamlar qaytadi — so'zlar va boshqa ma'lumotlar tashqariga chiqmaydi.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const dOf = (k: string) => new Date(k + "T12:00:00Z");
const kOf = (d: Date) => d.toISOString().slice(0, 10);
const addTo = (k: string, n: number) => { const d = dOf(k); d.setUTCDate(d.getUTCDate() + n); return kOf(d); };
const dayDiff = (a: string, b: string) => Math.round((dOf(b).getTime() - dOf(a).getTime()) / 864e5);
const weekOf = (k: string) => { const d = dOf(k); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return kOf(d); };

// saytdagi liveStreak() bilan bir xil: haftasiga 2 tagacha mashqsiz kun seriyani uzmaydi
function liveStreak(S: any, t: string) {
  const st = S.streak || {}, last = st.last; if (!last) return 0;
  if (last === t || last === addTo(t, -1)) return st.n || 0;
  const miss: string[] = []; for (let i = 1; i < dayDiff(last, t); i++) miss.push(addTo(last, i));
  const rest = (S.rest || []) as string[], by: Record<string, number> = {};
  miss.forEach((d) => { const w = weekOf(d); by[w] = (by[w] || 0) + 1; });
  const ok = miss.length > 0 && Object.keys(by).every((w) => by[w] <= 2 - rest.filter((x) => weekOf(x) === w).length);
  return ok ? st.n || 0 : 0;
}

Deno.serve(async (req) => {
  const u = new URL(req.url), key = (u.searchParams.get("k") || "").trim();
  let d = u.searchParams.get("d") || "";
  if (!/^[0-9a-f]{64}$/.test(key)) return json({ error: "key" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) d = kOf(new Date(Date.now() + 5 * 3600e3)); // Toshkent
  const url = Deno.env.get("SUPABASE_URL")!, svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const h = { apikey: svc, Authorization: `Bearer ${svc}` };
  const kr = await fetch(`${url}/rest/v1/widget_keys?key=eq.${key}&select=user_id`, { headers: h });
  const kk = await kr.json().catch(() => []);
  if (!Array.isArray(kk) || !kk[0]) return json({ error: "key" }, 404);
  const pr = await fetch(`${url}/rest/v1/progress?user_id=eq.${kk[0].user_id}&select=state,updated_at`, { headers: h });
  const pp = await pr.json().catch(() => []);
  const S = (Array.isArray(pp) && pp[0] && pp[0].state) || {};
  const srs = (S.srs || {}) as Record<string, { due?: string; ls?: string }>, learn = new Set(((S.vb && S.vb.learn) || []) as string[]);
  const tom = addTo(d, 1);
  let due = 0, dueTom = 0, rev = 0; // rev — bugun takrorlangan (javob berilgan) so'zlar
  for (const [k, r] of Object.entries(srs)) {
    if (!r || !r.due) continue;
    if (k.startsWith("vb|") && !learn.has(k.slice(3))) continue;
    if (r.ls === d) rev++;
    if (r.due <= d) due++;
    if (r.due <= tom) dueTom++;
  }
  const log = (S.log || {}) as Record<string, { a?: number }>, mon = weekOf(d);
  const week = Array.from({ length: 7 }, (_, i) => { const k = addTo(mon, i); return log[k] && log[k].a ? 1 : 0; });
  return json({
    due, tom: due ? dueTom - due : dueTom, done: !!(log[d] && log[d].a), streak: liveStreak(S, d),
    week, today: dayDiff(mon, d), rev, min: due ? Math.max(1, Math.ceil(due * 15 / 60)) : 0, at: pp[0] ? pp[0].updated_at : null,
  });
});
