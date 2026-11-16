/* တရားတော် Studio — service worker: network-first (fresh deploys), cache fallback (offline, navigations only) */
const CACHE = 'tayar-v3-app-v2';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'app2.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'channel-logo.webp', 'fonts/myanmar-black.woff2', 'fonts/myanmar-njaun.woff2', 'fonts/myanmar-pauklay.woff2', 'fonts/myanmar-angoun.woff2', 'fonts/myanmar-gantgaw.woff2', 'fonts/myanmar-thuriya.woff2', 'fonts/myanmar-waso.woff2', 'fonts/myanmar-yinmar.woff2', 'fonts/myanmar-sagar.woff2', 'fonts/pangram-my.woff2', 'fonts/pangram-rest.woff2', 'fonts/myanmar-yein-my.woff2', 'fonts/myanmar-yein-rest.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.status === 200 || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(m => {
      if (m) return m;
      if (req.mode === 'navigate') return caches.match('index.html');
      return Response.error();
    }))
  );
});
