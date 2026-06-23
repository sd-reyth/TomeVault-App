const VERIFIED_AMBIENCE_TRACKS = [
  {
    id: 'tavern',
    scene: 'Herberg',
    title: 'Tavern - Music and Ambience',
    subtitle: 'Warme snaarinstrumenten, glasgerinkel en rustig geroezemoes.',
    filePath: '/audio/Tavern - Music and Ambience.mp3',
    accentTone: 'warm',
    source: {
      creator: 'Vlad Bakutov',
      platform: 'Pixabay',
      license: 'Pixabay License',
      url: 'https://pixabay.com/nl/music/volk-medieval-citytavern-ambient-235876/',
      thankYou: 'Dank aan Vlad Bakutov voor de herberg-sfeer.',
    },
  },
  {
    id: 'forest',
    scene: 'Bosrand',
    title: 'Forest - Ambience',
    subtitle: 'Voorjaarswind, vogels en een open veldrand in de verte.',
    filePath: '/audio/Forest - Ambience.mp3',
    accentTone: 'forest',
    source: {
      creator: 'klankbeeld',
      platform: 'Freesound',
      license: 'Attribution 4.0',
      url: 'https://freesound.org/s/625588/',
      thankYou: 'Dank aan klankbeeld voor het frisse buitengevoel.',
    },
  },
  {
    id: 'dungeon',
    scene: 'Kerker',
    title: 'Dungeon - Ambience',
    subtitle: 'Diepe galm, vochtige stenen en ondergrondse spanning.',
    filePath: '/audio/Dungeon - Ambience.mp3',
    accentTone: 'dungeon',
    source: {
      creator: 'phlair',
      platform: 'Freesound',
      license: 'Attribution 3.0',
      url: 'https://freesound.org/s/388340/',
      thankYou: 'Dank aan phlair voor de claustrofobische kerkerlaag.',
    },
  },
  {
    id: 'ocean',
    scene: 'Kust',
    title: 'Ocean - Ambience',
    subtitle: 'Constante branding voor kades, kliffen en zeereizen.',
    filePath: '/audio/Ocean - Ambience.mp3',
    accentTone: 'ocean',
    source: {
      creator: 'Profispiesser',
      platform: 'Freesound',
      license: 'Creative Commons 0',
      url: 'https://freesound.org/s/550915/',
      thankYou: 'Dank aan Profispiesser voor de kustlijn en branding.',
    },
  },
];

const ARCHIVED_AMBIENCE_TRACKS = [
  {
    id: 'battle',
    scene: 'Gevecht',
    title: 'Battle - Music',
    status: 'Bronvermelding nog niet met zekerheid bevestigd.',
  },
  {
    id: 'mysterious',
    scene: 'Mysterie',
    title: 'Mysterious - Music and Ambience',
    status: 'Track verborgen tot de creator en bron-URL bevestigd zijn.',
  },
];

export const DEFAULT_AMBIENCE_STATE = {
  trackId: VERIFIED_AMBIENCE_TRACKS[0].id,
  isPlaying: false,
  masterVolume: 58,
  fadeMs: 700,
  startedAtMs: null,
  updatedBy: null,
};

export function clampAmbienceVolume(value, fallback = DEFAULT_AMBIENCE_STATE.masterVolume) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function getVerifiedAmbienceTracks() {
  return VERIFIED_AMBIENCE_TRACKS;
}

export function getArchivedAmbienceTracks() {
  return ARCHIVED_AMBIENCE_TRACKS;
}

export function getAmbienceTrackById(trackId) {
  return VERIFIED_AMBIENCE_TRACKS.find((entry) => entry.id === trackId) || VERIFIED_AMBIENCE_TRACKS[0];
}

export function normalizeAmbienceState(value) {
  const raw = value || {};
  const trackId = String(raw.trackId || raw.track || DEFAULT_AMBIENCE_STATE.trackId).trim();
  const resolvedTrack = getAmbienceTrackById(trackId);
  const legacyVolume = Number(raw.masterVolume ?? raw.volume ?? DEFAULT_AMBIENCE_STATE.masterVolume);
  const normalizedVolume = legacyVolume <= 1
    ? clampAmbienceVolume(legacyVolume * 100)
    : clampAmbienceVolume(legacyVolume);
  const startedAtMs = raw.startedAt?.toMillis
    ? raw.startedAt.toMillis()
    : (Number.isFinite(Number(raw.startedAtMs)) ? Number(raw.startedAtMs) : null);

  return {
    trackId: resolvedTrack.id,
    isPlaying: raw.isPlaying === true,
    masterVolume: normalizedVolume,
    fadeMs: Math.max(0, Number(raw.fadeMs ?? DEFAULT_AMBIENCE_STATE.fadeMs) || DEFAULT_AMBIENCE_STATE.fadeMs),
    startedAtMs,
    updatedBy: typeof raw.updatedBy === 'string' && raw.updatedBy.trim() ? raw.updatedBy.trim() : null,
  };
}

export function buildAmbienceSessionPatch(nextAmbience, { includeStartedAt = false } = {}) {
  const normalized = normalizeAmbienceState(nextAmbience);
  const patch = {
    trackId: normalized.trackId,
    track: normalized.trackId,
    isPlaying: normalized.isPlaying,
    masterVolume: normalized.masterVolume,
    volume: Number((normalized.masterVolume / 100).toFixed(2)),
    fadeMs: normalized.fadeMs,
    updatedBy: normalized.updatedBy || null,
  };

  if (includeStartedAt) {
    patch.startedAtMs = normalized.startedAtMs;
  }

  return patch;
}
