import React from 'react';

function WalletSection({ title, wallet, isGm, editable = false, onAdjust }) {
  const coins = [
    { key: 'platinum', label: 'PP', color: 'text-stone-300', bg: 'bg-stone-300/10', border: 'border-stone-400/30' },
    { key: 'gold', label: 'GP', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/30' },
    { key: 'silver', label: 'SP', color: 'text-stone-400', bg: 'bg-stone-400/10', border: 'border-stone-500/30' },
    { key: 'bronze', label: 'CP', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-600/30' },
  ];

  return (
    <div>
      {title && <h4 className={`text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 ${isGm ? 'text-amber-600/70' : ''}`}>{title}</h4>}
      <div className="flex flex-wrap gap-2 md:gap-3">
        {coins.map(c => (
          <div key={c.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${c.border} ${c.bg} shadow-sm backdrop-blur-sm`}>
            <div className={`w-5 h-5 rounded-full border border-current flex items-center justify-center ${c.color} shadow-inner bg-stone-950/40`}>
              <span className="text-[8px] font-bold tracking-tighter">{c.label}</span>
            </div>
            <span className={`text-sm font-bold font-serif ${c.color}`}>{wallet[c.key] || 0}</span>
            {editable && onAdjust && (
              <div className="flex items-center gap-1 ml-0.5 md:ml-1">
                <button
                  type="button"
                  onClick={() => onAdjust(c.key, -1)}
                  className="w-4 h-4 md:w-5 md:h-5 rounded border border-stone-700 text-stone-400 hover:text-rose-400 hover:border-rose-800 text-[10px] md:text-xs leading-none"
                  title="Verlaag"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust(c.key, 1)}
                  className="w-4 h-4 md:w-5 md:h-5 rounded border border-stone-700 text-stone-400 hover:text-emerald-400 hover:border-emerald-800 text-[10px] md:text-xs leading-none"
                  title="Verhoog"
                >
                  +
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WalletSection;
