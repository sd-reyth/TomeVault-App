import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flashFeedback, playFeedback, playUiSound } from '../lib/uiFeedback';
import Button from './Button';
import Text from '../ui/Text';
import CombatGmHeader from '../features/combat/CombatGmHeader';
import CombatPlayerHeader from '../features/combat/CombatPlayerHeader';
import ParticipantRow from '../features/combat/ParticipantRow';
import { CONDITION_ICON_MAP } from '../features/combat/conditionIconMap';
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
  getInitiativeModifier,
  getInitiativeTieGroups,
  getInitiativeTotal,
  getTieGroupKey,
  getTurnsUntilMember,
  hasPendingCombatJoinRequest,
  isCombatParticipant,
  rollInitiative,
  shuffleList,
  sortPartyByInitiative,
} from '../lib/battleUtils';
import { useT } from '../i18n/useT';

const RIGHT_SIDEBAR_DEFAULT_WIDTH = 380;
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

function OverlayDialog({ title, description, children, onClose, actions, showCloseButton = true, closeLabel }) {
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
              aria-label={closeLabel}
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
  onReturnPlayerToCombat,
  onOpenNpcModal,
  onOpenDamageModal,
  onOpenProfile,
  currentPlayerId,
  onUpdateStat,
  isPinned,
  setIsPinned,
  theme,
}) {
  const { t } = useT('combat');
  const [sidebarWidth, setSidebarWidth] = useState(RIGHT_SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [pendingMissingAction, setPendingMissingAction] = useState(null);
  const [tieResolutionState, setTieResolutionState] = useState(null);
  const [endCombatConfirmOpen, setEndCombatConfirmOpen] = useState(false);
  const [conditionsTarget, setConditionsTarget] = useState(null);
  const [conditionsDraftIds, setConditionsDraftIds] = useState([]);
  const dragStateRef = useRef({ startX: 0, startWidth: RIGHT_SIDEBAR_DEFAULT_WIDTH });
  const rosterScrollRef = useRef(null);
  const combatHeaderRef = useRef(null);

  const isGm = role === 'gm';
  const battleActive = combatStatus === COMBAT_STATUS.ACTIVE;
  const combatInProgress = combatStatus !== COMBAT_STATUS.IDLE;
  const canManageRoster = isGm && combatStatus !== COMBAT_STATUS.ACTIVE;
  const combatRoster = useMemo(() => filterCombatParticipants(party), [party]);
  const visibleCombatRoster = useMemo(() => (
    isGm
      ? combatRoster
      : combatRoster.filter((member) => !(member.isNpc && member.isRevealed === false))
  ), [combatRoster, isGm]);
  const hiddenPlayers = useMemo(() => (
    isGm
      ? party.filter((member) => member.isNpc !== true && !isCombatParticipant(member))
      : []
  ), [isGm, party]);

  const sortedParty = useMemo(
    () => sortPartyByInitiative(visibleCombatRoster, combatInProgress ? initiativeOrder : []),
    [combatInProgress, visibleCombatRoster, initiativeOrder]
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
    if (!isGm && member.isNpc && member.isRevealed === false) return t('participant.unknownEnemy');
    return member.name;
  };
  const currentTurnDisplayName = getVisibleCombatName(currentTurnMember);
  const currentTurnOrderIndex = currentTurnMember
    ? sortedParty.findIndex((member) => member.id === currentTurnMember.id) + 1
    : null;
  const combatPaused = combatStatus === COMBAT_STATUS.PAUSED;
  const slagordeAmbienceActive = isOpen || isPinned;

  const showPlayerRollPanel = role === 'player'
    && combatStatus === COMBAT_STATUS.IDLE
    && myCharacter
    && currentPlayerInCombat
    && myCharacter.init === null;

  useEffect(() => {
    if (!combatInProgress || !currentTurnId) return undefined;
    playUiSound('turn');
    if (role === 'player' && currentTurnId === currentPlayerId) {
      playUiSound('warning');
      flashFeedback(combatHeaderRef.current, 'gold');
    }
  }, [currentTurnId, combatInProgress, turnRound, role, currentPlayerId]);

  const activeTieGroup = tieResolutionState?.tieGroups?.[tieResolutionState.currentIndex] || null;
  const activeTieGroupKey = activeTieGroup ? getTieGroupKey(activeTieGroup[0]) : null;
  const activeTieGroupMembers = activeTieGroup || [];
  const tieRepresentative = activeTieGroupMembers[0] || null;
  const tieSharedTotal = tieRepresentative ? getInitiativeTotal(tieRepresentative) : null;
  const tieSharedModifier = tieRepresentative ? getInitiativeModifier(tieRepresentative) : 0;
  const tieSharedModifierLabel = tieSharedModifier >= 0 ? `+${tieSharedModifier}` : `${tieSharedModifier}`;
  const tieIsManual = tieResolutionState?.selectionMode === 'manual';

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
        playFeedback({ sound: 'combatStart', element: combatHeaderRef.current, variant: 'gold' });
      } else {
        await onResumeCombat?.({ initiativeUpdates, nextInitiativeOrder });
        playFeedback({ sound: 'combatResume', element: combatHeaderRef.current });
      }
    } catch (error) {
      console.error('Combat flow error:', error);
      setStatusError(t('errors.updateFailed'));
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
      playFeedback({ sound: 'combatPause', element: combatHeaderRef.current });
    } catch (error) {
      console.error('Pause combat error:', error);
      setStatusError(t('errors.pauseFailed'));
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
      playUiSound('dice');
      flashFeedback(combatHeaderRef.current);
    } catch (error) {
      console.error('Roll all error:', error);
      setStatusError(t('errors.rollFailed'));
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
      console.error('Advance turn error:', error);
      setStatusError(t('errors.advanceFailed'));
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
      playFeedback({ sound: 'combatEnd', element: combatHeaderRef.current, variant: 'danger' });
      setEndCombatConfirmOpen(false);
    } catch (error) {
      console.error('End combat error:', error);
      setStatusError(t('errors.endFailed'));
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
      console.error('Join request error:', error);
      setStatusError(t('errors.joinRequestFailed'));
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
    playUiSound('paper');
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
    ? t('status.yourTurn')
    : (combatStatus === COMBAT_STATUS.IDLE
      ? t('status.idle')
      : (combatStatus === COMBAT_STATUS.PAUSED ? t('status.paused') : t('status.combat')));

  const gmStatusLine = (() => {
    if (combatStatus === COMBAT_STATUS.IDLE) return t('status.gmIdle');
    if (combatStatus === COMBAT_STATUS.PAUSED) {
      return t('status.gmPaused');
    }
    return t('status.gmActive');
  })();

  const playerStatusPrimaryLine = (() => {
    if (combatStatus === COMBAT_STATUS.IDLE) {
      return myCharacter?.init === null
        ? t('status.playerInitOpen')
        : t('status.playerReady');
    }

    if (combatStatus === COMBAT_STATUS.PAUSED) {
      return currentTurnDisplayName
        ? t('status.playerPausedDuring', { name: currentTurnDisplayName })
        : t('status.playerPausedGeneric');
    }

    if (isMyTurn) return t('status.playerYourTurn');
    return currentTurnDisplayName ? t('status.playerTurnOf', { name: currentTurnDisplayName }) : t('status.playerActive');
  })();

  const playerStatusSecondaryLine = (() => {
    if (combatStatus === COMBAT_STATUS.IDLE) {
      return myCharacter?.init === null
        ? t('status.playerInitHint')
        : t('status.playerWaitHint');
    }

    if (combatStatus === COMBAT_STATUS.PAUSED) {
      return t('status.playerPauseHint');
    }

    if (turnsUntilMine === null) {
      return t('status.roundRunning', { round: turnRound });
    }

    if (isMyTurn) {
      return t('status.roundActNow', { round: turnRound });
    }

    return t('status.turnsUntil', { count: turnsUntilMine });
  })();

  return (
    <>
      {isOpen && !isPinned ? (
        <div
          className="app-shell-overlay-backdrop tv-backdrop fixed inset-x-0 bottom-0 z-40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        style={{ '--battle-sidebar-width': `${sidebarWidth}px` }}
        className={`
          fixed left-0 right-0 z-50 flex flex-col overflow-hidden border-t backdrop-blur-md transition-[transform,width,opacity] duration-300 ease-in-out tv-rail-surface
          ${(isOpen || isPinned) ? 'translate-x-0' : 'translate-x-full'}
          ${isPinned ? 'top-0 h-full md:relative md:h-full md:translate-x-0 md:z-0 md:left-auto md:right-0 md:border-l md:border-t-0 md:w-[var(--battle-sidebar-width)] md:min-w-[var(--battle-sidebar-width)] md:max-w-[var(--battle-sidebar-width)] md:shadow-none' : 'app-shell-overlay-frame'}
          ${isOpen ? 'md:relative md:left-auto md:right-0 md:top-0 md:h-full md:translate-x-0 md:z-0 md:flex md:border-l md:border-t-0 md:w-[var(--battle-sidebar-width)] md:min-w-[var(--battle-sidebar-width)] md:max-w-[var(--battle-sidebar-width)] md:opacity-100 md:shadow-none' : 'md:pointer-events-none md:absolute md:right-0 md:top-0 md:h-full md:w-0 md:min-w-0 md:max-w-0 md:translate-x-full md:overflow-hidden md:border-0 md:opacity-0'}
        `}
      >
        <div className="absolute top-0 left-0 hidden h-full w-1 bg-gradient-to-b from-white/8 color-mix(in srgb, var(--tv-border), transparent 40%) to-white/8 md:block" />
        <button
          type="button"
          aria-label={t('resizeAria')}
          onMouseDown={handleResizeStart}
          onDoubleClick={() => setSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH)}
          className="absolute left-0 top-0 hidden h-full w-3 translate-x-1/2 cursor-col-resize md:block"
        >
          <span className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isDragging ? 'tv-drag-handle tv-drag-handle--active shadow-[0_0_12px_color-mix(in_srgb,var(--tv-text-primary),transparent_75%)]' : 'tv-drag-handle hover:tv-drag-handle--active'}`} />
        </button>

        <div className="tv-rail-body flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="tv-view-shell-header tv-rail-shell-header shrink-0 border-b px-3.5 py-3 md:mt-0 md:px-4 md:py-3.5">
          <div className="relative" ref={combatHeaderRef} data-tv-feedback-root>
            {isGm ? (
              <CombatGmHeader
                combatStatus={combatStatus}
                combatInProgress={combatInProgress}
                turnRound={turnRound}
                currentTurnOrderIndex={currentTurnOrderIndex}
                currentTurnMember={currentTurnMember}
                isActionBusy={isActionBusy}
                isPinned={isPinned}
                onTogglePinned={() => setIsPinned?.(!isPinned)}
                onClose={onClose}
                onStart={handleStartCombat}
                onPause={handlePauseCombat}
                onResume={handleResumeCombat}
                onRequestEndCombat={() => setEndCombatConfirmOpen(true)}
                statusTitle={statusTitle}
                statusSubtitle={gmStatusLine}
                ambienceActive={slagordeAmbienceActive}
              />
            ) : (
              <CombatPlayerHeader
                combatStatus={combatStatus}
                combatInProgress={combatInProgress}
                turnRound={turnRound}
                currentTurnOrderIndex={currentTurnOrderIndex}
                currentTurnMember={currentTurnMember}
                currentTurnId={currentTurnId}
                isMyTurn={isMyTurn}
                isPinned={isPinned}
                onTogglePinned={() => setIsPinned?.(!isPinned)}
                onClose={onClose}
                statusPrimaryLine={playerStatusPrimaryLine}
                statusSecondaryLine={playerStatusSecondaryLine}
                ambienceActive={slagordeAmbienceActive}
              />
            )}

          </div>

          {showPlayerRollPanel ? (
            <div className="mt-3 tv-panel-inset px-3 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] tv-accent">{t('initiative.label')}</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  placeholder={t('initiative.placeholder')}
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10);
                    if (!Number.isNaN(value)) onUpdateStat?.(myCharacter.id, 'init', value);
                  }}
                  className="hide-arrows w-full rounded-md border border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] tv-input-surface px-2 text-center font-bold tv-text outline-none focus:border-[var(--tv-accent)]/60 sm:w-18"
                />
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('dice');
                    onUpdateStat?.(myCharacter.id, 'init', rollInitiative(myCharacter));
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors tv-button-primary"
                >
                  <Dice5 className="h-3.5 w-3.5" /> {t('initiative.roll', { mod: myCharacter.initMod || 0 })}
                </button>
              </div>
            </div>
          ) : null}

          {showCombatJoinPanel ? (
            <div className="mt-3 tv-tone-ally-surface px-3 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] tv-tone-ally-text">{t('join.notInCombat')}</div>
              <p className="mb-3 text-xs leading-5 tv-text-sub">
                {t('join.description')}
              </p>
              <button
                type="button"
                onClick={handleRequestJoinCombat}
                disabled={!canRequestCombatJoin || isActionBusy}
                className={`flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-fantasy uppercase tracking-[0.16em] transition-colors ${playerJoinRequestPending ? 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset tv-muted' : (canRequestCombatJoin ? 'tv-tone-ally-button' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset tv-muted')}`}
              >
                {playerJoinRequestPending ? t('join.pending') : t('join.request')}
              </button>
              {playerJoinRequestPending ? (
                <p className="mt-2 text-[11px] leading-5 tv-muted">
                  {combatStatus === COMBAT_STATUS.IDLE
                    ? t('join.pendingIdle')
                    : t('join.pendingActive')}
                </p>
              ) : (
                <p className="mt-2 text-[11px] leading-5 tv-muted">
                  {combatStatus === COMBAT_STATUS.IDLE
                    ? t('join.hintIdle')
                    : t('join.hintActive')}
                </p>
              )}
            </div>
          ) : null}

          {statusError ? (
            <div className="mt-3 rounded-xl tv-tone-enemy-surface px-3 py-2 text-xs leading-5">
              {statusError}
            </div>
          ) : null}

          {isGm && hiddenPlayers.length > 0 ? (
            <div className="mt-3 rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_46%)] tv-panel-inset px-3 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] tv-muted">{t('hidden.title')}</div>
              <div className="space-y-2">
                {hiddenPlayers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs tv-text">{member.name || t('roles.player')}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={combatStatus === COMBAT_STATUS.ACTIVE || isActionBusy}
                      onClick={() => onReturnPlayerToCombat?.(member.id)}
                    >
                      {t('hidden.return')}
                    </Button>
                  </div>
                ))}
              </div>
              {combatStatus === COMBAT_STATUS.ACTIVE ? (
                <p className="mt-2 text-[11px] leading-5 tv-muted">{t('hidden.pauseHint')}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="tv-rail-roster flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-3 pt-3 md:px-1.5 md:pb-3.5 md:pt-3.5">
          {sortedParty.length === 0 && !showPlayerRollPanel ? (
            <div className="tv-rail-empty flex min-h-[220px] flex-1 items-center justify-center px-6 text-center">
              <div>
                <Text variant="label" tone="muted" className="mb-2 block tracking-[0.24em]">{t('empty.label')}</Text>
                <Text variant="story" tone="muted" className="leading-relaxed">
                  {t('empty.hint')}
                </Text>
              </div>
            </div>
          ) : (
            <div ref={rosterScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pt-2 no-scrollbar md:space-y-2.5 md:pt-2.5">
          {sortedParty.map((member, memberIndex) => {
            const isCurrentTurn = combatInProgress && member.id === currentTurnId;
            const orderIndex = memberIndex + 1;
            const hiddenNpcForPlayer = !isGm && member.isNpc && member.isRevealed === false;
            const displayMemberName = hiddenNpcForPlayer ? t('participant.unknownEnemy') : member.name;
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
              />
            );
          })}
            </div>
          )}
        </div>

        {role === 'gm' ? (
          <div className="tv-combat-deck">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                block
                icon={Dice5}
                disabled={combatInProgress || isActionBusy}
                onClick={handleRollAll}
              >
                {t('deck.rollAll')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                block
                icon={UserPlus}
                disabled={!canManageRoster || isActionBusy}
                onClick={onOpenNpcModal}
              >
                {t('deck.npc')}
              </Button>
            </div>
            {battleActive ? (
              <Button
                variant="primary"
                block
                icon={ChevronRight}
                iconPosition="right"
                className="mt-2"
                disabled={isActionBusy}
                onClick={handleAdvanceTurn}
              >
                {t('deck.nextTurn')}
              </Button>
            ) : null}
          </div>
        ) : null}
        </div>
      </aside>

      {endCombatConfirmOpen ? (
        <OverlayDialog
          title={t('endConfirm.title')}
          description={t('endConfirm.description')}
          closeLabel={t('common:actions.close')}
          onClose={() => setEndCombatConfirmOpen(false)}
          actions={(
            <>
              <Button variant="ghost" onClick={() => setEndCombatConfirmOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button variant="danger" onClick={handleEndCombatClick} disabled={isActionBusy} icon={Skull}>
                {t('endConfirm.confirm')}
              </Button>
            </>
          )}
        >
          <div className="rounded-xl tv-tone-enemy-surface px-3 py-3 text-sm leading-6">
            {t('endConfirm.body')}
          </div>
        </OverlayDialog>
      ) : null}

      {pendingMissingAction ? (
        <OverlayDialog
          title={pendingMissingAction.mode === 'start' ? t('missingInit.startTitle') : t('missingInit.resumeTitle')}
          description={t('missingInit.description')}
          closeLabel={t('common:actions.close')}
          onClose={() => setPendingMissingAction(null)}
          actions={(
            <>
              <Button variant="ghost" onClick={() => setPendingMissingAction(null)}>
                {t('missingInit.wait')}
              </Button>
              <Button variant="primary" onClick={handleConfirmMissingInitiative}>
                {t('missingInit.rollMissing')}
              </Button>
            </>
          )}
        >
          <div className="space-y-2">
            {pendingMissingAction.missingMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset px-3 py-2 text-sm tv-text">
                <span>{member.name}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] tv-muted">{member.isNpc ? t('roles.npc') : t('roles.player')}</span>
              </div>
            ))}
          </div>
        </OverlayDialog>
      ) : null}

      {tieResolutionState && activeTieGroup && activeTieGroupKey ? (
        <OverlayDialog
          title={tieResolutionState.tieGroups.length > 1
            ? t('tie.titleProgress', { current: tieResolutionState.currentIndex + 1, total: tieResolutionState.tieGroups.length })
            : t('tie.title')}
          description={tieIsManual ? t('tie.manualDescription') : t('tie.choiceDescription')}
          closeLabel={t('common:actions.close')}
          onClose={() => setTieResolutionState(null)}
          actions={(
            tieResolutionState.selectionMode === 'manual' ? (
              <>
                <Button variant="ghost" onClick={() => setTieResolutionState({ ...tieResolutionState, selectionMode: 'choice' })}>
                  {t('common:actions.back')}
                </Button>
                <Button variant="primary" icon={Check} onClick={() => handleTieOrderResolved(tieResolutionState.manualOrder)}>
                  {t('tie.confirmOrder')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setTieResolutionState({ ...tieResolutionState, selectionMode: 'manual' })}>
                  {t('tie.chooseSelf')}
                </Button>
                <Button variant="primary" icon={Dice5} onClick={() => handleTieOrderResolved(shuffleList(activeTieGroupMembers.map((member) => member.id)))}>
                  {t('tie.draw')}
                </Button>
              </>
            )
          )}
        >
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] tv-muted">{t('tie.totalScore')}</div>
              <div className="mt-0.5 font-fantasy text-xl leading-none tv-text">{tieSharedTotal ?? '—'}</div>
            </div>
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] tv-muted">{t('tie.initMod')}</div>
              <div className="mt-0.5 font-fantasy text-xl leading-none tv-text">{tieSharedModifierLabel}</div>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] tv-muted">
              {tieIsManual ? t('tie.order') : t('tie.tiedCount', { count: activeTieGroupMembers.length })}
            </span>
            {tieIsManual ? (
              <span className="text-[10px] uppercase tracking-[0.18em] tv-muted">{t('tie.firstToLast')}</span>
            ) : null}
          </div>

          <div className="space-y-2">
            {(tieIsManual
              ? tieResolutionState.manualOrder.map((id) => activeTieGroupMembers.find((member) => member.id === id)).filter(Boolean)
              : activeTieGroupMembers
            ).map((member, index, list) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset px-3 py-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border tv-chip-surface ${
                  tieIsManual
                    ? 'border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)] font-fantasy text-base tv-accent'
                    : 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-muted'
                }`}>
                  {tieIsManual ? index + 1 : <Dice5 className="h-4 w-4" />}
                </div>
                <div className="tv-image-frame flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface">
                  <TvImage src={resolveDisplayAvatar(member.avatar, member.id)} alt={member.name} className="opacity-90" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-fantasy text-sm tracking-[0.14em] tv-text">{member.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] tv-muted">{member.isNpc ? t('roles.npc') : t('roles.player')}</div>
                </div>
                {tieIsManual ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={t('tie.moveUp')}
                      onClick={() => moveTieMember(member.id, 'up')}
                      disabled={index === 0}
                      className="rounded-md border border-[color-mix(in_srgb,var(--tv-border),transparent_20%)] tv-chip-surface p-1.5 tv-text transition-colors hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('tie.moveDown')}
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

      {conditionsTarget && isGm ? (
        <OverlayDialog
          title={t('conditions.title', { name: conditionsTarget.name })}
          description={t('conditions.description')}
          closeLabel={t('common:actions.close')}
          onClose={() => setConditionsTarget(null)}
          actions={(
            <Button variant="primary" onClick={handleSaveConditions}>
              {t('common:actions.save')}
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
