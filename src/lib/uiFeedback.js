const UI_SOUNDS_STORAGE_KEY = 'tomevault:ui-sounds';

let audioContext = null;
let lastTapAt = 0;
let lastWriteAt = 0;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function ensureAudioReady() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function isUiSoundsEnabled() {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(UI_SOUNDS_STORAGE_KEY);
  if (raw === null) return true;
  return raw !== '0' && raw !== 'false';
}

export function setUiSoundsEnabled(enabled) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UI_SOUNDS_STORAGE_KEY, enabled ? '1' : '0');
}

function playTone({
  frequency,
  duration = 0.08,
  type = 'sine',
  gain = 0.045,
  attack = 0.004,
  release = 0.06,
  when = 0,
  filterFrequency = null,
  frequencyEnd = null,
}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + when;
  const stop = start + duration;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  let output = gainNode;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (frequencyEnd && frequencyEnd > 0) {
    oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, stop);
  }

  if (filterFrequency) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFrequency, start);
    filter.Q.setValueAtTime(0.9, start);
    oscillator.connect(filter);
    filter.connect(gainNode);
  } else {
    oscillator.connect(gainNode);
  }

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0001), start + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stop);

  output.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(stop + release);
}

function playPluck({
  frequency,
  gain = 0.032,
  when = 0,
  duration = 0.11,
  filterFrequency = null,
}) {
  playTone({
    frequency,
    frequencyEnd: frequency * 0.74,
    duration,
    type: 'triangle',
    gain,
    attack: 0.002,
    release: 0.05,
    when,
    filterFrequency: filterFrequency ?? frequency * 3.2,
  });
}

function playNoiseBurst({
  duration = 0.035,
  gain = 0.022,
  when = 0,
  centerFreq = 240,
  q = 0.85,
}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + when;
  const stop = start + duration;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(centerFreq, start);
  filter.Q.setValueAtTime(q, start);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, start);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stop);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(start);
  source.stop(stop + 0.01);
}

function playFilteredNoise({
  duration = 0.1,
  gain = 0.01,
  when = 0,
  filterType = 'bandpass',
  frequency = 1000,
  q = 0.8,
  frequencyEnd = null,
  attack = 0.008,
  release = 0.04,
}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + when;
  const stop = start + duration;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, start);
  if (frequencyEnd && frequencyEnd > 0) {
    filter.frequency.exponentialRampToValueAtTime(frequencyEnd, stop);
  }
  filter.Q.setValueAtTime(q, start);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0001), start + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stop);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(start);
  source.stop(stop + release);
}

function playBrassNote({ frequency, duration = 0.4, gain = 0.024, when = 0 }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + when;
  const stop = start + duration;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(frequency * 0.97, start);
  osc.frequency.linearRampToValueAtTime(frequency, start + 0.035);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(frequency * 2.2, start);
  filter.frequency.exponentialRampToValueAtTime(frequency * 5.5, start + 0.06);
  filter.frequency.exponentialRampToValueAtTime(frequency * 3, stop);
  filter.Q.setValueAtTime(1.8, start);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(gain, start + 0.045);
  gainNode.gain.setValueAtTime(gain * 0.78, start + duration * 0.55);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stop);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(start);
  osc.stop(stop + 0.12);

  playTone({
    frequency: frequency * 2,
    duration: duration * 0.75,
    type: 'sine',
    gain: gain * 0.12,
    attack: 0.04,
    release: 0.2,
    when,
    filterFrequency: frequency * 4.5,
  });
}

function playBell({ frequency, duration = 0.38, gain = 0.028, when = 0 }) {
  const partials = [
    { ratio: 1, weight: 1 },
    { ratio: 2.4, weight: 0.42 },
    { ratio: 3.5, weight: 0.22 },
    { ratio: 4.2, weight: 0.1 },
  ];

  partials.forEach(({ ratio, weight }) => {
    playTone({
      frequency: frequency * ratio,
      duration,
      type: 'sine',
      gain: gain * weight,
      attack: 0.001,
      release: duration * 0.85,
      when,
      filterFrequency: frequency * 5.5,
    });
  });
}

function playTapSound() {
  const now = Date.now();
  if (now - lastTapAt < 55) return;
  lastTapAt = now;
  playPaperRustle({ intensity: 0.45, when: 0 });
  playPluck({ frequency: 196, gain: 0.018, duration: 0.08 });
}

