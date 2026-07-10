import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  I18N_NAMESPACES,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from './constants.js';

const localeModules = import.meta.glob('./locales/*/*.json', { eager: true });

function buildResources() {
  const resources = { en: {}, nl: {} };

  for (const [path, module] of Object.entries(localeModules)) {
    const match = path.match(/\.\/locales\/(en|nl)\/(.+)\.json$/);
    if (!match) continue;
    const [, locale, namespace] = match;
    resources[locale][namespace] = module.default || module;
  }

  return resources;
}

let currentLocale = DEFAULT_LOCALE;

export function getCurrentLocale() {
  return currentLocale;
}

export function readStoredLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  } catch (_) {
    return DEFAULT_LOCALE;
  }
}

export function persistLocale(locale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (_) {
    // Ignore blocked storage.
  }
}

export function applyDocumentLocale(locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

const resources = buildResources();

i18n.use(initReactI18next).init({
  resources,
  lng: readStoredLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  ns: I18N_NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

currentLocale = i18n.language || DEFAULT_LOCALE;
applyDocumentLocale(currentLocale);

i18n.on('languageChanged', (lng) => {
  currentLocale = lng;
  applyDocumentLocale(lng);
});

export function bootstrapLocale() {
  const locale = readStoredLocale();
  applyDocumentLocale(locale);
  if (i18n.language !== locale) {
    return i18n.changeLanguage(locale);
  }
  return Promise.resolve(locale);
}

export default i18n;
