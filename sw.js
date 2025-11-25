const CACHE_NAME = "cloud-notes-v1";
const ASSETS = [
  "/",          // for GitHub Pages, the root maps to index.html
  "/index.html",
];

// Install: cache the app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch: simple cache-first strategy
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(resp => {
        // optionally cache network responses for navigation requests
        return resp;
      }).catch(() => {
        // offline fallback: return cached index.html for navigation
        if(event.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});
