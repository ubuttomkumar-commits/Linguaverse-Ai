const SHELL_CACHE = 'linguaverse-shell-v4';
const FONTS_CACHE = 'linguaverse-fonts-v4';
const ACTIVE_CACHES = new Set([SHELL_CACHE, FONTS_CACHE]);

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

function isHtmlResponse(response) {
  const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
  return contentType.includes('text/html');
}

function isCacheableResponse(response, disallowHtml = false) {
  if (!response || !response.ok || response.status !== 200) return false;
  if (response.type === 'opaque' || response.type === 'opaqueredirect') return false;
  if (response.headers.has('Set-Cookie')) return false;
  const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;
  if (disallowHtml && isHtmlResponse(response)) return false;
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache
          .addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })))
          .catch(() => {})
      )
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
  if (data.type === 'PURGE_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
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

  // SPA navigation MUST run BEFORE static asset rules so '/' always fetches fresh HTML online
  // and NEVER serves a stale index.html referencing deleted hashed JS chunks from a prior deploy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-cache' }))
        .then((response) => {
          if (url.pathname === '/' && isCacheableResponse(response) && isHtmlResponse(response)) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Content-hashed Vite /assets/* bundles: Cache-First with strict non-HTML MIME guard.
  // If Cloudflare Pages SPA fallback returns text/html for a removed chunk hash after deploy,
  // purge stale '/' HTML shell and return 503 so client auto-recovery reloads fresh assets cleanly.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached && isCacheableResponse(cached, true)) {
            return cached;
          }
          if (cached) {
            cache.delete(request).catch(() => {});
          }
          return fetch(request).then((response) => {
            if (isHtmlResponse(response)) {
              cache.delete('/').catch(() => {});
              return new Response('Chunk version mismatch', {
                status: 503,
                headers: {
                  'Content-Type': 'text/plain; charset=utf-8',
                  'Cache-Control': 'no-store',
                  'X-LV-Chunk-Mismatch': '1',
                },
              });
            }
            if (isCacheableResponse(response, true)) {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Public icons & manifest: Network-First with cache fallback
  if (PRECACHE_URLS.includes(url.pathname)) {
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
  }
});
