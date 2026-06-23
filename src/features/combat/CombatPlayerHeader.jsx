import React from 'react';
import { Pin, PinOff, Shield, Swords, X } from 'lucide-react';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import Icon from '../../ui/Icon';
import IconButton from '../../ui/IconButton';
import Text from '../../ui/Text';

export default function CombatPlayerHeader({
  combatStatus,
  combatInProgress,
  turnRound,
  isMyTurn,
  isPinned,
  onTogglePinned,
  onClose,
  statusTitle,
  statusPrimaryLine,
  statusSecondaryLine,
}) {
  const StatusIcon = combatStatus === COMBAT_STATUS.IDLE
    ? Shield
    : (combatStatus === COMBAT_STATUS.PAUSED ? Shield : Swords);

  const isLive = combatStatus === COMBAT_STATUS.ACTIVE;

  return (
    <div className={`tv-combat-hero ${isLive ? 'tv-combat-hero--live' : ''} ${isMyTurn ? 'ring-2 ring-[var(--tv-accent)]/35' : ''}`}>
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
        <div className={`tv-combat-hero__status-chip shrink-0 ${isMyTurn ? 'tv-breathe-glow' : ''}`}>
          <Icon as={StatusIcon} size="md" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="title" as="span" className="!text-base md:!text-lg">{statusTitle}</Text>
            {combatInProgress ? (
              <span className="tv-combat-hero__round-pill">Ronde {turnRound}</span>
            ) : null}
          </div>
          <Text variant="body" as="p" className="mt-1.5 leading-6">{statusPrimaryLine}</Text>
          <Text variant="meta" as="p" className="mt-0.5 leading-5">{statusSecondaryLine}</Text>
        </div>
      </div>
    </div>
  );
}
