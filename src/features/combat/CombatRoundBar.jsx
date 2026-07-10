import React from 'react';
import { Flame, Shield, Swords } from 'lucide-react';
import Text from '../../ui/Text';
import { COMBAT_STATUS } from '../../lib/battleUtils';
import { getCombatRoundBarLabel, getCombatRoundBarMode } from './combatRoundBarMode';
import { getCombatRoundMediaProfile } from '../../lib/combatAmbientLibrary';
import { useCombatRoundAmbience } from './useCombatRoundAmbience';
import { useT } from '../../i18n/useT';

function getCombatStatusIcon(mode) {
  if (mode === 'idle') return Flame;
  if (mode === 'paused') return Shield;
  return Swords;
}

export default function CombatRoundBar({
  combatStatus,
  turnRound,
  currentTurnOrderIndex,
  currentTurnMember = null,
  isMyTurn = false,
  isActive = true,
  infoSlot = null,
}) {
  const { t } = useT('combat');
  const mode = getCombatRoundBarMode({
    combatStatus,
    isMyTurn,
    currentTurnMember,
  });
  const label = getCombatRoundBarLabel({ combatStatus, turnRound });
  const mediaProfile = getCombatRoundMediaProfile(mode);
  const { videoRef, ambienceAllowed } = useCombatRoundAmbience({ mode, isActive });
  const showTurnIndex = combatStatus !== COMBAT_STATUS.IDLE && Boolean(currentTurnOrderIndex);
  const turnIndexLive = combatStatus === COMBAT_STATUS.ACTIVE;
  const StatusIcon = getCombatStatusIcon(mode);

  const turnIndexClass = [
    'tv-combat-turn-index',
    turnIndexLive ? 'tv-combat-turn-index--live' : '',
    mode === 'enemy-turn' ? 'tv-combat-turn-index--enemy' : '',
    mode === 'player-turn' ? 'tv-combat-turn-index--player' : '',
    mode === 'ally-turn' ? 'tv-combat-turn-index--ally' : '',
    mode === 'paused' ? 'tv-combat-turn-index--paused' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`tv-combat-round-bar tv-combat-round-bar--${mode}`}
      data-combat-round-mode={mode}
      aria-live="polite"
    >
      {ambienceAllowed ? (
        <div className="tv-combat-round-bar__media" aria-hidden="true">
          <video
            key={mediaProfile.video}
            ref={videoRef}
            className="tv-combat-round-bar__video"
            src={mediaProfile.video}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
          />
          <div className={`tv-combat-round-bar__media-veil tv-combat-round-bar__media-veil--${mode}`} />
        </div>
      ) : null}

      <div className="tv-combat-round-bar__scene" aria-hidden="true">
        <span className="tv-combat-round-bar__orb tv-combat-round-bar__orb--a" />
        <span className="tv-combat-round-bar__orb tv-combat-round-bar__orb--b" />
        <span className="tv-combat-round-bar__sheen" />
        <span className="tv-combat-round-bar__ring" />
      </div>

      <div className="tv-combat-round-bar__content">
        {showTurnIndex ? (
          <span className={turnIndexClass} title={t('roundBar.turnIndexTitle')}>
            {currentTurnOrderIndex}
          </span>
        ) : null}
        <span
          className={`tv-combat-round-bar__status-icon tv-combat-round-bar__status-icon--${mode}`}
          aria-hidden="true"
        >
          <StatusIcon className="h-3.5 w-3.5" />
        </span>
        <Text variant="body" as="span" className="tv-combat-round-bar__label min-w-0 flex-1 truncate text-sm font-semibold">
          {label}
        </Text>
        {infoSlot}
      </div>
    </div>
  );
}
