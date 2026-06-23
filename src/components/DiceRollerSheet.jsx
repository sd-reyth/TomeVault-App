import React, { useEffect } from 'react';
import { Dice5, X } from 'lucide-react';
import DiceRoller from './DiceRoller';

export function getDiceThemeChrome() {
  return {
    triggerIdle: 'tv-text-sub hover:tv-panel-inset',
    triggerActive: 'tv-surface tv-text',
    surfaceBorder: 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)]',
    badge: 'tv-chip-surface tv-text-sub',
    title: 'tv-text',
    buttonHex: 'var(--tv-accent)',
    buttonGlow: 'var(--tv-shadow)',
  };
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
  subtitle = '',
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
      className="tv-backdrop fixed inset-0 z-50 flex items-end justify-center p-2 backdrop-blur-md sm:items-center sm:p-4"
      onClick={() => onClose?.()}
    >
      <div
        className={`tv-surface relative flex w-full max-w-md max-h-[min(720px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-[26px] shadow-[0_28px_90px_-30px_rgba(0,0,0,0.7)] overscroll-contain sm:max-h-[min(760px,calc(100dvh-2rem))] sm:max-w-lg sm:rounded-[32px] ${chrome.surfaceBorder}`}
        style={{
          backgroundImage: atmosphere.surfaceGradient,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`pointer-events-none absolute -top-20 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl ${atmosphere.glowClass}`} />

        <div className="tv-modal-header items-center">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-fantasy uppercase tracking-[0.18em] ${chrome.badge}`}>
              <Dice5 className="h-3.5 w-3.5" />
              Roller
            </span>
            <h3 className={`tv-title-section mt-3`}>{title}</h3>
            {subtitle ? <p className="tv-meta mt-1 max-w-xs">{subtitle}</p> : null}
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="tv-icon-btn shrink-0"
            aria-label="Sluit dobbelstenen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <DiceRoller embedded theme={theme} onRoll={onRoll} />
        </div>
      </div>
    </div>
  );
}
