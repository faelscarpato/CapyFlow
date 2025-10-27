// CapyFlow PWA — Service Worker
const SW_VERSION = 'v1.0.0';
const APP_SHELL = [
  '/',
  'offline.html',
  'public/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`capyflow-shell-${SW_VERSION}`).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (!key.includes(SW_VERSION)) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// Network-first for HTML, SWR for CSS/JS, Cache-first for images
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  // HTML: network-first, fallback to cache, then offline page
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(`capyflow-pages-${SW_VERSION}`).then(c => c.put(req, clone));
        return res;
      }).catch(async () => {
        const cached = await caches.match(req);
        return cached || caches.match('offline.html');
      })
    );
    return;
  }

  // CSS/JS: stale-while-revalidate
  if (req.destination === 'script' || req.destination === 'style') {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          const resClone = res.clone();
          caches.open(`capyflow-assets-${SW_VERSION}`).then(c => c.put(req, resClone));
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Images: cache-first
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(`capyflow-images-${SW_VERSION}`).then(c => c.put(req, resClone));
        return res;
      }))
    );
    return;
  }
});