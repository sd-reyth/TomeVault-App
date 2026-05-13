import React from 'react';

function WalletSection({ title, wallet, isGm, editable = false, onAdjust }) {
  const coins = [
    { key: 'platinum', label: 'P', color: '#d8dee9', bg: 'rgba(216, 222, 233, 0.10)', border: 'rgba(216, 222, 233, 0.28)' },
    { key: 'gold', label: 'G', color: '#f7c948', bg: 'rgba(247, 201, 72, 0.10)', border: 'rgba(247, 201, 72, 0.30)' },
    { key: 'silver', label: 'S', color: '#b8c2cc', bg: 'rgba(184, 194, 204, 0.10)', border: 'rgba(184, 194, 204, 0.28)' },
    { key: 'bronze', label: 'C', color: '#f08c2b', bg: 'rgba(240, 140, 43, 0.10)', border: 'rgba(240, 140, 43, 0.30)' },
  ];

  return (
    <div>
      {title && <h4 className={`text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 ${isGm ? 'text-amber-600/70' : ''}`}>{title}</h4>}
      <div className="flex flex-wrap gap-2 md:gap-3">
        {coins.map(c => (
          <div key={c.key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border shadow-sm backdrop-blur-sm" style={{ borderColor: c.border, backgroundColor: c.bg }}>
            <div className="w-5 h-5 rounded-full border flex items-center justify-center shadow-inner bg-stone-950/40" style={{ color: c.color, borderColor: c.color }}>
              <span className="text-[8px] font-bold tracking-tighter">{c.label}</span>
            </div>
            <span className="text-sm font-bold font-serif" style={{ color: c.color }}>{wallet[c.key] || 0}</span>
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
                  className="w-4 h-4 md:w-5 md:h-5 rounded border border-stone-700 text-stone-400 hover:text-amber-400 hover:border-amber-800 text-[10px] md:text-xs leading-none"
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
