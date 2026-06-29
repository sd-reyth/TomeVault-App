import { Map as MapIcon, Crown, Scroll, User } from 'lucide-react';

export const HANDOUT_TYPE_LABELS = {
  clue: 'Document',
  loot: 'Voorwerp',
  map: 'Kaart',
  npc: 'NPC',
};

export const HANDOUT_TYPE_OPTIONS = [
  { value: 'clue', label: 'Document' },
  { value: 'loot', label: 'Voorwerp' },
  { value: 'map', label: 'Kaart' },
  { value: 'npc', label: 'NPC' },
];

export function getHandoutTypeLabel(type) {
  return HANDOUT_TYPE_LABELS[String(type || '').toLowerCase()] || 'Document';
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
      label: 'Geen secret',
      hint: 'Voeg een GM secret toe via bewerken.',
    };
  }

  if (handout.secretRevealed === true) {
    return {
      canToggle: true,
      state: 'revealed',
      label: 'Party ziet het',
      hint: 'Spelers zien het GM secret. Klik om te verbergen.',
    };
  }

  return {
    canToggle: true,
    state: 'hidden',
    label: 'Alleen GM',
    hint: 'Alleen jij ziet het GM secret. Klik om het te onthullen aan spelers.',
  };
}

export const HANDOUT_SECRET_TOGGLE_ERRORS = {
  'no-gm': 'Alleen de GM kan secrets tonen of verbergen.',
  missing: 'Deze handout is even niet beschikbaar. Vernieuw de lijst of open de handout opnieuw.',
  'no-secret': 'Deze handout heeft geen GM secret. Bewerk de handout om er een toe te voegen.',
  'no-session': 'Geen actieve sessie — wijziging is alleen lokaal opgeslagen.',
  firestore: 'Opslaan mislukt. Controleer je verbinding en probeer opnieuw.',
};

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
  if (hours > 0) return `${hours} u ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return 'bijna verlopen';
}
