import { COMBAT_STATUS, normalizeCombatStatus } from './battleUtils';

export const DEFAULT_COMBAT_STATE = {
  status: COMBAT_STATUS.IDLE,
  currentTurnId: null,
  turnRound: 1,
  initiativeOrder: [],
};

export function normalizeCombatSessionState(sessionData = {}) {
  const fallbackStatus = sessionData?.battleActive ? COMBAT_STATUS.ACTIVE : COMBAT_STATUS.IDLE;
  const status = normalizeCombatStatus(sessionData?.combatStatus || sessionData?.status || fallbackStatus);

  return {
    status,
    currentTurnId: typeof sessionData?.currentTurnId === 'string' && sessionData.currentTurnId.trim()
      ? sessionData.currentTurnId
      : null,
    turnRound: Math.max(1, Number(sessionData?.turnRound) || 1),
    initiativeOrder: Array.isArray(sessionData?.initiativeOrder)
      ? sessionData.initiativeOrder.filter((id) => typeof id === 'string' && id.trim())
      : [],
  };
}

export function buildCombatSessionPatch(combatState = {}) {
  const normalized = normalizeCombatSessionState(combatState);
  return {
    battleActive: normalized.status === COMBAT_STATUS.ACTIVE,
    combatStatus: normalized.status,
    currentTurnId: normalized.currentTurnId,
    turnRound: normalized.turnRound,
    initiativeOrder: normalized.initiativeOrder,
  };
}
