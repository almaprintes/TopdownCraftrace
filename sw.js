// DEV transition worker: intentionally no caching and no fetch interception.
// The public beta keeps its own service worker because it is built from beta-0.0.3.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { await self.clients.claim(); } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
  })());
});
