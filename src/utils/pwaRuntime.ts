/**
 * Production PWA Service Worker registration, visibility update check,
 * and logout/recovery cache-purge helpers.
 * Strictly skipped on Separate Admin Application routes (/admin*).
 */

const SW_UPDATE_MIN_INTERVAL_MS = 5 * 60 * 1000;

export function registerLinguaVerseServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (window.location.pathname.startsWith('/admin')) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        let lastUpdateCheck = Date.now();

        const promptSkipWaiting = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        };

        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          promptSkipWaiting(registration.installing);
        });

        // Re-check for new deployments when returning to a long-lived tab
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return;
          const now = Date.now();
          if (now - lastUpdateCheck < SW_UPDATE_MIN_INTERVAL_MS) return;
          lastUpdateCheck = now;
          void registration.update().catch(() => {});
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

export async function purgeAllServiceWorkerCaches(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({ type: 'PURGE_ALL_CACHES' });
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.update().catch(() => {})));
    }
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
  } catch {
    // Best-effort cleanup
  }
}
