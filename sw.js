/* DEV-only static-cache SW — isolated from stable beta caches */
const CACHE_PREFIX = 'tdr2-dev-';
const CACHE_VERSION = `${CACHE_PREFIX}v1-20260902`;
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
    // DEV must replace stale DEV workers immediately. Its scope is /dev/, so this
    // cannot take over the stable root application.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Never delete stable/main caches. Only clean caches explicitly owned by DEV.
    await Promise.all(keys.map((key) => {
      if (!key.startsWith(CACHE_PREFIX) || key === CACHE_VERSION) return Promise.resolve();
      return caches.delete(key);
    }));
    await self.clients.claim();
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

  // This worker is intended only for its /dev/ scope. Do not touch stable-root
  // requests even if a browser ever exposes them to this worker.
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;

  if (isNavigationRequest(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const indexUrl = new URL('./index.html', self.registration.scope).toString();
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          await cache.put(indexUrl, fresh.clone());
          return fresh;
        }
      } catch (_) {}
      const cached = await cache.match(indexUrl);
      if (cached) return cached;
      return new Response('<!doctype html><meta charset="utf-8"><title>DEV Offline</title><body style="background:#071017;color:white;font-family:system-ui;padding:24px">Top-Down Race DEV no puede arrancar sin una copia válida en caché.</body>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    })());
    return;
  }

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
