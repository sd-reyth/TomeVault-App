import React from 'react';
import { Flame, Share2, Pause, Music, Volume2, Swords, User, LogOut, Settings } from 'lucide-react';
import RuntimeBadge from './RuntimeBadge';
import { COMBAT_STATUS, getTurnApproachRatio, getTurnsUntilMember, sortPartyByInitiative } from '../lib/battleUtils';

export default function TopBar({ role, sessionId, sessionNumber, combatStatus, currentTurnId, initiativeOrder, party, currentPlayerId, onLogout, isMusicPlaying, setIsMusicPlaying, onToggleParty, onOpenShare, onOpenProfile, onOpenSettings, runtimeBadge }) {
  const sortedParty = sortPartyByInitiative(Array.isArray(party) ? party : [], Array.isArray(initiativeOrder) ? initiativeOrder : []);
  const turnsUntilMine = getTurnsUntilMember(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const turnApproachRatio = getTurnApproachRatio(sortedParty, initiativeOrder, currentTurnId, currentPlayerId);
  const isMyTurn = combatStatus === COMBAT_STATUS.ACTIVE && currentTurnId === currentPlayerId;
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

  return (
    <header className="h-14 md:h-16 bg-stone-900/80 backdrop-blur border-b border-stone-800 flex items-center justify-between px-3 md:px-5 shrink-0 z-30">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <Flame className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
        <span className="font-bold text-lg md:text-xl tracking-widest text-stone-100 font-fantasy hidden sm:block">
          TOME<span className="text-amber-600">VAULT</span>
        </span>

        <div className="ml-1 md:ml-3 flex items-center gap-1.5 md:gap-2 min-w-0">
          <div className="h-9 max-w-[180px] md:max-w-[250px] px-2.5 md:px-3 rounded-lg border border-stone-700/70 bg-stone-950/70 shadow-inner min-w-0 flex items-center">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex items-center justify-center shrink-0">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500/25" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] relative z-10" />
              </span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-stone-500 shrink-0 hidden md:inline">
                Actieve sessie
              </span>
              <span className="font-fantasy text-[10px] md:text-xs tracking-[0.18em] text-amber-400 truncate">
                {sessionId || '#ONBEKEND'}
              </span>
            </div>
          </div>

          <div
            className="h-9 px-2.5 md:px-3 rounded-lg border border-amber-800/40 bg-amber-950/25 shadow-inner flex items-center"
            title="Campagne sessienummer"
          >
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-amber-600/80 mr-1.5 hidden md:inline">Sessie</span>
            <span className="font-fantasy text-[11px] md:text-xs tracking-[0.14em] text-amber-400">#{Math.max(1, Number(sessionNumber) || 1)}</span>
          </div>

          <button
            onClick={onOpenShare}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-stone-700/70 bg-stone-950/70 text-stone-400 hover:text-amber-400 hover:border-amber-700/50 hover:bg-stone-900 transition-colors shadow-inner shrink-0"
            title="Deel deze sessie"
          >
            <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>

          {runtimeBadge ? <RuntimeBadge runtimeBadge={runtimeBadge} compact className="hidden lg:block" /> : null}
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {role === 'gm' && (
          <div className="h-9 flex items-center gap-1 md:gap-2 bg-stone-950/90 border border-stone-800 rounded-lg px-1.5 md:px-2 shadow-inner mr-0.5 md:mr-1">
            <button 
              onClick={() => setIsMusicPlaying(!isMusicPlaying)}
              className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-md transition-colors ${isMusicPlaying ? 'text-amber-500 bg-amber-950/30' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
              title={isMusicPlaying ? "Stop Taverne Muziek" : "Speel Taverne Muziek"}
            >
              {isMusicPlaying ? <Pause className="w-3 h-3 md:w-4 md:h-4" /> : <Music className="w-3 h-3 md:w-4 md:h-4" />}
            </button>
            <div className="w-12 md:w-24 h-1.5 bg-stone-800 rounded-full overflow-hidden border border-stone-900">
              <div className="w-2/3 h-full bg-amber-600" />
            </div>
            <Volume2 className="w-3 h-3 md:w-4 md:h-4 text-stone-500 ml-0.5 md:ml-1" />
          </div>
        )}

        <div className="flex items-center gap-1 md:gap-2 pl-2 md:pl-2.5 border-l border-stone-800/70">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-fantasy tracking-[0.14em] text-stone-200 uppercase">{role === 'gm' ? 'Dungeon Master' : 'Avonturier'}</div>
            <div className="text-[10px] text-stone-500 uppercase tracking-[0.22em]">Aanwezig</div>
          </div>
          
          {role === 'player' && (
            <button onClick={onOpenProfile} className="h-9 w-9 flex items-center justify-center hover:bg-stone-800 rounded-md text-stone-400 hover:text-amber-400 transition-colors" title="Mijn Karakterblad">
              <User className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="h-9 w-9 flex items-center justify-center md:hidden hover:bg-stone-800 rounded-md text-stone-400 hover:text-amber-400 transition-colors"
            title="Configuratie"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button 
            onClick={onToggleParty} 
            className="relative h-9 w-9 flex items-center justify-center lg:hidden rounded-md text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors"
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

          <button onClick={onLogout} className="h-9 w-9 flex items-center justify-center hover:bg-stone-800 rounded-md text-stone-400 hover:text-rose-400 transition-colors" title="Verlaat Sessie">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
