/* Static-cache SW (sin Workbox) — shell fresco online, fallback estable offline */
const CACHE_VERSION = 'tdr2-v21';
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

// Never seize a running game session. A newly installed worker activates naturally
// after old clients close; the next launch gets the new shell.
self.addEventListener('message', () => {});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(CORE_ASSETS.map(async (asset) => {
      try {
        const req = new Request(asset, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(req, res.clone());
      } catch (_) {}
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_VERSION ? Promise.resolve() : caches.delete(k))));
  })());
});

function isNavigationRequest(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

async function refreshInBackground(req, cache) {
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.ok) await cache.put(req, fresh.clone());
  } catch (_) {}
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(req)) {
    // HTML is version authority. Prefer network so a normal online launch never
    // boots yesterday's bundle; fall back to the known-good cached shell offline.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const indexUrl = new URL('./index.html', self.location.href).toString();
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          await cache.put(indexUrl, fresh.clone());
          return fresh;
        }
      } catch (_) {}
      const cached = await cache.match(indexUrl);
      if (cached) return cached;
      return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><body style="background:#071017;color:white;font-family:system-ui;padding:24px">Top-Down Race no puede arrancar sin una copia válida en caché.</body>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }

  // Hashed Vite chunks and immutable-ish game assets benefit from cache-first.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    if (cached) {
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
