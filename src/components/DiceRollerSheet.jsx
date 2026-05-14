import React, { useEffect } from 'react';
import { Dice5, X } from 'lucide-react';
import DiceRoller from './DiceRoller';

const DICE_THEME_CHROME = {
  amber: {
    triggerIdle: 'text-stone-400 hover:bg-amber-950/20 hover:text-amber-300',
    triggerActive: 'border border-amber-700/50 bg-amber-950/35 text-amber-300',
    surfaceBorder: 'border-amber-900/30',
    badge: 'border-amber-700/40 bg-amber-950/35 text-amber-200',
    title: 'text-amber-100',
    buttonHex: '#d97706',
    buttonGlow: 'rgba(217, 119, 6, 0.34)',
  },
  purple: {
    triggerIdle: 'text-stone-300 hover:bg-amber-950/25 hover:text-amber-200',
    triggerActive: 'border border-amber-700/45 bg-amber-950/35 text-amber-200',
    surfaceBorder: 'border-amber-900/35',
    badge: 'border-amber-700/45 bg-amber-950/35 text-amber-100',
    title: 'text-amber-100',
    buttonHex: '#b45309',
    buttonGlow: 'rgba(180, 83, 9, 0.34)',
  },
  green: {
    triggerIdle: 'text-stone-400 hover:bg-emerald-950/25 hover:text-emerald-300',
    triggerActive: 'border border-emerald-700/50 bg-emerald-950/35 text-emerald-300',
    surfaceBorder: 'border-emerald-900/35',
    badge: 'border-emerald-700/40 bg-emerald-950/35 text-emerald-200',
    title: 'text-emerald-100',
    buttonHex: '#16a34a',
    buttonGlow: 'rgba(22, 163, 74, 0.34)',
  },
  light: {
    triggerIdle: 'text-stone-500 hover:bg-amber-100 hover:text-amber-800',
    triggerActive: 'border border-amber-400/60 bg-amber-100 text-amber-800',
    surfaceBorder: 'border-amber-300/70',
    badge: 'border-amber-400/50 bg-amber-100 text-amber-800',
    title: 'text-stone-900',
    buttonHex: '#b45309',
    buttonGlow: 'rgba(180, 83, 9, 0.26)',
  },
};

export function getDiceThemeChrome(theme) {
  return DICE_THEME_CHROME[theme] || DICE_THEME_CHROME.amber;
}

function getSheetAtmosphere(theme) {
  if (theme === 'purple') {
    return {
      surfaceGradient: 'linear-gradient(180deg, rgba(168, 85, 247, 0.14) 0%, rgba(9, 9, 11, 0.95) 42%)',
      glowClass: 'bg-violet-300/12',
    };
  }

  if (theme === 'green') {
    return {
      surfaceGradient: 'linear-gradient(180deg, rgba(52, 211, 153, 0.14) 0%, rgba(9, 9, 11, 0.95) 42%)',
      glowClass: 'bg-emerald-300/12',
    };
  }

  if (theme === 'light') {
    return {
      surfaceGradient: 'linear-gradient(180deg, rgba(251, 191, 36, 0.16) 0%, rgba(255, 251, 235, 0.92) 52%)',
      glowClass: 'bg-amber-300/18',
    };
  }

  return {
    surfaceGradient: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(9, 9, 11, 0.95) 42%)',
    glowClass: 'bg-amber-300/10',
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
  const chrome = getDiceThemeChrome(theme);
  const atmosphere = getSheetAtmosphere(theme);

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
        className={`relative w-full max-w-md overflow-hidden rounded-[28px] border bg-zinc-950/96 shadow-[0_28px_90px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md sm:rounded-[32px] ${chrome.surfaceBorder}`}
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

        <div className="px-5 pb-5 pt-4">
          <DiceRoller embedded theme={theme} onRoll={onRoll} />
        </div>
      </div>
    </div>
  );
}