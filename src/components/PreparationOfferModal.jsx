import React from 'react';
import { Crown } from 'lucide-react';
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
      subtitle="Een rol ligt voor je klaar. Bekijk eerst wat er verandert voordat je accepteert."
      icon={Crown}
      accent="amber"
      maxWidthClassName="max-w-xl"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-amber-950/20 p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_40%)]"/>
          <div className="relative z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
            <Crown className="h-3.5 w-3.5" />
            Een rol ligt voor je klaar
          </div>
          <h2 className="relative z-10 mt-3 font-fantasy text-2xl tracking-[0.08em] text-stone-100">{preparation.name || 'Naamloos personage'}</h2>
          {preparation.subtitle ? (
            <p className="relative z-10 mt-1 text-sm italic text-stone-400">{preparation.subtitle}</p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-5 p-5 md:grid-cols-[140px_minmax(0,1fr)] md:p-6">
            <div className="mx-auto h-[140px] w-[140px] overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 shadow-inner">
              <img
                src={resolveDisplayAvatar(preparation.imageUrl, preparation.id)}
                alt={preparation.name || 'Voorbereid personage'}
                className="h-full w-full object-cover scale-[1.18]"
              />
            </div>

            <div>
              <p className="text-sm leading-7 text-stone-400">
                De GM heeft een voorbereid personage voor je klaargezet. Als je dit accepteert, worden je profielnaam, rol of titel,
                avatar, profielwaarden, verborgen eigenschappen en bio bijgewerkt. Eerst maken we automatisch een herstelpunt, zodat
                je oude profiel veilig blijft. Inventaris, wallet en losse notities blijven ongemoeid.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {statPills.map((pill) => (
                  <span
                    key={`${preparation.id}-${pill}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-stone-300">
                {preparation.bio || <span className="italic text-stone-500">Deze voorbereiding bevat nog geen bio.</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 bg-white/5 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onReject}
              className="h-9 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-300 transition-all duration-200 hover:border-rose-400/50 hover:bg-rose-950/20 hover:text-rose-300 active:scale-95"
            >
              Weigeren
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="h-9 inline-flex items-center justify-center rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 px-5 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-all duration-200 hover:from-amber-600 hover:to-amber-500 active:scale-95 hover:shadow-lg hover:shadow-amber-700/40"
            >
              Neem deze rol aan
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}