import React from 'react';
import { Pin, PinOff, Skull, X } from 'lucide-react';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import SegmentedControl from '../../ui/SegmentedControl';
import Text from '../../ui/Text';
import { SlagordeInfoButton, SlagordeInfoContent, useSlagordeInfo } from './SlagordeInfoPanel';

export default function CombatGmHeader({
  combatStatus,
  combatInProgress,
  turnRound,
  currentTurnOrderIndex,
  isActionBusy,
  isPinned,
  onTogglePinned,
  onClose,
  onStart,
  onPause,
  onResume,
  onRequestEndCombat,
  statusTitle,
  statusSubtitle,
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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
            <IconButton
              icon={Skull}
              label="Beëindig gevecht"
              variant="danger"
              size="sm"
              className="shrink-0"
              disabled={!combatInProgress || isActionBusy}
              onClick={onRequestEndCombat}
            />
          </div>
        )}

        {combatInProgress ? (
          <>
            <div className="tv-combat-round-bar flex items-center gap-2">
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
        ) : (
          <Text variant="meta" as="p" className="leading-5">{statusSubtitle || statusTitle}</Text>
        )}
      </div>
    </div>
  );
}
