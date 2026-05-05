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
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDate(date, includeYear = false) {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
}

function formatWeekday(date) {
  const weekday = new Intl.DateTimeFormat('nl-NL', { weekday: 'long' }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

export function formatLastEditedLabel(ts) {
  const ms = ts?.toMillis ? ts.toMillis() : Date.now();
  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) {
    return 'Onlangs';
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((todayStart.getTime() - dateStart.getTime()) / 86400000);
  const timeLabel = formatTime(date);

  if (dayDifference <= 0) {
    return `Vandaag om ${timeLabel}`;
  }

  if (dayDifference === 1) {
    return `${date.getHours() >= 18 ? 'Gisteravond' : 'Gisteren'} om ${timeLabel}`;
  }

  if (dayDifference < 7) {
    return `${formatWeekday(date)} om ${timeLabel}`;
  }

  const includeYear = date.getFullYear() !== now.getFullYear();
  return `${formatDate(date, includeYear)} om ${timeLabel}`;
}
