import React, { useMemo, useState } from 'react';
import { Dice5 } from 'lucide-react';
import { diceRollHasNat1, diceRollHasNat20, playUiSound } from '../lib/uiFeedback';
import DiceIcon from '../ui/DiceIcon';
import { useT } from '../i18n/useT';

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
  const iconColor = DICE_ICON_COLORS[sides] || '#f59e0b';
  return <DiceIcon sides={sides} className={className} style={{ color: iconColor }} />;
}

export default function DiceRoller({ onRoll, embedded = false }) {
  const { t } = useT('chat');
  const [dice, setDice] = useState(
    DICE_TYPES.map((type) => ({ ...type, count: 0 }))
  );

  const totalDiceSelected = useMemo(
    () => dice.reduce((sum, entry) => sum + Number(entry.count || 0), 0),
    [dice]
  );

  const canRoll = totalDiceSelected > 0 && totalDiceSelected <= MAX_DICE_PER_ROLL;

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

    playUiSound('dice');
    if (diceRollHasNat20(rolls)) playUiSound('success');
    else if (diceRollHasNat1(rolls)) playUiSound('warning');

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
    <div className={`tv-dice-roller ${embedded ? 'tv-dice-roller--embedded' : ''}`}>
      <div className={`tv-dice-roller__grid ${embedded ? 'tv-dice-roller__grid--embedded' : ''}`}>
        {dice.map((d, idx) => (
          <div key={d.label} className="tv-dice-roller__row">
            <div className="tv-dice-roller__label">
              <span className="tv-dice-roller__icon">
                <DiceTypeIcon sides={d.sides} className="h-5 w-5" />
              </span>
              <span className="tv-dice-roller__name">{d.label}</span>
            </div>

            <div className="tv-dice-roller__stepper">
              <button
                type="button"
                className="tv-dice-roller__step"
                onClick={() => handleChange(idx, -1)}
                disabled={d.count === 0}
                aria-label={t('dice.decreaseAria', { label: d.label })}
              >
                -
              </button>
              <span className="tv-dice-roller__count">{d.count}</span>
              <button
                type="button"
                className="tv-dice-roller__step"
                onClick={() => handleChange(idx, 1)}
                disabled={totalDiceSelected >= MAX_DICE_PER_ROLL}
                aria-label={t('dice.increaseAria', { label: d.label })}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="tv-dice-roller__meta">
        {t('dice.selected', { selected: totalDiceSelected, max: MAX_DICE_PER_ROLL })}
      </div>

      <button
        type="button"
        className={`tv-dice-roll-btn ${canRoll ? 'tv-dice-roll-btn--ready' : ''}`}
        onClick={handleRoll}
        disabled={!canRoll}
        aria-label={t('dice.rollSelectedAria')}
      >
        <Dice5 className="h-6 w-6" />
      </button>
    </div>
  );
}
