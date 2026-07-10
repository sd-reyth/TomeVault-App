import { getCurrentLocale } from '../i18n/index.js';

const INTL_LOCALE_MAP = {
  en: 'en-US',
  nl: 'nl-NL',
};

export function getIntlLocale(locale = getCurrentLocale()) {
  return INTL_LOCALE_MAP[locale] || INTL_LOCALE_MAP.en;
}

export function formatRelativeTime(value, unit = 'auto', options = {}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';

  const locale = getIntlLocale(options.locale);
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: options.numeric ?? 'auto',
    style: options.style ?? 'long',
  });

  if (unit !== 'auto') {
    return formatter.format(numericValue, unit);
  }

  const absValue = Math.abs(numericValue);
  if (absValue < 60) return formatter.format(numericValue, 'second');
  if (absValue < 3600) return formatter.format(Math.round(numericValue / 60), 'minute');
  if (absValue < 86400) return formatter.format(Math.round(numericValue / 3600), 'hour');
  if (absValue < 604800) return formatter.format(Math.round(numericValue / 86400), 'day');
  if (absValue < 2629800) return formatter.format(Math.round(numericValue / 604800), 'week');
  if (absValue < 31557600) return formatter.format(Math.round(numericValue / 2629800), 'month');
  return formatter.format(Math.round(numericValue / 31557600), 'year');
}

export function localeCompare(a, b, options = {}) {
  const locale = getIntlLocale(options.locale);
  return String(a ?? '').localeCompare(String(b ?? ''), locale, options);
}
