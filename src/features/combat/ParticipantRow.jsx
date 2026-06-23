import React from 'react';
import { AlertCircle, Trash2, UserMinus } from 'lucide-react';
import EditableStat from '../../components/EditableStat';
import TvImage from '../../components/TvImage';
import { resolveDisplayAvatar } from '../../lib/placeholders';
import IconButton from '../../ui/IconButton';
import Text from '../../ui/Text';
import CombatStatChip from './CombatStatChip';
import ConditionChips from './ConditionChips';
import TurnOrderMarker from './TurnOrderMarker';

export default function ParticipantRow({
  member,
  orderIndex,
  isGm,
  combatInProgress,
  battleActive,
  combatPaused,
  isCurrentTurn,
  initiativeEditable,
  hiddenNpcForPlayer,
  displayMemberName,
  displayMemberAvatar,
  canManageRoster,
  isActionBusy,
  activeConditions,
  hasAlertFeat,
  currentPlayerId,
  onOpenProfile,
  onUpdateStat,
  onOpenDamageModal,
  onOpenConditions,
  onRemoveNpc,
  onKickPlayer,
}) {
  const hasConditions = activeConditions.length > 0;
  const hpLow = !hiddenNpcForPlayer && Number(member.hp) < 10;

  const cardClassName = [
    'tv-combat-participant-row group relative cursor-pointer rounded-2xl border shadow-sm transition-all hover:shadow-md',
    member.isNpc
      ? 'tv-combat-row--npc'
      : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-view-card hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]',
    isCurrentTurn && battleActive ? 'tv-combat-row--turn' : '',
    isCurrentTurn && combatPaused ? 'tv-combat-row--turn-paused ring-1 ring-[color-mix(in_srgb,var(--tv-border),transparent_20%)]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      onClick={() => onOpenProfile?.(member)}
      className={cardClassName}
      data-turn={isCurrentTurn ? 'true' : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenProfile?.(member);
        }
      }}
    >
      {isCurrentTurn && battleActive ? <div className="tv-combat-turn-rail" aria-hidden="true" /> : null}

      <div className={`tv-combat-participant-row__avatar tv-image-frame flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border shadow-inner transition-all md:h-11 md:w-11 ${
        member.isNpc ? 'tv-tone-enemy-chip' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-chip-surface tv-accent'
      } ${isCurrentTurn ? 'ring-1 ring-[var(--tv-accent)]/40' : ''}`}>
        <TvImage src={resolveDisplayAvatar(displayMemberAvatar, member.id)} alt={displayMemberName} className="opacity-90" />
      </div>

      <div className="tv-combat-participant-row__body min-w-0">
        <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
          <Text
            variant="body"
            as="span"
            className={`break-words font-semibold leading-snug ${member.isNpc ? 'tv-tone-enemy-text' : ''}`}
          >
            {displayMemberName}
          </Text>
          {hasAlertFeat ? (
            <Text variant="label" tone="accent" as="span" className="shrink-0 rounded border border-[color-mix(in_srgb,var(--tv-accent),transparent_50%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_82%)] px-1.5 py-[1px]">
              Alert
            </Text>
          ) : null}
        </div>

        <ConditionChips
          conditions={activeConditions}
          isGm={isGm}
          onEdit={() => onOpenConditions?.(member)}
        />
      </div>

      <div className="tv-combat-participant-row__stats grid grid-cols-2 gap-1.5 md:gap-2">
        <CombatStatChip
          label="HP"
          value={member.hp}
          hidden={hiddenNpcForPlayer}
          low={hpLow}
          interactive={isGm}
          title={isGm ? 'Klik om HP aan te passen' : 'Hit Points'}
          onClick={(event) => {
            event.stopPropagation();
            onOpenDamageModal?.(member);
          }}
        />
        <CombatStatChip label="AC" hidden={hiddenNpcForPlayer}>
          {hiddenNpcForPlayer ? (
            <Text variant="meta" as="span">?</Text>
          ) : (
            <EditableStat
              className="font-bold tv-text text-xs tabular-nums"
              value={member.ac}
              onChange={(value) => onUpdateStat?.(member.id, 'ac', value)}
              disabled={!isGm}
            />
          )}
        </CombatStatChip>
      </div>

      <div className="tv-combat-participant-row__aside flex flex-col items-center justify-center gap-1.5 self-stretch">
        {combatInProgress ? (
          <TurnOrderMarker orderIndex={orderIndex} isCurrentTurn={isCurrentTurn && battleActive} />
        ) : null}
        <span className={`tv-combat-init-badge ${member.isNpc ? 'tv-tone-enemy-chip' : ''} ${isCurrentTurn ? 'tv-combat-init-badge--active' : ''}`}>
          <EditableStat
            value={member.init}
            onChange={(value) => onUpdateStat?.(member.id, 'init', value)}
            disabled={!initiativeEditable}
            title={initiativeEditable ? 'Bewerk initiative' : 'Initiative score'}
          />
        </span>
      </div>

      {isGm ? (
        <div
          className="tv-combat-row-actions"
          onClick={(event) => event.stopPropagation()}
        >
          {!hasConditions ? (
            <IconButton
              icon={AlertCircle}
              label="Conditions toevoegen"
              variant="muted"
              size="sm"
              onClick={() => onOpenConditions?.(member)}
            />
          ) : null}
          {member.isNpc ? (
            <IconButton
              icon={Trash2}
              label="Verwijder NPC"
              variant="enemy"
              size="sm"
              disabled={!canManageRoster}
              onClick={() => onRemoveNpc?.(member.id)}
            />
          ) : null}
          {!member.isNpc && member.id !== currentPlayerId ? (
            <IconButton
              icon={UserMinus}
              label="Verwijder speler uit gevecht"
              variant="muted"
              size="sm"
              disabled={isActionBusy}
              onClick={() => onKickPlayer?.(member)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
