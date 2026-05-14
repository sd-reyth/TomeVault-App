import React from 'react';

function WalletSection({ title, wallet, isGm, editable = false, onAdjust }) {
  const coins = [
    { key: 'platinum', label: 'P', color: '#d8dee9', glow: 'rgba(216, 222, 233, 0.18)' },
    { key: 'gold', label: 'G', color: '#f7c948', glow: 'rgba(247, 201, 72, 0.22)' },
    { key: 'silver', label: 'S', color: '#b8c2cc', glow: 'rgba(184, 194, 204, 0.2)' },
    { key: 'bronze', label: 'C', color: '#f08c2b', glow: 'rgba(240, 140, 43, 0.2)' },
  ];

  return (
    <div>
      {title ? (
        <h4 className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${isGm ? 'text-amber-300' : 'text-stone-400'}`}>
          {title}
        </h4>
      ) : null}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {coins.map((coin) => (
          <div
            key={coin.key}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950/70 px-2.5 py-2 shadow-[0_10px_20px_rgba(0,0,0,0.22)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full blur-xl"
              style={{ backgroundColor: coin.glow }}
            />

            <div className="relative flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full border bg-zinc-900/90 shadow-inner"
                  style={{ color: coin.color, borderColor: `${coin.color}99` }}
                >
                  <span className="text-[9px] font-semibold tracking-tight">{coin.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums" style={{ color: coin.color }}>
                  {wallet[coin.key] || 0}
                </span>
              </div>

              {editable && onAdjust ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAdjust(coin.key, -1)}
                    className="flex h-5 w-5 items-center justify-center rounded-md border border-white/10 text-[11px] leading-none text-stone-300 transition-colors hover:border-rose-400/40 hover:text-rose-300"
                    title="Verlaag"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjust(coin.key, 1)}
                    className="flex h-5 w-5 items-center justify-center rounded-md border border-white/10 text-[11px] leading-none text-stone-300 transition-colors hover:border-amber-400/40 hover:text-amber-300"
                    title="Verhoog"
                  >
                    +
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WalletSection;
