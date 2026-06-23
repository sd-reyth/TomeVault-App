import React from 'react';
import Text from '../../ui/Text';

/**
 * Compact HP / AC / stat chip for combat participant rows.
 */
export default function CombatStatChip({
  label,
  value,
  hidden = false,
  low = false,
  interactive = false,
  onClick,
  title,
  children,
  className = '',
}) {
  const chipClass = [
    'tv-combat-stat',
    interactive ? 'tv-combat-stat--interactive' : '',
    low ? 'tv-combat-stat--low' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = children ?? (
    hidden ? (
      <Text variant="meta" as="span">?</Text>
    ) : (
      <Text variant="meta" as="span" tone={low ? 'accent' : 'primary'} className="font-bold tabular-nums">
        {value}
      </Text>
    )
  );

  if (interactive) {
    return (
      <button type="button" className={chipClass} onClick={onClick} title={title}>
        <Text variant="label" as="span">{label}</Text>
        {content}
      </button>
    );
  }

  return (
    <div className={chipClass} title={title} onClick={(event) => event.stopPropagation()}>
      <Text variant="label" as="span">{label}</Text>
      {content}
    </div>
  );
}
