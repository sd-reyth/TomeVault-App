import rustCampfireVideo from '../../Video/combat/rust-campfire.mp4';
import combatKnightsVideo from '../../Video/combat/combat-knights.mp4';
import pauseEmbersVideo from '../../Video/combat/pause-embers.mp4';

// Use URL strings for audio — vite-plugin-static-copy serves /audio/ in dev, which
// breaks ES module ?import handling (browser gets audio/mpeg instead of JS).
const rustAmbienceAudio = '/audio/Tavern - Ambience Only.mp3';
const pauseAmbienceAudio = '/audio/Forest - Ambience.mp3';
const combatAmbienceAudio = '/audio/Dungeon - Ambience.mp3';

/** @typedef {'idle' | 'paused' | 'combat'} CombatRoundMediaKey */

/**
 * @param {string} mode from getCombatRoundBarMode
 * @returns {CombatRoundMediaKey}
 */
export function resolveCombatRoundMediaKey(mode) {
  if (mode === 'idle') return 'idle';
  if (mode === 'paused') return 'paused';
  return 'combat';
}

/**
 * @type {Record<CombatRoundMediaKey, { video: string, layers: { src: string, gain: number }[], masterGain: number }>}
 */
export const COMBAT_ROUND_MEDIA_PROFILES = {
  idle: {
    video: rustCampfireVideo,
    layers: [
      { src: rustAmbienceAudio, gain: 1 },
    ],
    masterGain: 0.14,
  },
  paused: {
    video: pauseEmbersVideo,
    layers: [
      { src: pauseAmbienceAudio, gain: 1 },
    ],
    masterGain: 0.1,
  },
  combat: {
    video: combatKnightsVideo,
    layers: [
      { src: combatAmbienceAudio, gain: 1 },
    ],
    masterGain: 0.12,
  },
};

export function getCombatRoundMediaProfile(mode) {
  return COMBAT_ROUND_MEDIA_PROFILES[resolveCombatRoundMediaKey(mode)];
}
