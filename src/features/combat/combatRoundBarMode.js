import { COMBAT_STATUS } from '../../lib/battleUtils';
import { t } from '../../i18n/dialogs.js';

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
  if (combatStatus === COMBAT_STATUS.IDLE) return t('combat:roundBar.idle');
  if (combatStatus === COMBAT_STATUS.PAUSED) return t('combat:roundBar.paused', { round: turnRound });
  return t('combat:roundBar.round', { round: turnRound });
}
