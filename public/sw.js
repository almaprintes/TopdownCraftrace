/* Top-Down Race 2 service worker — development-safe PWA cache.
   DEV preview has its own cache namespace so it never collides with the beta. */

const CACHE_VERSION = 'tdr2-dev-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/data/car_overrides.json',
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

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
  event.respondWith(networkFirst(req));
});
