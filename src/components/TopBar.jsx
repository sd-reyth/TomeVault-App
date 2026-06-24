import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Share2, Shield, Music, Pause, Swords, User, LogOut, Settings, ChevronDown, Bell, BellRing, MoreHorizontal } from 'lucide-react';
import AmbiencePanel from './AmbiencePanel';
import LeaveSessionConfirmModal from './LeaveSessionConfirmModal';
import RuntimeBadge from './RuntimeBadge';
import { COMBAT_STATUS, getTurnApproachRatio, getTurnsUntilMember, sortPartyByInitiative } from '../lib/battleUtils';

export default function TopBar({ role, sessionId, sessionNumber, theme, combatStatus, currentTurnId, initiativeOrder, party, currentPlayerId, isPartyOpen, onLogout, ambience, onToggleAmbiencePanel, onCloseAmbiencePanel, onToggleAmbiencePlayback, onSelectAmbienceTrack, onSetSessionAmbienceVolume, onSetListenerAmbienceVolume, onUnlockAmbienceAudio, onToggleParty, onOpenShare, onOpenProfile, onOpenSettings, onOpenSessionPanel, onOpenSourcelist, runtimeBadge }) {
  const sortedParty = sortPartyByInitiative(Array.isArray(party) ? party : [], Array.isArray(initiativeOrder) ? initiativeOrder : []);
  const turnsUntilMine = getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const turnApproachRatio = getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const isMyTurn = combatStatus === COMBAT_STATUS.ACTIVE && currentTurnId === currentPlayerId;
  const ambienceShellRef = useRef(null);
  const PartyIcon = combatStatus === COMBAT_STATUS.IDLE
    ? Flame
    : (combatStatus === COMBAT_STATUS.PAUSED ? Shield : Swords);
  const partyIndicatorAngle = `${Math.round(Math.max(0, Math.min(1, turnApproachRatio || 0)) * 360)}deg`;
  const partyButtonTitle = isPartyOpen
    ? 'Verberg slagorde'
    : (combatStatus === COMBAT_STATUS.IDLE
      ? 'Open slagorde - ruststand'
      : (isMyTurn
        ? 'Open slagorde - jouw beurt'
        : (combatStatus === COMBAT_STATUS.PAUSED
          ? 'Open slagorde - gevecht gepauzeerd'
          : (turnsUntilMine === null ? 'Open slagorde - gevecht actief' : `Open slagorde - nog ${turnsUntilMine} beurt(en)`))));
  const isPlayer = role === 'player';
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [turnAlert, setTurnAlert] = useState(null);
  const sessionMenuRef = useRef(null);
  const mobileActionsRef = useRef(null);
  const lastTurnRef = useRef(currentTurnId || null);
  const previousCombatStatusRef = useRef(combatStatus);
  const sessionLabel = sessionId || '#ONBEKEND';
  const compactSessionLabel = sessionLabel.length > 10 ? `${sessionLabel.slice(0, 10)}…` : sessionLabel;
  const roleLabel = role === 'gm' ? 'Game Master' : 'Speler';

  const requestLeaveSession = useCallback(() => {
    setIsSessionMenuOpen(false);
    setIsMobileActionsOpen(false);
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
          label: 'Jij bent nu aan de beurt.',
        });
      } else if (turnsUntilMine === 1) {
        setTurnAlert({
          id: `${Date.now()}-soon`,
          variant: 'soon',
          label: 'Bijna jouw beurt. Maak je actie alvast klaar.',
        });
      } else if (previousCombatStatus !== COMBAT_STATUS.ACTIVE && turnsUntilMine !== null) {
        setTurnAlert({
          id: `${Date.now()}-start`,
          variant: 'start',
          label: 'Gevecht gestart. Let op de slagorde.',
        });
      }
    }

    lastTurnRef.current = currentTurnId;
    previousCombatStatusRef.current = combatStatus;
  }, [role, combatStatus, currentTurnId, currentPlayerId, turnsUntilMine]);

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

  useEffect(() => {
    if (!isSessionMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(target)) {
        setIsSessionMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSessionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSessionMenuOpen]);

  useEffect(() => {
    if (!isMobileActionsOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (mobileActionsRef.current && !mobileActionsRef.current.contains(target)) {
        setIsMobileActionsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileActionsOpen]);

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

      <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 px-3 sm:gap-3 sm:px-4 md:h-16 md:gap-4 md:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 md:gap-3">
          <img src="/references/tomeVaultLogo1.png" alt="TomeVault" className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7 md:h-8 md:w-8" />
          <span className="hidden font-fantasy text-base font-bold tracking-[0.1em] tv-text sm:block md:text-lg">
            TOME<span className="text-[color:var(--tv-accent)]">VAULT</span>
          </span>

          <div className="ml-0.5 flex min-w-0 items-center gap-1.5 md:ml-2">
            <div ref={sessionMenuRef} className="relative min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  setIsSessionMenuOpen((open) => !open);
                }}
                className={`tv-topbar-chip tv-topbar-chip--text min-w-0 max-w-[8.5rem] pr-2 sm:max-w-none sm:pr-2.5 ${isSessionMenuOpen ? 'tv-topbar-chip--active' : ''}`}
                title="Sessiemenu openen"
              >
                <span className="hidden text-[10px] font-semibold tv-muted md:inline">
                  #{Math.max(1, Number(sessionNumber) || 1)}
                </span>
                <span className="hidden tv-muted md:inline">·</span>
                <span className="tv-topbar-session-label truncate text-[11px] font-medium sm:hidden">{compactSessionLabel}</span>
                <span className="hidden max-w-[140px] truncate text-xs font-medium sm:inline md:max-w-[200px]">{sessionLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 tv-muted transition-transform duration-200 ${isSessionMenuOpen ? 'rotate-180 tv-text' : ''}`} />
              </button>

              {isSessionMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.55rem)] z-[80] w-72 overflow-hidden rounded-2xl border border-[color:var(--tv-border)] bg-[color-mix(in_srgb,var(--tv-bg-modal),transparent_3%)] p-2 shadow-[0_26px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                  <div className="mb-2 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] bg-[color-mix(in_srgb,var(--tv-bg-rail),transparent_10%)] px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">Actieve sessie</div>
                    <div className="mt-1 truncate text-sm font-semibold tv-text">{sessionLabel}</div>
                    <div className="mt-1 text-[11px] font-medium text-[color:var(--tv-text-secondary)]">
                      Sessie #{Math.max(1, Number(sessionNumber) || 1)} · {roleLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenShare();
                      setIsSessionMenuOpen(false);
                    }}
                    className="tv-btn tv-button-secondary tv-btn--block-row mt-1 transition-all duration-200 ease-out active:scale-[0.985]"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Deel sessie
                  </button>
                  {role === 'gm' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSessionPanel?.();
                        setIsSessionMenuOpen(false);
                      }}
                      className="tv-btn tv-button-secondary tv-btn--block-row mt-1 transition-all duration-200 ease-out active:scale-[0.985]"
                    >
                      <Settings className="h-3.5 w-3.5" /> Sessiebeheer
                    </button>
                  ) : null}
                  <div className="my-1 tv-divider" />
                  <button
                    type="button"
                    onClick={requestLeaveSession}
                    className="tv-btn tv-btn--block-row mt-1 tv-text-sub transition-all duration-200 ease-out tv-hover-danger active:scale-[0.985] md:hidden"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Verlaat sessie
                  </button>
                </div>
              ) : null}
            </div>

            {runtimeBadge ? <RuntimeBadge runtimeBadge={runtimeBadge} compact className="hidden xl:block" /> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div ref={ambienceShellRef} className="relative">
            <button
              type="button"
              onClick={onToggleAmbiencePanel}
              className={`tv-topbar-chip tv-topbar-chip--icon relative ${ambience?.isOpen ? 'tv-topbar-chip--active' : ''} ${ambience?.isPlaying ? 'tv-topbar-chip--playing' : ''}`}
              title={isPlayer ? 'Open audio-instellingen' : (ambience?.isPlaying ? 'Open actieve sessiesfeer' : 'Open sferenpaneel')}
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
            <PartyIcon className={`h-4 w-4 ${combatStatus !== COMBAT_STATUS.IDLE ? 'text-[color:var(--tv-accent)]' : ''}`} />
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

          <div className="hidden items-center gap-1.5 md:flex">
            <span className="tv-topbar-chip tv-topbar-chip--text tv-topbar-chip--static hidden text-[10px] font-semibold uppercase tracking-[0.1em] xl:inline-flex">
              {role === 'gm' ? 'GM' : 'Speler'}
            </span>

            {role === 'player' ? (
              <button
                type="button"
                onClick={onOpenProfile}
                className="tv-topbar-chip tv-topbar-chip--icon"
                title="Mijn Karakterblad"
              >
                <User className="h-4 w-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={requestLeaveSession}
              className="tv-topbar-chip tv-topbar-chip--icon tv-topbar-chip--danger"
              title="Verlaat Sessie"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div ref={mobileActionsRef} className="relative md:hidden">
            <button
              type="button"
              onClick={() => {
                setIsSessionMenuOpen(false);
                setIsMobileActionsOpen((open) => !open);
              }}
              className={`tv-topbar-chip tv-topbar-chip--icon ${isMobileActionsOpen ? 'tv-topbar-chip--active' : ''}`}
              title="Meer acties"
              aria-pressed={isMobileActionsOpen}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {isMobileActionsOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-52 rounded-2xl border border-[color:var(--tv-border)] bg-[var(--tv-bg-modal)] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    onOpenShare();
                    setIsMobileActionsOpen(false);
                  }}
                  className="tv-btn tv-button-secondary tv-btn--block-row transition-all duration-200 ease-out active:scale-[0.985]"
                >
                  <Share2 className="h-3.5 w-3.5" /> Deel sessie
                </button>
                {role === 'gm' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSessionPanel?.();
                      setIsMobileActionsOpen(false);
                    }}
                    className="tv-btn tv-button-secondary tv-btn--block-row mt-1 transition-all duration-200 ease-out active:scale-[0.985]"
                  >
                    <Settings className="h-3.5 w-3.5" /> Sessiebeheer
                  </button>
                ) : null}
                {role === 'player' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfile?.();
                      setIsMobileActionsOpen(false);
                    }}
                    className="tv-btn tv-button-secondary tv-btn--block-row mt-1 transition-all duration-200 ease-out active:scale-[0.985]"
                  >
                    <User className="h-3.5 w-3.5" /> Mijn karakterblad
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings?.();
                    setIsMobileActionsOpen(false);
                  }}
                  className="tv-btn tv-button-secondary tv-btn--block-row mt-1 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" /> Configuratie
                </button>
                <div className="my-1 tv-divider" />
                <button
                  type="button"
                  onClick={requestLeaveSession}
                  className="tv-btn tv-btn--block-row mt-1 tv-text-sub transition-all duration-200 ease-out tv-hover-danger active:scale-[0.985]"
                >
                  <LogOut className="h-3.5 w-3.5" /> Verlaat sessie
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <LeaveSessionConfirmModal
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={confirmLeaveSession}
        sessionLabel={sessionLabel}
        sessionNumber={sessionNumber}
        roleLabel={roleLabel}
      />
    </header>
  );
}
