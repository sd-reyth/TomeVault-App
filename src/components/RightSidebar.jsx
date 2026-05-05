import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Dice5,
  Flame,
  Info,
  Pause,
  Pin,
  PinOff,
  Swords,
  Trash2,
  UserPlus,
  UserMinus,
  X,
} from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import EditableStat from './EditableStat';
import {
  COMBAT_JOIN_REQUEST_STATUS,
  COMBAT_PARTICIPATION_STATUS,
  COMBAT_STATUS,
  buildInitiativeOrder,
  filterCombatParticipants,
  getInitiativeTieGroups,
  getTieGroupKey,
  getTurnApproachRatio,
  getTurnsUntilMember,
  hasPendingCombatJoinRequest,
  isCombatParticipant,
  rollInitiative,
  shuffleList,
  sortPartyByInitiative,
} from '../lib/battleUtils';

const RIGHT_SIDEBAR_DEFAULT_WIDTH = 288;
const RIGHT_SIDEBAR_MIN_WIDTH = 248;
const RIGHT_SIDEBAR_MAX_WIDTH = 380;
const RIGHT_SIDEBAR_STORAGE_KEY = 'tomevault.battleSidebarWidth';

function clampBattleSidebarWidth(width) {
  return Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, width));
}

function applyInitiativeUpdates(party = [], initiativeUpdates = []) {
  const updateMap = new Map(
    initiativeUpdates
      .filter((entry) => entry?.id)
      .map((entry) => [entry.id, Number.isFinite(Number(entry.init)) ? Number(entry.init) : null])
  );

  return party.map((member) => (
    updateMap.has(member.id)
      ? { ...member, init: updateMap.get(member.id) }
      : member
  ));
}

function getExistingTieOverrides(party = [], initiativeOrder = []) {
  if (!Array.isArray(initiativeOrder) || initiativeOrder.length === 0) return {};

  const overrides = {};
  getInitiativeTieGroups(party).forEach((group) => {
    const orderedIds = initiativeOrder.filter((id) => group.some((member) => member.id === id));
    if (orderedIds.length === group.length) {
      overrides[getTieGroupKey(group[0])] = orderedIds;
    }
  });
  return overrides;
}

function StatusTurnIndicator({ turnsUntil, ratio, isCurrentTurn }) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  const angle = `${Math.round(safeRatio * 360)}deg`;

  return (
    <div
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
        isCurrentTurn
          ? 'border-amber-500/70 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
          : 'border-stone-700/70'
      }`}
      title={isCurrentTurn ? 'Jouw beurt' : `Nog ${turnsUntil ?? '-'} beurt(en)`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--color-amber-500) 0deg ${angle}, rgba(255,255,255,0.08) ${angle} 360deg)`,
        }}
      />
      <div className="absolute inset-[3px] rounded-full border border-stone-800 bg-stone-950/90" />
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className={`font-fantasy text-[10px] tracking-[0.18em] ${isCurrentTurn ? 'text-amber-100' : 'text-stone-300'}`}>
          {isCurrentTurn ? 'NU' : (turnsUntil ?? '-')}
        </span>
      </div>
    </div>
  );
}

function OverlayDialog({ title, description, children, onClose, actions, showCloseButton = true }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-800/70 px-5 py-4">
          <div>
            <h3 className="font-fantasy text-lg tracking-[0.14em] text-stone-100">{title}</h3>
            {description ? <p className="mt-1 text-sm leading-6 text-stone-400">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-rose-400"
            >
              <X className="h-5 w-5" />
            </button>
          ) : <div className="h-7 w-7" />}
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex items-center justify-end gap-3 border-t border-stone-800/70 bg-stone-950/40 px-5 py-4">
          {actions}
        </div>
      </div>
    </div>
  );
}

