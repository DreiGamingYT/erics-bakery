const CACHE_NAME = 'erics-bakery-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/reports-enhancements.js',
  '/logo.jpg',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap',
];

const API_PREFIX = '/api/';

const API_NO_CACHE = [
  '/api/auth/',
  '/api/users/',
  '/api/admin/',
  '/api/notifications/prefs',
];

const API_CACHE_MAX_AGE_MS = 60 * 1000;

function isNoCacheRoute(pathname) {
  return API_NO_CACHE.some(prefix => pathname.startsWith(prefix));
}

async function putWithTimestamp(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set('x-sw-cached-at', Date.now().toString());
  const timestamped = new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, timestamped);
}

function getFreshCached(cached) {
  if (!cached) return null;
  const cachedAt = parseInt(cached.headers.get('x-sw-cached-at') || '0', 10);
  if (!cachedAt || Date.now() - cachedAt > API_CACHE_MAX_AGE_MS) return null;
  return cached;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  if (url.pathname.startsWith(API_PREFIX)) {

    if (isNoCacheRoute(url.pathname)) return;

    event.respondWith(
      fetch(event.request.clone())
        .then(async response => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await putWithTimestamp(cache, event.request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache  = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          const fresh  = getFreshCached(cached);
          if (fresh) return fresh;

          return new Response(
            JSON.stringify({ error: 'Offline — cached data unavailable or expired.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request)
          .then(response => {
            if (response && response.ok && event.request.method === 'GET') {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => null);
        return cached || fetchPromise;
      })
    )
  );
});