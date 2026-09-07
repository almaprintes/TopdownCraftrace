/* Top Down RACE DEV service worker — network-only guard.
   Keep a DEV-scoped worker installed so the frozen root beta worker can never
   take control of /TopdownCraftrace/dev/. No DEV responses are cached. */

const DEV_CACHE_RE = /(^|[/:._-])dev([/:._-]|$)|tdr2-dev/i;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => DEV_CACHE_RE.test(String(key))).map((key) => caches.delete(key)));
    } catch {}
    try { await self.clients.claim(); } catch {}
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(req, { cache: 'no-store' }));
});
