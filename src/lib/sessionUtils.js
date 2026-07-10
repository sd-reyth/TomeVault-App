import i18n from '../i18n/index.js';
import { getIntlLocale } from './localeFormat.js';

export function slugifySessionName(name) {
  const trimmed = String(name || '').trim().slice(0, 48);
  const base = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 24)
    .replace(/^-+|-+$/g, '');
  return base || 'session';
}

export function normalizeJoinTagInput(value) {
  let normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
  normalized = normalized.replace(/-([0-9]{4,8})$/, '#$1');
  return normalized;
}

export function toSafeJoinTagForLink(value) {
  return normalizeJoinTagInput(value).replace(/#([0-9]{4,8})$/, '-$1');
}

export function toLegacyHashJoinTag(value) {
  return normalizeJoinTagInput(value).replace(/-([0-9]{4,8})$/, '#$1');
}

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function resolvePublicAppOrigin() {
  const configuredOrigin = trimTrailingSlash(import.meta.env?.VITE_PUBLIC_APP_ORIGIN || '');
  if (configuredOrigin) return configuredOrigin;

  if (typeof window !== 'undefined') {
    const host = String(window.location.hostname || '').toLowerCase();
    const runtimeOrigin = trimTrailingSlash(window.location.origin || '');
    if (runtimeOrigin && host !== 'localhost' && host !== '127.0.0.1') {
      return runtimeOrigin;
    }
  }

  return 'https://tomevaultapp.web.app';
}

export function buildSessionInviteUrl(joinTag, origin = '') {
  const resolvedOrigin = trimTrailingSlash(origin || resolvePublicAppOrigin());
  const safeCode = toSafeJoinTagForLink(joinTag);
  return `${resolvedOrigin}/?code=${encodeURIComponent(safeCode)}`;
}

export function formatCampaignDisplayName(name, fallbackKey = 'fallbacks.campaign') {
  const trimmed = String(name || '').trim();
  return trimmed || i18n.t(fallbackKey);
}

export function buildInviteShareText({ campaignName, joinTag, joinUrl }) {
  const displayName = formatCampaignDisplayName(campaignName, 'fallbacks.myCampaign');
  const canonicalCode = toLegacyHashJoinTag(joinTag);
  const resolvedUrl = joinUrl || buildSessionInviteUrl(joinTag);
  return i18n.t('session:invite.shareText', {
    campaignName: displayName,
    code: canonicalCode,
    url: resolvedUrl,
  });
}

export function buildWhatsAppShareUrl({ campaignName, joinTag, joinUrl }) {
  const text = buildInviteShareText({ campaignName, joinTag, joinUrl });
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function getJoinTagLookupVariants(value) {
  const normalized = normalizeJoinTagInput(value);
  if (!normalized) return [];
  return Array.from(new Set([
    normalized,
    toSafeJoinTagForLink(normalized),
    toLegacyHashJoinTag(normalized),
  ].filter(Boolean)));
}

export async function sha256(text) {
  const data = new TextEncoder().encode(String(text || ''));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function formatTime(date) {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDate(date, includeYear = false) {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
}

function formatWeekday(date) {
  const weekday = new Intl.DateTimeFormat(getIntlLocale(), { weekday: 'long' }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

export function formatLastEditedLabel(ts) {
  const ms = ts?.toMillis ? ts.toMillis() : Date.now();
  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) {
    return i18n.t('status.recent');
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((todayStart.getTime() - dateStart.getTime()) / 86400000);
  const timeLabel = formatTime(date);

  if (dayDifference <= 0) {
    return i18n.t('time.todayAt', { time: timeLabel });
  }

  if (dayDifference === 1) {
    const key = date.getHours() >= 18 ? 'time.yesterdayEveningAt' : 'time.yesterdayAt';
    return i18n.t(key, { time: timeLabel });
  }

  if (dayDifference < 7) {
    return i18n.t('time.weekdayAt', { weekday: formatWeekday(date), time: timeLabel });
  }

  const includeYear = date.getFullYear() !== now.getFullYear();
  return i18n.t('time.dateAt', {
    date: formatDate(date, includeYear),
    time: timeLabel,
  });
}
