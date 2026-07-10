import { Map as MapIcon, Crown, Scroll, User } from 'lucide-react';
import i18n from '../i18n/index.js';

const HANDOUT_TYPE_VALUES = ['clue', 'loot', 'map', 'npc'];

const HANDOUT_SECRET_TOGGLE_ERROR_KEYS = {
  'no-gm': 'handouts:secretToggle.errors.no-gm',
  missing: 'handouts:secretToggle.errors.missing',
  'no-secret': 'handouts:secretToggle.errors.no-secret',
  'no-session': 'handouts:secretToggle.errors.no-session',
  firestore: 'handouts:secretToggle.errors.firestore',
};

export function getHandoutTypeOptions() {
  return HANDOUT_TYPE_VALUES.map((value) => ({
    value,
    label: i18n.t(`handouts:types.${value}`),
  }));
}

export function getHandoutTypeLabel(type) {
  const normalized = String(type || '').toLowerCase();
  if (HANDOUT_TYPE_VALUES.includes(normalized)) {
    return i18n.t(`handouts:types.${normalized}`);
  }
  return i18n.t('handouts:types.clue');
}

/**
 * Resolve which player "owns" a handout for inventory purposes.
 * A handout belongs to a player when they claimed it, or when the GM
 * assigned it to them. Claiming takes precedence over assignment.
 */
export function getHandoutOwnerId(handout) {
  if (!handout) return null;
  return handout.claimedBy || handout.assignedToUid || null;
}

/** True when a handout sits with a player (claimed or GM-assigned). */
export function isHandoutAtPlayer(handout) {
  return Boolean(getHandoutOwnerId(handout));
}

export function getHandoutIcon(type) {
  switch(type) {
    case 'map': return MapIcon;
    case 'loot': return Crown;
    case 'clue': return Scroll;
    case 'npc': return User;
    default: return Scroll;
  }
}

/** Normalized GM secret text from any supported handout shape. */
export function resolveHandoutSecret(handout) {
  if (!handout) return '';
  return String(handout.secret ?? handout.secretContent ?? '').trim();
}

export function handoutHasSecret(handout) {
  return resolveHandoutSecret(handout).length > 0;
}

/** Labels + hints for the GM secret visibility control. */
export function getHandoutSecretToggleMeta(handout) {
  if (!handoutHasSecret(handout)) {
    return {
      canToggle: false,
      state: 'missing',
      label: i18n.t('handouts:secretToggle.meta.noSecret'),
      hint: i18n.t('handouts:secretToggle.meta.noSecretHint'),
    };
  }

  if (handout.secretRevealed === true) {
    return {
      canToggle: true,
      state: 'revealed',
      label: i18n.t('handouts:secretToggle.meta.partySees'),
      hint: i18n.t('handouts:secretToggle.meta.partySeesHint'),
    };
  }

  return {
    canToggle: true,
    state: 'hidden',
    label: i18n.t('handouts:secretToggle.meta.gmOnly'),
    hint: i18n.t('handouts:secretToggle.meta.gmOnlyHint'),
  };
}

export function getHandoutSecretToggleError(reason) {
  const key = HANDOUT_SECRET_TOGGLE_ERROR_KEYS[reason];
  return i18n.t(key || 'handouts:secretToggle.errors.unknown');
}

/** Soft-deleted handouts stay recoverable for 24 hours. */
export const HANDOUT_TRASH_RETENTION_MS = 24 * 60 * 60 * 1000;

export function isHandoutDeleted(handout) {
  return Boolean(handout?.deletedAtMs);
}

export function getHandoutTrashExpiresMs(handout) {
  if (handout?.deletedExpiresAtMs) return Number(handout.deletedExpiresAtMs);
  if (handout?.deletedAtMs) return Number(handout.deletedAtMs) + HANDOUT_TRASH_RETENTION_MS;
  return null;
}

export function isHandoutTrashExpired(handout) {
  const expires = getHandoutTrashExpiresMs(handout);
  if (!expires) return false;
  return Date.now() >= expires;
}

export function isHandoutInTrash(handout) {
  return isHandoutDeleted(handout) && !isHandoutTrashExpired(handout);
}

export function formatHandoutTrashRemaining(handout, now = Date.now()) {
  const expires = getHandoutTrashExpiresMs(handout);
  if (!expires) return '';
  const ms = Math.max(0, expires - now);
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) {
    return i18n.t('handouts:trash.remainingHours', { hours, minutes });
  }
  if (minutes > 0) {
    return i18n.t('handouts:trash.remainingMinutes', { minutes });
  }
  return i18n.t('handouts:trash.almostExpired');
}
