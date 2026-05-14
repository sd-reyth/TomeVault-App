import React, { useMemo, useState } from 'react';
import {
  mdiDiceD4,
  mdiDiceD6,
  mdiDiceD8,
  mdiDiceD10,
  mdiDiceD12,
  mdiDiceD20,
  mdiDiceD10Outline,
} from '@mdi/js';

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

const DICE_ICON_PATHS = {
  4: mdiDiceD4,
  6: mdiDiceD6,
  8: mdiDiceD8,
  10: mdiDiceD10,
  12: mdiDiceD12,
  20: mdiDiceD20,
  100: mdiDiceD10Outline,
};

const DICE_ICON_COLORS = {
  4: '#60a5fa',
  6: '#34d399',
  8: '#a78bfa',
  10: '#f59e0b',
  12: '#fb7185',
  20: '#22d3ee',
  100: '#f97316',
};

function DiceTypeIcon({ sides, className = '' }) {
  const iconPath = DICE_ICON_PATHS[sides] || mdiDiceD10Outline;
  const iconColor = DICE_ICON_COLORS[sides] || '#f59e0b';

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true" style={{ color: iconColor }}>
      <path d={iconPath} fill="currentColor" />
      {sides === 100 ? (
        <text x="12" y="14" textAnchor="middle" fontSize="5.8" fill="#0f172a" stroke="none" fontWeight="700">00</text>
      ) : null}
    </svg>
  );
}

function getRollActionAccent(theme) {
  if (theme === 'purple') {
    return {
      backgroundColor: '#7c3aed',
      boxShadow: '0 14px 34px -18px rgba(124, 58, 237, 0.42)',
    };
  }

  if (theme === 'green') {
    return {
      backgroundColor: '#16a34a',
      boxShadow: '0 14px 34px -18px rgba(22, 163, 74, 0.42)',
    };
  }

  if (theme === 'light') {
    return {
      backgroundColor: '#b45309',
      boxShadow: '0 14px 34px -18px rgba(180, 83, 9, 0.34)',
    };
  }

  return {
    backgroundColor: '#d97706',
    boxShadow: '0 14px 34px -18px rgba(217, 119, 6, 0.42)',
  };
}

function getRollerPalette(theme) {
  if (theme === 'purple') {
    return {
      panelBorder: 'rgba(168, 85, 247, 0.30)',
      panelBg: 'linear-gradient(180deg, rgba(168, 85, 247, 0.12) 0%, rgba(17, 24, 39, 0.86) 58%)',
      rowBorder: 'rgba(196, 181, 253, 0.24)',
      rowBg: 'rgba(46, 16, 101, 0.34)',
      stepperBorder: 'rgba(196, 181, 253, 0.28)',
      stepperBg: 'rgba(30, 27, 75, 0.44)',
      labelColor: '#ede9fe',
      countColor: '#f5f3ff',
      metaColor: '#c4b5fd',
    };
  }

  if (theme === 'green') {
    return {
      panelBorder: 'rgba(52, 211, 153, 0.28)',
      panelBg: 'linear-gradient(180deg, rgba(52, 211, 153, 0.10) 0%, rgba(17, 24, 39, 0.86) 58%)',
      rowBorder: 'rgba(110, 231, 183, 0.18)',
      rowBg: 'rgba(6, 78, 59, 0.36)',
      stepperBorder: 'rgba(110, 231, 183, 0.24)',
      stepperBg: 'rgba(2, 44, 34, 0.5)',
      labelColor: '#d1fae5',
      countColor: '#ecfdf5',
      metaColor: '#86efac',
    };
  }

  if (theme === 'light') {
    return {
      panelBorder: 'rgba(180, 83, 9, 0.32)',
      panelBg: 'linear-gradient(180deg, rgba(251, 191, 36, 0.20) 0%, rgba(255, 251, 235, 0.90) 62%)',
      rowBorder: 'rgba(180, 83, 9, 0.22)',
      rowBg: 'rgba(255, 248, 220, 0.72)',
      stepperBorder: 'rgba(146, 64, 14, 0.25)',
      stepperBg: 'rgba(255, 251, 235, 0.95)',
      labelColor: '#78350f',
      countColor: '#451a03',
      metaColor: '#92400e',
    };
  }

  return {
    panelBorder: 'rgba(251, 191, 36, 0.28)',
    panelBg: 'linear-gradient(180deg, rgba(251, 191, 36, 0.10) 0%, rgba(17, 24, 39, 0.86) 58%)',
    rowBorder: 'rgba(252, 211, 77, 0.18)',
    rowBg: 'rgba(120, 53, 15, 0.30)',
    stepperBorder: 'rgba(252, 211, 77, 0.24)',
    stepperBg: 'rgba(69, 26, 3, 0.46)',
    labelColor: '#fde68a',
    countColor: '#fffbeb',
    metaColor: '#fcd34d',
  };
}

