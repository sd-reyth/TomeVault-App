import React from 'react';
import { Pin, PinOff, Skull, X } from 'lucide-react';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import SegmentedControl from '../../ui/SegmentedControl';
import Text from '../../ui/Text';
import CombatRoundBar from './CombatRoundBar';
import { SlagordeInfoButton, SlagordeInfoContent, useSlagordeInfo } from './SlagordeInfoPanel';

export default function CombatGmHeader({
  combatStatus,
  combatInProgress,
  turnRound,
  currentTurnOrderIndex,
  currentTurnMember,
  isActionBusy,  isPinned,
  onTogglePinned,
  onClose,
  onStart,
  onPause,
  onResume,
  onRequestEndCombat,
  statusTitle,
  statusSubtitle,
  ambienceActive = true,
}) {
  const isLive = combatStatus === COMBAT_STATUS.ACTIVE;
  const info = useSlagordeInfo();

  const handleSegmentChange = (next) => {
    if (next === 'paused' && combatStatus === COMBAT_STATUS.ACTIVE) {
      onPause?.();
      return;
    }
    if (next === 'active' && combatStatus === COMBAT_STATUS.PAUSED) {
      onResume?.();
    }
  };

  return (
    <div className={`tv-combat-rail-header ${isLive ? 'tv-combat-rail-header--live' : ''} ${isActionBusy ? 'opacity-80' : ''}`}>
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

      <div className="tv-combat-rail-controls flex flex-col gap-2">
        {combatStatus === COMBAT_STATUS.IDLE ? (
          <Button variant="primary" block disabled={isActionBusy} onClick={onStart}>
            Start gevecht
          </Button>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <SegmentedControl
              block
              aria-label="Gevechtsmodus"
              value={combatStatus === COMBAT_STATUS.PAUSED ? 'paused' : 'active'}
              disabled={isActionBusy}
              onChange={handleSegmentChange}
              options={[
                { value: 'active', label: 'Actief' },
                { value: 'paused', label: 'Pauze' },
              ]}
            />
            <button
              type="button"
              onClick={onRequestEndCombat}
              title="Beëindig gevecht"
              aria-label="Beëindig gevecht"
              disabled={!combatInProgress || isActionBusy}
              className={`tv-toolbar-icon-btn tv-chat-dice-btn transition-all duration-200 ease-out disabled:opacity-50 active:scale-[0.985] ${
                combatInProgress && !isActionBusy ? 'tv-combat-end-btn--ready' : ''
              }`}
            >
              <Skull className="h-[1.05rem] w-[1.05rem] shrink-0 translate-y-[1.5px]" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <CombatRoundBar
            combatStatus={combatStatus}
            turnRound={turnRound}
            currentTurnOrderIndex={currentTurnOrderIndex}
            currentTurnMember={currentTurnMember}
            isActive={ambienceActive}
            infoSlot={<SlagordeInfoButton open={info.open} onToggle={info.toggle} />}
          />
          {info.open ? (
            <div className="tv-combat-info-popover">
              <SlagordeInfoContent />
            </div>
          ) : null}
          {!combatInProgress ? (
            <Text variant="meta" as="p" className="leading-5">{statusSubtitle || statusTitle}</Text>
          ) : null}
        </div>      </div>
    </div>
  );
}
