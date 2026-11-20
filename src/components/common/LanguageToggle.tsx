import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { UILanguage } from '../../types/domain';

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();
  const { user, profile, updateProfile } = useAuth();

  const handleSelect = (next: UILanguage) => {
    if (next === lang) return;
    setLang(next);
    if (user && profile) {
      updateProfile({ preferredUiLanguage: next }).catch(() => {
        // Local UI toggle already applied; ignore background persistence errors here.
      });
    }
  };

  return (
    <div
      role="group"
      aria-label="Interface language switcher"
      className="inline-flex items-center rounded-lg border border-slate-800 bg-[#111827] p-0.5 shrink-0"
    >
      <button
        type="button"
        onClick={() => handleSelect('en')}
        aria-pressed={lang === 'en'}
        className={`rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        } ${
          lang === 'en'
            ? 'bg-[#3B82F6] text-white'
            : 'text-slate-400 hover:text-slate-100'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleSelect('bn')}
        aria-pressed={lang === 'bn'}
        className={`font-bn rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        } ${
          lang === 'bn'
            ? 'bg-[#3B82F6] text-white'
            : 'text-slate-400 hover:text-slate-100'
        }`}
      >
        বাংলা
      </button>
    </div>
  );
}
