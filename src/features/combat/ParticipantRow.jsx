import React from 'react';
import { AlertCircle, Trash2, UserMinus } from 'lucide-react';
import EditableStat from '../../components/EditableStat';
import TvImage from '../../components/TvImage';
import { resolveDisplayAvatar } from '../../lib/placeholders';
import IconButton from '../../ui/IconButton';
import Text from '../../ui/Text';
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

  const cardClassName = `group relative grid cursor-pointer grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border p-2.5 shadow-sm transition-all hover:shadow-md md:grid-cols-[44px_minmax(0,1fr)_auto_auto] md:gap-3 md:p-3 ${
    member.isNpc
      ? 'tv-combat-row--npc'
      : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-view-card hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]'
  } ${isCurrentTurn && battleActive ? 'tv-combat-row--turn' : ''} ${isCurrentTurn && combatPaused ? 'tv-combat-row--turn-paused ring-1 ring-[color-mix(in_srgb,var(--tv-border),transparent_20%)]' : ''}`;

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
      <div className={`tv-image-frame col-start-1 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border shadow-inner transition-all md:h-11 md:w-11 ${
        member.isNpc ? 'tv-tone-enemy-chip' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-chip-surface tv-accent'
      } ${isCurrentTurn ? 'ring-1 ring-[var(--tv-accent)]/40' : ''}`}>
        <TvImage src={resolveDisplayAvatar(displayMemberAvatar, member.id)} alt={displayMemberName} className="opacity-90" />
      </div>

      <div className="col-start-2 min-w-0 self-start">
        <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
          <Text
            variant="body"
            as="span"
            className={`break-words font-semibold ${member.isNpc ? 'tv-tone-enemy-text' : ''}`}
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

        <div className="mt-1 grid grid-cols-2 gap-1.5 md:gap-2">
          <div
            className={`flex flex-1 items-center justify-between rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/50 tv-input-surface px-1.5 py-0.5 ${isGm ? 'cursor-pointer hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              if (isGm) onOpenDamageModal?.(member);
            }}
            title={isGm ? 'Klik om HP aan te passen' : 'Hit Points'}
          >
            <Text variant="label" as="span">HP</Text>
            {hiddenNpcForPlayer ? (
              <Text variant="meta" as="span">?</Text>
            ) : (
              <Text variant="meta" as="span" tone={member.hp < 10 ? 'accent' : 'primary'} className="font-bold tabular-nums">
                {member.hp}
              </Text>
            )}
          </div>
          <div
            className="flex flex-1 items-center justify-between rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/50 tv-input-surface px-1.5 py-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            <Text variant="label" as="span">AC</Text>
            {hiddenNpcForPlayer ? (
              <Text variant="meta" as="span">?</Text>
            ) : (
              <EditableStat
                className="font-bold tv-text text-xs"
                value={member.ac}
                onChange={(value) => onUpdateStat?.(member.id, 'ac', value)}
                disabled={!isGm}
              />
            )}
          </div>
        </div>
      </div>

      <div className="col-start-3 flex flex-col items-center justify-center gap-1.5 self-stretch md:col-start-4">
        {combatInProgress ? (
          <TurnOrderMarker orderIndex={orderIndex} />
        ) : null}
        <span className={`inline-flex min-w-[44px] items-center justify-center rounded border tv-input-surface px-2 py-0.5 text-xs font-bold ${member.isNpc ? 'tv-tone-enemy-chip' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] tv-accent'} ${isCurrentTurn ? 'tv-chip-surface shadow-inner' : ''}`}>
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
          className="col-start-3 row-span-1 flex flex-row items-center justify-end gap-1 md:col-start-3 md:row-span-2 md:flex-col md:justify-center md:gap-1.5 md:opacity-80 md:transition-opacity md:group-hover:opacity-100"
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
