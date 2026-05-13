import React, { useEffect, useRef, useState } from 'react';
import { Flame, Share2, Shield, Music, Pause, Volume2, Swords, User, LogOut, Settings, ChevronDown, Bell, BellRing, Dice5, MoreHorizontal } from 'lucide-react';
import DiceRoller from './DiceRoller';
import AmbiencePanel from './AmbiencePanel';
import RuntimeBadge from './RuntimeBadge';
import { COMBAT_STATUS, getTurnApproachRatio, getTurnsUntilMember, sortPartyByInitiative } from '../lib/battleUtils';

export default function TopBar({ role, sessionId, sessionNumber, theme, combatStatus, currentTurnId, initiativeOrder, party, currentPlayerId, onLogout, ambience, onToggleAmbiencePanel, onCloseAmbiencePanel, onToggleAmbiencePlayback, onSelectAmbienceTrack, onSetSessionAmbienceVolume, onSetListenerAmbienceVolume, onUnlockAmbienceAudio, onToggleParty, onOpenShare, onOpenProfile, onOpenSettings, onOpenSessionPanel, onOpenSourcelist, onDiceRoll, runtimeBadge }) {
  const sortedParty = sortPartyByInitiative(Array.isArray(party) ? party : [], Array.isArray(initiativeOrder) ? initiativeOrder : []);
  const turnsUntilMine = getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const turnApproachRatio = getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const isMyTurn = combatStatus === COMBAT_STATUS.ACTIVE && currentTurnId === currentPlayerId;
  const ambienceShellRef = useRef(null);
  const PartyIcon = combatStatus === COMBAT_STATUS.IDLE
    ? Flame
    : (combatStatus === COMBAT_STATUS.PAUSED ? Shield : Swords);
  const partyIndicatorAngle = `${Math.round(Math.max(0, Math.min(1, turnApproachRatio || 0)) * 360)}deg`;
  const partyButtonTitle = combatStatus === COMBAT_STATUS.IDLE
    ? 'Open slagorde - ruststand'
    : (isMyTurn
      ? 'Open slagorde - jouw beurt'
      : (combatStatus === COMBAT_STATUS.PAUSED
        ? 'Open slagorde - gevecht gepauzeerd'
        : (turnsUntilMine === null ? 'Open slagorde - gevecht actief' : `Open slagorde - nog ${turnsUntilMine} beurt(en)`)));
  const ambienceTitle = ambience?.currentTrack?.scene || 'Sferen';
  const ambienceSubtitle = ambience?.isPlaying ? 'Live aan tafel' : 'Sfeer staat klaar';
  const ambienceFillWidth = `${Math.max(0, Math.min(100, Number(ambience?.sessionVolume) || 0))}%`;
  const isPlayer = role === 'player';
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [turnAlert, setTurnAlert] = useState(null);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const sessionMenuRef = useRef(null);
  const mobileActionsRef = useRef(null);
  const lastTurnRef = useRef(currentTurnId || null);
  const previousCombatStatusRef = useRef(combatStatus);
  const sessionLabel = sessionId || '#ONBEKEND';
  const compactSessionLabel = sessionLabel.length > 10 ? `${sessionLabel.slice(0, 10)}...` : sessionLabel;

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
    <header className="relative shrink-0 z-30 border-b border-stone-800 bg-stone-900/80 backdrop-blur">
      {turnAlert && role === 'player' ? (
        <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.4rem)] z-40 w-[calc(100%-1rem)] max-w-sm -translate-x-1/2">
          <div
            className={`flex items-center justify-center gap-2 rounded-full border px-3 py-2 shadow-lg ${turnAlert.variant === 'now' ? 'border-amber-600/70 bg-amber-900/90 text-amber-100' : (turnAlert.variant === 'start' ? 'border-indigo-600/70 bg-indigo-950/90 text-indigo-100' : 'border-cyan-700/60 bg-cyan-950/85 text-cyan-100')}`}
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

      <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 sm:gap-3 sm:px-3 md:h-16 md:gap-4 md:px-5">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 md:gap-3">
          <img src="/references/tomeVaultLogo1.png" alt="TomeVault" className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7 md:h-8 md:w-8" />
          <span className="hidden font-fantasy text-lg font-bold tracking-widest text-stone-100 sm:block md:text-xl">
            TOME<span className="text-amber-600">VAULT</span>
          </span>

          <div className="ml-0.5 flex min-w-0 items-center gap-1 sm:gap-1.5 md:ml-3 md:gap-2">
            <div
              className="hidden h-9 items-center rounded-lg border border-amber-800/40 bg-amber-950/25 px-2.5 shadow-inner sm:flex md:px-3"
              title="Campagne sessienummer"
            >
              <span className="mr-1.5 hidden text-[9px] uppercase tracking-[0.2em] text-amber-600/80 md:inline md:text-[10px]">Sessie</span>
              <span className="font-fantasy text-[11px] tracking-[0.14em] text-amber-400 md:text-xs">#{Math.max(1, Number(sessionNumber) || 1)}</span>
            </div>

            <div ref={sessionMenuRef} className="relative h-9 min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  setIsSessionMenuOpen((open) => !open);
                }}
                className={`flex h-full min-w-0 max-w-full items-center gap-1.5 rounded-lg border pl-2 pr-1.5 transition-colors sm:gap-2 sm:pl-2.5 sm:pr-2 ${
                  isSessionMenuOpen
                    ? 'border-amber-700/50 bg-stone-900/90 text-amber-300'
                    : 'border-stone-700/60 bg-stone-950/60 text-stone-300 hover:border-stone-600/70 hover:text-stone-200'
                }`}
                title="Sessiemenu openen"
              >
                <span className="relative flex shrink-0 items-center justify-center">
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-amber-500/25" />
                  <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                </span>
                <span className="font-fantasy text-[10px] tracking-[0.16em] text-amber-400 sm:hidden">{compactSessionLabel}</span>
                <span className="hidden max-w-[140px] truncate font-fantasy text-xs tracking-[0.16em] text-amber-400 sm:inline md:max-w-[240px]">{sessionLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-stone-500 transition-transform duration-150 ${isSessionMenuOpen ? 'rotate-180 text-amber-500' : ''}`} />
              </button>

              {isSessionMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.4rem)] z-50 w-44 rounded-xl border border-stone-700/70 bg-stone-950/98 p-1.5 shadow-2xl backdrop-blur">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenShare();
                      setIsSessionMenuOpen(false);
                    }}
                    className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
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
                      className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
                    >
                      <Settings className="h-3.5 w-3.5" /> Sessiebeheer
                    </button>
                  ) : null}
                  <div className="my-1 h-px bg-stone-800/80" />
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setIsSessionMenuOpen(false);
                    }}
                    className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-400 transition-colors hover:bg-rose-950/40 hover:text-rose-300 md:hidden"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Verlaat sessie
                  </button>
                </div>
              ) : null}
            </div>

            {runtimeBadge ? <RuntimeBadge runtimeBadge={runtimeBadge} compact className="hidden xl:block" /> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={() => setShowDiceRoller((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-amber-400"
            title="Dobbelstenen"
          >
            <Dice5 className="h-5 w-5" />
          </button>

          <div ref={ambienceShellRef} className="relative">
            <button
              type="button"
              onClick={onToggleAmbiencePanel}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border px-0 shadow-inner transition-colors md:w-auto md:gap-2 md:px-3 ${ambience?.isPlaying ? 'border-amber-700/55 bg-amber-950/35 text-amber-100' : 'border-stone-700/80 bg-stone-950/90 text-stone-300 hover:border-stone-600 hover:text-stone-100'}`}
              title={isPlayer ? 'Open audio-instellingen' : (ambience?.isPlaying ? 'Open actieve sessiesfeer' : 'Open sferenpaneel')}
            >
              <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-black/20">
                <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${ambience?.isPlaying ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]' : 'bg-stone-500'}`} />
                {ambience?.isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
              </span>

              {isPlayer ? (
                <div className="hidden text-left md:block">
                  <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">Audio</div>
                  <div className="mt-0.5 font-fantasy text-[11px] tracking-[0.14em] text-current">Jouw volume</div>
                </div>
              ) : (
                <div className="hidden text-left md:block">
                  <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">{ambienceTitle}</div>
                  <div className="mt-0.5 font-fantasy text-[11px] tracking-[0.14em] text-current">{ambienceSubtitle}</div>
                </div>
              )}

              {!isPlayer ? (
                <div className="hidden items-center gap-1.5 border-l border-stone-800/80 pl-2 xl:flex">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full border border-stone-900 bg-stone-900">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: ambienceFillWidth }} />
                  </div>
                  <Volume2 className="h-3.5 w-3.5 text-stone-500" />
                </div>
              ) : null}
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
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-amber-400 lg:hidden"
            title={partyButtonTitle}
          >
            <PartyIcon className={`h-5 w-5 ${combatStatus !== COMBAT_STATUS.IDLE ? 'text-amber-400' : ''}`} />
            {role === 'player' && combatStatus !== COMBAT_STATUS.IDLE ? (
              <span className={`pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${isMyTurn ? 'border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'border-stone-700'}`}>
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: isMyTurn
                      ? 'var(--color-amber-500)'
                      : `conic-gradient(var(--color-amber-500) 0deg ${partyIndicatorAngle}, rgba(255,255,255,0.12) ${partyIndicatorAngle} 360deg)`,
                  }}
                />
                <span className="absolute inset-[2px] rounded-full bg-stone-950" />
                <span className={`relative z-10 block h-1.5 w-1.5 rounded-full ${isMyTurn ? 'bg-amber-200 animate-pulse' : 'bg-stone-300'}`} />
              </span>
            ) : null}
          </button>

          <div className="hidden items-center gap-1 border-l border-stone-800/70 pl-2 md:flex md:gap-2 md:pl-2.5">
            <div className="hidden text-right lg:block">
              <div className="text-sm font-fantasy font-bold uppercase tracking-[0.14em] text-stone-100">{role === 'gm' ? 'Game Master' : 'Avonturier'}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">Aanwezig</div>
            </div>

            {role === 'player' ? (
              <button onClick={onOpenProfile} className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-amber-400" title="Mijn Karakterblad">
                <User className="h-5 w-5" />
              </button>
            ) : null}

            <button
              onClick={onLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-rose-400"
              title="Verlaat Sessie"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <div ref={mobileActionsRef} className="relative md:hidden">
            <button
              type="button"
              onClick={() => {
                setIsSessionMenuOpen(false);
                setIsMobileActionsOpen((open) => !open);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${isMobileActionsOpen ? 'border-amber-700/50 bg-stone-900/90 text-amber-300' : 'border-stone-700/60 bg-stone-950/60 text-stone-300 hover:border-stone-600/70 hover:text-stone-200'}`}
              title="Meer acties"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {isMobileActionsOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-48 rounded-xl border border-stone-700/70 bg-stone-950/98 p-1.5 shadow-2xl backdrop-blur">
                <button
                  type="button"
                  onClick={() => {
                    onOpenShare();
                    setIsMobileActionsOpen(false);
                  }}
                  className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
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
                    className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
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
                    className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
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
                  className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
                >
                  <Settings className="h-3.5 w-3.5" /> Configuratie
                </button>
                <div className="my-1 h-px bg-stone-800/80" />
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setIsMobileActionsOpen(false);
                  }}
                  className="inline-flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-400 transition-colors hover:bg-rose-950/40 hover:text-rose-300"
                >
                  <LogOut className="h-3.5 w-3.5" /> Verlaat sessie
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {showDiceRoller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <DiceRoller
              theme={theme}
              onRoll={(payload) => {
                onDiceRoll?.(payload);
                setShowDiceRoller(false);
              }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
