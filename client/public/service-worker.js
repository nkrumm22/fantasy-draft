// Minimal service worker — exists to satisfy PWA installability criteria and give
// a basic offline app-shell fallback. Deliberately NOT a full offline-first cache:
// this app is live-data-driven (drafts, scores, notifications), so /api/* requests
// are never intercepted — serving a cached API response could show a stale pick
// order or wrong score, which is worse than just failing.
const CACHE_NAME = 'pulse-league-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/pulseleague-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  // Network-first: always prefer the live version (this app deploys often),
  // only falling back to the cached shell when there's genuinely no connection.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});
