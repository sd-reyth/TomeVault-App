import React from 'react';
import { Pin, PinOff, X } from 'lucide-react';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import IconButton from '../../ui/IconButton';
import Text from '../../ui/Text';
import { SlagordeInfoButton, SlagordeInfoContent, useSlagordeInfo } from './SlagordeInfoPanel';

export default function CombatPlayerHeader({
  combatStatus,
  combatInProgress,
  turnRound,
  currentTurnOrderIndex,
  isMyTurn,
  isPinned,
  onTogglePinned,
  onClose,
  statusPrimaryLine,
  statusSecondaryLine,
}) {
  const isLive = combatStatus === COMBAT_STATUS.ACTIVE;
  const info = useSlagordeInfo();

  return (
    <div className={`tv-combat-rail-header ${isLive ? 'tv-combat-rail-header--live' : ''} ${isMyTurn ? 'tv-combat-rail-header--my-turn' : ''}`}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Text variant="label" tone="accent">Slagorde</Text>
        <div className="flex items-center gap-1 lg:hidden">
          <IconButton
            icon={isPinned ? Pin : PinOff}
            label={isPinned ? 'Losmaken' : 'Vastzetten'}
            variant="default"
            size="sm"
            active={isPinned}
            onClick={onTogglePinned}
            className="hidden md:inline-flex"
          />
          <IconButton
            icon={X}
            label="Sluiten"
            variant="danger"
            size="sm"
            onClick={onClose}
            className={isPinned ? 'hidden' : 'inline-flex'}
          />
        </div>
      </div>

      {combatInProgress ? (
        <>
          <div className="tv-combat-round-bar mb-2 flex items-center gap-2">
            {currentTurnOrderIndex ? (
              <span
                className={`tv-combat-turn-index ${isLive ? 'tv-combat-turn-index--live' : ''}`}
                title="Huidige beurt in volgorde"
              >
                {currentTurnOrderIndex}
              </span>
            ) : null}
            <Text variant="body" as="span" className="min-w-0 flex-1 truncate text-sm font-semibold">
              Ronde {turnRound}
            </Text>
            <SlagordeInfoButton open={info.open} onToggle={info.toggle} />
          </div>
          {info.open ? <SlagordeInfoContent /> : null}
        </>
      ) : null}

      <Text variant="body" as="p" className="leading-6">{statusPrimaryLine}</Text>
      {statusSecondaryLine ? (
        <Text variant="meta" as="p" className="mt-0.5 leading-5">{statusSecondaryLine}</Text>
      ) : null}
    </div>
  );
}
