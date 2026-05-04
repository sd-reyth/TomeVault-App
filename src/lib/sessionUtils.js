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

export function formatLastEditedLabel(ts) {
  const ms = ts?.toMillis ? ts.toMillis() : Date.now();
  return new Date(ms).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPersonalTestJoinTag(uid) {
  const safeUid = String(uid || 'guest').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const shard = safeUid.slice(0, 6) || 'guest';
  return `test-${shard}#0000`;
}
