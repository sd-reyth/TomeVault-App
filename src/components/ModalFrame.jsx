import React from 'react';
import { X } from 'lucide-react';

export default function ModalFrame({
  isOpen,
  onClose,
  title,
  icon: Icon,
  iconClassName = 'tv-accent h-5 w-5 shrink-0',
  subtitle = '',
  maxWidthClassName = 'max-w-sm',
  panelClassName = '',
  bodyClassName = '',
  backdropClassName = '',
  footer = null,
  footerClassName = '',
  mobileFullScreen = false,
  children,
}) {
  if (!isOpen) return null;

  const mobileFullClass = mobileFullScreen ? 'tv-backdrop--mobile-full' : '';
  const mobilePanelClass = mobileFullScreen ? 'tv-modal-panel--mobile-full' : '';

  return (
    <div className={`tv-backdrop fixed inset-0 z-50 flex items-end justify-center p-2 backdrop-blur-md sm:items-center sm:p-4 ${mobileFullClass} ${backdropClassName}`.trim()}>
      <div className={`tv-surface tv-text pointer-events-auto relative flex max-h-[calc(100dvh-1rem)] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-2xl transition-all duration-200 ease-out sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-center-0 ${mobilePanelClass} ${panelClassName}`.trim()}>
        <div className="tv-modal-top-glow pointer-events-none absolute inset-x-0 top-0 h-32 blur-[42px]" />

        <div className="tv-modal-header relative z-10 shrink-0">
          <div className="min-w-0">
            <h3 className="tv-title-section flex items-center gap-2">
              {Icon ? <Icon className={iconClassName} /> : null}
              <span className="truncate">{title}</span>
            </h3>
            {subtitle ? (
              <p className="tv-meta mt-1.5 max-w-md">{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="tv-icon-btn shrink-0"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={`tv-modal-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 ${bodyClassName}`}>
            {children}
          </div>
          {footer ? (
            <div className={`tv-modal-footer shrink-0 !justify-stretch ${footerClassName}`}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
