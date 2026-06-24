/** Single source of truth for in-app theme ids and picker metadata. */
export const APP_THEMES = [
  {
    value: 'ember-forge',
    label: 'Ember Forge',
    shortLabel: 'Ember',
    swatch: '#ff9d42',
    premium: false,
    qr: { dot: '#ff9d42', corner: '#c66514', bg: '#25160f' },
  },
  {
    value: 'dawn-parchment',
    label: 'Dawn Parchment',
    shortLabel: 'Dawn',
    swatch: '#9c6f2e',
    premium: false,
    qr: { dot: '#9c6f2e', corner: '#7c5420', bg: '#f8f1e3' },
  },
  {
    value: 'midnight-tome',
    label: 'Midnight Tome',
    shortLabel: 'Night',
    swatch: '#9f7dff',
    premium: true,
    qr: { dot: '#9f7dff', corner: '#7c3aed', bg: '#171320' },
  },
  {
    value: 'forest-scroll',
    label: 'Forest Scroll',
    shortLabel: 'Forest',
    swatch: '#6bc66b',
    premium: true,
    qr: { dot: '#6bc66b', corner: '#2f8f4d', bg: '#162019' },
  },
  {
    value: 'blood-moon',
    label: 'Blood Moon',
    shortLabel: 'Blood',
    swatch: '#c41e3a',
    premium: true,
    qr: { dot: '#ff6b86', corner: '#c41e3a', bg: '#1d1015' },
  },
];

export const DEFAULT_THEME = 'ember-forge';

export const LANDING_DEFAULT_THEME = 'ember-forge';

export function getThemeQrColors(themeId) {
  const match = APP_THEMES.find((entry) => entry.value === themeId);
  const fallback = APP_THEMES.find((entry) => entry.value === DEFAULT_THEME);
  return (match || fallback).qr;
}
