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
