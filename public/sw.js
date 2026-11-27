const SHELL_CACHE = 'linguaverse-shell-v2';
const FONTS_CACHE = 'linguaverse-fonts-v2';
const ACTIVE_CACHES = new Set([SHELL_CACHE, FONTS_CACHE]);

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

function isCacheableResponse(response) {
  if (!response || !response.ok || response.status !== 200) return false;
  if (response.type === 'opaque' || response.type === 'opaqueredirect') return false;
  if (response.headers.has('Set-Cookie')) return false;
  const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !ACTIVE_CACHES.has(key)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_USER_CACHES') {
    event.waitUntil(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.keys().then((requests) =>
          Promise.all(
            requests
              .filter((req) => {
                const pathname = new URL(req.url).pathname;
                return !PRECACHE_URLS.includes(pathname) && !pathname.startsWith('/assets/');
              })
              .map((req) => cache.delete(req))
          )
        )
      )
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Never intercept or cache authenticated Authorization requests
  if (request.headers.get('Authorization')) return;

  const url = new URL(request.url);

  // Strictly bypass API calls and Separate Admin Application routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {
    return;
  }

  // CacheFirst for Google Fonts stylesheets & font files
  if (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONTS_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
        )
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Immutable hashed static assets & public icons: network-first with cache fallback
  const isStaticAsset =
    url.pathname.startsWith('/assets/') || PRECACHE_URLS.includes(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // SPA navigation: network-first, NEVER cache authenticated /app/* URLs individually;
  // offline fallback safely returns the pre-cached static shell '/'.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (url.pathname === '/' && isCacheableResponse(response)) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/'))
    );
  }
});
