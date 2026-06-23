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
    <div
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all tv-combat-card ${
        combatStatus === COMBAT_STATUS.IDLE
          ? 'hover:border-[color-mix(in_srgb,var(--tv-border),transparent_20%)]'
          : (combatStatus === COMBAT_STATUS.PAUSED ? '' : 'tv-combat-card--active')
      } ${isActionBusy ? 'opacity-80' : ''}`}
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
            size="sm"
            onClick={onClose}
            className={isPinned ? 'hidden' : 'inline-flex lg:hidden'}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[40px_minmax(0,1fr)] sm:items-center">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${combatStatus === COMBAT_STATUS.ACTIVE ? 'tv-button-accent-muted' : 'tv-chip-surface tv-accent'}`}>
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
          {statusSubtitle ? (
            <Text variant="meta" as="p" className="mt-1 leading-5">{statusSubtitle}</Text>
          ) : null}
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {combatStatus === COMBAT_STATUS.IDLE ? (
          <Button
            variant="primary"
            block
            disabled={isActionBusy}
            onClick={onStart}
            icon={Swords}
          >
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
