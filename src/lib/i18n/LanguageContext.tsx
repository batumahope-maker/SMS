
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  LanguageCode,
  languages,
  translations,
} from './translations';

interface LanguageContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LANGUAGE_STORAGE_KEY = 'essjt_lang';

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

function isLanguageCode(value: string | null): value is LanguageCode {
  return (
    typeof value === 'string' &&
    languages.some((language) => language.code === value)
  );
}

/**
 * The selected language is stored in localStorage, so it is modelled as an
 * external store: React reads it through useSyncExternalStore instead of
 * copying it into component state with an effect. This keeps the same
 * behaviour as before (server renders English, the saved language is applied
 * after hydration) without a cascading render.
 */
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): LanguageCode {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguageCode(saved) ? saved : 'en';
}

function getServerSnapshot(): LanguageCode {
  return 'en';
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Keep the document language in step with the selected language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(newLang: LanguageCode) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    // localStorage changes do not fire a storage event in the same tab.
    for (const listener of listeners) listener();
  }

  function t(key: string): string {
    return (
      translations[lang][key] ||
      translations.en[key] ||
      key.split('.').pop() ||
      key
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
