import React, { useEffect, useRef, useState } from 'react';
import { Swords, X, Pin, PinOff, Flame, Dice5, UserPlus, Trash2, ChevronRight, Info } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import EditableStat from './EditableStat';

const RIGHT_SIDEBAR_DEFAULT_WIDTH = 288;
const RIGHT_SIDEBAR_MIN_WIDTH = 248;
const RIGHT_SIDEBAR_MAX_WIDTH = 380;
const RIGHT_SIDEBAR_STORAGE_KEY = 'tomevault.battleSidebarWidth';

function clampBattleSidebarWidth(width) {
  return Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, width));
}

function RightSidebar({ party, setParty, role, isOpen, onClose, battleActive, setBattleActive, currentTurnId, setCurrentTurnId, turnRound, setTurnRound, onOpenNpcModal, onOpenDamageModal, onOpenProfile, currentPlayerId, onUpdateStat, isPinned, setIsPinned, onRemoveNpc }) {
  const [showInfo, setShowInfo] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(RIGHT_SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ startX: 0, startWidth: RIGHT_SIDEBAR_DEFAULT_WIDTH });
  
  const sortedParty = [...party].sort((a, b) => (b.init || 0) - (a.init || 0));

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
    if (battleActive && !currentTurnId && sortedParty.length > 0 && sortedParty[0].init !== null) {
      setCurrentTurnId(sortedParty[0].id);
    }
  }, [sortedParty, currentTurnId, setCurrentTurnId, battleActive]);

  const toggleBattle = () => {
    const nextState = !battleActive;
    setBattleActive(nextState);
    if (nextState) {
      setTurnRound(1);
      setParty(party.map(p => ({ ...p, init: null })));
      setCurrentTurnId(null);
    }
  };

  const rollInitiativeAll = () => {
    const updated = party.map(p => ({
      ...p,
      init: Math.floor(Math.random() * 20) + 1 + (p.initMod || 0)
    }));
    setParty(updated);
    
    const newSorted = [...updated].sort((a, b) => (b.init || 0) - (a.init || 0));
    setCurrentTurnId(newSorted[0]?.id || null);
    setTurnRound(1);
  };

  const advanceTurn = () => {
    if (sortedParty.length === 0 || !sortedParty[0].init) return;
    const currentIndex = sortedParty.findIndex(p => p.id === currentTurnId);
    
    if (currentIndex === -1 || currentIndex === sortedParty.length - 1) {
      setCurrentTurnId(sortedParty[0].id);
      setTurnRound(r => r + 1);
    } else {
      setCurrentTurnId(sortedParty[currentIndex + 1].id);
    }
  };

  const updateStat = (id, key, val) => {
    if (onUpdateStat) {
      onUpdateStat(id, key, val);
    } else {
      setParty(party.map(p => p.id === id ? { ...p, [key]: val } : p));
    }
  };

  const removeNpc = async (id) => {
    if (onRemoveNpc) {
      await onRemoveNpc(id);
    } else {
      setParty(party.filter(p => p.id !== id));
    }
    if (currentTurnId === id) advanceTurn();
  };

  const myCharacter = party.find(p => p.id === currentPlayerId);
  const showPlayerRollPanel = role === 'player' && battleActive && myCharacter && myCharacter.init === null;

  const handleResizeStart = (event) => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsDragging(true);
  };

  return (
    <>
      {isOpen && !isPinned && (
        <div 
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside style={{ '--battle-sidebar-width': `${sidebarWidth}px` }} className={`
        fixed top-0 right-0 h-full w-80 bg-stone-900/95 border-l border-stone-800 flex flex-col z-50 transition-transform duration-300 ease-in-out backdrop-blur-md shadow-2xl
        ${(isOpen || isPinned) ? 'translate-x-0' : 'translate-x-full'}
        ${isPinned ? 'md:relative md:translate-x-0 md:z-0 md:bg-stone-900/50 md:shadow-none md:w-[var(--battle-sidebar-width)] md:min-w-[var(--battle-sidebar-width)] md:max-w-[var(--battle-sidebar-width)]' : ''}
        lg:relative lg:translate-x-0 lg:z-0 lg:flex lg:w-[var(--battle-sidebar-width)] lg:min-w-[var(--battle-sidebar-width)] lg:max-w-[var(--battle-sidebar-width)] lg:bg-stone-900/50 lg:shadow-none
      `}>
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-stone-800 via-stone-900 to-stone-800 hidden lg:block" />
        <button
          type="button"
          aria-label="Sleep om slagordebreedte aan te passen"
          onMouseDown={handleResizeStart}
          onDoubleClick={() => setSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH)}
          className="absolute left-0 top-0 hidden h-full w-3 translate-x-1/2 cursor-col-resize lg:block"
        >
          <span className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isDragging ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]' : 'bg-stone-800 hover:bg-stone-700'}`} />
        </button>
        
        <div className="px-3.5 py-3 md:px-4 md:py-3.5 border-b border-stone-800 bg-stone-900/85 flex justify-between items-center mt-14 md:mt-0 min-h-[58px]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-900/40 bg-stone-950/60 text-amber-500 shadow-inner">
              <Swords className="w-4 h-4" />
            </div>
            <button
              type="button"
              onClick={() => setShowInfo((value) => !value)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${showInfo ? 'border-amber-800/50 bg-amber-950/30 text-amber-300' : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:text-amber-300'}`}
              title={showInfo ? 'Verberg slagorde-info' : 'Toon slagorde-info'}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {role === 'gm' && (
              <button 
                onClick={toggleBattle}
                className={`h-9 px-3 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.14em] rounded-lg border transition-colors shadow-sm whitespace-nowrap
                  ${battleActive 
                    ? 'bg-rose-950/40 border-rose-900/50 text-rose-400 hover:bg-rose-900/50' 
                    : 'bg-stone-950/40 border-stone-700/50 text-stone-400 hover:text-stone-200'}
                `}
              >
                {battleActive ? 'Eindig Gevecht' : 'Start Gevecht'}
              </button>
            )}
            {battleActive && (
              <span className="h-9 px-3 inline-flex items-center text-[10px] md:text-[11px] font-bold text-amber-500 bg-amber-950/40 border border-amber-900/50 rounded-lg shadow-inner whitespace-nowrap">
                Ronde {turnRound}
              </span>
            )}
            <button
              onClick={() => setIsPinned?.(!isPinned)}
              className={`hidden md:flex lg:hidden p-1.5 rounded-md transition-colors ${
                isPinned
                  ? 'text-amber-500 bg-amber-950/30 hover:bg-amber-950/50'
                  : 'text-stone-400 hover:text-amber-400 hover:bg-stone-800'
              }`}
              title={isPinned ? 'Losgemaakt — sluit automatisch' : 'Vastzetten — blijft zichtbaar'}
            >
              {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className={`p-1 rounded-md text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors ${isPinned ? 'hidden' : 'lg:hidden'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3.5 py-3.5 md:px-4 md:py-4 space-y-3 no-scrollbar">
          {showInfo && (
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Slagorde info</div>
              <div className="mt-3 space-y-2">
                {[
                  'Start Gevecht zet de ronde terug en wist tijdelijke initiatieven.',
                  'Rol Allen vult de hele volgorde direct in voor de huidige groep.',
                  'NPC voegt snel een tijdelijke bondgenoot of vijand toe aan de lijst.',
                ].map((line) => (
                  <p key={line} className="text-sm leading-6 text-stone-500">{line}</p>
                ))}
              </div>
            </div>
          )}
          
          {showPlayerRollPanel && (
            <div className="p-4 bg-amber-950/30 border border-amber-500/50 rounded-lg mb-4 shadow-[0_0_15px_rgba(245,158,11,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-xl rounded-full" />
              <h4 className="text-amber-500 font-fantasy text-sm font-bold tracking-wider mb-3 relative z-10 flex items-center gap-2">
                <Flame className="w-4 h-4" /> Bepaal je initiatief!
              </h4>
              <div className="flex gap-2 relative z-10">
                <input 
                  type="number" 
                  placeholder="Typ..."
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) updateStat(myCharacter.id, 'init', val);
                  }}
                  className="w-16 bg-stone-950/80 border border-amber-900/50 rounded-md px-2 text-center text-amber-100 font-bold outline-none focus:border-amber-500 hide-arrows"
                />
                <button 
                  onClick={() => updateStat(myCharacter.id, 'init', Math.floor(Math.random() * 20) + 1 + (myCharacter.initMod || 0))}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-widest rounded-md py-2 transition-colors flex items-center justify-center gap-1"
                >
                  <Dice5 className="w-3.5 h-3.5" /> Rol (+{myCharacter.initMod || 0})
                </button>
              </div>
            </div>
          )}

          {sortedParty.length === 0 && !showPlayerRollPanel && (
            <div className="h-full min-h-[220px] rounded-xl border border-dashed border-stone-800 bg-stone-950/30 flex items-center justify-center px-6 text-center shadow-inner mt-1">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-stone-600 font-bold mb-2">Nog leeg</div>
                <p className="text-sm text-stone-500 font-story italic leading-relaxed">Open info voor snelle uitleg over deze kolom.</p>
              </div>
            </div>
          )}

          {sortedParty.map((member) => {
            const isActiveTurn = battleActive && member.id === currentTurnId;
            const isGm = role === 'gm';
            
            return (
              <div 
                key={member.id} 
                onClick={() => onOpenProfile(member)}
                className={`p-2.5 md:p-3 rounded-lg border flex flex-row items-center gap-3 relative shadow-md transition-all group cursor-pointer hover:shadow-lg
                ${member.isNpc 
                  ? 'bg-rose-950/20 border-rose-900/30 hover:border-rose-500/50' 
                  : 'bg-stone-950/40 border-amber-900/20 hover:border-amber-500/50'}
                ${isActiveTurn ? 'ring-1 ring-amber-500 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : ''}
              `}>
                {isActiveTurn && (
                  <div className="absolute -left-[1px] top-0 bottom-0 w-[3px] bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] rounded-l-lg" />
                )}
                
                {isGm && member.isNpc && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeNpc(member.id); }}
                    className="absolute -top-2 -right-2 bg-rose-950 border border-rose-900 text-rose-500 hover:bg-rose-900 hover:text-rose-200 rounded-full p-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20 shadow-md"
                    title="Verwijder NPC"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className={`w-10 h-10 md:w-11 md:h-11 rounded-md shrink-0 flex items-center justify-center font-fantasy font-bold text-lg shadow-inner border overflow-hidden transition-all
                  ${member.isNpc ? 'bg-rose-950/40 border-rose-900/50 text-rose-400' : 'bg-stone-900/80 border-amber-900/30 text-amber-500'}
                  ${isActiveTurn ? 'ring-1 ring-amber-500/50' : ''}
                `}>
                  <img src={resolveDisplayAvatar(member.avatar, member.id)} alt={member.name} className="w-full h-full object-cover opacity-80" />
                </div>

                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className={`font-fantasy tracking-wider text-sm ${member.isNpc ? 'text-rose-400' : 'text-amber-100'} truncate mr-2`}>
                      {member.name}
                    </span>
                    <span className={`shrink-0 px-2 py-0.5 rounded bg-stone-950 border text-xs font-bold font-serif
                      ${member.isNpc ? 'text-rose-500 border-rose-900/50' : 'text-amber-500 border-amber-900/50'}
                      ${isActiveTurn ? 'shadow-inner bg-stone-900' : ''}
                    `}>
                      <EditableStat 
                        value={member.init} 
                        onChange={(v) => updateStat(member.id, 'init', v)} 
                        disabled={!isGm && (battleActive || member.id !== currentPlayerId)} 
                        title={isGm ? "Bewerk Initiatief" : "Initiatief Score"}
                      />
                    </span>
                  </div>
                  
                  <div className="flex gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-sans mt-0.5">
                    <div 
                      className={`flex-1 bg-stone-950/80 rounded px-1.5 py-0.5 flex justify-between items-center border border-stone-800/50 ${isGm ? 'cursor-pointer hover:border-amber-500/50' : ''}`}
                      onClick={(e) => { e.stopPropagation(); if (isGm) onOpenDamageModal(member); }}
                      title={isGm ? "Klik om HP aan te passen" : "Hit Points"}
                    >
                      <span className="text-stone-500 font-bold">HP</span>
                      <span className={member.hp < 10 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>{member.hp}</span>
                    </div>
                    <div 
                      className="flex-1 bg-stone-950/80 rounded px-1.5 py-0.5 flex justify-between items-center border border-stone-800/50"
                      onClick={(e) => e.stopPropagation()} 
                    >
                      <span className="text-stone-500 font-bold">AC</span>
                      <EditableStat 
                        className="text-stone-300 font-bold" 
                        value={member.ac} 
                        onChange={(v) => updateStat(member.id, 'ac', v)} 
                        disabled={!isGm} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {role === 'gm' && (
          <div className="px-3.5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] border-t border-stone-800 bg-stone-900/85 space-y-2.5 md:px-4 md:pt-3.5 md:pb-3">
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={rollInitiativeAll}
                className="h-10 flex items-center justify-center gap-1.5 bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-amber-500 rounded-lg transition-colors text-xs font-fantasy tracking-[0.14em] uppercase border border-stone-700 hover:border-amber-700/50 shadow-inner"
              >
                <Dice5 className="w-3.5 h-3.5" /> Rol Allen
              </button>
              <button 
                onClick={onOpenNpcModal}
                className="h-10 flex items-center justify-center gap-1.5 bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-amber-500 rounded-lg transition-colors text-xs font-fantasy tracking-[0.14em] uppercase border border-stone-700 hover:border-amber-700/50 shadow-inner"
              >
                <UserPlus className="w-3.5 h-3.5" /> NPC
              </button>
            </div>
            
            {battleActive && (
              <button 
                onClick={advanceTurn}
                className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-100 rounded-lg transition-all text-sm font-fantasy tracking-[0.14em] uppercase shadow-[0_0_10px_rgba(217,119,6,0.2)]"
              >
                Volgende Beurt <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default RightSidebar;
