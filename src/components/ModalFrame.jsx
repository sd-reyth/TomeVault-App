import React from 'react';
import { X } from 'lucide-react';

export default function ModalFrame({
  isOpen,
  onClose,
  title,
  icon: Icon,
  subtitle = '',
  maxWidthClassName = 'max-w-sm',
  panelClassName = '',
  bodyClassName = '',
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="tv-backdrop fixed inset-0 z-50 flex items-end justify-center p-2 backdrop-blur-md sm:items-center sm:p-4">
      <div className={`tv-surface tv-text relative flex max-h-[calc(100dvh-1rem)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-[1.5rem] transition-all duration-200 ease-out sm:max-h-[calc(100dvh-2rem)] sm:rounded-[1.5rem] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-center-0 ${panelClassName}`}>
        <div className="tv-modal-top-glow pointer-events-none absolute inset-x-0 top-0 h-32 blur-[42px]" />

        <div className="relative z-10 flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h3 className="tv-text flex items-center gap-2 font-fantasy text-sm font-bold uppercase tracking-[0.16em] sm:text-[0.95rem]">
              {Icon ? <Icon className="tv-accent h-5 w-5 shrink-0" /> : null}
              <span className="truncate">{title}</span>
            </h3>
            {subtitle ? (
              <p className="tv-text-sub mt-2 max-w-md text-sm leading-relaxed">{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="tv-button-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-105 active:scale-95"
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
