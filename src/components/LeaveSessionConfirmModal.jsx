import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flame, LogOut, X } from 'lucide-react';
import Button from './Button';
import CampfireIllustration from '../ui/CampfireIllustration';

function CampfireHero() {
  return (
    <div className="tv-leave-campfire" aria-hidden="true">
      <span className="tv-leave-campfire__glow tv-leave-campfire__glow--outer" />
      <span className="tv-leave-campfire__glow tv-leave-campfire__glow--inner" />
      <CampfireIllustration className="tv-leave-campfire__art" size={58} />
    </div>
  );
}

export default function LeaveSessionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sessionLabel,
  sessionNumber,
  roleLabel,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center tv-backdrop p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_38%)] tv-surface shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-session-title"
      >
        <div className="tv-modal-top-glow pointer-events-none absolute inset-x-0 top-0 h-28 blur-[42px]" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 tv-muted transition-colors hover:tv-text"
          aria-label="Sluiten"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 px-6 pb-6 pt-8 text-center">
          <CampfireHero />

          <h3
            id="leave-session-title"
            className="mt-2 font-fantasy text-lg tracking-[0.12em] tv-text sm:text-xl"
          >
            Nog even bij het kampvuur?
          </h3>

          <p className="mx-auto mt-2 max-w-[26ch] font-story text-sm italic leading-relaxed tv-text-sub">
            Neem een pauze, of keer terug naar de hal.
          </p>

          <div className="mt-5">
            <div className="truncate font-fantasy text-base font-semibold tracking-[0.05em] tv-text">
              {sessionLabel}
            </div>
            <div className="mt-1 text-[11px] tv-muted">
              Sessie #{Math.max(1, Number(sessionNumber) || 1)} · {roleLabel}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Button variant="primary" block icon={Flame} onClick={onClose}>
              Blijf spelen
            </Button>
            <button
              type="button"
              onClick={onConfirm}
              className="tv-btn tv-button-ghost tv-btn--block gap-2 text-xs tv-muted transition-colors hover:tv-text-sub"
            >
              <LogOut className="h-3.5 w-3.5 opacity-70" />
              Vertrekken
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
