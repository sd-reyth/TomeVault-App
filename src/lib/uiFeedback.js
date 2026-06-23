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
}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + when;
  const stop = start + duration;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0001), start + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stop);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(stop + release);
}

function playTapSound() {
  const now = Date.now();
  if (now - lastTapAt < 55) return;
  lastTapAt = now;
  playTone({ frequency: 520, duration: 0.05, type: 'triangle', gain: 0.028 });
  playTone({ frequency: 780, duration: 0.04, type: 'sine', gain: 0.018, when: 0.012 });
}

function playTurnSound() {
  playTone({ frequency: 392, duration: 0.1, type: 'triangle', gain: 0.04 });
  playTone({ frequency: 523, duration: 0.12, type: 'sine', gain: 0.035, when: 0.08 });
  playTone({ frequency: 659, duration: 0.14, type: 'sine', gain: 0.03, when: 0.16 });
}

function playDiceSound() {
  [0, 0.03, 0.06, 0.1].forEach((when, index) => {
    playTone({
      frequency: 180 + index * 42 + Math.random() * 24,
      duration: 0.05,
      type: 'square',
      gain: 0.02,
      when,
    });
  });
}

function playSuccessSound() {
  playTone({ frequency: 523, duration: 0.1, type: 'sine', gain: 0.035 });
  playTone({ frequency: 784, duration: 0.14, type: 'sine', gain: 0.03, when: 0.09 });
}

function playWarningSound() {
  playTone({ frequency: 220, duration: 0.12, type: 'triangle', gain: 0.04 });
  playTone({ frequency: 165, duration: 0.14, type: 'triangle', gain: 0.03, when: 0.1 });
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

export function primeUiAudio() {
  getAudioContext();
}

export function bindGlobalUiSounds(root = document) {
  if (!root || typeof root.addEventListener !== 'function') return () => {};

  const onPointerDown = (event) => {
    const target = event.target?.closest?.(
      '.tv-satisfy-pop, .tv-button-primary, .tv-icon-btn, .tv-tone-enemy-button, .tv-tone-ally-button'
    );
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    playUiSound('tap');
  };

  root.addEventListener('pointerdown', onPointerDown, true);
  return () => root.removeEventListener('pointerdown', onPointerDown, true);
}
