import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { getCurrentLocale, persistLocale, readStoredLocale } from './index.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './constants.js';

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => readStoredLocale());

  const setLocale = useCallback((nextLocale) => {
    const resolved = SUPPORTED_LOCALES.includes(nextLocale) ? nextLocale : DEFAULT_LOCALE;
    persistLocale(resolved);
    setLocaleState(resolved);
    i18n.changeLanguage(resolved);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export { getCurrentLocale };
