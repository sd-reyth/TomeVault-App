import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bed,
  ChevronRight,
  CircleOff,
  Dice5,
  Eye,
  FlameKindling,
  Ghost,
  Hand,
  Heart,
  Info,
  Link,
  Mountain,
  Pin,
  PinOff,
  Shield,
  Skull,
  Snowflake,
  Swords,
  Trash2,
  UserPlus,
  UserMinus,
  VolumeX,
  X,
  Zap,
  AlertCircle,
  Check,
} from 'lucide-react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';
import { resolveDisplayAvatar } from '../lib/placeholders';
import EditableStat from './EditableStat';
import {
  CONDITIONS,
  CONDITION_COLORS,
  CONDITION_BADGE_COLORS,
  getActiveConditions,
  getCondition,
} from '../lib/battleConditions';
import {
  COMBAT_JOIN_REQUEST_STATUS,
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

const CONDITION_ICON_MAP = {
  eye: Eye,
  heart: Heart,
  'volume-x': VolumeX,
  'alert-circle': AlertCircle,
  hand: Hand,
  'circle-off': CircleOff,
  ghost: Ghost,
  snowflake: Snowflake,
  mountain: Mountain,
  skull: Skull,
  'arrow-down': ArrowDown,
  link: Link,
  zap: Zap,
  bed: Bed,
};

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

function StatusTurnIndicator({ turnsUntil, ratio, isCurrentTurn, theme = 'dark' }) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  const angle = `${Math.round(safeRatio * 360)}deg`;

  return (
    <div
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
        isCurrentTurn
          ? 'border-amber-500/70 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
          : 'border-white/20'
      }`}
      title={isCurrentTurn ? 'Jouw beurt' : `Nog ${turnsUntil ?? '-'} beurt(en)`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--tv-accent) 0deg ${angle}, rgba(255,255,255,0.08) ${angle} 360deg)`,
        }}
      />
      <div className="tv-surface absolute inset-[3px] rounded-full border" />
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className={`font-fantasy text-[10px] tracking-[0.18em] ${isCurrentTurn ? 'text-amber-100' : 'tv-text-sub'}`}>
          {isCurrentTurn ? 'NU' : (turnsUntil ?? '-')}
        </span>
      </div>
    </div>
  );
}

function TurnClockBadge({ turnsUntil, ratio, isCurrentTurn, theme = 'dark' }) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  const angle = `${Math.round(safeRatio * 360)}deg`;

  return (
    <div
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
        isCurrentTurn
          ? 'border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
          : 'border-white/20'
      }`}
      title={isCurrentTurn ? 'Nu aan zet' : `Nog ${turnsUntil ?? '-'} beurt(en)`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--tv-accent) 0deg ${angle}, rgba(255,255,255,0.08) ${angle} 360deg)`,
        }}
      />
      <div className="tv-surface absolute inset-[2px] rounded-full" />
      <span className={`relative z-10 text-[9px] font-fantasy tracking-[0.14em] ${isCurrentTurn ? 'text-amber-100' : 'tv-text-sub'}`}>
        {isCurrentTurn ? 'NU' : (turnsUntil ?? '-')}
      </span>
    </div>
  );
}

