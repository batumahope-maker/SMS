
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
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

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<LanguageCode>('en');
  const [initialized, setInitialized] = useState(false);

  // Restore the saved language when the app first loads.
  useEffect(() => {
    const saved = localStorage.getItem('essjt_lang');

    if (
      saved &&
      languages.some((language) => language.code === saved)
    ) {
      setLangState(saved as LanguageCode);
    }

    setInitialized(true);
  }, []);

  // Save the selected language after initialization.
  useEffect(() => {
    if (!initialized) return;

    localStorage.setItem('essjt_lang', lang);
    document.documentElement.lang = lang;
  }, [lang, initialized]);

  function setLang(newLang: LanguageCode) {
    setLangState(newLang);
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
