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
    triggerIdle: 'text-stone-400 hover:bg-violet-950/25 hover:text-violet-300',
    triggerActive: 'border border-violet-700/50 bg-violet-950/35 text-violet-300',
    surfaceBorder: 'border-violet-900/35',
    badge: 'border-violet-700/40 bg-violet-950/35 text-violet-200',
    title: 'text-violet-100',
    buttonHex: '#7c3aed',
    buttonGlow: 'rgba(124, 58, 237, 0.34)',
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

export default function DiceRollerSheet({
  isOpen,
  onClose,
  onRoll,
  theme,
  title = 'Dobbelstenen',
  subtitle = 'Werp een snelle rol zonder de tafel te verlaten.',
}) {
  const chrome = getDiceThemeChrome(theme);

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/72 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={() => onClose?.()}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-[26px] border bg-stone-950/98 shadow-[0_28px_90px_-40px_rgba(0,0,0,0.8)] sm:rounded-[30px] ${chrome.surfaceBorder}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex items-start justify-between gap-4 border-b border-stone-800/70 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-fantasy uppercase tracking-[0.18em] ${chrome.badge}`}>
              <Dice5 className="h-3.5 w-3.5" />
              Gedeelde roller
            </span>
            <h3 className={`mt-3 font-fantasy text-lg tracking-[0.14em] ${chrome.title}`}>{title}</h3>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-stone-400">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-700/70 bg-stone-900/80 text-stone-400 transition-colors hover:border-stone-600 hover:text-stone-200"
            aria-label="Sluit dobbelstenen"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <DiceRoller embedded theme={theme} onRoll={onRoll} />
        </div>
      </div>
    </div>
  );
}