// Service worker for offline PWA support.
// HTML pages: network-first with 2.5s timeout fallback to cache.
// Versioned assets (data/*, styles/*, js/* with ?v=HASH): cache-first with old-version pruning.
// Audio caches (ingliz-ovoz-*) are managed by the app itself and preserved on activate.
const CACHE = "ingliz-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

// Versioned assets referenced in index.html are pre-cached during install.
const assetUrls = html => [...html.matchAll(/(?:src|href)="((?:data|styles|js)\/[^"?]+\.(?:js|css)\?v=[^"]+)"/g)].map(m => "./" + m[1]);

// Store a versioned asset and remove older cached versions of the same path.
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
    const urls = page ? assetUrls(await page.text()) : [];
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
  if (url.origin === location.origin && /\/(data|styles|js)\//.test(url.pathname) && url.searchParams.has("v")) {
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
    const slow = new Promise(res => setTimeout(res, 2500)).then(cached).then(r => r || net);
    e.respondWith(Promise.race([net.catch(cached), slow]));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
  }
});
