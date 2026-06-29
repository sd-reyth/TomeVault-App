import React from 'react';
import { Pin, PinOff, X } from 'lucide-react';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import IconButton from '../../ui/IconButton';
import Text from '../../ui/Text';
import CombatRoundBar from './CombatRoundBar';
import { SlagordeInfoButton, SlagordeInfoContent, useSlagordeInfo } from './SlagordeInfoPanel';

export default function CombatPlayerHeader({
  combatStatus,
  combatInProgress,
  turnRound,
  currentTurnOrderIndex,
  currentTurnMember,
  currentTurnId,
  isMyTurn,
  isPinned,
  onTogglePinned,
  onClose,
  statusPrimaryLine,
  statusSecondaryLine,
  ambienceActive = true,
}) {
  const isLive = combatStatus === COMBAT_STATUS.ACTIVE;
  const info = useSlagordeInfo();

  return (
    <div className={`tv-combat-rail-header ${isLive ? 'tv-combat-rail-header--live' : ''} ${isMyTurn ? 'tv-combat-rail-header--my-turn' : ''}`}>
      {isMyTurn && isLive ? (
        <div
          key={`turn-banner-${currentTurnId}-${turnRound}`}
          className="tv-turn-banner tv-turn-banner--flash"
        >
          <span>Jouw beurt</span>
          <span className="tv-turn-banner__tag">Nu</span>
        </div>
      ) : null}
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

      <div className="mb-2 flex flex-col gap-2">
        {combatInProgress ? (
          <div className="grid grid-cols-[minmax(0,1fr)_var(--tv-control-height)] items-start gap-2">
            <CombatRoundBar
              combatStatus={combatStatus}
              turnRound={turnRound}
              currentTurnOrderIndex={currentTurnOrderIndex}
              currentTurnMember={currentTurnMember}
              isMyTurn={isMyTurn}
              isActive={ambienceActive}
              infoSlot={null}
            />
            <SlagordeInfoButton open={info.open} onToggle={info.toggle} />
          </div>
        ) : (
          <CombatRoundBar
            combatStatus={combatStatus}
            turnRound={turnRound}
            currentTurnOrderIndex={currentTurnOrderIndex}
            currentTurnMember={currentTurnMember}
            isMyTurn={isMyTurn}
            isActive={ambienceActive}
            infoSlot={null}
          />
        )}
        {combatInProgress && info.open ? (
          <div className="tv-combat-info-popover">
            <SlagordeInfoContent />
          </div>
        ) : null}
      </div>

      <Text variant="body" as="p" className="leading-6">{statusPrimaryLine}</Text>
      {statusSecondaryLine ? (
        <Text variant="meta" as="p" className="mt-0.5 leading-5">{statusSecondaryLine}</Text>
      ) : null}
    </div>
  );
}
