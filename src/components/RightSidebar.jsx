import React, { useEffect, useMemo, useRef, useState } from 'react';
import { playUiSound } from '../lib/uiFeedback';
import Button from './Button';
import CombatGmHeader from '../features/combat/CombatGmHeader';
import CombatPlayerHeader from '../features/combat/CombatPlayerHeader';
import ParticipantRow from '../features/combat/ParticipantRow';
import { CONDITION_ICON_MAP } from '../features/combat/conditionIconMap';
import IconButton from '../ui/IconButton';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Dice5,
  Skull,
  UserPlus,
  X,
  AlertCircle,
} from 'lucide-react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';
import { resolveDisplayAvatar } from '../lib/placeholders';
import TvImage from './TvImage';
import {
  CONDITIONS,
  CONDITION_BADGE_COLORS,
  getActiveConditions,
} from '../lib/battleConditions';
import {
  COMBAT_JOIN_REQUEST_STATUS,
  COMBAT_STATUS,
  buildInitiativeOrder,
  filterCombatParticipants,
  getInitiativeTieGroups,
  getTieGroupKey,
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

function OverlayDialog({ title, description, children, onClose, actions, showCloseButton = true }) {
  return (
    <div className="tv-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="tv-surface tv-text w-full max-w-md overflow-hidden rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
        <div className="tv-modal-header items-center">
          <div className="min-w-0">
            <h3 className="tv-title-section">{title}</h3>
            {description ? <p className="tv-meta mt-1">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="tv-icon-btn shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          ) : <div className="h-9 w-9 shrink-0" />}
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="tv-modal-footer">
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
  const isMyTurn = battleActive && currentTurnId === currentPlayerId;
  const currentTurnMember = sortedParty.find((member) => member.id === currentTurnId) || null;
  const getVisibleCombatName = (member) => {
    if (!member) return null;
    if (!isGm && member.isNpc && member.isRevealed === false) return 'Onbekende vijand';
    return member.name;
  };
  const currentTurnDisplayName = getVisibleCombatName(currentTurnMember);
  const combatPaused = combatStatus === COMBAT_STATUS.PAUSED;

  const showPlayerRollPanel = role === 'player'
    && combatStatus === COMBAT_STATUS.IDLE
    && myCharacter
    && currentPlayerInCombat
    && myCharacter.init === null;

  useEffect(() => {
    if (!combatInProgress || !currentTurnId) return undefined;
    playUiSound('turn');
  }, [currentTurnId, combatInProgress, turnRound]);

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

  const handleStartCombat = () => {
    if (!isGm || isActionBusy) return;
    prepareCombatFlow('start');
  };

  const handlePauseCombat = async () => {
    if (!isGm || isActionBusy || combatStatus !== COMBAT_STATUS.ACTIVE) return;

    setStatusError('');
    setIsActionBusy(true);
    try {
      await onPauseCombat?.();
    } catch (error) {
      console.error('Gevecht pauzeren fout:', error);
      setStatusError('Gevecht pauzeren is mislukt.');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleResumeCombat = () => {
    if (!isGm || isActionBusy) return;
    prepareCombatFlow('resume');
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

  const statusTitle = role === 'player' && isMyTurn
    ? 'Jouw beurt'
    : (combatStatus === COMBAT_STATUS.IDLE
      ? 'Ruststand'
      : (combatStatus === COMBAT_STATUS.PAUSED ? 'Gepauzeerd' : 'Gevecht'));

  const gmStatusLine = (() => {
    if (combatStatus === COMBAT_STATUS.IDLE) return 'Klaar om de slagorde actief te maken.';
    if (combatStatus === COMBAT_STATUS.PAUSED) {
      return 'Pauze actief — pas de slagorde aan en hervat wanneer je klaar bent.';
    }
    return 'Gevecht loopt — de huidige beurt is gemarkeerd in de lijst.';
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
          className="app-shell-overlay-backdrop tv-backdrop fixed inset-x-0 bottom-0 z-40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        style={{ '--battle-sidebar-width': `${sidebarWidth}px` }}
        className={`
          fixed left-0 right-0 z-50 flex flex-col overflow-hidden border-t backdrop-blur-md transition-transform duration-300 ease-in-out tv-rail-surface
          ${(isOpen || isPinned) ? 'translate-x-0' : 'translate-x-full'}
          ${isPinned ? 'top-0 h-full md:relative md:h-full md:translate-x-0 md:z-0 md:left-auto md:right-0 md:border-l md:border-t-0 md:w-[var(--battle-sidebar-width)] md:min-w-[var(--battle-sidebar-width)] md:max-w-[var(--battle-sidebar-width)] md:shadow-none' : 'app-shell-overlay-frame'}
          lg:relative lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:translate-x-0 lg:z-0 lg:flex lg:border-l lg:border-t-0 lg:w-[var(--battle-sidebar-width)] lg:min-w-[var(--battle-sidebar-width)] lg:max-w-[var(--battle-sidebar-width)] lg:shadow-none lg:shadow-[0_22px_60px_rgba(0,0,0,0.34)]
        `}
      >
        <div className="absolute top-0 left-0 hidden h-full w-1 bg-gradient-to-b from-white/8 color-mix(in srgb, var(--tv-border), transparent 40%) to-white/8 md:block" />
        <button
          type="button"
          aria-label="Sleep om slagordebreedte aan te passen"
          onMouseDown={handleResizeStart}
          onDoubleClick={() => setSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH)}
          className="absolute left-0 top-0 hidden h-full w-3 translate-x-1/2 cursor-col-resize md:block"
        >
          <span className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isDragging ? 'tv-drag-handle tv-drag-handle--active shadow-[0_0_12px_color-mix(in_srgb,var(--tv-text-primary),transparent_75%)]' : 'tv-drag-handle hover:tv-drag-handle--active'}`} />
        </button>

        <div className="tv-view-shell-header mt-14 border-b px-3.5 py-3 md:mt-0 md:px-4 md:py-3.5">
          <div className="relative">
            {isGm ? (
              <CombatGmHeader
                combatStatus={combatStatus}
                combatInProgress={combatInProgress}
                turnRound={turnRound}
                isActionBusy={isActionBusy}
                showInfo={showInfo}
                onToggleInfo={() => setShowInfo((value) => !value)}
                isPinned={isPinned}
                onTogglePinned={() => setIsPinned?.(!isPinned)}
                onClose={onClose}
                onStart={handleStartCombat}
                onPause={handlePauseCombat}
                onResume={handleResumeCombat}
                onRequestEndCombat={() => setEndCombatConfirmOpen(true)}
                statusTitle={statusTitle}
                statusSubtitle={gmStatusLine}
              />
            ) : (
              <CombatPlayerHeader
                combatStatus={combatStatus}
                combatInProgress={combatInProgress}
                turnRound={turnRound}
                isMyTurn={isMyTurn}
                isPinned={isPinned}
                onTogglePinned={() => setIsPinned?.(!isPinned)}
                onClose={onClose}
                statusTitle={statusTitle}
                statusPrimaryLine={playerStatusPrimaryLine}
                statusSecondaryLine={playerStatusSecondaryLine}
              />
            )}

          </div>

          {showPlayerRollPanel ? (
            <div className="mt-3 tv-panel-inset px-3 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] tv-accent">Initiative</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  placeholder="Typ..."
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10);
                    if (!Number.isNaN(value)) onUpdateStat?.(myCharacter.id, 'init', value);
                  }}
                  className="hide-arrows w-full rounded-md border border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] tv-input-surface px-2 text-center font-bold tv-text outline-none focus:border-[var(--tv-accent)]/60 sm:w-18"
                />
                <button
                  type="button"
                  onClick={() => onUpdateStat?.(myCharacter.id, 'init', rollInitiative(myCharacter))}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors tv-button-primary"
                >
                  <Dice5 className="h-3.5 w-3.5" /> Rol (+{myCharacter.initMod || 0})
                </button>
              </div>
            </div>
          ) : null}

          {showCombatJoinPanel ? (
            <div className="mt-3 tv-tone-ally-surface px-3 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] tv-tone-ally-text">Niet in gevecht</div>
              <p className="mb-3 text-xs leading-5 tv-text-sub">
                Je staat nu buiten de initiativelijst. Dien een verzoek in om weer mee te doen.
              </p>
              <button
                type="button"
                onClick={handleRequestJoinCombat}
                disabled={!canRequestCombatJoin || isActionBusy}
                className={`flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-fantasy uppercase tracking-[0.16em] transition-colors ${playerJoinRequestPending ? 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset tv-muted' : (canRequestCombatJoin ? 'tv-tone-ally-button' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset tv-muted')}`}
              >
                {playerJoinRequestPending ? 'In behandeling' : 'Meedoen'}
              </button>
              {playerJoinRequestPending ? (
                <p className="mt-2 text-[11px] leading-5 tv-muted">
                  {combatStatus === COMBAT_STATUS.IDLE
                    ? 'Verzoek ontvangen. Je wordt automatisch teruggezet in de initiative tijdens ruststand.'
                    : 'Verzoek ontvangen. Je wordt automatisch toegevoegd zodra het gevecht eindigt en ruststand actief is.'}
                </p>
              ) : (
                <p className="mt-2 text-[11px] leading-5 tv-muted">
                  {combatStatus === COMBAT_STATUS.IDLE
                    ? 'In ruststand word je na het verzoek automatisch toegevoegd.'
                    : 'Tijdens pauze of gevecht blijft je verzoek in behandeling tot ruststand.'}
                </p>
              )}
            </div>
          ) : null}

          {statusError ? (
            <div className="mt-3 rounded-xl tv-tone-enemy-surface px-3 py-2 text-xs leading-5">
              {statusError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden px-3.5 py-3.5 md:px-4 md:py-4">
          {showInfo ? (
            <div className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] tv-muted">Slagorde info</div>
              <div className="mt-3 space-y-2">
                {[
                  'Ruststand laat iedereen initiative voorbereiden voordat de GM start.',
                  'Gevecht actief vergrendelt initiative-invoer en houdt beurt en ronde bij.',
                  'Pauzeren geeft ruimte om NPC’s toe te voegen of te verwijderen zonder de ronde kwijt te raken.',
                ].map((line) => (
                  <p key={line} className="text-sm leading-6 tv-muted">{line}</p>
                ))}
              </div>
            </div>
          ) : null}

          {sortedParty.length === 0 && !showPlayerRollPanel ? (
            <div className="flex min-h-[220px] flex-1 items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset px-6 text-center shadow-inner">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] tv-muted">Nog leeg</div>
                <p className="font-story text-sm italic leading-relaxed tv-muted">Voeg spelers, NPC’s of handout-personages toe aan de lijst.</p>
              </div>
            </div>
          ) : (
            <div ref={rosterScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
          {sortedParty.map((member, memberIndex) => {
            const isCurrentTurn = combatInProgress && member.id === currentTurnId;
            const orderIndex = memberIndex + 1;
            const hiddenNpcForPlayer = !isGm && member.isNpc && member.isRevealed === false;
            const displayMemberName = hiddenNpcForPlayer ? 'Onbekende vijand' : member.name;
            const displayMemberAvatar = hiddenNpcForPlayer ? null : member.avatar;
            const initiativeEditable = isGm
              ? combatStatus !== COMBAT_STATUS.ACTIVE
              : (combatStatus === COMBAT_STATUS.IDLE && member.id === currentPlayerId);
            const activeConditions = getActiveConditions(member);

            return (
              <ParticipantRow
                key={member.id}
                member={member}
                orderIndex={orderIndex}
                isGm={isGm}
                combatInProgress={combatInProgress}
                battleActive={battleActive}
                combatPaused={combatPaused}
                isCurrentTurn={isCurrentTurn}
                initiativeEditable={initiativeEditable}
                hiddenNpcForPlayer={hiddenNpcForPlayer}
                displayMemberName={displayMemberName}
                displayMemberAvatar={displayMemberAvatar}
                canManageRoster={canManageRoster}
                isActionBusy={isActionBusy}
                activeConditions={activeConditions}
                hasAlertFeat={member?.hasAlertFeat === true}
                currentPlayerId={currentPlayerId}
                onOpenProfile={onOpenProfile}
                onUpdateStat={onUpdateStat}
                onOpenDamageModal={onOpenDamageModal}
                onOpenConditions={openConditionsEditor}
                onRemoveNpc={handleRemoveNpc}
                onKickPlayer={setKickTarget}
              />
            );
          })}
            </div>
          )}
        </div>

        {role === 'gm' ? (
          <div className="tv-input-footer border-t px-3.5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] md:px-4 md:pt-3.5 md:pb-3">
            <div className={`grid gap-2 ${battleActive ? 'grid-cols-2' : 'grid-cols-2'}`}>
              <IconButton
                icon={Dice5}
                label="Rol alle initiative"
                variant="muted"
                disabled={combatInProgress || isActionBusy}
                onClick={handleRollAll}
                className="!w-full"
              />
              <IconButton
                icon={UserPlus}
                label="Voeg een losse NPC toe"
                variant="muted"
                disabled={!canManageRoster || isActionBusy}
                onClick={onOpenNpcModal}
                className="!w-full"
              />
            </div>
            {battleActive ? (
              <button
                type="button"
                onClick={handleAdvanceTurn}
                disabled={isActionBusy}
                aria-label="Volgende beurt"
                title="Volgende beurt"
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60 tv-button-primary"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="hidden sm:inline">Volgende beurt</span>
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
              <Button variant="ghost" onClick={() => setEndCombatConfirmOpen(false)}>
                Annuleren
              </Button>
              <Button variant="danger" onClick={handleEndCombatClick} disabled={isActionBusy}>
                <Skull className="h-4 w-4" /> Beëindig
              </Button>
            </>
          )}
        >
          <div className="rounded-xl tv-tone-enemy-surface px-3 py-3 text-sm leading-6">
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
              <Button variant="ghost" onClick={() => setPendingMissingAction(null)}>
                Nog niet starten
              </Button>
              <Button variant="primary" onClick={handleConfirmMissingInitiative}>
                Rol ontbrekende
              </Button>
            </>
          )}
        >
          <div className="space-y-2">
            {pendingMissingAction.missingMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset px-3 py-2 text-sm tv-text">
                <span>{member.name}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] tv-muted">{member.isNpc ? 'NPC' : 'Speler'}</span>
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
                <Button variant="ghost" onClick={() => setTieResolutionState({ ...tieResolutionState, selectionMode: 'choice' })}>
                  Terug
                </Button>
                <Button variant="primary" onClick={() => handleTieOrderResolved(tieResolutionState.manualOrder)}>
                  Volgorde vastzetten
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setTieResolutionState({ ...tieResolutionState, selectionMode: 'manual' })}>
                  Ik kies zelf
                </Button>
                <Button variant="primary" onClick={() => handleTieOrderResolved(shuffleList(activeTieGroupMembers.map((member) => member.id)))}>
                  TomeVault bepaalt
                </Button>
              </>
            )
          )}
        >
          <div className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2 text-xs leading-5 tv-text-sub">
            Score {activeTieGroupMembers[0]?.init ?? '-'} · Init Mod {activeTieGroupMembers[0]?.initMod >= 0 ? `+${activeTieGroupMembers[0]?.initMod}` : activeTieGroupMembers[0]?.initMod}
          </div>

          <div className="space-y-2">
            {(tieResolutionState.selectionMode === 'manual'
              ? tieResolutionState.manualOrder.map((id) => activeTieGroupMembers.find((member) => member.id === id)).filter(Boolean)
              : activeTieGroupMembers
            ).map((member, index, list) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset px-3 py-2.5">
                <div className="tv-image-frame flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface">
                  <TvImage src={resolveDisplayAvatar(member.avatar, member.id)} alt={member.name} className="opacity-90" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-fantasy text-sm tracking-[0.14em] tv-text">{member.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] tv-muted">{member.isNpc ? 'NPC' : 'Speler'}</div>
                </div>
                {tieResolutionState.selectionMode === 'manual' ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveTieMember(member.id, 'up')}
                      disabled={index === 0}
                      className="rounded-md border border-[color-mix(in_srgb,var(--tv-border),transparent_20%)] tv-chip-surface p-1.5 tv-text transition-colors hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTieMember(member.id, 'down')}
                      disabled={index === list.length - 1}
                      className="rounded-md border border-[color-mix(in_srgb,var(--tv-border),transparent_20%)] tv-chip-surface p-1.5 tv-text transition-colors hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text disabled:cursor-not-allowed disabled:opacity-40"
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
              <Button variant="ghost" onClick={() => setKickTarget(null)}>
                Annuleren
              </Button>
              <Button variant="danger" onClick={handleConfirmKickPlayer} disabled={isActionBusy}>
                Ja, verwijder
              </Button>
            </>
          )}
        >
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset px-3 py-3 text-sm leading-6 tv-text">
            Bevestig dat je <span className="font-fantasy tracking-[0.12em] tv-text">{kickTarget.name}</span> uit dit gevecht wilt halen.
          </div>
        </OverlayDialog>
      ) : null}

      {conditionsTarget && isGm ? (
        <OverlayDialog
          title={`Conditions voor ${conditionsTarget.name}`}
          description="Activeer of verwijder status effecten op dit personage."
          onClose={() => setConditionsTarget(null)}
          actions={(
            <Button variant="primary" onClick={handleSaveConditions}>
              Opslaan
            </Button>
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
                      : 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-view-card tv-muted hover:border-[color-mix(in_srgb,var(--tv-border),transparent_20%)] hover:opacity-90/60'
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
