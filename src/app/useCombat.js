import { useEffect, useRef, useState } from 'react';
import {
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  COMBAT_JOIN_REQUEST_STATUS,
  COMBAT_PARTICIPATION_STATUS,
  COMBAT_STATUS,
  filterCombatParticipants,
  getNextTurnId,
  sortPartyByInitiative,
} from '../lib/battleUtils';
import { isIncapacitated } from '../lib/battleConditions';
import {
  buildCombatSessionPatch,
  DEFAULT_COMBAT_STATE,
  normalizeCombatSessionState,
} from '../lib/combatSessionState';

/**
 * Combat state + handlers extracted from App.jsx (Wave 2a).
 *
 * Owns initiative order, turn tracking, pause/resume, join-requests, and
 * Firestore persistence for session-level combat fields. Party member docs
 * (initiative values, participation flags) are updated here when combat
 * actions require it.
 */
export function useCombat({ sessionDocId, party, setParty, role, uid, setSessionInfo }) {
  const [combatStatus, setCombatStatus] = useState(COMBAT_STATUS.IDLE);
  const [currentTurnId, setCurrentTurnId] = useState(null);
  const [turnRound, setTurnRound] = useState(1);
  const [initiativeOrder, setInitiativeOrder] = useState([]);

  const optimisticCombatStateRef = useRef(null);
  const autoResolveJoinRequestsInFlightRef = useRef(false);

  const battleActive = combatStatus === COMBAT_STATUS.ACTIVE;
  const battlePaused = combatStatus === COMBAT_STATUS.PAUSED;

  const applyLocalCombatState = (nextCombatState) => {
    const normalized = normalizeCombatSessionState(nextCombatState);
    setCombatStatus(normalized.status);
    setCurrentTurnId(normalized.currentTurnId);
    setTurnRound(normalized.turnRound);
    setInitiativeOrder(normalized.initiativeOrder);
    return normalized;
  };

  const resetCombatState = () => {
    optimisticCombatStateRef.current = null;
    applyLocalCombatState(DEFAULT_COMBAT_STATE);
  };

  const markOptimisticCombatState = (nextCombatState) => {
    optimisticCombatStateRef.current = {
      state: normalizeCombatSessionState(nextCombatState),
      expiresAt: Date.now() + 9000,
    };
  };

  const isTransientCombatSyncError = (error) => {
    const code = String(error?.code || '').toLowerCase();
    if (['aborted', 'cancelled', 'deadline-exceeded', 'resource-exhausted', 'unavailable'].includes(code)) {
      return true;
    }

    const message = String(error?.message || '').toLowerCase();
    return message.includes('err_aborted') || message.includes('network') || message.includes('offline');
  };

  const keepLocalCombatStateWithSyncWarning = (contextLabel) => {
    setSessionInfo?.(`${contextLabel} lokaal bijgewerkt. Synchronisatie met Firestore hapert tijdelijk; status wordt opnieuw geprobeerd.`);
  };

  const persistCombatState = async (nextCombatState) => {
    const normalized = applyLocalCombatState(nextCombatState);
    if (sessionDocId) {
      await updateDoc(doc(db, 'sessions', sessionDocId), {
        ...buildCombatSessionPatch(normalized),
        updatedAt: serverTimestamp(),
      });
    }
    return normalized;
  };

  const getCurrentCombatState = () => ({
    status: combatStatus,
    currentTurnId,
    turnRound,
    initiativeOrder,
  });

  const buildCombatStateAfterExcludingMember = (memberId, nextParty) => {
    const currentCombatState = getCurrentCombatState();
    const shouldUpdateCombat = currentTurnId === memberId || initiativeOrder.includes(memberId);

    if (!shouldUpdateCombat) {
      return {
        shouldUpdateCombat: false,
        nextCombatState: currentCombatState,
      };
    }

    const activeMembersBefore = sortPartyByInitiative(filterCombatParticipants(party), initiativeOrder)
      .filter((member) => Number.isFinite(Number(member.init)));
    const activeMembersAfter = sortPartyByInitiative(filterCombatParticipants(nextParty), initiativeOrder)
      .filter((member) => Number.isFinite(Number(member.init)));
    const removedIndex = activeMembersBefore.findIndex((member) => member.id === memberId);
    const wrapped = removedIndex >= activeMembersAfter.length;

    const nextCombatState = {
      status: activeMembersAfter.length > 0 ? combatStatus : COMBAT_STATUS.IDLE,
      currentTurnId,
      turnRound: activeMembersAfter.length > 0 ? turnRound : 1,
      initiativeOrder: initiativeOrder.filter((id) => id !== memberId),
    };

    if (currentTurnId === memberId) {
      nextCombatState.currentTurnId = activeMembersAfter.length > 0
        ? (activeMembersAfter[removedIndex]?.id || activeMembersAfter[0]?.id || null)
        : null;

      if (wrapped && combatStatus === COMBAT_STATUS.ACTIVE && activeMembersAfter.length > 0) {
        nextCombatState.turnRound = turnRound + 1;
      }
    }

    return {
      shouldUpdateCombat: true,
      nextCombatState,
    };
  };

  /**
   * Apply combat fields from a session Firestore snapshot.
   * Returns skipCombatUpdate=true when a stale idle snapshot should be ignored
   * right after a local start/resume (optimistic window).
   */
  const reconcileCombatFromSnapshot = (sessionData = {}) => {
    const incomingCombatState = normalizeCombatSessionState(sessionData);
    const optimistic = optimisticCombatStateRef.current;

    if (optimistic) {
      if (Date.now() > optimistic.expiresAt) {
        optimisticCombatStateRef.current = null;
      } else {
        const expected = optimistic.state;
        const matchesExpected = (
          incomingCombatState.status === expected.status
          && incomingCombatState.currentTurnId === expected.currentTurnId
          && incomingCombatState.turnRound === expected.turnRound
        );

        if (matchesExpected) {
          optimisticCombatStateRef.current = null;
        } else if (
          expected.status === COMBAT_STATUS.ACTIVE
          && incomingCombatState.status === COMBAT_STATUS.IDLE
        ) {
          return { skipCombatUpdate: true };
        }
      }
    }

    applyLocalCombatState(incomingCombatState);
    return { skipCombatUpdate: false };
  };

  const handleBatchUpdateInitiatives = async (initiativeUpdates = []) => {
    if (!Array.isArray(initiativeUpdates) || initiativeUpdates.length === 0) return party;

    const previousParty = party;
    const updateMap = new Map(
      initiativeUpdates
        .filter((entry) => entry?.id)
        .map((entry) => [entry.id, Number.isFinite(Number(entry.init)) ? Number(entry.init) : null])
    );

    if (updateMap.size === 0) return party;

    const nextParty = party.map((member) => (
      updateMap.has(member.id)
        ? { ...member, init: updateMap.get(member.id) }
        : member
    ));

    setParty(nextParty);

    if (sessionDocId) {
      try {
        const batch = writeBatch(db);
        updateMap.forEach((initValue, memberId) => {
          batch.set(doc(db, 'sessions', sessionDocId, 'players', memberId), {
            initiative: initValue,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        await batch.commit();
      } catch (err) {
        console.error('Initiatives batch update fout:', err);
        setParty(previousParty);
        throw err;
      }
    }

    return nextParty;
  };

  const handleInitiativeSwap = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceMember = party.find((p) => p.id === sourceId);
    const targetMember = party.find((p) => p.id === targetId);

    if (!sourceMember || !targetMember) return;
    if (isIncapacitated(sourceMember) || isIncapacitated(targetMember)) return;

    const sourceInit = Number.isFinite(Number(sourceMember.init)) ? Number(sourceMember.init) : null;
    const targetInit = Number.isFinite(Number(targetMember.init)) ? Number(targetMember.init) : null;

    if (sourceInit === null || targetInit === null) return;

    const nextParty = party.map((member) => {
      if (member.id === sourceId) return { ...member, init: targetInit };
      if (member.id === targetId) return { ...member, init: sourceInit };
      return member;
    });

    setParty(nextParty);

    if (sessionDocId) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'sessions', sessionDocId, 'players', sourceId), {
          initiative: targetInit,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        batch.set(doc(db, 'sessions', sessionDocId, 'players', targetId), {
          initiative: sourceInit,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        await batch.commit();
      } catch (err) {
        console.error('Initiative swap fout:', err);
      }
    }
  };

  const handleStartCombat = async ({ initiativeUpdates = [], nextInitiativeOrder = [] } = {}) => {
    const previousParty = party;
    const previousCombatState = getCurrentCombatState();
    const updateMap = new Map(
      initiativeUpdates
        .filter((entry) => entry?.id)
        .map((entry) => [entry.id, Number.isFinite(Number(entry.init)) ? Number(entry.init) : null])
    );

    const nextParty = party.map((member) => (
      updateMap.has(member.id)
        ? { ...member, init: updateMap.get(member.id) }
        : member
    ));

    const resolvedOrder = (Array.isArray(nextInitiativeOrder) && nextInitiativeOrder.length > 0
      ? nextInitiativeOrder
      : sortPartyByInitiative(filterCombatParticipants(nextParty))
          .filter((member) => Number.isFinite(Number(member.init)))
          .map((member) => member.id)
    );

    const nextCombatState = {
      status: COMBAT_STATUS.ACTIVE,
      currentTurnId: resolvedOrder[0] || null,
      turnRound: 1,
      initiativeOrder: resolvedOrder,
    };

    setParty(nextParty);
    markOptimisticCombatState(nextCombatState);
    applyLocalCombatState(nextCombatState);

    if (sessionDocId) {
      try {
        const batch = writeBatch(db);
        updateMap.forEach((initValue, memberId) => {
          batch.set(doc(db, 'sessions', sessionDocId, 'players', memberId), {
            initiative: initValue,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        batch.update(doc(db, 'sessions', sessionDocId), {
          ...buildCombatSessionPatch(nextCombatState),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (err) {
        console.error('Gevecht starten fout:', err);
        if (isTransientCombatSyncError(err)) {
          keepLocalCombatStateWithSyncWarning('Gevecht starten');
          return { nextParty, nextCombatState, syncPending: true };
        }

        optimisticCombatStateRef.current = null;
        setParty(previousParty);
        applyLocalCombatState(previousCombatState);
        throw err;
      }
    }

    return { nextParty, nextCombatState };
  };

  const handlePauseCombat = async () => persistCombatState({
    ...getCurrentCombatState(),
    status: COMBAT_STATUS.PAUSED,
  });

  const handleResumeCombat = async ({ nextInitiativeOrder = initiativeOrder, initiativeUpdates = [] } = {}) => {
    const previousParty = party;
    const previousCombatState = getCurrentCombatState();
    const updateMap = new Map(
      initiativeUpdates
        .filter((entry) => entry?.id)
        .map((entry) => [entry.id, Number.isFinite(Number(entry.init)) ? Number(entry.init) : null])
    );

    const nextParty = party.map((member) => (
      updateMap.has(member.id)
        ? { ...member, init: updateMap.get(member.id) }
        : member
    ));

    const resolvedOrder = (Array.isArray(nextInitiativeOrder) && nextInitiativeOrder.length > 0
      ? nextInitiativeOrder
      : sortPartyByInitiative(filterCombatParticipants(nextParty), initiativeOrder)
          .filter((member) => Number.isFinite(Number(member.init)))
          .map((member) => member.id)
    );

    const nextCombatState = {
      ...getCurrentCombatState(),
      status: COMBAT_STATUS.ACTIVE,
      currentTurnId: resolvedOrder.includes(currentTurnId) ? currentTurnId : (resolvedOrder[0] || null),
      initiativeOrder: resolvedOrder,
    };

    setParty(nextParty);
    markOptimisticCombatState(nextCombatState);
    applyLocalCombatState(nextCombatState);

    if (sessionDocId) {
      try {
        const batch = writeBatch(db);
        updateMap.forEach((initValue, memberId) => {
          batch.set(doc(db, 'sessions', sessionDocId, 'players', memberId), {
            initiative: initValue,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        batch.update(doc(db, 'sessions', sessionDocId), {
          ...buildCombatSessionPatch(nextCombatState),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (err) {
        console.error('Gevecht hervatten fout:', err);
        if (isTransientCombatSyncError(err)) {
          keepLocalCombatStateWithSyncWarning('Gevecht hervatten');
          return { nextCombatState, nextParty, syncPending: true };
        }

        optimisticCombatStateRef.current = null;
        setParty(previousParty);
        applyLocalCombatState(previousCombatState);
        throw err;
      }
    }

    return nextCombatState;
  };

  const handleEndCombat = async () => persistCombatState({
    status: COMBAT_STATUS.IDLE,
    currentTurnId: null,
    turnRound: 1,
    initiativeOrder,
  });

  const handleAdvanceTurn = async () => {
    const activeMembers = sortPartyByInitiative(filterCombatParticipants(party), initiativeOrder)
      .filter((member) => Number.isFinite(Number(member.init)));

    if (activeMembers.length === 0) return null;

    const currentIndex = activeMembers.findIndex((member) => member.id === currentTurnId);
    const nextTurnId = getNextTurnId(activeMembers, currentTurnId, initiativeOrder);
    const wrappedRound = currentIndex === -1 || currentIndex === activeMembers.length - 1;

    return persistCombatState({
      ...getCurrentCombatState(),
      status: COMBAT_STATUS.ACTIVE,
      currentTurnId: nextTurnId,
      turnRound: wrappedRound ? turnRound + 1 : turnRound,
    });
  };

  const handleDeleteNpc = async (npcId) => {
    const previousParty = party;
    const previousCombatState = getCurrentCombatState();
    const nextParty = party.filter((member) => member.id !== npcId);
    const { shouldUpdateCombat, nextCombatState } = buildCombatStateAfterExcludingMember(npcId, nextParty);

    setParty(nextParty);
    if (shouldUpdateCombat) {
      applyLocalCombatState(nextCombatState);
    }

    if (sessionDocId) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'sessions', sessionDocId, 'players', npcId));
        if (shouldUpdateCombat) {
          batch.update(doc(db, 'sessions', sessionDocId), {
            ...buildCombatSessionPatch(nextCombatState),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        console.error('NPC verwijderen fout:', err);
        setParty(previousParty);
        if (shouldUpdateCombat) {
          applyLocalCombatState(previousCombatState);
        }
      }
    }
  };

  const handleKickPlayerFromCombat = async (playerId) => {
    if (role !== 'gm' || !sessionDocId || !playerId) return;

    const targetMember = party.find((member) => member.id === playerId);
    if (!targetMember || targetMember.isNpc || targetMember.id === uid) return;
    if (targetMember.combatParticipation === COMBAT_PARTICIPATION_STATUS.REMOVED) return;

    const previousParty = party;
    const previousCombatState = getCurrentCombatState();
    const nextParty = party.map((member) => (
      member.id === playerId
        ? {
            ...member,
            combatParticipation: COMBAT_PARTICIPATION_STATUS.REMOVED,
            combatJoinRequestStatus: COMBAT_JOIN_REQUEST_STATUS.NONE,
          }
        : member
    ));
    const { shouldUpdateCombat, nextCombatState } = buildCombatStateAfterExcludingMember(playerId, nextParty);

    setParty(nextParty);
    if (shouldUpdateCombat) {
      applyLocalCombatState(nextCombatState);
    }

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'sessions', sessionDocId, 'players', playerId), {
        combatParticipation: COMBAT_PARTICIPATION_STATUS.REMOVED,
        combatJoinRequestStatus: COMBAT_JOIN_REQUEST_STATUS.NONE,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (shouldUpdateCombat) {
        batch.update(doc(db, 'sessions', sessionDocId), {
          ...buildCombatSessionPatch(nextCombatState),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (err) {
      console.error('Speler uit gevecht verwijderen fout:', err);
      setParty(previousParty);
      if (shouldUpdateCombat) {
        applyLocalCombatState(previousCombatState);
      }
      throw err;
    }
  };

  const handleRequestCombatJoin = async (playerId) => {
    if (!sessionDocId || !playerId) return;

    const targetMember = party.find((member) => member.id === playerId);
    if (!targetMember || targetMember.isNpc) return;
    if (targetMember.combatParticipation !== COMBAT_PARTICIPATION_STATUS.REMOVED) return;
    if (targetMember.combatJoinRequestStatus === COMBAT_JOIN_REQUEST_STATUS.PENDING) return;

    const previousParty = party;
    const nextParty = party.map((member) => (
      member.id === playerId
        ? { ...member, combatJoinRequestStatus: COMBAT_JOIN_REQUEST_STATUS.PENDING }
        : member
    ));

    setParty(nextParty);

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'players', playerId), {
        combatJoinRequestStatus: COMBAT_JOIN_REQUEST_STATUS.PENDING,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Meedoen-verzoek fout:', err);
      setParty(previousParty);
      throw err;
    }
  };

  useEffect(() => {
    if (
      role !== 'gm'
      || !sessionDocId
      || combatStatus !== COMBAT_STATUS.IDLE
      || autoResolveJoinRequestsInFlightRef.current
    ) {
      return;
    }

    const pendingMembers = party.filter((member) => (
      member?.isNpc !== true
      && member?.combatParticipation === COMBAT_PARTICIPATION_STATUS.REMOVED
      && member?.combatJoinRequestStatus === COMBAT_JOIN_REQUEST_STATUS.PENDING
    ));

    if (pendingMembers.length === 0) return;

    autoResolveJoinRequestsInFlightRef.current = true;

    const resolvePendingRequests = async () => {
      try {
        const batch = writeBatch(db);
        pendingMembers.forEach((member) => {
          batch.set(doc(db, 'sessions', sessionDocId, 'players', member.id), {
            combatParticipation: COMBAT_PARTICIPATION_STATUS.ACTIVE,
            combatJoinRequestStatus: COMBAT_JOIN_REQUEST_STATUS.NONE,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        await batch.commit();
      } catch (err) {
        console.error('Automatisch verwerken van meedoen-verzoeken mislukt:', err);
      } finally {
        autoResolveJoinRequestsInFlightRef.current = false;
      }
    };

    resolvePendingRequests();
  }, [combatStatus, party, role, sessionDocId]);

  return {
    combatStatus,
    currentTurnId,
    turnRound,
    initiativeOrder,
    battleActive,
    battlePaused,
    resetCombatState,
    reconcileCombatFromSnapshot,
    handleBatchUpdateInitiatives,
    handleInitiativeSwap,
    handleStartCombat,
    handlePauseCombat,
    handleResumeCombat,
    handleEndCombat,
    handleAdvanceTurn,
    handleDeleteNpc,
    handleKickPlayerFromCombat,
    handleRequestCombatJoin,
  };
}

export default useCombat;
