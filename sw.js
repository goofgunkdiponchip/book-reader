// Keeps the reader working with no signal: everything is served from the phone's copy first,
// and quietly refreshed in the background whenever there is a connection (updates show on the next launch).
const CACHE = 'book-reader-v2';   // bump when files must change together: the phone then swaps them all at once
const FILES = ['./', './index.html', './manifest.webmanifest', './lib/pdf.min.js', './lib/pdf.worker.min.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // 'reload' skips the browser's short-term copy, so a fresh install never mixes old and new files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(r => {
      if (r && r.ok && r.type === 'basic') cache.put(req, r.clone());
      return r;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    const r = await fresh;
    if (r) return r;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
