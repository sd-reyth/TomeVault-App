import React from 'react';
import { FlameKindling, Info, Pin, PinOff, Shield, Skull, Swords, X } from 'lucide-react';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import Button from '../../ui/Button';
import Icon from '../../ui/Icon';
import IconButton from '../../ui/IconButton';
import SegmentedControl from '../../ui/SegmentedControl';
import Text from '../../ui/Text';

export default function CombatGmHeader({
  combatStatus,
  combatInProgress,
  turnRound,
  isActionBusy,
  showInfo,
  onToggleInfo,
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
  const StatusIcon = combatStatus === COMBAT_STATUS.IDLE
    ? FlameKindling
    : (combatStatus === COMBAT_STATUS.PAUSED ? Shield : Swords);

  const isLive = combatStatus === COMBAT_STATUS.ACTIVE;

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
    <div className={`tv-combat-hero ${isLive ? 'tv-combat-hero--live' : ''} ${isActionBusy ? 'opacity-80' : ''}`}>
      {isLive ? <div className="tv-combat-hero__glow" aria-hidden="true" /> : null}

      <div className="relative mb-3 flex items-center justify-between gap-2">
        <Text variant="label" tone="accent">Slagorde</Text>
        <div className="flex items-center gap-1">
          <IconButton
            icon={isPinned ? Pin : PinOff}
            label={isPinned ? 'Losmaken' : 'Vastzetten'}
            variant="muted"
            size="sm"
            active={isPinned}
            onClick={onTogglePinned}
            className="hidden md:inline-flex lg:hidden"
          />
          <IconButton
            icon={X}
            label="Sluiten"
            variant="danger"
            size="sm"
            onClick={onClose}
            className={isPinned ? 'hidden' : 'inline-flex lg:hidden'}
          />
        </div>
      </div>

      <div className="relative flex items-start gap-3">
        <div className="tv-combat-hero__status-chip shrink-0">
          <Icon as={StatusIcon} size="md" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="title" as="span" className="!text-base md:!text-lg">{statusTitle}</Text>
            {combatInProgress ? (
              <span className="tv-combat-hero__round-pill">Ronde {turnRound}</span>
            ) : null}
          </div>
          {statusSubtitle ? (
            <Text variant="meta" as="p" className="mt-1.5 max-w-[28ch] leading-5">{statusSubtitle}</Text>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 flex flex-col gap-2">
        {combatStatus === COMBAT_STATUS.IDLE ? (
          <Button variant="primary" block disabled={isActionBusy} onClick={onStart} icon={Swords}>
            Start gevecht
          </Button>
        ) : (
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
        )}

        <div className="tv-rail-toolbar">
          <IconButton
            icon={Info}
            label={showInfo ? 'Verberg uitleg' : 'Toon uitleg'}
            caption="Uitleg"
            variant="muted"
            block
            active={showInfo}
            onClick={onToggleInfo}
          />
          <IconButton
            icon={Skull}
            label="Beëindig gevecht"
            caption="Stop"
            variant="danger"
            block
            disabled={!combatInProgress || isActionBusy}
            onClick={onRequestEndCombat}
          />
        </div>
      </div>
    </div>
  );
}
