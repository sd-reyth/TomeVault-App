import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flame, LogOut, X } from 'lucide-react';
import Button from './Button';
import CampfireIllustration from '../ui/CampfireIllustration';
import { useT } from '../i18n/useT';

function CampfireScene() {
  return (
    <div className="tv-leave-scene" aria-hidden="true">
      <div className="tv-leave-scene__sky" />
      <div className="tv-leave-scene__glow" />
      <CampfireIllustration className="tv-leave-scene__fire" size={108} />
      <span className="tv-leave-ember" />
      <span className="tv-leave-ember" />
      <span className="tv-leave-ember" />
      <span className="tv-leave-ember" />
      <span className="tv-leave-ember" />
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
  theme = 'ember-forge',
}) {
  const { t } = useT('session');

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
      data-theme={theme}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="tv-leave-modal relative w-full max-w-sm overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_38%)] tv-surface shadow-[0_28px_80px_rgba(0,0,0,0.5)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-session-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="tv-leave-close absolute right-3 top-3 z-20"
          aria-label={t('common:actions.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <CampfireScene />

        <div className="relative z-10 px-6 pb-6 pt-5 text-center">
          <h3
            id="leave-session-title"
            className="font-fantasy text-xl tracking-[0.1em] tv-text"
          >
            {t('leaveConfirm.title')}
          </h3>

          <p className="mx-auto mt-2 max-w-[30ch] font-story text-sm italic leading-relaxed tv-text-sub">
            {t('leaveConfirm.body')}
          </p>

          <div className="tv-leave-session">
            <span className="tv-leave-session__rule" />
            <Flame className="tv-leave-session__flame h-3.5 w-3.5 shrink-0" />
            <span className="tv-leave-session__rule" />
          </div>

          <div className="truncate font-fantasy text-base font-semibold tracking-[0.05em] tv-text">
            {sessionLabel}
          </div>
          <div className="mt-1 text-[11px] tracking-[0.04em] tv-muted">
            {t('leaveConfirm.sessionMeta', {
              number: Math.max(1, Number(sessionNumber) || 1),
              role: roleLabel,
            })}
          </div>

          <div className="mt-6 space-y-2">
            <Button variant="primary" block icon={Flame} onClick={onClose}>
              {t('leaveConfirm.stay')}
            </Button>
            <button
              type="button"
              onClick={onConfirm}
              className="tv-btn tv-button-ghost tv-btn--block gap-2 text-xs tv-muted transition-colors hover:tv-text-sub"
            >
              <LogOut className="h-3.5 w-3.5 opacity-70" />
              {t('leaveConfirm.leave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
