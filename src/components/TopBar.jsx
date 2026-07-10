import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Music, Pause, Swords, User, LogOut, ChevronDown, Bell, BellRing } from 'lucide-react';
import AmbiencePanel from './AmbiencePanel';
import LeaveSessionConfirmModal from './LeaveSessionConfirmModal';
import RuntimeBadge from './RuntimeBadge';
import { formatCampaignDisplayName } from '../lib/sessionUtils';
import { COMBAT_STATUS, getTurnApproachRatio, getTurnsUntilMember, sortPartyByInitiative } from '../lib/battleUtils';
import { useT } from '../i18n/useT';

export default function TopBar({
  role,
  campaignName,
  sessionNumber,
  theme,
  combatStatus,
  currentTurnId,
  initiativeOrder,
  party,
  currentPlayerId,
  isPartyOpen,
  onLogout,
  ambience,
  onToggleAmbiencePanel,
  onCloseAmbiencePanel,
  onToggleAmbiencePlayback,
  onSelectAmbienceTrack,
  onSetSessionAmbienceVolume,
  onSetListenerAmbienceVolume,
  onUnlockAmbienceAudio,
  onToggleParty,
  onOpenSessionHub,
  onOpenProfile,
  onOpenSettings,
  onOpenSourcelist,
  runtimeBadge,
}) {
  const { t } = useT('session');
  const sortedParty = sortPartyByInitiative(Array.isArray(party) ? party : [], Array.isArray(initiativeOrder) ? initiativeOrder : []);
  const turnsUntilMine = getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const turnApproachRatio = getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const isMyTurn = combatStatus === COMBAT_STATUS.ACTIVE && currentTurnId === currentPlayerId;
  const ambienceShellRef = useRef(null);
  const partyIndicatorAngle = `${Math.round(Math.max(0, Math.min(1, turnApproachRatio || 0)) * 360)}deg`;
  const partyButtonTitle = useMemo(() => {
    if (isPartyOpen) return t('party.hide');
    if (combatStatus === COMBAT_STATUS.IDLE) return t('party.idle');
    if (isMyTurn) return t('party.myTurn');
    if (combatStatus === COMBAT_STATUS.PAUSED) return t('party.paused');
    if (turnsUntilMine === null) return t('party.active');
    return t('party.turnsUntil', { count: turnsUntilMine });
  }, [combatStatus, isMyTurn, isPartyOpen, t, turnsUntilMine]);
  const isPlayer = role === 'player';
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [turnAlert, setTurnAlert] = useState(null);
  const lastTurnRef = useRef(currentTurnId || null);
  const previousCombatStatusRef = useRef(combatStatus);
  const displayCampaignName = formatCampaignDisplayName(campaignName, t('common:fallbacks.campaign'));
  const compactCampaignName = displayCampaignName.length > 14
    ? `${displayCampaignName.slice(0, 14)}…`
    : displayCampaignName;
  const safeSessionNumber = Math.max(1, Number(sessionNumber) || 1);
  const roleLabel = role === 'gm' ? t('common:roles.gm') : t('common:roles.player');
  const sessionSublabel = t('sessionLabel', { number: safeSessionNumber });

  const requestLeaveSession = useCallback(() => {
    setIsLeaveConfirmOpen(true);
  }, []);

  const confirmLeaveSession = useCallback(() => {
    setIsLeaveConfirmOpen(false);
    onLogout();
  }, [onLogout]);

  useEffect(() => {
    const previousCombatStatus = previousCombatStatusRef.current;
    const turnChanged = lastTurnRef.current !== currentTurnId;

    if (role === 'player' && combatStatus === COMBAT_STATUS.ACTIVE && turnChanged) {
      if (currentTurnId === currentPlayerId) {
        setTurnAlert({
          id: `${Date.now()}-now`,
          variant: 'now',
          label: t('turnAlert.now'),
        });
      } else if (turnsUntilMine === 1) {
        setTurnAlert({
          id: `${Date.now()}-soon`,
          variant: 'soon',
          label: t('turnAlert.soon'),
        });
      } else if (previousCombatStatus !== COMBAT_STATUS.ACTIVE && turnsUntilMine !== null) {
        setTurnAlert({
          id: `${Date.now()}-start`,
          variant: 'start',
          label: t('turnAlert.start'),
        });
      }
    }

    lastTurnRef.current = currentTurnId;
    previousCombatStatusRef.current = combatStatus;
  }, [role, combatStatus, currentTurnId, currentPlayerId, turnsUntilMine, t]);

  useEffect(() => {
    if (!turnAlert) return undefined;

    const timer = window.setTimeout(() => {
      setTurnAlert((current) => (current?.id === turnAlert.id ? null : current));
    }, 4800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [turnAlert]);

  useEffect(() => {
    if (!ambience?.isOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      const clickedTrigger = ambienceShellRef.current && ambienceShellRef.current.contains(target);
      const clickedPanel = target instanceof Element && target.closest('[data-ambience-panel-root="true"]');

      if (!clickedTrigger && !clickedPanel) {
        onCloseAmbiencePanel();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseAmbiencePanel();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ambience?.isOpen, onCloseAmbiencePanel]);

  const ambienceTitle = isPlayer
    ? t('ambience.playerSettings')
    : (ambience?.isPlaying ? t('ambience.activeSession') : t('ambience.panel'));

  return (
    <header className="relative z-40 shrink-0 tv-topbar-bg backdrop-blur-md">
      {turnAlert && role === 'player' ? (
        <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.4rem)] z-40 w-[calc(100%-1rem)] max-w-sm -translate-x-1/2">
          <div
            className={`tv-turn-alert ${turnAlert.variant === 'now' ? 'tv-turn-alert--now' : (turnAlert.variant === 'start' ? 'tv-turn-alert--start' : 'tv-turn-alert--wait')}`}
            role="status"
            aria-live="polite"
            aria-label={turnAlert.label}
            title={turnAlert.label}
          >
            {turnAlert.variant === 'now' ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            <span className="truncate text-[11px] font-medium sm:text-xs">{turnAlert.label}</span>
          </div>
        </div>
      ) : null}

      <div className="flex h-14 items-center md:h-16">
        <div className="flex shrink-0 items-center gap-2 pl-3 md:w-[var(--tv-sidebar-width,252px)] md:min-w-[var(--tv-sidebar-width,252px)] md:max-w-[var(--tv-sidebar-width,252px)] md:gap-3 md:border-r md:border-[color-mix(in_srgb,var(--tv-border),transparent_38%)] md:pl-5 md:pr-4">
          <img src="/references/tomeVaultLogo1.png" alt="TomeVault" className="h-7 w-7 shrink-0 object-contain md:h-8 md:w-8" />
          <span className="hidden font-fantasy text-base font-bold tracking-[0.1em] tv-text sm:block md:text-lg">
            TOME<span className="text-[color:var(--tv-accent)]">VAULT</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 md:gap-4 md:px-5">
          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={() => onOpenSessionHub?.()}
              className="tv-session-trigger"
              title={t('hubTitle')}
            >
              <span className="tv-session-trigger__crest tv-session-trigger__crest--icon" aria-hidden="true">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <span className="tv-session-trigger__body">
                <span className="tv-session-trigger__name">
                  <span className="sm:hidden">{compactCampaignName}</span>
                  <span className="hidden sm:inline">{displayCampaignName}</span>
                </span>
                <span className="tv-session-trigger__role">
                  <span className="hidden sm:inline">{sessionSublabel} · </span>
                  {roleLabel}
                </span>
              </span>
              <ChevronDown className="tv-session-trigger__chevron" />
            </button>

            {runtimeBadge ? <RuntimeBadge runtimeBadge={runtimeBadge} dot className="ml-0.5 hidden shrink-0 md:inline-block" /> : null}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div ref={ambienceShellRef} className="relative">
              <button
                type="button"
                onClick={onToggleAmbiencePanel}
                className={`tv-topbar-chip tv-topbar-chip--icon relative ${ambience?.isOpen ? 'tv-topbar-chip--active' : ''} ${ambience?.isPlaying ? 'tv-topbar-chip--playing' : ''}`}
                title={ambienceTitle}
                aria-pressed={ambience?.isOpen === true}
              >
                <span className={`tv-topbar-chip__dot ${ambience?.isPlaying ? '' : 'tv-topbar-chip__dot--inactive'}`} />
                {ambience?.isPlaying ? <Pause className="h-4 w-4" /> : <Music className="h-4 w-4" />}
              </button>

              <AmbiencePanel
                role={role}
                theme={theme}
                isOpen={ambience?.isOpen === true}
                currentTrack={ambience?.currentTrack}
                isPlaying={ambience?.isPlaying === true}
                sessionVolume={ambience?.sessionVolume ?? 0}
                listenerVolume={ambience?.listenerVolume ?? 0}
                verifiedTracks={ambience?.verifiedTracks || []}
                archivedTracks={ambience?.archivedTracks || []}
                needsAudioUnlock={ambience?.needsAudioUnlock === true}
                ambienceError={ambience?.ambienceError || ''}
                onClose={onCloseAmbiencePanel}
                onTogglePlayback={onToggleAmbiencePlayback}
                onSelectTrack={onSelectAmbienceTrack}
                onSessionVolumeChange={onSetSessionAmbienceVolume}
                onListenerVolumeChange={onSetListenerAmbienceVolume}
                onUnlockAudio={onUnlockAmbienceAudio}
                onOpenSourcelist={onOpenSourcelist}
              />
            </div>

            <button
              onClick={onToggleParty}
              className={`tv-topbar-chip tv-topbar-chip--icon relative ${isPartyOpen ? 'tv-topbar-chip--active' : ''}`}
              title={partyButtonTitle}
              aria-pressed={isPartyOpen}
            >
              <Swords className={`h-4 w-4 ${combatStatus !== COMBAT_STATUS.IDLE ? 'text-[color:var(--tv-accent)]' : ''}`} />
              {role === 'player' && combatStatus !== COMBAT_STATUS.IDLE ? (
                <span
                  className={`pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${isMyTurn ? 'border-[color:var(--tv-accent)]' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_20%)]'}`}
                  style={isMyTurn ? { boxShadow: 'var(--tv-glow)' } : undefined}
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: isMyTurn
                        ? 'var(--tv-accent)'
                        : `conic-gradient(var(--tv-accent) 0deg ${partyIndicatorAngle}, rgba(255,255,255,0.12) ${partyIndicatorAngle} 360deg)`,
                    }}
                  />
                  <span className="absolute inset-[2px] rounded-full tv-input-surface" />
                  <span className={`relative z-10 block h-1.5 w-1.5 rounded-full ${isMyTurn ? 'bg-[color:var(--tv-text-primary)] animate-pulse' : 'tv-status-dot--inactive'}`} />
                </span>
              ) : null}
            </button>

            {isPlayer ? (
              <button
                type="button"
                onClick={onOpenProfile}
                className="tv-topbar-chip tv-topbar-chip--icon"
                title={t('profileTitle')}
              >
                <User className="h-4 w-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={requestLeaveSession}
              className="tv-topbar-chip tv-topbar-chip--icon tv-topbar-chip--danger"
              title={t('leaveTitle')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <LeaveSessionConfirmModal
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={confirmLeaveSession}
        sessionLabel={displayCampaignName}
        sessionNumber={sessionNumber}
        roleLabel={roleLabel}
        theme={theme}
      />
    </header>
  );
}
