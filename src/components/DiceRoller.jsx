import React, { useMemo, useState } from 'react';

const DICE_TYPES = [
  { label: 'd4', sides: 4 },
  { label: 'd6', sides: 6 },
  { label: 'd8', sides: 8 },
  { label: 'd10', sides: 10 },
  { label: 'd12', sides: 12 },
  { label: 'd20', sides: 20 },
  { label: 'd100', sides: 100 },
];

const MAX_DICE_PER_ROLL = 10;

const THEME_ACCENTS = {
  purple: { icon: '#a78bfa', soft: 'rgba(167, 139, 250, 0.25)', strong: 'rgba(167, 139, 250, 0.45)' },
  amber: { icon: '#f59e0b', soft: 'rgba(245, 158, 11, 0.24)', strong: 'rgba(245, 158, 11, 0.44)' },
  green: { icon: '#34d399', soft: 'rgba(52, 211, 153, 0.24)', strong: 'rgba(52, 211, 153, 0.44)' },
  light: { icon: '#b45309', soft: 'rgba(180, 83, 9, 0.2)', strong: 'rgba(180, 83, 9, 0.35)' },
};

const DICE_ICON_TUNING = {
  4: { scale: 0.98, stroke: 1.8 },
  6: { scale: 0.94, stroke: 1.75 },
  8: { scale: 1.02, stroke: 1.7 },
  10: { scale: 1.01, stroke: 1.68 },
  12: { scale: 1.04, stroke: 1.62 },
  20: { scale: 1.03, stroke: 1.66 },
  100: { scale: 1.01, stroke: 1.66 },
};

function DiceTypeIcon({ sides, className = '' }) {
  const iconTuning = DICE_ICON_TUNING[sides] || { scale: 1, stroke: 1.75 };
  const iconStyle = { transform: `scale(${iconTuning.scale})`, transformOrigin: 'center' };

  if (sides === 4) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={iconStyle} fill="none" stroke="currentColor" strokeWidth={iconTuning.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4 L20 19 H4 Z" />
        <path d="M12 4 L12 19" opacity="0.75" />
      </svg>
    );
  }

  if (sides === 6) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={iconStyle} fill="none" stroke="currentColor" strokeWidth={iconTuning.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="2.4" />
        <circle cx="9" cy="9" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="15" cy="15" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (sides === 8) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={iconStyle} fill="none" stroke="currentColor" strokeWidth={iconTuning.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 L18.5 9 L12 21 L5.5 9 Z" />
        <path d="M12 3 L9.2 9" opacity="0.7" />
        <path d="M12 3 L14.8 9" opacity="0.7" />
        <path d="M5.5 9 L18.5 9" opacity="0.62" />
        <path d="M9.2 9 L12 21" opacity="0.7" />
        <path d="M14.8 9 L12 21" opacity="0.7" />
      </svg>
    );
  }

  if (sides === 10) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={iconStyle} fill="none" stroke="currentColor" strokeWidth={iconTuning.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.6 L18 6.7 L19.5 12.6 L15.8 20.1 H8.2 L4.5 12.6 L6 6.7 Z" />
        <path d="M12 2.6 L12 20.1" opacity="0.7" />
        <path d="M6 6.7 L18 6.7" opacity="0.55" />
        <path d="M4.5 12.6 L19.5 12.6" opacity="0.4" />
      </svg>
    );
  }

  if (sides === 12) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={iconStyle} fill="none" stroke="currentColor" strokeWidth={iconTuning.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.8 L16.5 4.4 L19.3 8.3 L18.7 13.2 L15 17 L9 17 L5.3 13.2 L4.7 8.3 L7.5 4.4 Z" />
        <path d="M12 6 L15.2 8.2 L14.2 12 L9.8 12 L8.8 8.2 Z" opacity="0.85" />
        <path d="M9 17 L9.8 12" opacity="0.7" />
        <path d="M15 17 L14.2 12" opacity="0.7" />
      </svg>
    );
  }

  if (sides === 20) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={iconStyle} fill="none" stroke="currentColor" strokeWidth={iconTuning.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.7 L19.3 7.2 L17.8 16.8 L12 21.3 L6.2 16.8 L4.7 7.2 Z" />
        <path d="M12 2.7 L12 21.3" opacity="0.68" />
        <path d="M4.7 7.2 L19.3 7.2" opacity="0.62" />
        <path d="M6.2 16.8 L17.8 16.8" opacity="0.55" />
        <path d="M6.2 16.8 L12 7.2" opacity="0.55" />
        <path d="M17.8 16.8 L12 7.2" opacity="0.55" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} style={iconStyle} fill="none" stroke="currentColor" strokeWidth={iconTuning.stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.6 L18 6.7 L19.5 12.6 L15.8 20.1 H8.2 L4.5 12.6 L6 6.7 Z" />
      <path d="M12 2.6 L12 20.1" opacity="0.6" />
      <path d="M6 6.7 L18 6.7" opacity="0.5" />
      <path d="M4.5 12.6 L19.5 12.6" opacity="0.35" />
      <text x="12" y="14" textAnchor="middle" fontSize="6.2" fill="currentColor" stroke="none" fontWeight="700">00</text>
    </svg>
  );
}

