const UI_SOUNDS_STORAGE_KEY = 'tomevault:ui-sounds';

let audioContext = null;
let lastTapAt = 0;

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
  // Muted lute / parchment pluck — warm and low, not a bright UI beep.
  playPluck({ frequency: 196, gain: 0.026, duration: 0.09 });
  playPluck({ frequency: 294, gain: 0.01, when: 0.004, duration: 0.07 });
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
  getAudioContext();
}

export function bindGlobalUiSounds(root = document) {
  if (!root || typeof root.addEventListener !== 'function') return () => {};

  const onPointerDown = (event) => {
    const target = event.target?.closest?.(
      '.tv-satisfy-pop, .tv-button-primary, .tv-icon-btn, .tv-tone-enemy-button, .tv-tone-ally-button, .tv-dice-roll-btn, .tv-chat-send-btn'
    );
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    playUiSound('tap');
  };

  root.addEventListener('pointerdown', onPointerDown, true);
  return () => root.removeEventListener('pointerdown', onPointerDown, true);
}
