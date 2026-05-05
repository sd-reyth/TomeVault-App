import React from 'react';
import { Crown } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-amber-900/30 bg-stone-900 shadow-2xl">
        <div className="relative overflow-hidden border-b border-stone-800/60 bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950/30 p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_40%)] pointer-events-none" />
          <div className="relative z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
            <Crown className="h-3.5 w-3.5" />
            Een rol ligt voor je klaar
          </div>
          <h2 className="relative z-10 mt-3 font-fantasy text-2xl tracking-[0.08em] text-stone-100">{preparation.name || 'Naamloos personage'}</h2>
          {preparation.subtitle ? (
            <p className="relative z-10 mt-1 text-sm italic text-stone-400">{preparation.subtitle}</p>
          ) : null}
        </div>

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
                  className="rounded-full border border-stone-800 bg-stone-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400"
                >
                  {pill}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/50 p-4 text-sm leading-7 text-stone-300">
              {preparation.bio || <span className="italic text-stone-600">Deze voorbereiding bevat nog geen bio.</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-800/60 bg-stone-900/85 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReject}
            className="rounded-lg border border-stone-700 bg-stone-900/70 px-4 py-2.5 font-fantasy text-sm tracking-[0.14em] text-stone-300 transition-colors hover:border-rose-900/50 hover:text-rose-300"
          >
            Weigeren
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-5 py-2.5 font-fantasy text-sm tracking-[0.14em] text-stone-100 shadow-[0_0_10px_rgba(217,119,6,0.2)] transition-colors hover:from-amber-600 hover:to-amber-500"
          >
            Neem deze rol aan
          </button>
        </div>
      </div>
    </div>
  );
}