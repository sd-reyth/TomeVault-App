import { useEffect, useRef, useState } from 'react';
import { getCombatRoundMediaProfile } from '../../lib/combatAmbientLibrary';
import { safeLocalStorageGet, safeLocalStorageSet } from '../../lib/browserStorage';

const ENABLED_KEY = 'tomevault.combatRoundAmbience.enabled';
const VOLUME_KEY = 'tomevault.combatRoundAmbience.volume';

function readEnabled() {
  const stored = safeLocalStorageGet(ENABLED_KEY);
  return stored !== 'false';
}

function readVolume() {
  const stored = Number(safeLocalStorageGet(VOLUME_KEY));
  return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 1;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useCombatRoundAmbience({ mode, isActive }) {
  const videoRef = useRef(null);
  const audioLayersRef = useRef([]);
  const audioUnlockedRef = useRef(false);
  const activeMediaKeyRef = useRef(null);
  const [mediaEnabled] = useState(readEnabled);
  const [volumeMultiplier] = useState(readVolume);
  const [needsGesture, setNeedsGesture] = useState(false);
  const reducedMotion = prefersReducedMotion();
  const ambienceAllowed = mediaEnabled && !reducedMotion;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const unlock = () => {
      audioUnlockedRef.current = true;
      setNeedsGesture(false);
    };

    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    if (!ambienceAllowed || !isActive) {
      audioLayersRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      if (videoRef.current) videoRef.current.pause();
      return undefined;
    }

    const profile = getCombatRoundMediaProfile(mode);
    const mediaKey = `${profile.video}|${profile.layers.map((l) => l.src).join(',')}`;

    if (activeMediaKeyRef.current !== mediaKey) {
      audioLayersRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioLayersRef.current = profile.layers.map((layer) => {
        const audio = new Audio(layer.src);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = profile.masterGain * layer.gain * volumeMultiplier;
        return audio;
      });
      activeMediaKeyRef.current = mediaKey;
    } else {
      audioLayersRef.current.forEach((audio, index) => {
        const layer = profile.layers[index];
        if (!layer) return;
        audio.volume = profile.masterGain * layer.gain * volumeMultiplier;
      });
    }

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }

    const playAudio = async () => {
      if (!audioUnlockedRef.current) {
        setNeedsGesture(true);
        return;
      }

      try {
        await Promise.all(audioLayersRef.current.map((audio) => audio.play()));
        setNeedsGesture(false);
      } catch {
        setNeedsGesture(true);
      }
    };

    playAudio();

    return undefined;
  }, [ambienceAllowed, isActive, mode, volumeMultiplier]);

  useEffect(() => () => {
    audioLayersRef.current.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    audioLayersRef.current = [];
  }, []);

  const persistEnabled = (next) => {
    safeLocalStorageSet(ENABLED_KEY, String(next));
  };

  const persistVolume = (next) => {
    safeLocalStorageSet(VOLUME_KEY, String(next));
  };

  return {
    videoRef,
    ambienceAllowed,
    needsGesture,
    mediaEnabled,
    volumeMultiplier,
    persistEnabled,
    persistVolume,
  };
}
