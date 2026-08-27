/* Static-cache SW (sin Workbox) — arranque estable y actualización en segundo plano */
const CACHE_VERSION = 'tdr2-v20';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './assets/ui/orientation_portrait.png',
  './assets/tutorials/dropping/dropping_01_717x330.png',
  './assets/tutorials/dropping/dropping_02_717x330.png',
  './assets/tutorials/dropping/dropping_03_717x330.png',
  './assets/tutorials/dropping/dropping_04_717x330.png',
  './assets/tutorials/dropping/dropping_05_717x330.png'
];

// Do not let an update replace the active controller in the middle of bootstrap.
// Older clients may still send SKIP_WAITING; intentionally ignore it here.
self.addEventListener('message', () => {});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(CORE_ASSETS.map(async (asset) => {
      try {
        const req = new Request(asset, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(req, res.clone());
      } catch (_) {
        // A single optional asset must never abort SW installation.
      }
    }));
    // No skipWaiting: activate naturally after existing clients close.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_VERSION ? Promise.resolve() : caches.delete(k))));
    // No clients.claim(): never seize an already-running game session.
  })());
});

function isNavigationRequest(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

async function refreshInBackground(req, cache, cacheKey = req) {
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.ok) await cache.put(cacheKey, fresh.clone());
  } catch (_) {}
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const indexUrl = new URL('./index.html', self.location.href).toString();
      const cached = await cache.match(indexUrl);

      if (cached) {
        // Known-good shell starts immediately. Network only refreshes the next launch.
        event.waitUntil(refreshInBackground(req, cache, indexUrl));
        return cached;
      }

      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) await cache.put(indexUrl, fresh.clone());
        return fresh;
      } catch (_) {
        return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><body style="background:#071017;color:white;font-family:system-ui;padding:24px">Top-Down Race no puede arrancar sin una copia válida en caché.</body>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);

    if (cached) {
      // Critical startup rule: cached game files never wait for the network.
      event.waitUntil(refreshInBackground(req, cache));
      return cached;
    }

    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      if (fresh && fresh.ok) await cache.put(req, fresh.clone());
      return fresh;
    } catch (_) {
      return new Response('', { status: 504 });
    }
  })());
});
