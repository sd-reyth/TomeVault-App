import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Plus, Eye, EyeOff, Hand, User, KeyRound, Search, SlidersHorizontal } from 'lucide-react';
import { getHandoutIcon } from '../lib/handoutUtils';

function HandoutsView({ role, handouts, currentPlayerId, onToggleVisibility, onToggleSecretVisibility, onOpenHandout, onCreateHandout, onClaim }) {
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const isClaimableLoot = (handout) => (
    handout.claimable
    && !handout.claimedBy
    && String(handout.type || '').toLowerCase() === 'loot'
  );

  const isSecretVisibleToPlayers = (handout) => handout.secretRevealed === true;

  const toggleVisibility = (id) => {
    if (role !== 'gm') return;
    onToggleVisibility?.(id);
  };

  const toggleSecretVisibility = (id) => {
    if (role !== 'gm') return;
    onToggleSecretVisibility?.(id);
  };

  const visibleBaseHandouts = useMemo(() => handouts.filter((h) => {
    if (role === 'gm') {
      if (allClaimedHidden && h.claimedBy) return false;
      return true;
    }
    if (!h.isRevealed) return false;
    if (h.assignedToUid && h.assignedToUid !== currentPlayerId) return false;
    if (h.claimedBy) return false;
    return true;
  }), [allClaimedHidden, currentPlayerId, handouts, role]);

  const typeOptions = useMemo(() => {
    const uniqueTypes = Array.from(new Set(handouts.map((h) => String(h.type || 'clue').toLowerCase())));
    uniqueTypes.sort((a, b) => a.localeCompare(b, 'nl-NL'));
    return uniqueTypes;
  }, [handouts]);

  const claimedCount = useMemo(() => (
    handouts.filter((h) => h.claimedBy).length
  ), [handouts]);

  // Default to hiding claimed handouts for the GM overview
  const [allClaimedHidden, setAllClaimedHidden] = useState(true);
  useEffect(() => {
    if (claimedCount === 0) {
      setAllClaimedHidden(true);
    }
  }, [claimedCount]);

  const toggleClaimedVisibility = () => {
    if (role !== 'gm' || claimedCount === 0) return;
    setAllClaimedHidden((previous) => !previous);
  };

  const processedHandouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = visibleBaseHandouts.filter((h) => {
      if (typeFilter !== 'all' && String(h.type || '').toLowerCase() !== typeFilter) return false;

      if (query) {
        const haystack = `${h.title || ''} ${h.content || ''} ${h.secret || ''} ${h.type || ''} ${h.npcSubtitle || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (statusFilter === 'revealed' && !h.isRevealed) return false;
      if (statusFilter === 'hidden' && h.isRevealed) return false;
      if (statusFilter === 'assigned' && !h.assignedToUid) return false;
      if (statusFilter === 'mine' && h.assignedToUid !== currentPlayerId) return false;
      if (statusFilter === 'secret' && !(h.secret && isSecretVisibleToPlayers(h))) return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'oldest') {
        return Number(a.updatedAtMs || 0) - Number(b.updatedAtMs || 0);
      }
      if (sortBy === 'title-asc') {
        return String(a.title || '').localeCompare(String(b.title || ''), 'nl-NL');
      }
      if (sortBy === 'title-desc') {
        return String(b.title || '').localeCompare(String(a.title || ''), 'nl-NL');
      }
      if (sortBy === 'type') {
        const typeCompare = String(a.type || '').localeCompare(String(b.type || ''), 'nl-NL');
        if (typeCompare !== 0) return typeCompare;
        return String(a.title || '').localeCompare(String(b.title || ''), 'nl-NL');
      }

      return Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0);
    });
  }, [currentPlayerId, searchQuery, sortBy, statusFilter, typeFilter, visibleBaseHandouts]);

  const statusOptions = role === 'gm'
    ? [
      { value: 'all', label: 'Alles' },
      { value: 'revealed', label: 'Onthuld' },
      { value: 'hidden', label: 'Verborgen' },
      { value: 'assigned', label: 'Toegewezen' },
    ]
    : [
      { value: 'all', label: 'Alles' },
      { value: 'mine', label: 'Voor mij' },
      { value: 'secret', label: 'Met secret' },
    ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 md:mb-8 border-b border-stone-800/50 pb-4 gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-100 tracking-wider font-fantasy">Oude Geschriften</h2>
          <p className="text-stone-400 text-xs md:text-sm mt-1 md:mt-2 font-story italic">Documenten, kaarten en magische voorwerpen ontdekt tijdens de reis.</p>
        </div>
        
        <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-stone-900/80 border border-stone-800 rounded-lg p-1 shrink-0">
            <button 
              onClick={() => setViewMode('list')} 
              className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border transition-colors ${viewMode === 'list' ? 'border-amber-700/50 bg-amber-900/40 text-amber-500 shadow-sm' : 'border-transparent text-stone-500 hover:border-stone-700 hover:bg-stone-800/70 hover:text-stone-300'}`}
              title="Lijst weergave"
            >
              <List className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border transition-colors ${viewMode === 'grid' ? 'border-amber-700/50 bg-amber-900/40 text-amber-500 shadow-sm' : 'border-transparent text-stone-500 hover:border-stone-700 hover:bg-stone-800/70 hover:text-stone-300'}`}
              title="Blok weergave"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {role === 'gm' && (
            <div className="flex flex-1 sm:flex-none items-center gap-2">
              <button
                onClick={toggleClaimedVisibility}
                disabled={claimedCount === 0}
                className={`h-9 inline-flex items-center justify-center gap-2 rounded-lg border px-3 font-fantasy text-[10px] uppercase tracking-[0.14em] shadow-sm transition-colors ${claimedCount > 0 ? 'border-stone-700/80 bg-stone-900 text-stone-200 hover:border-amber-700/50 hover:text-amber-300' : 'cursor-not-allowed border-stone-800 bg-stone-900/60 text-stone-600'}`}
                title={allClaimedHidden ? 'Maak geclaimde handouts zichtbaar' : 'Verberg geclaimde handouts'}
              >
                {allClaimedHidden ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">Geclaimd ({claimedCount})</span>
              </button>

              <button
                onClick={onCreateHandout}
                className="h-9 inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-colors hover:from-amber-600 hover:to-amber-500"
              >
                <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">Nieuw</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 md:mb-6 rounded-xl border border-stone-800/60 bg-stone-900/35 p-3 md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Zoek op titel, inhoud, type of secret..."
                className="h-9 w-full rounded-lg border border-stone-800 bg-stone-950/80 pl-9 pr-3 text-sm text-stone-200 outline-none transition-colors placeholder:text-stone-600 focus:border-amber-600/50"
              />
            </label>

            <label className="relative">
              <SlidersHorizontal className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-9 w-full rounded-lg border border-stone-800 bg-stone-950/80 pl-9 pr-3 text-sm text-stone-200 outline-none transition-colors focus:border-amber-600/50"
              >
                <option value="newest">Nieuwste eerst</option>
                <option value="oldest">Oudste eerst</option>
                <option value="title-asc">Titel A-Z</option>
                <option value="title-desc">Titel Z-A</option>
                <option value="type">Type</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-9 w-full rounded-lg border border-stone-800 bg-stone-950/80 px-3 text-sm text-stone-200 outline-none transition-colors focus:border-amber-600/50"
            >
              <option value="all">Alle types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 w-full rounded-lg border border-stone-800 bg-stone-950/80 px-3 text-sm text-stone-200 outline-none transition-colors focus:border-amber-600/50"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-stone-500">
            {processedHandouts.length} van {visibleBaseHandouts.length} handouts zichtbaar
          </div>
        </div>
      </div>

      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6" 
          : "flex flex-col gap-2 md:gap-3"
      }>
        {processedHandouts.map(handout => {
          const Icon = getHandoutIcon(handout.type);
          return (
          <div 
            key={handout.id} 
            onClick={() => onOpenHandout(handout)}
            className={`group bg-stone-900/80 border ${handout.isRevealed ? 'border-amber-900/30 shadow-lg' : 'border-stone-800 border-dashed opacity-60'} rounded-xl overflow-hidden hover:border-amber-600/50 transition-all flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-stretch'} backdrop-blur-sm relative cursor-pointer hover:shadow-xl hover:shadow-amber-900/10`}
          >
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

            <div className={`${viewMode === 'grid' ? 'aspect-[16/9] w-full border-b' : 'w-20 md:w-24 aspect-square border-r'} bg-stone-950/80 relative overflow-hidden flex items-center justify-center border-stone-800/50 shrink-0`}>
              
              {handout.imageUrl ? (
                <img src={handout.imageUrl} alt={handout.title} className="absolute inset-0 w-full h-full object-cover scale-[1.25] transition-transform duration-500 group-hover:scale-[1.4]" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-stone-900/60 to-stone-950" />
              )}
              
              {!handout.imageUrl ? (
                <Icon className={`${viewMode === 'grid' ? 'w-10 h-10 md:w-12 md:h-12' : 'w-6 h-6 md:w-8 md:h-8'} text-amber-700/60 drop-shadow-md relative z-10`} strokeWidth={1.5} />
              ) : null}

              {role === 'gm' && viewMode === 'grid' ? (
                <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1.5 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSecretVisibility(handout.id); }}
                    className={`p-2 bg-stone-900/90 rounded border transition-colors shadow-md ${isSecretVisibleToPlayers(handout) ? 'text-cyan-300 border-cyan-700/70 hover:border-cyan-500' : 'text-stone-400 border-stone-700 hover:text-cyan-300 hover:border-cyan-700/70'}`}
                    title={isSecretVisibleToPlayers(handout) ? 'Verberg Secret voor spelers' : 'Toon Secret aan alle spelers'}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(handout.id); }}
                    className="p-2 bg-stone-900/90 rounded text-stone-400 hover:text-amber-400 border border-stone-700 hover:border-amber-700 transition-colors shadow-md"
                    title={handout.isRevealed ? 'Verberg in de schaduwen' : 'Onthul aan de party'}
                  >
                    {handout.isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              ) : null}
              
              {role === 'player' && viewMode === 'grid' && isClaimableLoot(handout) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onClaim(handout.id); }}
                  className="absolute top-2 right-2 md:top-3 md:right-3 p-2 bg-stone-900/90 rounded text-amber-500 hover:text-amber-300 border border-amber-900/50 hover:border-amber-500 transition-colors z-20 shadow-md"
                  title="Claim dit object"
                >
                  <Hand className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className={`flex-1 flex flex-col relative z-10 overflow-hidden ${viewMode === 'grid' ? 'p-4 md:p-5' : 'p-2 md:p-3 justify-center'}`}>
              
              {role === 'gm' && viewMode === 'list' ? (
                <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-3 flex items-center gap-1.5 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSecretVisibility(handout.id); }}
                    className={`p-1.5 md:p-2 bg-stone-900/90 rounded border transition-colors shadow-sm ${isSecretVisibleToPlayers(handout) ? 'text-cyan-300 border-cyan-700/70 hover:border-cyan-500' : 'text-stone-400 border-stone-700 hover:text-cyan-300 hover:border-cyan-700/70'}`}
                    title={isSecretVisibleToPlayers(handout) ? 'Verberg Secret voor spelers' : 'Toon Secret aan alle spelers'}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(handout.id); }}
                    className="p-1.5 md:p-2 bg-stone-900/90 rounded text-stone-400 hover:text-amber-400 border border-stone-700 hover:border-amber-700 transition-colors shadow-sm"
                    title={handout.isRevealed ? 'Verberg in de schaduwen' : 'Onthul aan de party'}
                  >
                    {handout.isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              ) : null}

              {role === 'player' && viewMode === 'list' && isClaimableLoot(handout) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onClaim(handout.id); }}
                  className="absolute top-1/2 -translate-y-1/2 right-2 md:right-3 p-1.5 md:p-2 bg-stone-900/90 rounded text-amber-500 hover:text-amber-300 border border-amber-900/50 hover:border-amber-500 transition-colors z-20 shadow-sm"
                  title="Claim dit object"
                >
                  <Hand className="w-4 h-4" />
                </button>
              )}

              <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mb-2 md:mb-3 pr-10' : 'mb-1 pr-12'}`}>
                <span className={`font-bold uppercase tracking-widest text-amber-600 bg-amber-950/50 border border-amber-900/30 rounded shrink-0 ${viewMode === 'list' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                  {handout.type}
                </span>
                
                {role === 'gm' && !handout.isRevealed && (
                  <span className={`font-bold uppercase tracking-widest text-stone-400 bg-stone-950 border border-stone-800 rounded flex items-center gap-1 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <EyeOff className="w-2.5 h-2.5 md:w-3 md:h-3" /> Verborgen
                  </span>
                )}
                
                {role === 'gm' && handout.claimedBy && (
                  <span className={`font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/50 border border-indigo-900/30 rounded flex items-center gap-1 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <Hand className="w-2.5 h-2.5 md:w-3 md:h-3" /> Geclaimd
                  </span>
                )}

                {role === 'gm' && handout.assignedToUid && (
                  <span className={`font-bold uppercase tracking-widest text-cyan-300 bg-cyan-950/30 border border-cyan-900/30 rounded flex items-center gap-1 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <User className="w-2.5 h-2.5 md:w-3 md:h-3" /> Toegewezen
                  </span>
                )}

                {role === 'player' && handout.assignedToUid === currentPlayerId && (
                  <span className={`font-bold uppercase tracking-widest text-cyan-300 bg-cyan-950/30 border border-cyan-900/30 rounded flex items-center gap-1 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <User className="w-2.5 h-2.5 md:w-3 md:h-3" /> Voor jou
                  </span>
                )}

                {viewMode === 'list' && (
                  <h3 className="font-bold text-stone-200 leading-snug font-fantasy tracking-wide text-sm md:text-base truncate">
                    {handout.title}
                  </h3>
                )}
              </div>
              
              {viewMode === 'grid' && (
                <h3 className="font-bold text-stone-200 leading-snug font-fantasy tracking-wide text-base md:text-lg mb-2 md:mb-3">
                  {handout.title}
                </h3>
              )}
              
              <p className={`text-stone-400 font-story leading-relaxed ${viewMode === 'grid' ? 'text-xs md:text-sm mb-3 md:mb-4 line-clamp-3' : 'text-[11px] md:text-xs line-clamp-1 md:line-clamp-2 pr-12'}`}>
                {handout.content}
              </p>

              {role === 'gm' && handout.type === 'npc' && (
                <div className={`flex flex-wrap gap-1.5 ${viewMode === 'grid' ? 'mb-3' : 'mb-1 pr-12'}`}>
                  <span className="rounded border border-rose-900/30 bg-rose-950/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-rose-300">
                    HP {Number(handout.npcHp ?? 15) || 15}
                  </span>
                  <span className="rounded border border-stone-800 bg-stone-950/70 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-300">
                    AC {Number(handout.npcAc ?? 12) || 12}
                  </span>
                  <span className="rounded border border-amber-900/30 bg-amber-950/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300">
                    Init {(Number(handout.npcInitMod ?? 2) || 0) >= 0 ? `+${Number(handout.npcInitMod ?? 2) || 0}` : Number(handout.npcInitMod ?? 2) || 0}
                  </span>
                </div>
              )}
              
              {role === 'gm' && handout.secret && (
                <div className={`${viewMode === 'grid' ? 'mt-auto p-2.5 md:p-3' : 'mt-1 py-1 px-2 flex items-center gap-2 mr-20'} bg-stone-950/80 border-l-2 border-amber-700 rounded-r text-amber-500/90 font-story italic shadow-inner overflow-hidden`}>
                  <strong className={`font-sans text-[9px] uppercase tracking-widest text-amber-700 shrink-0 block ${viewMode === 'grid' ? 'mb-1' : ''}`}>Secret</strong>
                  <span className={`text-[10px] md:text-[11px] ${viewMode === 'list' ? 'truncate' : ''}`}>{handout.secret}</span>
                </div>
              )}

              {role === 'player' && handout.secret && isSecretVisibleToPlayers(handout) ? (
                <div className={`${viewMode === 'grid' ? 'mt-auto p-2.5 md:p-3' : 'mt-1 py-1 px-2 flex items-center gap-2 mr-12'} bg-cyan-950/35 border-l-2 border-cyan-500 rounded-r text-cyan-100/90 font-story shadow-inner overflow-hidden`}>
                  <strong className={`font-sans text-[9px] uppercase tracking-widest text-cyan-300 shrink-0 block ${viewMode === 'grid' ? 'mb-1' : ''}`}>Secret</strong>
                  <span className={`text-[10px] md:text-[11px] ${viewMode === 'list' ? 'truncate' : ''}`}>{handout.secret}</span>
                </div>
              ) : null}
            </div>
          </div>
        )})}
        {processedHandouts.length === 0 && (
          <div className="col-span-full py-16 md:py-24 text-center text-stone-600 border-2 border-dashed border-stone-800 rounded-xl font-story italic text-base md:text-lg bg-stone-900/20">
            Geen handouts gevonden voor je huidige zoek- en filterinstellingen.
          </div>
        )}
      </div>
    </div>
  );
}

export default HandoutsView;
