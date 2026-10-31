// Ingliz tili — oflayn ishlash uchun service worker.
// Sahifa: avval internetdan (push qilingan yangi versiya darrov ko'rinadi); internet sekin bo'lsa (2,5 s) yoki yo'q bo'lsa — keshdan.
// Shriftlar: keshdan, bo'lmasa internetdan olinib keshga qo'yiladi.
const CACHE = "ingliz-v2";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
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
