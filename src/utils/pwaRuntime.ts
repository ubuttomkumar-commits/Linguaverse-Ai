/**
 * Production PWA Service Worker registration & logout cache-purge helpers.
 * Strictly skipped on Separate Admin Application routes (/admin*).
 */
export function registerLinguaVerseServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (window.location.pathname.startsWith('/admin')) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        // Non-blocking in restricted iframe or private browsing contexts
      });
  });
}

export function notifyServiceWorkerLogout(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_USER_CACHES' });
  } catch {
    // Ignore if no active service worker controller exists
  }
}
