import React from 'react';
import Text from '../../ui/Text';

/**
 * Initiative order badge. Current turn is communicated by row highlight only —
 * no swords/pause duplicate indicator (Wave 2b UX rule).
 */
export default function TurnOrderMarker({ orderIndex }) {
  return (
    <div
      className="tv-turn-marker"
      title={`Volgorde ${orderIndex}`}
      aria-label={`Volgorde ${orderIndex}`}
    >
      <Text variant="meta" as="span" className="font-semibold tabular-nums">
        {orderIndex}
      </Text>
    </div>
  );
}
