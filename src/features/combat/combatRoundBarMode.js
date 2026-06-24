import { COMBAT_STATUS } from '../../lib/battleUtils';

/**
 * Visual mode for the ambient round bar in the slagorde header.
 */
export function getCombatRoundBarMode({
  combatStatus,
  isMyTurn = false,
  currentTurnMember = null,
}) {
  if (combatStatus === COMBAT_STATUS.IDLE) return 'idle';
  if (combatStatus === COMBAT_STATUS.PAUSED) return 'paused';

  if (combatStatus === COMBAT_STATUS.ACTIVE) {
    if (isMyTurn) return 'player-turn';
    if (currentTurnMember?.isNpc) return 'enemy-turn';
    if (currentTurnMember) return 'ally-turn';
    return 'combat';
  }

  return 'idle';
}

export function getCombatRoundBarLabel({ combatStatus, turnRound }) {
  if (combatStatus === COMBAT_STATUS.IDLE) return 'Ruststand';
  if (combatStatus === COMBAT_STATUS.PAUSED) return `Ronde ${turnRound} · Pauze`;
  return `Ronde ${turnRound}`;
}