function playPaperRustle({ when = 0, intensity = 1 } = {}) {
  const gain = 0.013 * intensity;
  [1100, 1500, 2100, 1700, 1300].forEach((freq, index) => {
    playNoiseBurst({
      duration: 0.022 + Math.random() * 0.014,
      gain: gain * (0.65 + Math.random() * 0.45),
      when: when + index * 0.016,
      centerFreq: freq + Math.random() * 120,
      q: 0.55 + Math.random() * 0.25,
    });
  });
}

function playWriteSoundInner({ char = '' } = {}) {
  const code = char ? char.charCodeAt(0) : 97;
  const isSpace = /\s/.test(char);
  const toneShift = ((code % 13) - 6) * 24;
  const volume = isSpace ? 0.55 : 1;

  // Pencil/quill stroke: longer, warmer friction with a soft attack.
  playFilteredNoise({
    duration: 0.06 + Math.random() * 0.035,
    gain: 0.14 * volume,
    filterType: 'bandpass',
    frequency: 1450 + toneShift + Math.random() * 220,
    frequencyEnd: 1050 + toneShift * 0.35,
    q: 0.42,
    attack: 0.007,
    release: 0.045,
  });

  // Dry paper texture, kept broad and low enough to avoid a typewriter tick.
  playFilteredNoise({
    duration: 0.045 + Math.random() * 0.025,
    gain: 0.08 * volume,
    when: 0.006,
    filterType: 'lowpass',
    frequency: 2100 + Math.random() * 350,
    frequencyEnd: 1550 + Math.random() * 250,
    q: 0.35,
    attack: 0.006,
    release: 0.035,
  });

  if (!isSpace && Math.random() > 0.35) {
    // Tiny trailing scrape so repeated letters feel hand-written, not stamped.
    playFilteredNoise({
      duration: 0.025 + Math.random() * 0.018,
      gain: 0.055,
      when: 0.035 + Math.random() * 0.018,
      filterType: 'bandpass',
      frequency: 1900 + Math.random() * 450,
      frequencyEnd: 1250 + Math.random() * 220,
      q: 0.65,
      attack: 0.004,
      release: 0.022,
    });
  }
}

export function playWriteSound({ char = '' } = {}) {
  if (!isUiSoundsEnabled()) return;

  const now = Date.now();
  if (now - lastWriteAt < 12) return;
  lastWriteAt = now;

  try {
    const ctx = ensureAudioReady();
    if (!ctx) return;
    ctx.resume().catch(() => {});
    playWriteSoundInner({ char });
  } catch {
    // Audio is best-effort only.
  }
}

export function playWritingFromValueChange(previousValue = '', nextValue = '') {
  if (!isUiSoundsEnabled()) return;

  if (nextValue.length <= previousValue.length) return;

  if (nextValue.startsWith(previousValue)) {
    const inserted = nextValue.slice(previousValue.length);
    if (inserted.length === 1) {
      playWriteSound({ char: inserted });
      return;
    }
    if (inserted.length <= 3) {
      inserted.split('').forEach((char) => playWriteSound({ char }));
      return;
    }
    playPaperRustle({ intensity: 0.65 });
    return;
  }

  playWriteSound({ char: nextValue.at(-1) || 'a' });
}

export function playWritingFeedback(inputEvent, { previousValue = '', nextValue = '' } = {}) {
  if (!isUiSoundsEnabled()) return;

  primeUiAudio();

  const inputType = inputEvent?.inputType || '';

  if (
    inputType.startsWith('delete')
    || inputType === 'historyUndo'
    || inputType === 'historyRedo'
  ) {
    return;
  }

  if (
    inputType === 'insertFromPaste'
    || inputType === 'insertFromDrop'
    || inputType === 'insertReplacementText'
  ) {
    playPaperRustle({ intensity: 0.65 });
    return;
  }

  if (inputType === 'insertLineBreak') {
    playWriteSound({ char: '\n' });
    playPaperRustle({ intensity: 0.35 });
    return;
  }

  if (inputType === 'insertText') {
    const data = inputEvent.data || '';
    if (data.length === 1) {
      playWriteSound({ char: data });
      return;
    }
    if (data.length > 1) {
      playWriteSound({ char: data[0] });
      return;
    }
  }

  playWritingFromValueChange(previousValue, nextValue);
}

function playBookOpenSound() {
  playPaperRustle({ intensity: 1.1 });
  playFilteredNoise({
    duration: 0.14,
    gain: 0.006,
    when: 0.04,
    filterType: 'lowpass',
    frequency: 520,
    frequencyEnd: 280,
    q: 0.4,
  });
  playPluck({ frequency: 130, gain: 0.01, when: 0.06, duration: 0.1, filterFrequency: 360 });
}