export default function DiceRoller({ onRoll, theme, embedded = false }) {
  const [dice, setDice] = useState(
    DICE_TYPES.map((type) => ({ ...type, count: 0 }))
  );
  const rollActionAccent = getRollActionAccent(theme);
  const palette = getRollerPalette(theme);

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
      className={embedded ? 'w-full rounded-2xl border p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' : 'mx-auto w-full max-w-sm rounded-2xl border p-4 shadow-2xl'}
      style={{
        borderColor: palette.panelBorder,
        backgroundImage: palette.panelBg,
        boxShadow: embedded ? undefined : rollActionAccent.boxShadow,
      }}
    >
      <div className="flex flex-col gap-2.5 w-full">
        {dice.map((d, idx) => (
          <div
            key={d.label}
            className="flex items-center w-full rounded-2xl border px-3 py-2.5"
            style={{
              borderColor: palette.rowBorder,
              backgroundColor: palette.rowBg,
            }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-6 w-6 items-center justify-center">
                <DiceTypeIcon sides={d.sides} className="h-5 w-5" />
              </span>
              <span className="w-10 font-mono text-base leading-none" style={{ color: palette.labelColor }}>{d.label}</span>
            </div>

            <div className="ml-auto inline-flex items-center gap-2">
              <button
                type="button"
                className="h-8 w-8 rounded-xl border text-sm disabled:opacity-40 transition-colors"
                style={{
                  borderColor: palette.stepperBorder,
                  backgroundColor: palette.stepperBg,
                  color: palette.labelColor,
                }}
                onClick={() => handleChange(idx, -1)}
                disabled={d.count === 0}
                aria-label={`Verlaag aantal ${d.label}`}
              >
                -
              </button>
              <span className="w-8 text-center text-lg tabular-nums" style={{ color: palette.countColor }}>{d.count}</span>
              <button
                type="button"
                className="h-8 w-8 rounded-xl border text-sm disabled:opacity-40 transition-colors"
                style={{
                  borderColor: palette.stepperBorder,
                  backgroundColor: palette.stepperBg,
                  color: palette.labelColor,
                }}
                onClick={() => handleChange(idx, 1)}
                disabled={totalDiceSelected >= MAX_DICE_PER_ROLL}
                aria-label={`Verhoog aantal ${d.label}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px]" style={{ color: palette.metaColor }}>
        {totalDiceSelected}/{MAX_DICE_PER_ROLL} geselecteerd
      </div>

      <button
        type="button"
        className="mt-4 block w-full rounded-2xl px-6 py-3 text-stone-100 font-fantasy text-xl uppercase tracking-[0.16em] shadow transition-all duration-200 hover:brightness-110 disabled:opacity-40"
        style={rollActionAccent}
        onClick={handleRoll}
        disabled={dice.every((d) => d.count === 0) || totalDiceSelected > MAX_DICE_PER_ROLL}
      >
        Gooi
      </button>
    </div>
  );
}