export default function DiceRoller({ onRoll, theme = 'green' }) {
  const [dice, setDice] = useState(
    DICE_TYPES.map((type) => ({ ...type, count: 0 }))
  );

  const accent = THEME_ACCENTS[theme] || THEME_ACCENTS.green;
  const totalDiceSelected = useMemo(
    () => dice.reduce((sum, entry) => sum + Number(entry.count || 0), 0),
    [dice]
  );

  const handleChange = (idx, delta) => {
    setDice((prev) => {
      const currentTotal = prev.reduce((sum, entry) => sum + Number(entry.count || 0), 0);

      return prev.map((entry, i) => {
        if (i !== idx) return entry;

        if (delta > 0 && currentTotal >= MAX_DICE_PER_ROLL) {
          return entry;
        }

        return { ...entry, count: Math.max(0, Number(entry.count || 0) + delta) };
      });
    });
  };

  const handleRoll = async () => {
    const rolls = dice
      .filter((d) => d.count > 0)
      .map((d) => ({
        ...d,
        rolls: Array.from({ length: d.count }, () => Math.ceil(Math.random() * d.sides)),
      }));

    if (!rolls.length) return;

    const total = rolls
      .flatMap((entry) => entry.rolls)
      .reduce((sum, value) => sum + Number(value || 0), 0);
    const lines = rolls.map((entry) => ({
      label: entry.label,
      sides: entry.sides,
      count: entry.count,
      rolls: entry.rolls,
      subtotal: entry.rolls.reduce((sum, value) => sum + Number(value || 0), 0),
    }));

    await onRoll?.({ total, lines });
  };

  return (
    <div
      className="p-4 bg-stone-900/95 rounded-2xl border border-stone-700 shadow-2xl w-full max-w-xs mx-auto"
      style={{ boxShadow: `0 16px 45px -22px ${accent.soft}` }}
    >
      <div className="flex flex-col gap-2.5 w-full">
        {dice.map((d, idx) => (
          <div key={d.label} className="flex items-center gap-2 w-full">
            <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: accent.icon }}>
              <DiceTypeIcon sides={d.sides} className="h-4 w-4" />
            </span>
            <span className="w-8 font-mono text-stone-200 text-[22px] leading-none">{d.label}</span>
            <button
              type="button"
              className="h-7 w-7 rounded-md bg-stone-950 hover:bg-stone-800 text-stone-300 disabled:opacity-40 transition-colors"
              onClick={() => handleChange(idx, -1)}
              disabled={d.count === 0}
              aria-label={`Verlaag aantal ${d.label}`}
            >
              -
            </button>
            <span className="w-6 text-center text-stone-100 text-lg tabular-nums">{d.count}</span>
            <button
              type="button"
              className="h-7 w-7 rounded-md bg-stone-950 hover:bg-stone-800 text-stone-300 disabled:opacity-40 transition-colors"
              onClick={() => handleChange(idx, 1)}
              disabled={totalDiceSelected >= MAX_DICE_PER_ROLL}
              aria-label={`Verhoog aantal ${d.label}`}
            >
              +
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-stone-500">{totalDiceSelected}/{MAX_DICE_PER_ROLL} geselecteerd</div>

      <button
        type="button"
        className="mt-4 px-6 py-2.5 rounded-xl text-stone-100 font-fantasy text-3xl uppercase tracking-widest shadow transition-colors disabled:opacity-40"
        style={{ backgroundColor: accent.icon }}
        onClick={handleRoll}
        disabled={dice.every((d) => d.count === 0) || totalDiceSelected > MAX_DICE_PER_ROLL}
      >
        Gooi
      </button>
    </div>
  );
}
