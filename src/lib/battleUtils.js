export const COMBAT_STATUS = {
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused',
};

export const COMBAT_PARTICIPATION_STATUS = {
  ACTIVE: 'active',
  REMOVED: 'removed',
};

export const COMBAT_JOIN_REQUEST_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
};

export function normalizeCombatStatus(value) {
  if (value === COMBAT_STATUS.ACTIVE || value === COMBAT_STATUS.PAUSED) return value;
  return COMBAT_STATUS.IDLE;
}

export function normalizeCombatParticipation(value) {
  return value === COMBAT_PARTICIPATION_STATUS.REMOVED
    ? COMBAT_PARTICIPATION_STATUS.REMOVED
    : COMBAT_PARTICIPATION_STATUS.ACTIVE;
}

export function normalizeCombatJoinRequestStatus(value) {
  return value === COMBAT_JOIN_REQUEST_STATUS.PENDING
    ? COMBAT_JOIN_REQUEST_STATUS.PENDING
    : COMBAT_JOIN_REQUEST_STATUS.NONE;
}

export function isCombatParticipant(member) {
  if (!member) return false;
  if (member.isNpc === true) return true;
  return normalizeCombatParticipation(member.combatParticipation) !== COMBAT_PARTICIPATION_STATUS.REMOVED;
}

export function filterCombatParticipants(party = []) {
  return party.filter((member) => isCombatParticipant(member));
}

export function hasPendingCombatJoinRequest(member) {
  return normalizeCombatJoinRequestStatus(member?.combatJoinRequestStatus) === COMBAT_JOIN_REQUEST_STATUS.PENDING;
}

export function getInitiativeTotal(member) {
  const value = Number(member?.init);
  return Number.isFinite(value) ? value : null;
}

export function getInitiativeModifier(member) {
  const value = Number(member?.initMod ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function getInitiativeRoll(member) {
  const total = getInitiativeTotal(member);
  if (total === null) return null;
  return total - getInitiativeModifier(member);
}

export function getCombatOrderIndexMap(initiativeOrder = []) {
  return new Map(
    initiativeOrder.map((id, index) => [id, index])
  );
}

export function compareInitiativeMembers(left, right, initiativeOrder = []) {
  const leftTotal = getInitiativeTotal(left);
  const rightTotal = getInitiativeTotal(right);

  if (leftTotal === null && rightTotal !== null) return 1;
  if (leftTotal !== null && rightTotal === null) return -1;
  if (leftTotal !== null && rightTotal !== null && rightTotal !== leftTotal) {
    return rightTotal - leftTotal;
  }

  const leftModifier = getInitiativeModifier(left);
  const rightModifier = getInitiativeModifier(right);
  if (rightModifier !== leftModifier) {
    return rightModifier - leftModifier;
  }

  const orderIndexMap = getCombatOrderIndexMap(initiativeOrder);
  const leftOrderIndex = orderIndexMap.get(left?.id);
  const rightOrderIndex = orderIndexMap.get(right?.id);
  const leftHasOrder = Number.isFinite(leftOrderIndex);
  const rightHasOrder = Number.isFinite(rightOrderIndex);

  if (leftHasOrder && rightHasOrder && leftOrderIndex !== rightOrderIndex) {
    return leftOrderIndex - rightOrderIndex;
  }

  if (leftHasOrder && !rightHasOrder) return -1;
  if (!leftHasOrder && rightHasOrder) return 1;

  const leftName = String(left?.name || '').toLocaleLowerCase('nl-NL');
  const rightName = String(right?.name || '').toLocaleLowerCase('nl-NL');
  return leftName.localeCompare(rightName, 'nl-NL');
}

export function sortPartyByInitiative(party = [], initiativeOrder = []) {
  return [...party].sort((left, right) => compareInitiativeMembers(left, right, initiativeOrder));
}

export function getTieGroupKey(member) {
  return `${getInitiativeTotal(member) ?? 'null'}:${getInitiativeModifier(member)}`;
}

export function getInitiativeTieGroups(party = []) {
  const groups = new Map();

  party.forEach((member) => {
    if (getInitiativeTotal(member) === null) return;
    const key = getTieGroupKey(member);
    const existing = groups.get(key) || [];
    existing.push(member);
    groups.set(key, existing);
  });

  return Array.from(groups.values())
    .filter((group) => group.length > 1)
    .sort((left, right) => compareInitiativeMembers(left[0], right[0]));
}

export function buildInitiativeOrder(party = [], groupOverrides = {}) {
  const sorted = sortPartyByInitiative(party);
  const groups = new Map();

  sorted.forEach((member) => {
    const key = getTieGroupKey(member);
    const existing = groups.get(key) || [];
    existing.push(member);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).flatMap(([key, group]) => {
    if (group.length < 2) return group.map((member) => member.id);

    const override = Array.isArray(groupOverrides[key]) ? groupOverrides[key] : [];
    const overrideSet = new Set(override);
    const orderedOverride = override.filter((id) => group.some((member) => member.id === id));
    const remaining = group
      .filter((member) => !overrideSet.has(member.id))
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'nl-NL'));

    return [...orderedOverride, ...remaining.map((member) => member.id)];
  });
}

export function getNextTurnId(party = [], currentTurnId = null, initiativeOrder = []) {
  const sorted = sortPartyByInitiative(
    party.filter((member) => getInitiativeTotal(member) !== null),
    initiativeOrder
  );
  if (sorted.length === 0) return null;

  const currentIndex = sorted.findIndex((member) => member.id === currentTurnId);
  if (currentIndex === -1 || currentIndex === sorted.length - 1) {
    return sorted[0].id;
  }

  return sorted[currentIndex + 1].id;
}

export function getTurnsUntilMember(party = [], initiativeOrder = [], currentTurnId = null, targetId = null) {
  if (!targetId) return null;

  const sorted = sortPartyByInitiative(
    party.filter((member) => getInitiativeTotal(member) !== null),
    initiativeOrder
  );
  if (sorted.length === 0) return null;

  const currentIndex = sorted.findIndex((member) => member.id === currentTurnId);
  const targetIndex = sorted.findIndex((member) => member.id === targetId);
  if (targetIndex === -1) return null;
  if (currentIndex === -1) return targetIndex;
  if (targetIndex >= currentIndex) return targetIndex - currentIndex;
  return sorted.length - currentIndex + targetIndex;
}

export function getTurnApproachRatio(party = [], initiativeOrder = [], currentTurnId = null, targetId = null) {
  const turnsUntil = getTurnsUntilMember(party, initiativeOrder, currentTurnId, targetId);
  const activeMembers = party.filter((member) => getInitiativeTotal(member) !== null);
  if (turnsUntil === null || activeMembers.length <= 1) return 0;
  if (turnsUntil === 0) return 1;
  const maxDistance = Math.max(activeMembers.length - 1, 1);
  return Math.max(0, Math.min(1, 1 - turnsUntil / maxDistance));
}

export function rollD20() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return (buffer[0] % 20) + 1;
  }

  return Math.floor(Math.random() * 20) + 1;
}

export function rollInitiative(member) {
  return rollD20() + getInitiativeModifier(member);
}

export function shuffleList(items = []) {
  const values = [...items];

  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomBuffer = new Uint32Array(1);
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(randomBuffer);
      const swapIndex = randomBuffer[0] % (index + 1);
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
      continue;
    }

    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }

  return values;
}