function OverlayDialog({ title, description, children, onClose, actions, showCloseButton = true, theme = 'dark' }) {
  return (
    <div className="tv-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="tv-surface tv-text w-full max-w-md overflow-hidden rounded-3xl border shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="font-fantasy text-lg tracking-[0.14em] tv-text">{title}</h3>
            {description ? <p className="mt-1 text-sm leading-6 tv-text-sub">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 transition-colors tv-text-sub hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          ) : <div className="h-7 w-7" />}
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4 bg-white/5">
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
  onOpenNpcModal,
  onOpenDamageModal,
  onOpenProfile,
  currentPlayerId,
  onUpdateStat,
  isPinned,
  setIsPinned,
  onRemoveNpc,
  theme,
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(RIGHT_SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [pendingMissingAction, setPendingMissingAction] = useState(null);
  const [tieResolutionState, setTieResolutionState] = useState(null);
  const [kickTarget, setKickTarget] = useState(null);
  const [endCombatConfirmOpen, setEndCombatConfirmOpen] = useState(false);
  const [conditionsTarget, setConditionsTarget] = useState(null);
  const [conditionsDraftIds, setConditionsDraftIds] = useState([]);
  const dragStateRef = useRef({ startX: 0, startWidth: RIGHT_SIDEBAR_DEFAULT_WIDTH });
  const rosterScrollRef = useRef(null);

  const isGm = role === 'gm';
  const battleActive = combatStatus === COMBAT_STATUS.ACTIVE;
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
  const canRequestCombatJoin = showCombatJoinPanel && !playerJoinRequestPending;
  const turnsUntilMine = getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const turnApproachRatio = getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const isMyTurn = battleActive && currentTurnId === currentPlayerId;
  const currentTurnMember = sortedParty.find((member) => member.id === currentTurnId) || null;
  const getVisibleCombatName = (member) => {
    if (!member) return null;
    if (!isGm && member.isNpc && member.isRevealed === false) return 'Onbekende vijand';
    return member.name;
  };
  const currentTurnDisplayName = getVisibleCombatName(currentTurnMember);
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
    const storedWidth = Number(safeLocalStorageGet(RIGHT_SIDEBAR_STORAGE_KEY));
    if (storedWidth) {
      setSidebarWidth(clampBattleSidebarWidth(storedWidth));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorageSet(RIGHT_SIDEBAR_STORAGE_KEY, String(sidebarWidth));
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
    if (typeof window === 'undefined') return undefined;

    const syncPinnedState = () => {
      if (window.innerWidth < 768 && isPinned) {
        setIsPinned?.(false);
      }
    };

    syncPinnedState();
    window.addEventListener('resize', syncPinnedState);

    return () => {
      window.removeEventListener('resize', syncPinnedState);
    };
  }, [isPinned, setIsPinned]);

  useEffect(() => {
    if (!rosterScrollRef.current) return;
    rosterScrollRef.current.scrollTop = 0;
  }, [isOpen, isPinned, combatStatus]);

  const handleResizeStart = (event) => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return;
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
    if (!combatInProgress || isActionBusy) return;
    setStatusError('');
    setIsActionBusy(true);
    try {
      await onEndCombat?.();
      setEndCombatConfirmOpen(false);
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

  const openConditionsEditor = (member) => {
    if (!isGm || !member) return;
    const activeIds = getActiveConditions(member).map((condition) => condition.id);
    setConditionsDraftIds(activeIds);
    setConditionsTarget(member);
  };

  const toggleConditionDraft = (conditionId) => {
    setConditionsDraftIds((current) => (
      current.includes(conditionId)
        ? current.filter((id) => id !== conditionId)
        : [...current, conditionId]
    ));
  };

  const handleSaveConditions = () => {
    if (!isGm || !conditionsTarget) return;
    const nextConditions = conditionsDraftIds.map((id) => ({ id, active: true }));
    onUpdateStat?.(conditionsTarget.id, 'conditions', nextConditions);
    setConditionsTarget(null);
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
    ? FlameKindling
    : (combatStatus === COMBAT_STATUS.PAUSED ? Shield : Swords);

  const statusTitle = role === 'player' && isMyTurn
    ? 'Jouw beurt'
    : (combatStatus === COMBAT_STATUS.IDLE
      ? 'Ruststand'
      : (combatStatus === COMBAT_STATUS.PAUSED ? 'Gepauzeerd' : 'Gevecht'));

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
      ? 'Start gevecht'
      : (combatStatus === COMBAT_STATUS.PAUSED ? 'Hervat gevecht' : 'Pauzeer gevecht'))
    : null;

  const gmStatusLine = (() => {
    if (combatStatus === COMBAT_STATUS.IDLE) return 'Klaar om de slagorde actief te maken.';
    if (combatStatus === COMBAT_STATUS.PAUSED) {
      return currentTurnDisplayName ? `Gepauzeerd bij ${currentTurnDisplayName}.` : 'Gepauzeerd voor beheer van de slagorde.';
    }
    return currentTurnDisplayName ? `Aan zet: ${currentTurnDisplayName}.` : 'Gevecht actief.';
  })();

  const playerStatusPrimaryLine = (() => {
    if (combatStatus === COMBAT_STATUS.IDLE) {
      return myCharacter?.init === null
        ? 'Je initiative staat nog open.'
        : 'Je staat klaar voor de volgende start.';
    }

    if (combatStatus === COMBAT_STATUS.PAUSED) {
      return currentTurnDisplayName
        ? `Gepauzeerd tijdens ${currentTurnDisplayName}.`
        : 'De GM past de slagorde aan.';
    }

    if (isMyTurn) return 'Jij bent nu aan zet.';
    return currentTurnDisplayName ? `${currentTurnDisplayName} is nu aan zet.` : 'Gevecht actief.';
  })();

  const playerStatusSecondaryLine = (() => {
    if (combatStatus === COMBAT_STATUS.IDLE) {
      return myCharacter?.init === null
        ? 'Vul je initiative in zodra de GM gaat starten.'
        : 'Wacht op het startsein van de GM.';
    }

    if (combatStatus === COMBAT_STATUS.PAUSED) {
      return 'Je beurtvolgorde blijft bewaard tot de GM hervat.';
    }

    if (turnsUntilMine === null) {
      return `Ronde ${turnRound} loopt.`;
    }

    if (isMyTurn) {
      return `Ronde ${turnRound} · handel nu.`;
    }

    return turnsUntilMine === 1
      ? 'Nog 1 beurt tot jij aan zet bent.'
      : `Nog ${turnsUntilMine} beurten tot jij aan zet bent.`;
  })();

  return (
    <>
      {isOpen && !isPinned ? (
        <div
          className="app-shell-overlay-backdrop fixed inset-x-0 bottom-0 z-40 bg-stone-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        style={{ '--battle-sidebar-width': `${sidebarWidth}px` }}
        className={`
          fixed right-0 z-50 flex w-80 max-w-full flex-col overflow-hidden border-l border-white/10 bg-zinc-950/92 shadow-[0_22px_60px_rgba(0,0,0,0.34)] backdrop-blur-md transition-transform duration-300 ease-in-out
          ${(isOpen || isPinned) ? 'translate-x-0' : 'translate-x-full'}
          ${isPinned ? 'top-0 h-full md:relative md:h-full md:translate-x-0 md:z-0 md:w-[var(--battle-sidebar-width)] md:min-w-[var(--battle-sidebar-width)] md:max-w-[var(--battle-sidebar-width)] md:bg-zinc-950/70 md:shadow-none' : 'app-shell-overlay-frame'}
          lg:relative lg:top-0 lg:h-full lg:translate-x-0 lg:z-0 lg:flex lg:w-[var(--battle-sidebar-width)] lg:min-w-[var(--battle-sidebar-width)] lg:max-w-[var(--battle-sidebar-width)] lg:bg-zinc-950/70 lg:shadow-none
        `}
      >
        <div className="absolute top-0 left-0 hidden h-full w-1 bg-gradient-to-b from-white/8 via-zinc-900 to-white/8 md:block" />
        <button
          type="button"
          aria-label="Sleep om slagordebreedte aan te passen"
          onMouseDown={handleResizeStart}
          onDoubleClick={() => setSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH)}
          className="absolute left-0 top-0 hidden h-full w-3 translate-x-1/2 cursor-col-resize md:block"
        >
          <span className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isDragging ? 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]' : 'bg-white/10 hover:bg-white/20'}`} />
        </button>

        <div className="mt-14 border-b border-white/10 bg-zinc-950/84 px-3.5 py-3 md:mt-0 md:px-4 md:py-3.5">
          <div className="relative">
            {isGm ? (
              <div
                className={`w-full rounded-2xl border px-4 py-4 text-left shadow-[0_0_18px_rgba(0,0,0,0.2)] transition-all ${
                  combatStatus === COMBAT_STATUS.IDLE
                    ? 'border-amber-900/50 bg-gradient-to-r from-stone-950 to-stone-900 hover:border-amber-700/60 hover:from-stone-900 hover:to-stone-950'
                    : (combatStatus === COMBAT_STATUS.PAUSED
                      ? 'border-stone-700/80 bg-gradient-to-r from-stone-950 to-stone-900 hover:border-amber-700/40'
                      : 'border-amber-700/60 bg-gradient-to-r from-amber-950/45 to-stone-950 hover:border-amber-500/70')
                } ${isActionBusy ? 'opacity-80' : ''}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${combatStatus === COMBAT_STATUS.ACTIVE ? 'border-amber-700/60 bg-amber-950/35 text-amber-300' : 'border-stone-700/70 bg-stone-950/70 text-amber-500'}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-fantasy text-sm tracking-[0.18em] text-stone-100 md:text-base">{statusTitle}</span>
                      {combatInProgress ? (
                        <span className="rounded-full border border-amber-900/50 bg-amber-950/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400 shadow-inner">
                          Ronde {turnRound}
                        </span>
                      ) : null}
                    </div>
                    {showInfo ? <p className="mt-1 text-xs leading-5 text-stone-300 md:text-[13px] md:leading-6">{gmStatusLine}</p> : null}
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto]">
                  {statusActionLabel ? (
                    <button
                      type="button"
                      disabled={isActionBusy}
                      onClick={handleStatusAction}
                      className={`h-10 rounded-lg border px-3 text-xs font-fantasy uppercase tracking-[0.16em] transition-colors ${
                        combatStatus === COMBAT_STATUS.ACTIVE
                          ? 'tv-button-accent-muted'
                          : combatStatus === COMBAT_STATUS.IDLE
                            ? 'tv-button-primary'
                            : 'border-stone-700 bg-stone-950 text-stone-200 hover:border-white/20 hover:text-stone-100'
                      } ${isActionBusy ? 'cursor-wait opacity-70' : ''}`}
                    >
                      <span className="inline-flex items-center justify-center gap-1.5">
                        {combatStatus === COMBAT_STATUS.ACTIVE ? <Shield className="h-3.5 w-3.5" /> : <Swords className="h-3.5 w-3.5" />}
                        {statusActionLabel}
                      </span>
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => setEndCombatConfirmOpen(true)}
                    disabled={!combatInProgress || isActionBusy}
                    className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 transition-colors sm:w-10 sm:px-0 ${combatInProgress && !isActionBusy ? 'border-rose-700/70 bg-rose-950/40 text-rose-300 hover:border-rose-500/80 hover:bg-rose-900/40 hover:text-rose-100' : 'cursor-not-allowed border-stone-800 bg-stone-950/60 text-stone-600'}`}
                    title={combatInProgress ? 'Beëindig gevecht direct' : 'Nog geen gevecht om te beëindigen'}
                  >
                    <Skull className="h-4 w-4" />
                    <span className="text-xs font-fantasy uppercase tracking-[0.14em] sm:hidden">Beëindig</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={`w-full rounded-2xl border px-4 py-4 text-left shadow-[0_0_18px_rgba(0,0,0,0.2)] ${
                combatStatus === COMBAT_STATUS.IDLE
                  ? 'border-amber-900/50 bg-gradient-to-r from-stone-950 to-stone-900'
                  : (combatStatus === COMBAT_STATUS.PAUSED
                    ? 'border-stone-700/80 bg-gradient-to-r from-stone-950 to-stone-900'
                    : 'border-amber-700/60 bg-gradient-to-r from-amber-950/45 to-stone-950')
              } ${isMyTurn ? 'ring-1 ring-amber-500/60 shadow-[0_0_22px_rgba(245,158,11,0.18)]' : ''}`}>
                <div className="flex flex-col gap-3 pr-0 sm:flex-row sm:items-start sm:pr-12">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${combatStatus === COMBAT_STATUS.ACTIVE ? 'border-amber-700/60 bg-amber-950/35 text-amber-300' : 'border-stone-700/70 bg-stone-950/70 text-amber-500'} ${isMyTurn ? 'animate-pulse' : ''}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-fantasy text-base tracking-[0.18em] text-stone-100 md:text-lg">{statusTitle}</span>
                      {combatInProgress ? (
                        <span className="rounded-full border border-amber-900/50 bg-amber-950/35 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400 shadow-inner">
                          Ronde {turnRound}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-200">{playerStatusPrimaryLine}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400 md:text-[13px] md:leading-6">{playerStatusSecondaryLine}</p>
                  </div>

                  {combatInProgress ? (
                    <div className="self-start sm:self-auto">
                      <StatusTurnIndicator
                        turnsUntil={turnsUntilMine}
                        ratio={turnApproachRatio}
                        isCurrentTurn={isMyTurn}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="absolute right-3 top-3 flex items-center gap-1.5">
              {role === 'gm' ? (
                <button
                  type="button"
                  onClick={() => setShowInfo((value) => !value)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${showInfo ? 'border-amber-800/50 bg-amber-950/30 text-amber-300' : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:text-amber-300'}`}
                  title={showInfo ? 'Verberg slagorde-info' : 'Toon slagorde-info'}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setIsPinned?.(!isPinned)}
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
                onClick={() => onClose?.()}
                className={`rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-800 hover:text-rose-400 ${isPinned ? 'hidden' : 'lg:hidden'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showPlayerRollPanel ? (
            <div className="mt-3 rounded-xl border border-amber-900/40 bg-stone-950/55 px-3 py-3 shadow-inner">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">Initiative</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  placeholder="Typ..."
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10);
                    if (!Number.isNaN(value)) onUpdateStat?.(myCharacter.id, 'init', value);
                  }}
                  className="hide-arrows w-full rounded-md border border-amber-900/40 bg-stone-950/80 px-2 text-center font-bold text-amber-100 outline-none focus:border-amber-500 sm:w-18"
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
                Je staat nu buiten de initiativelijst. Dien een verzoek in om weer mee te doen.
              </p>
              <button
                type="button"
                onClick={handleRequestJoinCombat}
                disabled={!canRequestCombatJoin || isActionBusy}
                className={`flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-fantasy uppercase tracking-[0.16em] transition-colors ${playerJoinRequestPending ? 'border-stone-800 bg-stone-950/55 text-stone-500' : (canRequestCombatJoin ? 'border-indigo-700/50 bg-indigo-950/30 text-indigo-200 hover:border-indigo-500/60 hover:bg-indigo-900/35' : 'border-stone-800 bg-stone-950/55 text-stone-600')}`}
              >
                {playerJoinRequestPending ? 'In behandeling' : 'Meedoen'}
              </button>
              {playerJoinRequestPending ? (
                <p className="mt-2 text-[11px] leading-5 text-stone-500">
                  {combatStatus === COMBAT_STATUS.IDLE
                    ? 'Verzoek ontvangen. Je wordt automatisch teruggezet in de initiative tijdens ruststand.'
                    : 'Verzoek ontvangen. Je wordt automatisch toegevoegd zodra het gevecht eindigt en ruststand actief is.'}
                </p>
              ) : (
                <p className="mt-2 text-[11px] leading-5 text-stone-500">
                  {combatStatus === COMBAT_STATUS.IDLE
                    ? 'In ruststand word je na het verzoek automatisch toegevoegd.'
                    : 'Tijdens pauze of gevecht blijft je verzoek in behandeling tot ruststand.'}
                </p>
              )}
            </div>
          ) : null}

          {statusError ? (
            <div className="mt-3 rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs leading-5 text-rose-300">
              {statusError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden px-3.5 py-3.5 md:px-4 md:py-4">
          {showInfo ? (
            <div className="mb-3 rounded-xl border border-stone-800 bg-stone-950/60 p-4">
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
            <div className="flex min-h-[220px] flex-1 items-center justify-center rounded-xl border border-dashed border-stone-800 bg-stone-950/30 px-6 text-center shadow-inner">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-600">Nog leeg</div>
                <p className="font-story text-sm italic leading-relaxed text-stone-500">Voeg spelers, NPC’s of handout-personages toe aan de lijst.</p>
              </div>
            </div>
          ) : (
            <div ref={rosterScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
          {sortedParty.map((member) => {
            const isCurrentTurn = combatInProgress && member.id === currentTurnId;
            const hiddenNpcForPlayer = !isGm && member.isNpc && member.isRevealed === false;
            const displayMemberName = hiddenNpcForPlayer ? 'Onbekende vijand' : member.name;
            const displayMemberAvatar = hiddenNpcForPlayer ? null : member.avatar;
            const turnsUntilMember = combatInProgress
              ? getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, member.id)
              : null;
            const turnRatioMember = combatInProgress
              ? getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, member.id)
              : 0;
            const initiativeEditable = isGm
              ? combatStatus !== COMBAT_STATUS.ACTIVE
              : (combatStatus === COMBAT_STATUS.IDLE && member.id === currentPlayerId);
            const activeConditions = getActiveConditions(member);
            const hasConditions = activeConditions.length > 0;
            const extraConditionsCount = Math.max(0, activeConditions.length - 1);
            const firstCondition = activeConditions[0] || null;
            const firstConditionMeta = firstCondition ? getCondition(firstCondition.id) : null;
            const conditionColor = firstConditionMeta?.color || 'slate';
            const ConditionIcon = CONDITION_ICON_MAP[firstConditionMeta?.icon] || AlertCircle;
            const hasAlertFeat = member?.hasAlertFeat === true;

            const cardClassName = `group relative flex cursor-pointer flex-row items-center gap-3 rounded-xl border p-2.5 shadow-sm transition-all hover:shadow-md md:p-3 ${
              member.isNpc
                ? 'border-rose-900/30 bg-rose-950/20 hover:border-rose-500/50'
                : 'border-amber-900/20 bg-stone-950/40 hover:border-amber-500/50'
            } ${hasConditions ? (CONDITION_COLORS[conditionColor] || '') : ''} ${isCurrentTurn ? (battleActive ? 'bg-amber-950/30 ring-1 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'ring-1 ring-stone-600') : ''}`;

            return (
              <div
                key={member.id}
                onClick={() => onOpenProfile?.(member)}
                className={cardClassName}
              >
                {isCurrentTurn ? (
                  <div className={`absolute -left-[1px] top-0 bottom-0 w-[3px] rounded-l-lg ${battleActive ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-stone-500'}`} />
                ) : null}

                {hasConditions ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isGm) openConditionsEditor(member);
                    }}
                    className={`absolute -top-2 -left-2 z-20 rounded-full border p-1 shadow-md ${CONDITION_BADGE_COLORS[conditionColor] || CONDITION_BADGE_COLORS.slate} ${isGm ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
                    title={activeConditions.map((c) => getCondition(c.id)?.label).filter(Boolean).join(', ')}
                  >
                    <ConditionIcon className="h-3.5 w-3.5" />
                    {extraConditionsCount > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-stone-950 bg-stone-100 px-1 text-[9px] font-bold leading-none text-stone-900">
                        +{extraConditionsCount}
                      </span>
                    ) : null}
                  </button>
                ) : (isGm ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openConditionsEditor(member);
                    }}
                    className="absolute -top-2 -left-2 z-20 rounded-full border border-stone-700 bg-stone-950 p-1 text-stone-600 shadow-md transition-colors hover:border-amber-700/50 hover:bg-stone-900 hover:text-amber-500 lg:opacity-0 lg:group-hover:opacity-100"
                    title="Voeg conditions toe"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </button>
                ) : null)}

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

                <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border font-fantasy text-lg font-bold shadow-inner transition-all md:h-11 md:w-11 ${
                  member.isNpc ? 'border-rose-900/50 bg-rose-950/40 text-rose-400' : 'border-amber-900/30 bg-stone-900/80 text-amber-500'
                } ${isCurrentTurn ? 'ring-1 ring-amber-500/50' : ''}`}>
                  <img src={resolveDisplayAvatar(displayMemberAvatar, member.id)} alt={displayMemberName} className="h-full w-full object-cover opacity-80" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="mr-2 flex min-w-0 items-center gap-1.5">
                      <span className={`truncate font-fantasy text-sm font-bold tracking-wider ${member.isNpc ? 'text-rose-400' : 'text-stone-100'}`}>
                        {displayMemberName}
                      </span>
                      {hasAlertFeat ? (
                        <span className="shrink-0 rounded border border-amber-700/50 bg-amber-950/35 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300">
                          Alert
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {combatInProgress ? (
                        <TurnClockBadge
                          turnsUntil={turnsUntilMember}
                          ratio={turnRatioMember}
                          isCurrentTurn={isCurrentTurn}
                        />
                      ) : null}
                      <span className={`shrink-0 rounded border bg-stone-950 px-2 py-0.5 font-serif text-xs font-bold ${member.isNpc ? 'border-rose-900/50 text-rose-500' : 'border-amber-900/50 text-amber-400'} ${isCurrentTurn ? 'bg-stone-900 shadow-inner' : ''}`}>
                        <EditableStat
                          value={member.init}
                          onChange={(value) => onUpdateStat?.(member.id, 'init', value)}
                          disabled={!initiativeEditable}
                          title={initiativeEditable ? 'Bewerk initiative' : 'Initiative score'}
                        />
                      </span>
                    </div>
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
                      <span className="font-bold text-stone-400">HP</span>
                      {hiddenNpcForPlayer ? (
                        <span className="font-bold text-stone-500">?</span>
                      ) : (
                        <span className={member.hp < 10 ? 'font-bold text-rose-500' : 'font-bold text-amber-500'}>{member.hp}</span>
                      )}
                    </div>
                    <div
                      className="flex flex-1 items-center justify-between rounded border border-stone-800/50 bg-stone-950/80 px-1.5 py-0.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="font-bold text-stone-400">AC</span>
                      {hiddenNpcForPlayer ? (
                        <span className="font-bold text-stone-500">?</span>
                      ) : (
                        <EditableStat
                          className="font-bold text-stone-300"
                          value={member.ac}
                          onChange={(value) => onUpdateStat?.(member.id, 'ac', value)}
                          disabled={!isGm}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          )}
        </div>

        {role === 'gm' ? (
          <div className="space-y-2.5 border-t border-white/10 bg-zinc-950/84 px-3.5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] md:px-4 md:pt-3.5 md:pb-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleRollAll}
                disabled={combatInProgress || isActionBusy}
                title="Rol alle initiative"
                aria-label="Rol alle initiative"
                className={`h-9 rounded-lg border text-xs font-fantasy uppercase tracking-[0.14em] transition-colors shadow-inner ${combatInProgress ? 'cursor-not-allowed border-stone-800 bg-stone-950/60 text-stone-600' : 'border-stone-700 bg-stone-950 text-stone-300 hover:border-amber-700/50 hover:bg-stone-800 hover:text-amber-500'}`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Dice5 className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Rol Allen</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenNpcModal}
                disabled={!canManageRoster || isActionBusy}
                className={`h-9 rounded-lg border text-xs font-fantasy uppercase tracking-[0.14em] transition-colors shadow-inner ${canManageRoster ? 'border-stone-700 bg-stone-950 text-stone-300 hover:border-amber-700/50 hover:bg-stone-800 hover:text-amber-500' : 'cursor-not-allowed border-stone-800 bg-stone-950/60 text-stone-600'}`}
                title={canManageRoster ? 'Voeg een losse NPC toe' : 'Pauzeer gevecht om NPC’s te beheren'}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">NPC</span>
                </span>
              </button>
            </div>

            {battleActive ? (
              <button
                type="button"
                onClick={handleAdvanceTurn}
                disabled={isActionBusy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-700 to-amber-600 text-sm uppercase tracking-[0.14em] text-stone-100 shadow-[0_0_10px_rgba(217,119,6,0.2)] transition-all duration-200 ease-out hover:from-amber-600 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-700/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Volgende
                </span>
              </button>
            ) : null}

          </div>
        ) : null}
      </aside>

      {endCombatConfirmOpen ? (
        <OverlayDialog
          title="Gevecht direct beëindigen"
          description="Dit zet de tracker terug naar ruststand. Initiative-volgorde en actieve beurt worden gestopt."
          onClose={() => setEndCombatConfirmOpen(false)}
          actions={(
            <>
              <button
                type="button"
                onClick={() => setEndCombatConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
              >
                Annuleer
              </button>
              <button
                type="button"
                onClick={handleEndCombatClick}
                disabled={isActionBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-700/70 bg-rose-950/40 px-4 py-2 text-sm font-fantasy tracking-[0.12em] text-rose-200 transition-colors hover:border-rose-500/80 hover:bg-rose-900/40 disabled:opacity-60"
              >
                <Skull className="h-4 w-4" /> Beëindig
              </button>
            </>
          )}
        >
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 px-3 py-3 text-sm leading-6 text-rose-200">
            Gebruik dit alleen wanneer je het gevecht volledig wilt afbreken. Pauzeren kan nog steeds via de hoofdactieknop.
          </div>
        </OverlayDialog>
      ) : null}

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
                Rol ontbrekende
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

      {conditionsTarget && isGm ? (
        <OverlayDialog
          title={`Conditions voor ${conditionsTarget.name}`}
          description="Activeer of verwijder status effecten op dit personage."
          onClose={() => setConditionsTarget(null)}
          actions={(
            <button
              type="button"
              onClick={handleSaveConditions}
              className="rounded-lg border border-amber-700/50 bg-amber-950/20 px-4 py-2 text-sm font-fantasy tracking-[0.12em] text-amber-300 transition-colors hover:border-amber-500/70 hover:bg-amber-900/20"
            >
              Opslaan
            </button>
          )}
        >
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((condition) => {
              const isActive = conditionsDraftIds.includes(condition.id);
              const ConditionListIcon = CONDITION_ICON_MAP[condition.icon] || AlertCircle;
              return (
                <button
                  key={condition.id}
                  type="button"
                  onClick={() => toggleConditionDraft(condition.id)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                    isActive
                      ? `${CONDITION_BADGE_COLORS[condition.color]} border-current`
                      : 'border-stone-800 bg-stone-950/40 text-stone-500 hover:border-stone-700 hover:bg-stone-900/60'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <ConditionListIcon className="h-4 w-4" />
                    {isActive ? <Check className="h-3 w-3" /> : null}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-[0.12em]">{condition.label}</div>
                  <div className={`text-[10px] tracking-[0.08em] ${isActive ? 'opacity-90' : 'opacity-60'}`}>{condition.description}</div>
                </button>
              );
            })}
          </div>
        </OverlayDialog>
      ) : null}

    </>
  );
}

export default RightSidebar;
