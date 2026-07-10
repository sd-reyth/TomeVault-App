import React from 'react';
import Text from '../../ui/Text';
import { useT } from '../../i18n/useT';

/**
 * Initiative order badge. Current turn is communicated by row highlight only.
 */
export default function TurnOrderMarker({ orderIndex, isCurrentTurn = false }) {
  const { t } = useT('combat');
  const label = t('participant.orderTitle', { index: orderIndex });

  return (
    <div
      className={`tv-turn-marker ${isCurrentTurn ? 'tv-turn-marker--active' : ''}`}
      title={label}
      aria-label={label}
    >
      <Text variant="meta" as="span" className="font-semibold tabular-nums">
        {orderIndex}
      </Text>
    </div>
  );
}
