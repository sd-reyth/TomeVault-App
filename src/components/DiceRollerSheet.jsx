import React, { useEffect } from 'react';
import { Dice5, X } from 'lucide-react';
import DiceRoller from './DiceRoller';

const DICE_THEME_CHROME = {
  triggerIdle: 'tv-text-sub hover:bg-white/5',
  triggerActive: 'tv-surface tv-text',
  surfaceBorder: 'border-white/10',
  badge: 'border-white/15 bg-white/5 tv-text-sub',
  title: 'tv-text',
  buttonHex: 'var(--tv-accent)',
  buttonGlow: 'var(--tv-shadow)',
};

export function getDiceThemeChrome() {
  return DICE_THEME_CHROME;
}

function getSheetAtmosphere() {
  return {
    surfaceGradient: 'linear-gradient(180deg, color-mix(in srgb, var(--tv-accent), transparent 84%) 0%, color-mix(in srgb, var(--tv-bg-modal), #000 8%) 52%)',
    glowClass: 'tv-backdrop',
  };
}

export default function DiceRollerSheet({
  isOpen,
  onClose,
  onRoll,
  theme,
  title = 'Dobbelstenen',
  subtitle = 'Werp een snelle rol zonder de tafel te verlaten.',
}) {
  const chrome = getDiceThemeChrome();
  const atmosphere = getSheetAtmosphere();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/82 p-3 backdrop-blur-md sm:items-center sm:p-5"
      onClick={() => onClose?.()}
    >
      <div
        className={`relative flex w-full max-w-md max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] border bg-zinc-950/96 shadow-[0_28px_90px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[32px] ${chrome.surfaceBorder}`}
        style={{
          backgroundImage: atmosphere.surfaceGradient,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`pointer-events-none absolute -top-20 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl ${atmosphere.glowClass}`} />
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-fantasy uppercase tracking-[0.18em] ${chrome.badge}`}>
              <Dice5 className="h-3.5 w-3.5" />
              Gedeelde roller
            </span>
            <h3 className={`mt-3 text-lg font-semibold tracking-[0.12em] ${chrome.title}`}>{title}</h3>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-stone-300">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-400 transition-all duration-200 ease-out hover:bg-white/8 hover:text-stone-100 active:scale-[0.985]"
            aria-label="Sluit dobbelstenen"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
          <DiceRoller embedded theme={theme} onRoll={onRoll} />
        </div>
      </div>
    </div>
  );
}