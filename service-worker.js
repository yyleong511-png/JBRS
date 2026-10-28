const CACHE_NAME = 'jl-backstage-v18';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './sparkle.png',
  './wes-logo.png',
  './wardrobe.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  // Pages: network first, so a new version of the app is picked up as soon
  // as there is a connection. Falls back to cache when offline.
  if (isPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // cache each page under its own path (wardrobe.html must not overwrite index.html)
          const path = new URL(req.url).pathname;
          const key = /wardrobe\.html$/.test(path) ? './wardrobe.html' : './index.html';
          const copy = res.clone();
          if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(key, copy));
          return res;
        })
        .catch(() => {
          const path = new URL(req.url).pathname;
          const key = /wardrobe\.html$/.test(path) ? './wardrobe.html' : './index.html';
          return caches.match(key).then((c) => c || caches.match(req));
        })
    );
    return;
  }

  // Everything else: cache first, refreshed in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
