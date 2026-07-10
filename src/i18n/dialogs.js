import i18n from './index.js';

export function t(key, options) {
  return i18n.t(key, options);
}

export function confirmDialog(key, options) {
  if (typeof window === 'undefined') return true;
  return window.confirm(i18n.t(key, options));
}

export function alertDialog(key, options) {
  if (typeof window === 'undefined') return;
  window.alert(i18n.t(key, options));
}