function RightSidebar({
  party,
  role,
  isOpen,
  onClose,
  combatStatus,
  currentTurnId,
  turnRound,
  initiativeOrder,
  onStartCombat,
  onPauseCombat,
  onResumeCombat,
  onEndCombat,
  onAdvanceTurn,
  onRollAllInitiative,
  onKickPlayerFromCombat,
  onRequestCombatJoin,
  onResolveCombatJoinRequest,
  onOpenNpcModal,
  onOpenDamageModal,
  onOpenProfile,
  currentPlayerId,
  onUpdateStat,
  isPinned,
  setIsPinned,
  onRemoveNpc,
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(RIGHT_SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [pendingMissingAction, setPendingMissingAction] = useState(null);
  const [tieResolutionState, setTieResolutionState] = useState(null);
  const [kickTarget, setKickTarget] = useState(null);
  const [joinApprovalTarget, setJoinApprovalTarget] = useState(null);
  const dragStateRef = useRef({ startX: 0, startWidth: RIGHT_SIDEBAR_DEFAULT_WIDTH });

  const isGm = role === 'gm';
  const battleActive = combatStatus === COMBAT_STATUS.ACTIVE;
  const battlePaused = combatStatus === COMBAT_STATUS.PAUSED;
  const combatInProgress = combatStatus !== COMBAT_STATUS.IDLE;
  const canManageRoster = isGm && combatStatus !== COMBAT_STATUS.ACTIVE;
  const combatRoster = useMemo(() => filterCombatParticipants(party), [party]);

  const sortedParty = useMemo(
    () => sortPartyByInitiative(combatRoster, combatInProgress ? initiativeOrder : []),
    [combatInProgress, combatRoster, initiativeOrder]
  );

  const myCharacter = party.find((member) => member.id === currentPlayerId);
  const currentPlayerInCombat = isCombatParticipant(myCharacter);
  const playerJoinRequestPending = hasPendingCombatJoinRequest(myCharacter);
  const showCombatJoinPanel = role === 'player' && myCharacter && !currentPlayerInCombat;
  const canRequestCombatJoin = showCombatJoinPanel && combatStatus !== COMBAT_STATUS.ACTIVE && !playerJoinRequestPending;
  const pendingCombatJoinRequests = useMemo(
    () => party.filter((member) => (
      member?.isNpc !== true
      && member?.id !== currentPlayerId
      && member?.combatParticipation === COMBAT_PARTICIPATION_STATUS.REMOVED
      && member?.combatJoinRequestStatus === COMBAT_JOIN_REQUEST_STATUS.PENDING
    )),
    [currentPlayerId, party]
  );
  const turnsUntilMine = getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const turnApproachRatio = getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const isMyTurn = battleActive && currentTurnId === currentPlayerId;
  const showPlayerRollPanel = role === 'player'
    && combatStatus === COMBAT_STATUS.IDLE
    && myCharacter
    && currentPlayerInCombat
    && myCharacter.init === null;

  const activeTieGroup = tieResolutionState?.tieGroups?.[tieResolutionState.currentIndex] || null;
  const activeTieGroupKey = activeTieGroup ? getTieGroupKey(activeTieGroup[0]) : null;
  const activeTieGroupMembers = activeTieGroup || [];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedWidth = Number(window.localStorage.getItem(RIGHT_SIDEBAR_STORAGE_KEY));
    if (storedWidth) {
      setSidebarWidth(clampBattleSidebarWidth(storedWidth));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (event) => {
      const delta = dragStateRef.current.startX - event.clientX;
      setSidebarWidth(clampBattleSidebarWidth(dragStateRef.current.startWidth + delta));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isGm || combatStatus === COMBAT_STATUS.ACTIVE) {
      setJoinApprovalTarget(null);
      return;
    }

    setJoinApprovalTarget((currentTarget) => {
      if (currentTarget && pendingCombatJoinRequests.some((member) => member.id === currentTarget.id)) {
        return currentTarget;
      }

      return pendingCombatJoinRequests[0] || null;
    });
  }, [combatStatus, isGm, pendingCombatJoinRequests]);

  const handleResizeStart = (event) => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsDragging(true);
  };

  const buildCombatPreparation = (initiativeUpdates = []) => filterCombatParticipants(applyInitiativeUpdates(party, initiativeUpdates));

  const finalizeCombatFlow = async ({ mode, initiativeUpdates = [], partyWithUpdates, resolvedOrders = {} }) => {
    const existingOverrides = mode === 'resume'
      ? getExistingTieOverrides(partyWithUpdates, initiativeOrder)
      : {};
    const nextInitiativeOrder = buildInitiativeOrder(partyWithUpdates, {
      ...existingOverrides,
      ...resolvedOrders,
    });

    setStatusError('');
    setIsActionBusy(true);

    try {
      if (mode === 'start') {
        await onStartCombat?.({ initiativeUpdates, nextInitiativeOrder });
      } else {
        await onResumeCombat?.({ initiativeUpdates, nextInitiativeOrder });
      }
    } catch (error) {
      console.error('Combat flow fout:', error);
      setStatusError('De slagorde kon niet worden bijgewerkt. Probeer het opnieuw.');
    } finally {
      setIsActionBusy(false);
      setPendingMissingAction(null);
      setTieResolutionState(null);
    }
  };

  const prepareCombatFlow = async (mode, initiativeUpdates = []) => {
    const partyWithUpdates = buildCombatPreparation(initiativeUpdates);
    const missingMembers = partyWithUpdates.filter((member) => !Number.isFinite(Number(member.init)));

    if (missingMembers.length > 0) {
      setPendingMissingAction({ mode, missingMembers });
      return;
    }

    const existingOverrides = mode === 'resume'
      ? getExistingTieOverrides(partyWithUpdates, initiativeOrder)
      : {};

    const unresolvedTieGroups = getInitiativeTieGroups(partyWithUpdates)
      .filter((group) => !existingOverrides[getTieGroupKey(group[0])]);

    if (unresolvedTieGroups.length > 0) {
      setTieResolutionState({
        mode,
        initiativeUpdates,
        partyWithUpdates,
        tieGroups: unresolvedTieGroups,
        currentIndex: 0,
        resolvedOrders: {},
        manualOrder: unresolvedTieGroups[0].map((member) => member.id),
        selectionMode: 'choice',
      });
      return;
    }

    await finalizeCombatFlow({ mode, initiativeUpdates, partyWithUpdates, resolvedOrders: {} });
  };

  const handleStatusAction = async () => {
    if (!isGm || isActionBusy) return;

    setStatusError('');

    if (combatStatus === COMBAT_STATUS.IDLE) {
      await prepareCombatFlow('start');
      return;
    }

    if (combatStatus === COMBAT_STATUS.ACTIVE) {
      setIsActionBusy(true);
      try {
        await onPauseCombat?.();
      } catch (error) {
        console.error('Gevecht pauzeren fout:', error);
        setStatusError('Gevecht pauzeren is mislukt.');
      } finally {
        setIsActionBusy(false);
      }
      return;
    }

    await prepareCombatFlow('resume');
  };

  const handleConfirmMissingInitiative = async () => {
    if (!pendingMissingAction) return;
    const initiativeUpdates = pendingMissingAction.missingMembers.map((member) => ({
      id: member.id,
      init: rollInitiative(member),
    }));
    await prepareCombatFlow(pendingMissingAction.mode, initiativeUpdates);
  };

  const handleRollAll = async () => {
    if (!isGm || combatInProgress || isActionBusy) return;
    const initiativeUpdates = combatRoster.map((member) => ({ id: member.id, init: rollInitiative(member) }));

    setStatusError('');
    setIsActionBusy(true);
    try {
      await onRollAllInitiative?.(initiativeUpdates);
    } catch (error) {
      console.error('Rol allen fout:', error);
      setStatusError('Niet alle initiatives konden worden gerold.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAdvanceTurn = async () => {
    if (!battleActive || isActionBusy) return;
    setStatusError('');
    setIsActionBusy(true);
    try {
      await onAdvanceTurn?.();
    } catch (error) {
      console.error('Volgende beurt fout:', error);
      setStatusError('De volgende beurt kon niet worden gestart.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleEndCombatClick = async () => {
    if (!battlePaused || isActionBusy) return;
    setStatusError('');
    setIsActionBusy(true);
    try {
      await onEndCombat?.();
    } catch (error) {
      console.error('Gevecht beëindigen fout:', error);
      setStatusError('Gevecht beëindigen is mislukt.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleRemoveNpc = async (npcId) => {
    if (!canManageRoster || isActionBusy) return;
    setStatusError('');
    setIsActionBusy(true);
    try {
      await onRemoveNpc?.(npcId);
    } catch (error) {
      console.error('NPC verwijderen fout:', error);
      setStatusError('NPC verwijderen is mislukt.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleConfirmKickPlayer = async () => {
    if (!kickTarget || isActionBusy) return;

    setStatusError('');
    setIsActionBusy(true);

    try {
      await onKickPlayerFromCombat?.(kickTarget.id);
      setKickTarget(null);
    } catch (error) {
      console.error('Speler uit gevecht kicken fout:', error);
      setStatusError('De speler kon niet uit het gevecht worden verwijderd.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleRequestJoinCombat = async () => {
    if (!myCharacter || !canRequestCombatJoin || isActionBusy) return;

    setStatusError('');
    setIsActionBusy(true);

    try {
      await onRequestCombatJoin?.(myCharacter.id);
    } catch (error) {
      console.error('Meedoen-verzoek versturen fout:', error);
      setStatusError('Je verzoek kon niet worden verstuurd. Probeer het opnieuw.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleResolveJoinRequest = async (approve) => {
    if (!joinApprovalTarget || isActionBusy) return;

    setStatusError('');
    setIsActionBusy(true);

    try {
      await onResolveCombatJoinRequest?.(joinApprovalTarget.id, approve);
      setJoinApprovalTarget(null);
    } catch (error) {
      console.error('Meedoen-verzoek beantwoorden fout:', error);
      setStatusError('Het meedoen-verzoek kon niet worden verwerkt.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleTieOrderResolved = async (orderedIds) => {
    if (!tieResolutionState || !activeTieGroupKey) return;

    const nextResolvedOrders = {
      ...tieResolutionState.resolvedOrders,
      [activeTieGroupKey]: orderedIds,
    };
    const nextIndex = tieResolutionState.currentIndex + 1;

    if (nextIndex >= tieResolutionState.tieGroups.length) {
      await finalizeCombatFlow({
        ...tieResolutionState,
        resolvedOrders: nextResolvedOrders,
      });
      return;
    }

    const nextGroup = tieResolutionState.tieGroups[nextIndex];
    setTieResolutionState({
      ...tieResolutionState,
      currentIndex: nextIndex,
      resolvedOrders: nextResolvedOrders,
      manualOrder: nextGroup.map((member) => member.id),
      selectionMode: 'choice',
    });
  };

  const moveTieMember = (memberId, direction) => {
    setTieResolutionState((currentState) => {
      if (!currentState) return currentState;
      const currentIndex = currentState.manualOrder.findIndex((id) => id === memberId);
      if (currentIndex === -1) return currentState;

      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= currentState.manualOrder.length) return currentState;

      const nextOrder = [...currentState.manualOrder];
      [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
      return {
        ...currentState,
        manualOrder: nextOrder,
      };
    });
  };

  const StatusIcon = combatStatus === COMBAT_STATUS.IDLE
    ? Flame
    : (combatStatus === COMBAT_STATUS.PAUSED ? Pause : Swords);

  const statusTitle = role === 'player' && isMyTurn
    ? 'Jouw beurt'
    : (combatStatus === COMBAT_STATUS.IDLE
      ? 'Ruststand'
      : (combatStatus === COMBAT_STATUS.PAUSED ? 'Gepauzeerd' : 'Gevecht actief'));

  const statusSubtitle = (() => {
    if (role === 'player') {
      if (combatStatus === COMBAT_STATUS.IDLE) {
        return myCharacter?.init === null
          ? 'Vul je initiative zodra de GM het gevecht voorbereidt.'
          : 'Wacht op het volgende gevecht.';
      }

      if (combatStatus === COMBAT_STATUS.PAUSED) {
        return 'De GM past de slagorde aan.';
      }

      if (isMyTurn) {
        return `Ronde ${turnRound} · handel nu.`;
      }

      if (turnsUntilMine === null) {
        return `Ronde ${turnRound} · volg de slagorde.`;
      }

      return turnsUntilMine === 1
        ? 'Nog 1 beurt tot jij aan zet bent.'
        : `Nog ${turnsUntilMine} beurten tot jij aan zet bent.`;
    }

    if (combatStatus === COMBAT_STATUS.IDLE) return 'Tik om gevecht te starten zodra iedereen klaar is.';
    if (combatStatus === COMBAT_STATUS.PAUSED) return 'Tik om te hervatten of rond de slagorde af.';
    return 'Tik om te pauzeren en de slagorde tijdelijk te vergrendelen.';
  })();

  const statusActionLabel = isGm
    ? (combatStatus === COMBAT_STATUS.IDLE
      ? 'Start'
      : (combatStatus === COMBAT_STATUS.PAUSED ? 'Hervat' : 'Pauzeer'))
    : null;

  return (
    <>
      {isOpen && !isPinned ? (
        <div
          className="fixed inset-0 z-40 bg-stone-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        style={{ '--battle-sidebar-width': `${sidebarWidth}px` }}
        className={`
          fixed top-0 right-0 z-50 flex h-full w-80 flex-col border-l border-stone-800 bg-stone-900/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out
          ${(isOpen || isPinned) ? 'translate-x-0' : 'translate-x-full'}
          ${isPinned ? 'md:relative md:translate-x-0 md:z-0 md:w-[var(--battle-sidebar-width)] md:min-w-[var(--battle-sidebar-width)] md:max-w-[var(--battle-sidebar-width)] md:bg-stone-900/50 md:shadow-none' : ''}
          lg:relative lg:translate-x-0 lg:z-0 lg:flex lg:w-[var(--battle-sidebar-width)] lg:min-w-[var(--battle-sidebar-width)] lg:max-w-[var(--battle-sidebar-width)] lg:bg-stone-900/50 lg:shadow-none
        `}
      >
        <div className="absolute top-0 left-0 hidden h-full w-1 bg-gradient-to-b from-stone-800 via-stone-900 to-stone-800 lg:block" />
        <button
          type="button"
          aria-label="Sleep om slagordebreedte aan te passen"
          onMouseDown={handleResizeStart}
          onDoubleClick={() => setSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH)}
          className="absolute left-0 top-0 hidden h-full w-3 translate-x-1/2 cursor-col-resize lg:block"
        >
          <span className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isDragging ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]' : 'bg-stone-800 hover:bg-stone-700'}`} />
        </button>

        <div className="mt-14 border-b border-stone-800 bg-stone-900/85 px-3.5 py-3 md:mt-0 md:px-4 md:py-3.5">
          <button
            type="button"
            disabled={!isGm || isActionBusy}
            onClick={handleStatusAction}
            className={`relative w-full rounded-2xl border px-4 py-4 text-left shadow-[0_0_18px_rgba(0,0,0,0.2)] transition-all ${
              combatStatus === COMBAT_STATUS.IDLE
                ? 'border-amber-900/50 bg-gradient-to-r from-stone-950 to-stone-900 hover:border-amber-700/60 hover:from-stone-900 hover:to-stone-950'
                : (combatStatus === COMBAT_STATUS.PAUSED
                  ? 'border-stone-700/80 bg-gradient-to-r from-stone-950 to-stone-900 hover:border-amber-700/40'
                  : 'border-amber-700/60 bg-gradient-to-r from-amber-950/45 to-stone-950 hover:border-amber-500/70')
            } ${!isGm ? 'cursor-default' : ''} ${isMyTurn ? 'ring-1 ring-amber-500/60 shadow-[0_0_22px_rgba(245,158,11,0.18)]' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${combatStatus === COMBAT_STATUS.ACTIVE ? 'border-amber-700/60 bg-amber-950/35 text-amber-300' : 'border-stone-700/70 bg-stone-950/70 text-amber-500'} ${isMyTurn ? 'animate-pulse' : ''}`}>
                <StatusIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 pr-18 md:pr-20">
                  <span className="font-fantasy text-base tracking-[0.18em] text-stone-100 md:text-lg">{statusTitle}</span>
                  {combatInProgress ? (
                    <span className="rounded-full border border-amber-900/50 bg-amber-950/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400 shadow-inner">
                      Ronde {turnRound}
                    </span>
                  ) : null}
                  {statusActionLabel ? (
                    <span className="rounded-full border border-stone-700/70 bg-stone-950/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                      {statusActionLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 pr-2 text-xs leading-5 text-stone-400 md:text-[13px] md:leading-6">{statusSubtitle}</p>
              </div>

              {role === 'player' && combatInProgress ? (
                <StatusTurnIndicator
                  turnsUntil={turnsUntilMine}
                  ratio={turnApproachRatio}
                  isCurrentTurn={isMyTurn}
                />
              ) : null}
            </div>

            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              {role === 'gm' ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowInfo((value) => !value);
                  }}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${showInfo ? 'border-amber-800/50 bg-amber-950/30 text-amber-300' : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:text-amber-300'}`}
                  title={showInfo ? 'Verberg slagorde-info' : 'Toon slagorde-info'}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsPinned?.(!isPinned);
                }}
                className={`hidden rounded-md p-1.5 transition-colors md:flex lg:hidden ${
                  isPinned
                    ? 'bg-amber-950/30 text-amber-500 hover:bg-amber-950/50'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-amber-400'
                }`}
                title={isPinned ? 'Losgemaakt — sluit automatisch' : 'Vastzetten — blijft zichtbaar'}
              >
                {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose?.();
                }}
                className={`rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-800 hover:text-rose-400 ${isPinned ? 'hidden' : 'lg:hidden'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </button>

          {showPlayerRollPanel ? (
            <div className="mt-3 rounded-xl border border-amber-900/40 bg-stone-950/55 px-3 py-3 shadow-inner">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">Initiative</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Typ..."
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10);
                    if (!Number.isNaN(value)) onUpdateStat?.(myCharacter.id, 'init', value);
                  }}
                  className="hide-arrows w-18 rounded-md border border-amber-900/40 bg-stone-950/80 px-2 text-center font-bold text-amber-100 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => onUpdateStat?.(myCharacter.id, 'init', rollInitiative(myCharacter))}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-amber-600 py-2 text-xs font-bold uppercase tracking-[0.18em] text-stone-950 transition-colors hover:bg-amber-500"
                >
                  <Dice5 className="h-3.5 w-3.5" /> Rol (+{myCharacter.initMod || 0})
                </button>
              </div>
            </div>
          ) : null}

          {showCombatJoinPanel ? (
            <div className="mt-3 rounded-xl border border-indigo-900/40 bg-stone-950/55 px-3 py-3 shadow-inner">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-400">Niet in gevecht</div>
              <p className="mb-3 text-xs leading-5 text-stone-400">
                Je staat nu buiten de initiativelijst. Vraag de GM om je opnieuw toe te voegen zodra het gevecht niet actief is.
              </p>
              <button
                type="button"
                onClick={handleRequestJoinCombat}
                disabled={!canRequestCombatJoin || isActionBusy}
                className={`flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-fantasy uppercase tracking-[0.16em] transition-colors ${playerJoinRequestPending ? 'border-stone-800 bg-stone-950/55 text-stone-500' : (canRequestCombatJoin ? 'border-indigo-700/50 bg-indigo-950/30 text-indigo-200 hover:border-indigo-500/60 hover:bg-indigo-900/35' : 'border-stone-800 bg-stone-950/55 text-stone-600')}`}
              >
                {playerJoinRequestPending ? 'In behandeling' : 'Meedoen'}
              </button>
              {combatStatus === COMBAT_STATUS.ACTIVE ? (
                <p className="mt-2 text-[11px] leading-5 text-stone-500">Wacht tot de GM het gevecht pauzeert of terug naar ruststand zet.</p>
              ) : null}
            </div>
          ) : null}

          {statusError ? (
            <div className="mt-3 rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs leading-5 text-rose-300">
              {statusError}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5 no-scrollbar md:px-4 md:py-4">
          {showInfo ? (
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Slagorde info</div>
              <div className="mt-3 space-y-2">
                {[
                  'Ruststand laat iedereen initiative voorbereiden voordat de GM start.',
                  'Gevecht actief vergrendelt initiative-invoer en houdt beurt en ronde bij.',
                  'Pauzeren geeft ruimte om NPC’s toe te voegen of te verwijderen zonder de ronde kwijt te raken.',
                ].map((line) => (
                  <p key={line} className="text-sm leading-6 text-stone-500">{line}</p>
                ))}
              </div>
            </div>
          ) : null}

          {sortedParty.length === 0 && !showPlayerRollPanel ? (
            <div className="mt-1 flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-stone-800 bg-stone-950/30 px-6 text-center shadow-inner">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-600">Nog leeg</div>
                <p className="font-story text-sm italic leading-relaxed text-stone-500">Voeg spelers, NPC’s of handout-personages toe aan de lijst.</p>
              </div>
            </div>
          ) : null}

          {sortedParty.map((member) => {
            const isCurrentTurn = combatInProgress && member.id === currentTurnId;
            const initiativeEditable = isGm
              ? combatStatus !== COMBAT_STATUS.ACTIVE
              : (combatStatus === COMBAT_STATUS.IDLE && member.id === currentPlayerId);

            return (
              <div
                key={member.id}
                onClick={() => onOpenProfile?.(member)}
                className={`group relative flex cursor-pointer flex-row items-center gap-3 rounded-lg border p-2.5 shadow-md transition-all hover:shadow-lg md:p-3 ${
                  member.isNpc
                    ? 'border-rose-900/30 bg-rose-950/20 hover:border-rose-500/50'
                    : 'border-amber-900/20 bg-stone-950/40 hover:border-amber-500/50'
                } ${isCurrentTurn ? (battleActive ? 'bg-amber-950/30 ring-1 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'ring-1 ring-stone-600') : ''}`}
              >
                {isCurrentTurn ? (
                  <div className={`absolute -left-[1px] top-0 bottom-0 w-[3px] rounded-l-lg ${battleActive ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-stone-500'}`} />
                ) : null}

                {isGm && member.isNpc ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveNpc(member.id);
                    }}
                    disabled={!canManageRoster}
                    className={`absolute -top-2 -right-2 z-20 rounded-full border p-1.5 shadow-md transition-opacity ${canManageRoster ? 'border-rose-900 bg-rose-950 text-rose-500 opacity-100 hover:bg-rose-900 hover:text-rose-200 lg:opacity-0 lg:group-hover:opacity-100' : 'cursor-not-allowed border-stone-800 bg-stone-900 text-stone-600 opacity-100'}`}
                    title={canManageRoster ? 'Verwijder NPC' : 'Pauzeer gevecht om NPC’s te beheren'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}

                {isGm && !member.isNpc && member.id !== currentPlayerId ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setKickTarget(member);
                    }}
                    disabled={isActionBusy}
                    className={`absolute -top-2 -right-2 z-20 rounded-full border p-1.5 shadow-md transition-opacity ${isActionBusy ? 'cursor-not-allowed border-stone-800 bg-stone-900 text-stone-600 opacity-100' : 'border-amber-900 bg-stone-950 text-amber-400 opacity-100 hover:bg-amber-950/60 hover:text-amber-200 lg:opacity-0 lg:group-hover:opacity-100'}`}
                    title="Verwijder speler uit dit gevecht"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                ) : null}

                <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border font-fantasy text-lg font-bold shadow-inner transition-all md:h-11 md:w-11 ${
                  member.isNpc ? 'border-rose-900/50 bg-rose-950/40 text-rose-400' : 'border-amber-900/30 bg-stone-900/80 text-amber-500'
                } ${isCurrentTurn ? 'ring-1 ring-amber-500/50' : ''}`}>
                  <img src={resolveDisplayAvatar(member.avatar, member.id)} alt={member.name} className="h-full w-full object-cover opacity-80" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className={`mr-2 truncate font-fantasy text-sm tracking-wider ${member.isNpc ? 'text-rose-400' : 'text-amber-100'}`}>
                      {member.name}
                    </span>
                    <span className={`shrink-0 rounded border bg-stone-950 px-2 py-0.5 font-serif text-xs font-bold ${member.isNpc ? 'border-rose-900/50 text-rose-500' : 'border-amber-900/50 text-amber-500'} ${isCurrentTurn ? 'bg-stone-900 shadow-inner' : ''}`}>
                      <EditableStat
                        value={member.init}
                        onChange={(value) => onUpdateStat?.(member.id, 'init', value)}
                        disabled={!initiativeEditable}
                        title={initiativeEditable ? 'Bewerk initiative' : 'Initiative score'}
                      />
                    </span>
                  </div>

                  <div className="mt-0.5 flex gap-1.5 font-sans text-[10px] md:gap-2 md:text-[11px]">
                    <div
                      className={`flex flex-1 items-center justify-between rounded border border-stone-800/50 bg-stone-950/80 px-1.5 py-0.5 ${isGm ? 'cursor-pointer hover:border-amber-500/50' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isGm) onOpenDamageModal?.(member);
                      }}
                      title={isGm ? 'Klik om HP aan te passen' : 'Hit Points'}
                    >
                      <span className="font-bold text-stone-500">HP</span>
                      <span className={member.hp < 10 ? 'font-bold text-rose-500' : 'font-bold text-emerald-500'}>{member.hp}</span>
                    </div>
                    <div
                      className="flex flex-1 items-center justify-between rounded border border-stone-800/50 bg-stone-950/80 px-1.5 py-0.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="font-bold text-stone-500">AC</span>
                      <EditableStat
                        className="font-bold text-stone-300"
                        value={member.ac}
                        onChange={(value) => onUpdateStat?.(member.id, 'ac', value)}
                        disabled={!isGm}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {role === 'gm' ? (
          <div className="space-y-2.5 border-t border-stone-800 bg-stone-900/85 px-3.5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] md:px-4 md:pt-3.5 md:pb-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRollAll}
                disabled={combatInProgress || isActionBusy}
                className={`h-10 rounded-lg border text-xs font-fantasy uppercase tracking-[0.14em] transition-colors shadow-inner ${combatInProgress ? 'cursor-not-allowed border-stone-800 bg-stone-950/60 text-stone-600' : 'border-stone-700 bg-stone-950 text-stone-300 hover:border-amber-700/50 hover:bg-stone-800 hover:text-amber-500'}`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Dice5 className="h-3.5 w-3.5" /> Rol Allen
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenNpcModal}
                disabled={!canManageRoster || isActionBusy}
                className={`h-10 rounded-lg border text-xs font-fantasy uppercase tracking-[0.14em] transition-colors shadow-inner ${canManageRoster ? 'border-stone-700 bg-stone-950 text-stone-300 hover:border-amber-700/50 hover:bg-stone-800 hover:text-amber-500' : 'cursor-not-allowed border-stone-800 bg-stone-950/60 text-stone-600'}`}
                title={canManageRoster ? 'Voeg een losse NPC toe' : 'Pauzeer gevecht om NPC’s te beheren'}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> NPC
                </span>
              </button>
            </div>

            {battleActive ? (
              <button
                type="button"
                onClick={handleAdvanceTurn}
                disabled={isActionBusy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 text-sm font-fantasy uppercase tracking-[0.14em] text-stone-100 shadow-[0_0_10px_rgba(217,119,6,0.2)] transition-all hover:from-amber-600 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Volgende Beurt <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}

            {battlePaused ? (
              <button
                type="button"
                onClick={handleEndCombatClick}
                disabled={isActionBusy}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/30 text-xs font-fantasy uppercase tracking-[0.16em] text-rose-300 transition-colors hover:bg-rose-900/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Beëindig Gevecht
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>

      {pendingMissingAction ? (
        <OverlayDialog
          title={pendingMissingAction.mode === 'start' ? 'Initiative ontbreekt nog' : 'Nog niet klaar om te hervatten'}
          description="Niet iedereen heeft al een initiative-score. TomeVault kan de ontbrekende waardes automatisch rollen of je kunt later verdergaan."
          onClose={() => setPendingMissingAction(null)}
          actions={(
            <>
              <button
                type="button"
                onClick={() => setPendingMissingAction(null)}
                className="rounded-lg px-4 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
              >
                Nog niet starten
              </button>
              <button
                type="button"
                onClick={handleConfirmMissingInitiative}
                className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-2 text-sm font-fantasy tracking-[0.12em] text-stone-100 transition-colors hover:from-amber-600 hover:to-amber-500"
              >
                Automatisch rollen
              </button>
            </>
          )}
        >
          <div className="space-y-2">
            {pendingMissingAction.missingMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-2 text-sm text-stone-300">
                <span>{member.name}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{member.isNpc ? 'NPC' : 'Speler'}</span>
              </div>
            ))}
          </div>
        </OverlayDialog>
      ) : null}

      {tieResolutionState && activeTieGroup && activeTieGroupKey ? (
        <OverlayDialog
          title={`Gelijke initiative (${tieResolutionState.currentIndex + 1}/${tieResolutionState.tieGroups.length})`}
          description="Twee of meer spelers of NPC's hebben exact dezelfde totaalscore en modifier. Kies of TomeVault willekeurig een volgorde bepaalt, of zet de volgorde zelf vast."
          onClose={() => setTieResolutionState(null)}
          actions={(
            tieResolutionState.selectionMode === 'manual' ? (
              <>
                <button
                  type="button"
                  onClick={() => setTieResolutionState({ ...tieResolutionState, selectionMode: 'choice' })}
                  className="rounded-lg px-4 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
                >
                  Terug
                </button>
                <button
                  type="button"
                  onClick={() => handleTieOrderResolved(tieResolutionState.manualOrder)}
                  className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-2 text-sm font-fantasy tracking-[0.12em] text-stone-100 transition-colors hover:from-amber-600 hover:to-amber-500"
                >
                  Volgorde vastzetten
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setTieResolutionState({ ...tieResolutionState, selectionMode: 'manual' })}
                  className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-2 text-sm text-stone-300 transition-colors hover:border-amber-700/50 hover:text-amber-300"
                >
                  Ik kies zelf
                </button>
                <button
                  type="button"
                  onClick={() => handleTieOrderResolved(shuffleList(activeTieGroupMembers.map((member) => member.id)))}
                  className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-2 text-sm font-fantasy tracking-[0.12em] text-stone-100 transition-colors hover:from-amber-600 hover:to-amber-500"
                >
                  TomeVault bepaalt
                </button>
              </>
            )
          )}
        >
          <div className="mb-3 rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs leading-5 text-amber-200">
            Score {activeTieGroupMembers[0]?.init ?? '-'} · Init Mod {activeTieGroupMembers[0]?.initMod >= 0 ? `+${activeTieGroupMembers[0]?.initMod}` : activeTieGroupMembers[0]?.initMod}
          </div>

          <div className="space-y-2">
            {(tieResolutionState.selectionMode === 'manual'
              ? tieResolutionState.manualOrder.map((id) => activeTieGroupMembers.find((member) => member.id === id)).filter(Boolean)
              : activeTieGroupMembers
            ).map((member, index, list) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-800 bg-stone-900/80">
                  <img src={resolveDisplayAvatar(member.avatar, member.id)} alt={member.name} className="h-full w-full object-cover opacity-80" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-fantasy text-sm tracking-[0.14em] text-stone-100">{member.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{member.isNpc ? 'NPC' : 'Speler'}</div>
                </div>
                {tieResolutionState.selectionMode === 'manual' ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveTieMember(member.id, 'up')}
                      disabled={index === 0}
                      className="rounded-md border border-stone-700 bg-stone-900 p-1.5 text-stone-300 transition-colors hover:border-amber-700/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTieMember(member.id, 'down')}
                      disabled={index === list.length - 1}
                      className="rounded-md border border-stone-700 bg-stone-900 p-1.5 text-stone-300 transition-colors hover:border-amber-700/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </OverlayDialog>
      ) : null}

      {kickTarget ? (
        <OverlayDialog
          title="Speler uit gevecht verwijderen"
          description={`${kickTarget.name} verdwijnt uit de initiativelijst en kan later via 'Meedoen' opnieuw een verzoek sturen.`}
          onClose={() => setKickTarget(null)}
          actions={(
            <>
              <button
                type="button"
                onClick={() => setKickTarget(null)}
                className="rounded-lg px-4 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
              >
                Annuleer
              </button>
              <button
                type="button"
                onClick={handleConfirmKickPlayer}
                disabled={isActionBusy}
                className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-2 text-sm font-fantasy tracking-[0.12em] text-stone-100 transition-colors hover:from-amber-600 hover:to-amber-500 disabled:opacity-60"
              >
                Ja, verwijder
              </button>
            </>
          )}
        >
          <div className="rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-3 text-sm leading-6 text-stone-300">
            Bevestig dat je <span className="font-fantasy tracking-[0.12em] text-stone-100">{kickTarget.name}</span> uit dit gevecht wilt halen.
          </div>
        </OverlayDialog>
      ) : null}

      {joinApprovalTarget ? (
        <OverlayDialog
          title="Meedoen-verzoek"
          description={`Speler ${joinApprovalTarget.name} wilt meedoen met het gevecht. Toevoegen ja of nee.`}
          onClose={() => {}}
          showCloseButton={false}
          actions={(
            <>
              <button
                type="button"
                onClick={() => handleResolveJoinRequest(false)}
                disabled={isActionBusy}
                className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-2 text-sm text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100 disabled:opacity-60"
              >
                Nee
              </button>
              <button
                type="button"
                onClick={() => handleResolveJoinRequest(true)}
                disabled={isActionBusy}
                className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-2 text-sm font-fantasy tracking-[0.12em] text-stone-100 transition-colors hover:from-amber-600 hover:to-amber-500 disabled:opacity-60"
              >
                Ja
              </button>
            </>
          )}
        >
          <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 px-3 py-3 text-sm leading-6 text-stone-200">
            <span className="font-fantasy tracking-[0.12em] text-stone-100">{joinApprovalTarget.name}</span> wacht op toestemming om opnieuw in de initiativelijst te komen.
          </div>
        </OverlayDialog>
      ) : null}
    </>
  );
}

export default RightSidebar;
