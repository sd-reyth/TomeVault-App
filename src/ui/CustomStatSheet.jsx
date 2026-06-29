import React from 'react';
import { computeD20Modifier, formatSignedModifier } from '../lib/statModifiers';

export default function CustomStatSheet({ stats = [] }) {
  if (!stats.length) return null;

  return (
    <div className="tv-stat-sheet" role="list" aria-label="Eigenschappen">
      {stats.map((stat) => {
        const value = Number(stat.value ?? 0) || 0;
        const modifier = stat.showModifier
          ? formatSignedModifier(computeD20Modifier(value))
          : null;

        return (
          <div key={stat.id} className="tv-stat-sheet__cell" role="listitem">
            <span className="tv-stat-sheet__label">{stat.name}</span>
            <span className="tv-stat-sheet__value">{value}</span>
            {modifier ? (
              <span className="tv-stat-sheet__mod">{modifier}</span>
            ) : (
              <span className="tv-stat-sheet__mod tv-stat-sheet__mod--empty" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
