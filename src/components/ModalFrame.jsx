import React from 'react';
import { X } from 'lucide-react';

const TONE_STYLES = {
  dark: {
    panel: 'border-stone-700/50 bg-stone-900 text-stone-300',
    divider: 'border-stone-800/50',
    title: 'text-stone-200',
    subtitle: 'text-stone-400',
    close: 'border-stone-700/70 bg-stone-950/70 text-stone-400 hover:border-stone-600 hover:text-rose-300',
  },
  light: {
    panel: 'border-stone-200 bg-stone-50 text-stone-700',
    divider: 'border-stone-200',
    title: 'text-stone-700',
    subtitle: 'text-stone-500',
    close: 'border-stone-300/80 bg-white/85 text-stone-500 hover:border-stone-400 hover:text-rose-500',
  },
};

const ACCENT_STYLES = {
  amber: {
    glow: 'bg-amber-500/10',
    icon: 'text-amber-400',
  },
  purple: {
    glow: 'bg-violet-500/12',
    icon: 'text-violet-300',
  },
  emerald: {
    glow: 'bg-emerald-500/12',
    icon: 'text-emerald-300',
  },
  rose: {
    glow: 'bg-rose-500/10',
    icon: 'text-rose-400',
  },
  stone: {
    glow: 'bg-stone-400/10',
    icon: 'text-stone-400',
  },
  sky: {
    glow: 'bg-sky-500/10',
    icon: 'text-sky-400',
  },
};

export default function ModalFrame({
  isOpen,
  onClose,
  title,
  icon: Icon,
  subtitle = '',
  tone = 'dark',
  accent = 'amber',
  maxWidthClassName = 'max-w-sm',
  panelClassName = '',
  bodyClassName = '',
  children,
}) {
  if (!isOpen) return null;

  const toneStyles = TONE_STYLES[tone] || TONE_STYLES.dark;
  const accentStyles = ACCENT_STYLES[accent] || ACCENT_STYLES.amber;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/84 p-2 backdrop-blur-md sm:items-center sm:p-4">
      <div className={`relative flex max-h-[calc(100dvh-1rem)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-[1.5rem] border shadow-[0_24px_70px_rgba(0,0,0,0.36)] transition-all duration-200 ease-out sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.5rem] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-center-0 ${toneStyles.panel} ${panelClassName}`}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-32 ${accentStyles.glow} blur-[42px]`} />

        <div className={`relative z-10 flex shrink-0 items-start justify-between gap-3 border-b px-5 py-5 sm:px-6 ${toneStyles.divider}`}>
          <div className="min-w-0">
            <h3 className={`flex items-center gap-2 font-fantasy text-sm font-bold uppercase tracking-[0.16em] sm:text-[0.95rem] ${toneStyles.title}`}>
              {Icon ? <Icon className={`h-5 w-5 shrink-0 ${accentStyles.icon}`} /> : null}
              <span className="truncate">{title}</span>
            </h3>
            {subtitle ? (
              <p className={`mt-2 max-w-md text-sm font-story leading-relaxed ${toneStyles.subtitle}`}>{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ease-out hover:scale-105 active:scale-95 ${toneStyles.close}`}
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className={`relative z-10 flex flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}