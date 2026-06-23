import React from 'react';
import { Crown, Check, X } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import ModalFrame from './ModalFrame';

function formatModifier(value) {
  const safeValue = Number(value ?? 0) || 0;
  return safeValue >= 0 ? `+${safeValue}` : String(safeValue);
}

export default function PreparationOfferModal({ isOpen, preparation, onAccept, onReject }) {
  if (!isOpen || !preparation) return null;

  const statPills = [
    `HP ${Number(preparation.hp ?? 0)}/${Number(preparation.maxHp ?? preparation.hp ?? 0)}`,
    `AC ${Number(preparation.ac ?? 10)}`,
    `Init ${formatModifier(preparation.initMod)}`,
  ].concat((preparation.customStats || []).slice(0, 4).map((stat) => `${stat.name} ${stat.value}`));

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onReject}
      title="Rolvoorstel"
      subtitle={preparation.name || 'Naamloos personage'}
      icon={Crown}
      maxWidthClassName="max-w-xl"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="tv-profile-banner relative overflow-hidden border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] p-5">
          {preparation.subtitle ? (
            <p className="tv-text-sub mt-1 text-sm italic">{preparation.subtitle}</p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-5 p-5 md:grid-cols-[140px_minmax(0,1fr)] md:p-6">
            <div className="mx-auto h-[140px] w-[140px] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset shadow-inner">
              <img
                src={resolveDisplayAvatar(preparation.imageUrl, preparation.id)}
                alt={preparation.name || 'Voorbereid personage'}
                className="h-full w-full scale-[1.18] object-cover"
              />
            </div>

            <div>
              <p className="tv-meta text-sm leading-7">
                De GM biedt een voorbereid personage aan. Je profiel wordt bijgewerkt; inventaris en wallet blijven intact. Er wordt automatisch een herstelpunt gemaakt.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {statPills.map((pill) => (
                  <span
                    key={`${preparation.id}-${pill}`}
                    className="tv-chip-surface rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] tv-text-sub"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <div className="tv-panel-inset mt-4 rounded-xl p-4 text-sm leading-7 tv-text">
                {preparation.bio || <span className="italic tv-muted">Geen bio.</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="tv-modal-footer shrink-0 !justify-stretch sm:!justify-end">
          <button
            type="button"
            onClick={onReject}
            aria-label="Weigeren"
            className="tv-icon-btn tv-icon-btn--danger h-10 flex-1 sm:flex-none sm:px-4"
          >
            <X className="h-4 w-4" />
            <span className="ml-2 hidden text-xs font-fantasy uppercase tracking-[0.16em] sm:inline">Weiger</span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            aria-label="Rol accepteren"
            className="tv-button-primary flex h-10 flex-1 items-center justify-center gap-2 rounded-lg sm:flex-none sm:px-5"
          >
            <Check className="h-4 w-4" />
            <span className="text-sm font-fantasy uppercase tracking-[0.16em]">Aanvaard</span>
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
