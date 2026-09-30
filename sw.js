const CACHE = "pararara-shell-2";
const FILES = ["./", "manifest.webmanifest", "favicon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const scope = new URL(self.registration.scope);

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(new URL(f, scope), { cache: "reload" })))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pararara-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req, key) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  if (req.mode === "navigate" || path === "" || path === "index.html") e.respondWith(networkFirst(req, scope.href));
  else if (path === "api-base.txt") e.respondWith(networkFirst(req, new URL("api-base.txt", scope).href));
  else if (path !== "sw.js") e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
