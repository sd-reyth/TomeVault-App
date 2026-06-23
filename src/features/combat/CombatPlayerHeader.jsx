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

  return (
    <div
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all tv-combat-card ${
        combatStatus === COMBAT_STATUS.IDLE
          ? ''
          : (combatStatus === COMBAT_STATUS.PAUSED ? '' : 'tv-combat-card--active')
      } ${isMyTurn ? 'ring-1 ring-[var(--tv-accent)]/45 tv-breathe-glow' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pb-3">
        <Text variant="label" tone="accent">Slagorde</Text>
        <div className="flex items-center gap-1.5">
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
            onClick={onClose}
            className={isPinned ? 'hidden' : 'inline-flex lg:hidden'}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:items-start">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${combatStatus === COMBAT_STATUS.ACTIVE ? 'tv-button-accent-muted' : 'tv-chip-surface tv-accent'} ${isMyTurn ? 'tv-breathe-glow' : ''}`}>
          <Icon as={StatusIcon} size="md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="subtitle" as="span">{statusTitle}</Text>
            {combatInProgress ? (
              <Text variant="label" tone="accent" as="span" className="rounded-full border border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_84%)] px-2.5 py-1 shadow-inner">
                Ronde {turnRound}
              </Text>
            ) : null}
          </div>
          <Text variant="body" as="p" className="mt-2 leading-6">{statusPrimaryLine}</Text>
          <Text variant="meta" as="p" className="mt-1 leading-5">{statusSecondaryLine}</Text>
        </div>
      </div>
    </div>
  );
}
