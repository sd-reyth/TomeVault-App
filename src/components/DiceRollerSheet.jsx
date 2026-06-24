import React, { useEffect } from 'react';
import { Dice5, X } from 'lucide-react';
import DiceRoller from './DiceRoller';

export default function DiceRollerSheet({
  isOpen,
  onClose,
  onRoll,
  title = 'Dobbelstenen',
  subtitle = '',
}) {
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
        className="tv-dice-sheet relative flex w-full max-w-md max-h-[min(720px,calc(100dvh-1rem))] flex-col overflow-hidden overscroll-contain sm:max-h-[min(760px,calc(100dvh-2rem))] sm:max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] blur-3xl" />

        <div className="tv-dice-sheet__header">
          <div className="min-w-0">
            <span className="tv-dice-sheet__badge">
              <Dice5 className="h-3.5 w-3.5" />
              Roller
            </span>
            <h3 className="tv-dice-sheet__title">{title}</h3>
            {subtitle ? <p className="tv-dice-sheet__subtitle">{subtitle}</p> : null}
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

        <div className="tv-dice-sheet__body">
          <DiceRoller embedded onRoll={onRoll} />
        </div>
      </div>
    </div>
  );
}
