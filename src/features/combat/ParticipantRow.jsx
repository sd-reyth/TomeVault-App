import React from 'react';
import { HeartCrack, Skull } from 'lucide-react';
import EditableStat from '../../components/EditableStat';
import TvImage from '../../components/TvImage';
import { getAvatarObjectPosition, resolveDisplayAvatar } from '../../lib/placeholders';
import Text from '../../ui/Text';
import CombatStatChip from './CombatStatChip';
import ConditionChips from './ConditionChips';
import TurnOrderMarker from './TurnOrderMarker';
import { useT } from '../../i18n/useT';

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
  activeConditions,
  hasAlertFeat,
  currentPlayerId,
  onOpenProfile,
  onUpdateStat,
  onOpenDamageModal,
  onOpenConditions,
}) {
  const { t } = useT('combat');
  const hasConditions = activeConditions.length > 0;
  const hpLow = !hiddenNpcForPlayer && Number(member.hp) < 10;
  const roleLabel = member.isNpc ? t('participant.npc') : t('participant.player');
  const rawSubtitle = String(member.subtitle || '').trim();
  const displaySubtitle = (() => {
    if (rawSubtitle && rawSubtitle.toLowerCase() !== roleLabel.toLowerCase()) return rawSubtitle;
    if (member.isNpc) return t('participant.enemy');
    return '';
  })();

  const canOpenProfile = !hiddenNpcForPlayer;
  const isOwnCharacter = member.id === currentPlayerId;
  const hpInteractive = isGm || isOwnCharacter;
  const isMarkedDead = member.isDead === true;
  const atZeroHp = Number(member.hp) <= 0 && Number(member.maxHp) > 0;
  const isDefeated = !hiddenNpcForPlayer && (isMarkedDead || (member.isNpc && atZeroHp));
  const isDowned = !hiddenNpcForPlayer && !member.isNpc && !isMarkedDead && atZeroHp;
  const rowClass = [
    'tv-combat-participant-row tv-handout-card group relative flex flex-row items-stretch overflow-hidden rounded-2xl transition-all duration-200 ease-out',
    canOpenProfile ? 'cursor-pointer' : 'cursor-default',
    member.isNpc ? 'tv-combat-row--npc' : '',
    isCurrentTurn && battleActive ? 'tv-combat-row--turn' : '',
    isCurrentTurn && combatPaused ? 'tv-combat-row--turn-paused' : '',
    isDefeated ? 'tv-combat-row--defeated' : '',
    isMarkedDead ? 'tv-combat-row--dead' : '',
    isDowned ? 'tv-combat-row--downed' : '',
  ].filter(Boolean).join(' ');

  const handleOpenProfile = () => {
    if (!canOpenProfile) return;
    onOpenProfile?.(member);
  };

  return (
    <div
      onClick={handleOpenProfile}
      className={rowClass}
      data-turn={isCurrentTurn ? 'true' : undefined}
      role={canOpenProfile ? 'button' : undefined}
      tabIndex={canOpenProfile ? 0 : undefined}
      onKeyDown={(event) => {
        if (!canOpenProfile) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenProfile?.(member);
        }
      }}
    >
      {isCurrentTurn && battleActive ? <div className="tv-combat-turn-rail" aria-hidden="true" /> : null}

      <div className="tv-handout-media tv-image-frame tv-combat-participant-media relative w-[4.25rem] shrink-0 self-stretch overflow-hidden border-r md:w-[4.75rem]">
        <TvImage
          src={resolveDisplayAvatar(displayMemberAvatar, member.id)}
          alt={displayMemberName}
          className="absolute inset-0 h-full w-full object-cover opacity-95"
          style={{ objectPosition: getAvatarObjectPosition(member.avatarPosition) }}
        />
      </div>

      <div className="tv-combat-participant-row__content relative z-10 flex min-w-0 flex-1 flex-col p-2 md:p-2.5">
        <div className="tv-combat-participant-row__title flex min-w-0 items-center gap-2 pr-8">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${member.isNpc ? 'tv-tone-enemy-chip' : 'tv-tone-ally-chip'}`}
          >
            {roleLabel}
          </span>
          <Text
            variant="body"
            as="span"
            className={`min-w-0 truncate text-sm font-medium leading-snug md:text-[0.9375rem] ${member.isNpc ? 'tv-tone-enemy-text' : ''}`}
          >
            {displayMemberName}
          </Text>
          {hasAlertFeat ? (
            <Text variant="label" tone="accent" as="span" className="tv-tag shrink-0 px-1.5 py-0.5 text-[9px]">
              {t('participant.alert')}
            </Text>
          ) : null}
        </div>

        <Text variant="meta" as="p" className="tv-combat-participant-row__subtitle line-clamp-1 pr-8 text-[11px] leading-4">
          {displaySubtitle || '\u00a0'}
        </Text>

        <div className="tv-combat-participant-row__stats flex min-w-0 flex-nowrap items-center gap-1.5">
          <CombatStatChip
            label="HP"
            value={member.hp}
            hidden={hiddenNpcForPlayer}
            low={hpLow}
            interactive={hpInteractive}
            title={isGm ? t('participant.hpEditGm') : (isOwnCharacter ? t('participant.hpEditSelf') : t('participant.hpTitle'))}
            onClick={(event) => {
              event.stopPropagation();
              if (isGm) {
                onOpenDamageModal?.(member);
              } else if (isOwnCharacter) {
                onOpenProfile?.(member);
              }
            }}
          />
          <CombatStatChip label="AC" hidden={hiddenNpcForPlayer}>
            {hiddenNpcForPlayer ? (
              <Text variant="meta" as="span">?</Text>
            ) : (
              <EditableStat
                className="font-bold tv-text text-[10px] tabular-nums md:text-xs"
                value={member.ac}
                onChange={(value) => onUpdateStat?.(member.id, 'ac', value)}
                disabled={!isGm}
              />
            )}
          </CombatStatChip>
          <CombatStatChip label="Init" className={isCurrentTurn ? 'tv-combat-init-badge--active' : ''}>
            <EditableStat
              className="font-bold tv-text text-[10px] tabular-nums md:text-xs"
              value={member.init}
              onChange={(value) => onUpdateStat?.(member.id, 'init', value)}
              disabled={!initiativeEditable}
              title={initiativeEditable ? t('participant.initEdit') : t('participant.initTitle')}
            />
          </CombatStatChip>
        </div>

        <div className="tv-combat-participant-row__conditions">
          {hasConditions ? (
            <ConditionChips
              conditions={activeConditions}
              isGm={isGm}
              onEdit={() => onOpenConditions?.(member)}
              className="mt-0"
            />
          ) : null}
        </div>
      </div>

      {combatInProgress ? (
        <div className="absolute right-2 top-2 z-20">
          <TurnOrderMarker orderIndex={orderIndex} isCurrentTurn={isCurrentTurn && battleActive} />
        </div>
      ) : null}

      {isDefeated ? (
        <div className="tv-combat-death-veil" aria-hidden="true">
          <Skull className="tv-combat-death-skull" strokeWidth={1.5} />
        </div>
      ) : null}

      {isDowned ? (
        <div className="tv-combat-downed-veil" role="img" aria-label={t('participant.downedAria', { name: displayMemberName })}>
          <HeartCrack className="tv-combat-downed-icon" strokeWidth={1.5} aria-hidden="true" />
          <span className="tv-combat-downed-label">{t('participant.downed')}</span>
        </div>
      ) : null}
    </div>
  );
}
