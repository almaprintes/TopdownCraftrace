/* Top Down RACE DEV service worker retirement shim.
   DEV must always load the latest deployment, never an old offline shell. */

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

    try { await self.registration.unregister(); } catch {}
    try { await self.clients.claim(); } catch {}

    try {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        const url = new URL(client.url);
        if (!url.pathname.includes('/TopdownCraftrace/dev/')) continue;
        url.searchParams.set('dev-recovered', 'XV');
        await client.navigate(url.href);
      }
    } catch {}
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});
