// Ingliz tili — oflayn ishlash uchun service worker.
// Sahifa: avval internetdan (push qilingan yangi versiya darrov ko'rinadi); internet sekin bo'lsa (2,5 s) yoki yo'q bo'lsa — keshdan.
// Ma'lumotlar (data/*.js?v=HASH): versiya manzilda, mazmuni o'zgarmaydi — avval keshdan (aniq versiya), bo'lmasa internetdan.
//   Yangi versiya keshga yozilganda shu faylning eski versiyalari o'chiriladi.
// Shriftlar: keshdan, bo'lmasa internetdan olinib keshga qo'yiladi.
// Ovozlar (ingliz-ovoz-*) sahifaning o'zi keshlaydi — bu yerda ularni o'chirmaymiz.
const CACHE = "ingliz-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

// index.html ichidagi <script src="data/...?v=..."> manzillari — o'rnatishda oflayn uchun oldindan keshlanadi
const dataUrls = html => [...html.matchAll(/<script src="(data\/[^"?]+\.js\?v=[^"]+)"/g)].map(m => "./" + m[1]);

// Versiyali faylni keshga yozish va shu faylning boshqa versiyalarini o'chirish
async function putVersioned(c, req, res) {
  const path = new URL(req.url).pathname;
  const old = (await c.keys()).filter(k => { const u = new URL(k.url); return u.pathname === path && k.url !== req.url; });
  await Promise.all(old.map(k => c.delete(k)));
  await c.put(req, res);
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    const page = await c.match("./index.html");
    const urls = page ? dataUrls(await page.text()) : [];
    await Promise.all(urls.map(u => fetch(u).then(r => r.ok && putVersioned(c, new Request(new URL(u, location).href), r))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && !k.startsWith("ingliz-ovoz")).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes("/data/") && url.searchParams.has("v")) {
    // versiyali ma'lumot: aniq versiya keshda bo'lsa — darrov; bo'lmasa internetdan va keshga
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) putVersioned(c, req, res.clone());
      return res;
    }).catch(() => c.match(req, { ignoreSearch: true })))));
  } else if (url.origin === location.origin) {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    const cached = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html"));
    // sekin internetda ilova kutib qolmasin: 2,5 soniyada javob bo'lmasa — keshdagi nusxa (yangisi baribir keshga yoziladi)
    const slow = new Promise(res => setTimeout(res, 2500)).then(cached).then(r => r || net);
    e.respondWith(Promise.race([net.catch(cached), slow]));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
  }
});