function playPotionBrewSound() {
  playFilteredNoise({
    duration: 0.32,
    gain: 0.0035,
    filterType: 'highpass',
    frequency: 2200,
    q: 0.45,
  });
  [0, 0.08, 0.15, 0.24].forEach((when, index) => {
    playTone({
      frequency: 360 - index * 28 + Math.random() * 30,
      frequencyEnd: 170 + Math.random() * 35,
      duration: 0.065,
      type: 'sine',
      gain: 0.011,
      attack: 0.003,
      release: 0.045,
      when,
      filterFrequency: 1100,
    });
  });
  playBell({ frequency: 784, gain: 0.007, duration: 0.18, when: 0.26 });
}

function playCombatStartSound() {
  playTone({
    frequency: 73,
    duration: 0.16,
    type: 'triangle',
    gain: 0.018,
    attack: 0.001,
    release: 0.12,
    filterFrequency: 190,
  });
  [
    { frequency: 174.61, when: 0.06, duration: 0.48 },
    { frequency: 220, when: 0.34, duration: 0.58 },
    { frequency: 261.63, when: 0.58, duration: 0.72 },
    { frequency: 349.23, when: 0.78, duration: 0.95 },
  ].forEach(({ frequency, when, duration }) => {
    playBrassNote({ frequency, duration, gain: 0.022, when });
  });
}

function playCombatResumeSound() {
  playPaperRustle({ intensity: 0.75, when: 0 });
  playBrassNote({ frequency: 196, duration: 0.38, gain: 0.016, when: 0.1 });
}

function playCombatPauseSound() {
  const partials = [
    { ratio: 1, weight: 1 },
    { ratio: 1.41, weight: 0.52 },
    { ratio: 1.67, weight: 0.38 },
    { ratio: 2.14, weight: 0.26 },
    { ratio: 2.65, weight: 0.16 },
    { ratio: 3.01, weight: 0.1 },
  ];
  partials.forEach(({ ratio, weight }) => {
    playTone({
      frequency: 108 * ratio,
      duration: 1.75,
      type: 'sine',
      gain: 0.028 * weight,
      attack: 0.001,
      release: 1.55,
      filterFrequency: 880,
    });
  });
  playNoiseBurst({ duration: 0.05, gain: 0.006, when: 0, centerFreq: 1600, q: 1.8 });
}

function playCombatEndSound() {
  playTone({
    frequency: 55,
    duration: 1.5,
    type: 'sine',
    gain: 0.01,
    attack: 0.18,
    release: 0.9,
    filterFrequency: 110,
  });
  for (let i = 0; i < 8; i += 1) {
    playNoiseBurst({
      duration: 0.07 + Math.random() * 0.11,
      gain: 0.004 + Math.random() * 0.003,
      when: 0.1 + i * 0.11 + Math.random() * 0.05,
      centerFreq: 650 + Math.random() * 950,
      q: 1.1 + Math.random() * 0.7,
    });
  }
  playTone({
    frequency: 196,
    frequencyEnd: 98,
    duration: 0.95,
    type: 'triangle',
    gain: 0.007,
    attack: 0.06,
    release: 0.55,
    when: 0.35,
    filterFrequency: 480,
  });
  playFilteredNoise({
    duration: 0.55,
    gain: 0.004,
    when: 0.5,
    filterType: 'bandpass',
    frequency: 320,
    frequencyEnd: 180,
    q: 1.2,
  });
}

function playTurnSound() {
  // Heraldic horn call: open fifth, slow and ceremonial.
  playTone({
    frequency: 174.6,
    duration: 0.2,
    type: 'triangle',
    gain: 0.034,
    attack: 0.018,
    release: 0.12,
    filterFrequency: 620,
  });
  playTone({
    frequency: 261.6,
    duration: 0.24,
    type: 'triangle',
    gain: 0.028,
    attack: 0.02,
    release: 0.14,
    when: 0.16,
    filterFrequency: 720,
  });
}

function playDiceSound() {
  const hits = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < hits; i += 1) {
    const when = i * 0.028 + Math.random() * 0.02;
    playNoiseBurst({
      duration: 0.028 + Math.random() * 0.02,
      gain: 0.016 + Math.random() * 0.01,
      when,
      centerFreq: 140 + Math.random() * 220,
      q: 0.7 + Math.random() * 0.5,
    });
    if (Math.random() > 0.45) {
      playPluck({
        frequency: 90 + Math.random() * 40,
        gain: 0.012,
        when: when + 0.004,
        duration: 0.06,
        filterFrequency: 260,
      });
    }
  }
}

