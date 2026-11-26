import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export function OfflineIndicator() {
  const { lang } = useLanguage();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      className="fixed bottom-16 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-950/95 px-3.5 py-2 text-xs font-semibold text-amber-100 shadow-lg backdrop-blur-md lg:bottom-4"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
      <span>
        {lang === 'bn'
          ? 'অফলাইন মোড — ক্যাশ করা ডেটা ব্যবহৃত হচ্ছে।'
          : 'Offline Mode — Cached workspace data is active.'}
      </span>
    </div>
  );
}
