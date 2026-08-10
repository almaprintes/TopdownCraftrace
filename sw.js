/* Top-Down Race 2 service worker — development-safe PWA cache.
   During active development we prefer fresh network content and keep cache only
   as an offline fallback. This prevents an installed iPhone PWA from getting
   stuck on an old circuit/environment build. */

const CACHE_VERSION = 'tdr2-v14';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/data/car_overrides.json',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './assets/ui/orientation_portrait.png'
];

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Do not let one optional/missing file abort SW installation.
      await Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => key === CACHE_VERSION ? Promise.resolve() : caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh?.ok) await cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // While the game is being iterated on, EVERYTHING on our own origin is
  // network-first. That includes JS/CSS/WebP, so an installed PWA sees the same
  // build as Safari/Vercel instead of a stale cached environment.
  event.respondWith(networkFirst(req));
});
