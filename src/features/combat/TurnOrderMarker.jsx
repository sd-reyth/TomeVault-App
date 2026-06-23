import React from 'react';
import Text from '../../ui/Text';

/**
 * Initiative order badge. Current turn is communicated by row highlight only.
 */
export default function TurnOrderMarker({ orderIndex, isCurrentTurn = false }) {
  return (
    <div
      className={`tv-turn-marker ${isCurrentTurn ? 'tv-turn-marker--active' : ''}`}
      title={`Volgorde ${orderIndex}`}
      aria-label={`Volgorde ${orderIndex}`}
    >
      <Text variant="meta" as="span" className="font-semibold tabular-nums">
        {orderIndex}
      </Text>
    </div>
  );
}
