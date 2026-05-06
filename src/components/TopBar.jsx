import React, { useEffect, useRef, useState } from 'react';
import { Flame, Share2, Pause, Music, Volume2, Swords, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import AmbiencePanel from './AmbiencePanel';
import RuntimeBadge from './RuntimeBadge';
import { COMBAT_STATUS, getTurnApproachRatio, getTurnsUntilMember, sortPartyByInitiative } from '../lib/battleUtils';

export default function TopBar({ role, sessionId, sessionNumber, combatStatus, currentTurnId, initiativeOrder, party, currentPlayerId, onLogout, ambience, onToggleAmbiencePanel, onCloseAmbiencePanel, onToggleAmbiencePlayback, onSelectAmbienceTrack, onSetSessionAmbienceVolume, onSetListenerAmbienceVolume, onUnlockAmbienceAudio, onToggleParty, onOpenShare, onOpenProfile, onOpenSettings, onOpenSessionPanel, onOpenSourcelist, runtimeBadge }) {
  const sortedParty = sortPartyByInitiative(Array.isArray(party) ? party : [], Array.isArray(initiativeOrder) ? initiativeOrder : []);
  const turnsUntilMine = getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const turnApproachRatio = getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const isMyTurn = combatStatus === COMBAT_STATUS.ACTIVE && currentTurnId === currentPlayerId;
  const ambienceShellRef = useRef(null);
  const PartyIcon = combatStatus === COMBAT_STATUS.IDLE
    ? Flame
    : (combatStatus === COMBAT_STATUS.PAUSED ? Pause : Swords);
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
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const sessionMenuRef = useRef(null);

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

  return (
    <header className="relative h-14 md:h-16 bg-stone-900/80 backdrop-blur border-b border-stone-800 flex items-center justify-between px-3 md:px-5 shrink-0 z-30">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <img src="/references/tomeVaultLogo1.png" alt="TomeVault" className="h-7 w-7 md:h-8 md:w-8 object-contain shrink-0" />
        <span className="font-bold text-lg md:text-xl tracking-widest text-stone-100 font-fantasy hidden sm:block">
          TOME<span className="text-amber-600">VAULT</span>
        </span>

        <div className="ml-1 md:ml-3 flex items-center gap-1.5 md:gap-2 min-w-0">
          <div
            className="h-9 px-2.5 md:px-3 rounded-lg border border-amber-800/40 bg-amber-950/25 shadow-inner hidden sm:flex items-center"
            title="Campagne sessienummer"
          >
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-amber-600/80 mr-1.5 hidden md:inline">Sessie</span>
            <span className="font-fantasy text-[11px] md:text-xs tracking-[0.14em] text-amber-400">#{Math.max(1, Number(sessionNumber) || 1)}</span>
          </div>

          <div ref={sessionMenuRef} className="relative h-9">
            <button
              type="button"
              onClick={() => setIsSessionMenuOpen((open) => !open)}
              className={`h-full pl-2.5 pr-2 rounded-lg border flex items-center gap-2 transition-colors ${
                isSessionMenuOpen
                  ? 'border-amber-700/50 bg-stone-900/90 text-amber-300'
                  : 'border-stone-700/60 bg-stone-950/60 text-stone-300 hover:border-stone-600/70 hover:text-stone-200'
              }`}
              title="Sessiemenu openen"
            >
              <span className="relative flex items-center justify-center shrink-0">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500/25" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] relative z-10" />
              </span>
              <span className="font-fantasy text-[10px] md:text-xs tracking-[0.16em] text-amber-400 max-w-[80px] sm:max-w-[140px] md:max-w-[240px] truncate">
                {sessionId || '#ONBEKEND'}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-stone-500 transition-transform duration-150 shrink-0 ${isSessionMenuOpen ? 'rotate-180 text-amber-500' : ''}`} />
            </button>

            {isSessionMenuOpen ? (
              <div className="absolute left-0 top-[calc(100%+0.4rem)] z-50 w-44 rounded-xl border border-stone-700/70 bg-stone-950/98 p-1.5 shadow-2xl backdrop-blur">
                <button
                  type="button"
                  onClick={() => {
                    onOpenShare();
                    setIsSessionMenuOpen(false);
                  }}
                  className="h-8 w-full inline-flex items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
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
                    className="h-8 w-full inline-flex items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-300 transition-colors hover:bg-stone-800/80 hover:text-amber-300"
                  >
                    <Settings className="h-3.5 w-3.5" /> Sessiebeheer
                  </button>
                ) : null}
                <div className="my-1 h-px bg-stone-800/80" />
                <button
                  type="button"
                  onClick={() => { onLogout(); setIsSessionMenuOpen(false); }}
                  className="h-8 w-full inline-flex items-center gap-2 rounded-lg px-2.5 text-xs font-fantasy tracking-[0.08em] text-stone-400 transition-colors hover:bg-rose-950/40 hover:text-rose-300 sm:hidden"
                >
                  <LogOut className="h-3.5 w-3.5" /> Verlaat sessie
                </button>
              </div>
            ) : null}
          </div>

          {runtimeBadge ? <RuntimeBadge runtimeBadge={runtimeBadge} compact className="hidden xl:block" /> : null}
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <div ref={ambienceShellRef} className="relative mr-0.5 md:mr-1">
          <button
            type="button"
            onClick={onToggleAmbiencePanel}
            className={`h-9 flex items-center gap-2 rounded-lg border px-2.5 md:px-3 shadow-inner transition-colors ${ambience?.isPlaying ? 'border-amber-700/50 bg-amber-950/35 text-amber-100' : 'border-stone-800 bg-stone-950/90 text-stone-300 hover:border-stone-700 hover:text-stone-100'}`}
            title={ambience?.isPlaying ? 'Open actieve sessiesfeer' : 'Open sferenpaneel'}
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-black/20">
              <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${ambience?.isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-stone-500'}`} />
              {ambience?.isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
            </span>

            <div className="hidden md:block text-left">
              <div className="text-[9px] uppercase tracking-[0.22em] text-stone-500">{ambienceTitle}</div>
              <div className="mt-0.5 font-fantasy text-[11px] tracking-[0.14em] text-current">{ambienceSubtitle}</div>
            </div>

            <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-stone-800/80">
              <div className="h-1.5 w-12 overflow-hidden rounded-full border border-stone-900 bg-stone-900">
                <div className="h-full rounded-full bg-amber-500" style={{ width: ambienceFillWidth }} />
              </div>
              <Volume2 className="h-3.5 w-3.5 text-stone-500" />
            </div>
          </button>

          <AmbiencePanel
            role={role}
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

        <div className="flex items-center gap-1 md:gap-2 pl-2 md:pl-2.5 border-l border-stone-800/70">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-fantasy tracking-[0.14em] text-stone-200 uppercase">{role === 'gm' ? 'Dungeon Master' : 'Avonturier'}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-[0.22em]">Aanwezig</div>
          </div>
          
          {role === 'player' && (
            <button onClick={onOpenProfile} className="h-9 w-9 flex items-center justify-center hover:bg-stone-800 rounded-lg text-stone-400 hover:text-amber-400 transition-colors" title="Mijn Karakterblad">
              <User className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="h-9 w-9 flex items-center justify-center hidden hover:bg-stone-800 rounded-lg text-stone-400 hover:text-amber-400 transition-colors"
            title="Configuratie"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button 
            onClick={onToggleParty} 
            className="relative h-9 w-9 flex items-center justify-center lg:hidden rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors"
            title={partyButtonTitle}
          >
            <PartyIcon className={`w-5 h-5 ${combatStatus !== COMBAT_STATUS.IDLE ? 'text-amber-400' : ''}`} />
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

          <button onClick={onLogout} className="h-9 w-9 hidden sm:flex items-center justify-center hover:bg-stone-800 rounded-lg text-stone-400 hover:text-rose-400 transition-colors" title="Verlaat Sessie">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