function playSuccessSound() {
  // Small hand-bell chime in a Dorian colour — one resonant strike, not a win jingle.
  playBell({ frequency: 392, gain: 0.03, duration: 0.42 });
  playTone({
    frequency: 523.25,
    duration: 0.28,
    type: 'sine',
    gain: 0.012,
    attack: 0.006,
    release: 0.22,
    when: 0.05,
    filterFrequency: 900,
  });
}

function playWarningSound() {
  // Low war drum / gong — dark and weighty.
  playTone({
    frequency: 92,
    duration: 0.18,
    type: 'triangle',
    gain: 0.038,
    attack: 0.012,
    release: 0.14,
    filterFrequency: 280,
  });
  playTone({
    frequency: 69,
    duration: 0.22,
    type: 'triangle',
    gain: 0.028,
    attack: 0.014,
    release: 0.16,
    when: 0.11,
    filterFrequency: 220,
  });
}

const SOUND_HANDLERS = {
  tap: playTapSound,
  turn: playTurnSound,
  dice: playDiceSound,
  success: playSuccessSound,
  warning: playWarningSound,
  paper: playPaperRustle,
  book: playBookOpenSound,
  write: () => playWriteSound({ char: 'a' }),
  potion: playPotionBrewSound,
  combatStart: playCombatStartSound,
  combatResume: playCombatResumeSound,
  combatPause: playCombatPauseSound,
  combatEnd: playCombatEndSound,
};

export function playUiSound(kind = 'tap') {
  if (!isUiSoundsEnabled()) return;
  const handler = SOUND_HANDLERS[kind] || SOUND_HANDLERS.tap;
  try {
    handler();
  } catch {
    // Audio is best-effort only.
  }
}

const FEEDBACK_VARIANTS = new Set(['accent', 'gold', 'danger', 'heal']);

export function flashFeedback(element, variant = 'accent') {
  if (!element || typeof document === 'undefined') return;

  const host = element.closest?.('[data-tv-feedback-root]') || element;
  const safeVariant = FEEDBACK_VARIANTS.has(variant) ? variant : 'accent';

  host.classList.add('tv-feedback-host');
  const sparkle = document.createElement('span');
  sparkle.className = `tv-feedback-sparkle tv-feedback-sparkle--${safeVariant}`;
  sparkle.setAttribute('aria-hidden', 'true');
  host.appendChild(sparkle);

  const cleanup = () => sparkle.remove();
  sparkle.addEventListener('animationend', cleanup, { once: true });
  window.setTimeout(cleanup, 900);
}

export function pulseClass(element, className, durationMs = 560) {
  if (!element || typeof document === 'undefined' || !className) return;
  element.classList.remove(className);
  // Force reflow so re-adding retriggers CSS animation.
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), durationMs);
}

export function playFeedback({ sound = 'tap', element = null, variant = 'accent', pulseClassName = null } = {}) {
  playUiSound(sound);
  if (element) flashFeedback(element, variant);
  if (element && pulseClassName) pulseClass(element, pulseClassName);
}

export function diceRollHasNat20(lines = []) {
  return lines.some(
    (line) => Number(line?.sides) === 20
      && Array.isArray(line?.rolls)
      && line.rolls.some((value) => Number(value) === 20)
  );
}

export function diceRollHasNat1(lines = []) {
  return lines.some(
    (line) => Number(line?.sides) === 20
      && Array.isArray(line?.rolls)
      && line.rolls.some((value) => Number(value) === 1)
  );
}

export function diceMessageHasNat20(parsed) {
  if (!parsed?.lines) return false;
  return diceRollHasNat20(parsed.lines);
}

export function primeUiAudio() {
  ensureAudioReady();
}

export function bindGlobalUiSounds(root = document) {
  if (!root || typeof root.addEventListener !== 'function') return () => {};

  const onPointerDown = (event) => {
    const target = event.target?.closest?.(
      '.tv-satisfy-pop, .tv-button-primary, .tv-icon-btn, .tv-tone-enemy-button, .tv-tone-ally-button, .tv-dice-roll-btn, .tv-chat-send-btn, [data-tv-sound]'
    );
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    const explicitSound = target.dataset?.tvSound;
    playUiSound(explicitSound || 'tap');
  };

  root.addEventListener('pointerdown', onPointerDown, true);
  return () => root.removeEventListener('pointerdown', onPointerDown, true);
}
