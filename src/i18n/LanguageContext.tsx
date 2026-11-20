import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UILanguage } from '../types/domain';
import { translations, type TranslationTree } from './translations';

const UI_LANG_STORAGE_KEY = 'linguaverse_ui_lang_v1';

interface LanguageContextValue {
  lang: UILanguage;
  setLang: (next: UILanguage) => void;
  toggleLang: () => void;
  t: TranslationTree;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(): UILanguage {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(UI_LANG_STORAGE_KEY);
  return saved === 'bn' ? 'bn' : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<UILanguage>(readInitialLanguage);

  const setLang = useCallback((next: UILanguage) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(UI_LANG_STORAGE_KEY, next);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: UILanguage = prev === 'en' ? 'bn' : 'en';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(UI_LANG_STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t: translations[lang],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
