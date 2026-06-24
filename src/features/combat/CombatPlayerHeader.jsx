import React, { useEffect, useRef, useState } from 'react';
import { Info, Pin, PinOff, X } from 'lucide-react';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import IconButton from '../../ui/IconButton';
import Text from '../../ui/Text';

const SLAGORDE_INFO_LINES = [
  'Ruststand laat iedereen initiative voorbereiden voordat de GM start.',
  'Gevecht actief vergrendelt initiative-invoer en houdt beurt en ronde bij.',
  'Pauzeren geeft ruimte om NPC\'s toe te voegen of te verwijderen zonder de ronde kwijt te raken.',
];

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
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef(null);

  const isLive = combatStatus === COMBAT_STATUS.ACTIVE;

  useEffect(() => {
    if (!infoOpen) return undefined;

    const handlePointerDown = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setInfoOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setInfoOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [infoOpen]);

  return (
    <div className={`tv-combat-rail-header ${isLive ? 'tv-combat-rail-header--live' : ''} ${isMyTurn ? 'tv-combat-rail-header--my-turn' : ''}`}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Text variant="label" tone="accent">Slagorde</Text>
        <div className="flex items-center gap-1 lg:hidden">
          <IconButton
            icon={isPinned ? Pin : PinOff}
            label={isPinned ? 'Losmaken' : 'Vastzetten'}
            variant="muted"
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
        <div className="tv-combat-round-bar relative mb-2 flex items-center gap-2">
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
          <div className="relative shrink-0" ref={infoRef}>
            <IconButton
              icon={Info}
              label={infoOpen ? 'Verberg uitleg' : 'Toon uitleg'}
              variant="muted"
              size="sm"
              active={infoOpen}
              onClick={() => setInfoOpen((value) => !value)}
            />
            {infoOpen ? (
              <div className="tv-combat-info-popover absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(18rem,calc(var(--battle-sidebar-width,280px)-1.5rem))] rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface p-3 shadow-lg">
                <Text variant="label" tone="muted" className="mb-2 block">Slagorde info</Text>
                <div className="space-y-2">
                  {SLAGORDE_INFO_LINES.map((line) => (
                    <Text key={line} variant="meta" as="p" className="leading-5">{line}</Text>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Text variant="body" as="p" className="leading-6">{statusPrimaryLine}</Text>
      {statusSecondaryLine ? (
        <Text variant="meta" as="p" className="mt-0.5 leading-5">{statusSecondaryLine}</Text>
      ) : null}
    </div>
  );
}
