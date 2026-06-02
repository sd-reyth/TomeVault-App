import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Plus, Eye, EyeOff, Hand, User, KeyRound, Search, SlidersHorizontal } from 'lucide-react';
import { getHandoutIcon } from '../lib/handoutUtils';

function HandoutsView({ role, handouts, currentPlayerId, onToggleVisibility, onToggleSecretVisibility, onOpenHandout, onCreateHandout, onClaim }) {
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [allClaimedHidden, setAllClaimedHidden] = useState(true);

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
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 md:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[0.12em] text-stone-100 md:text-3xl">Oude Geschriften</h2>
          <p className="mt-1 text-xs italic text-stone-400 md:mt-2 md:text-sm">Documenten, kaarten en magische voorwerpen ontdekt tijdens de reis.</p>
        </div>
        
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 p-1 sm:w-auto sm:justify-start">
            <button 
              onClick={() => setViewMode('list')} 
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ease-out ${viewMode === 'list' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-sm' : 'border-transparent text-stone-500 hover:border-white/10 hover:bg-white/7 hover:text-stone-300'}`}
              title="Lijst weergave"
            >
              <List className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ease-out ${viewMode === 'grid' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-sm' : 'border-transparent text-stone-500 hover:border-white/10 hover:bg-white/7 hover:text-stone-300'}`}
              title="Blok weergave"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {role === 'gm' && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                onClick={toggleClaimedVisibility}
                disabled={claimedCount === 0}
                className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-[10px] uppercase tracking-[0.14em] shadow-sm transition-all duration-200 ease-out sm:w-auto ${claimedCount > 0 ? 'border-white/10 bg-white/5 text-stone-200 hover:border-amber-500/25 hover:bg-white/7 hover:text-amber-200 active:scale-[0.985]' : 'cursor-not-allowed border-white/10 bg-white/5 text-stone-600'}`}
                title={allClaimedHidden ? 'Maak geclaimde handouts zichtbaar' : 'Verberg geclaimde handouts'}
              >
                {allClaimedHidden ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">Geclaimd ({claimedCount})</span>
              </button>

              <button
                onClick={onCreateHandout}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-700 to-amber-600 px-4 text-sm uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-all duration-200 ease-out hover:from-amber-600 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-700/35 active:scale-[0.985] sm:w-auto"
              >
                <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">Nieuw</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3 md:mb-6 md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Zoek op titel, inhoud, type of secret..."
                className="h-10 w-full rounded-xl border border-white/20 bg-zinc-950/90 pl-9 pr-3 text-sm text-stone-200 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-500/60 focus:bg-zinc-950"
              />
            </label>

            <label className="relative">
              <SlidersHorizontal className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/20 bg-zinc-950/90 pl-9 pr-3 text-sm text-stone-200 outline-none transition-colors focus:border-amber-500/60 focus:bg-zinc-950"
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
              className="h-10 w-full rounded-xl border border-white/20 bg-zinc-950/90 px-3 text-sm text-stone-200 outline-none transition-colors focus:border-amber-500/60 focus:bg-zinc-950"
            >
              <option value="all">Alle types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-xl border border-white/20 bg-zinc-950/90 px-3 text-sm text-stone-200 outline-none transition-colors focus:border-amber-500/60 focus:bg-zinc-950"
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
            className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ease-out flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-stretch'} backdrop-blur-sm ${handout.isRevealed ? 'border-white/10 bg-white/5 shadow-lg hover:border-amber-500/25 hover:shadow-xl hover:shadow-black/25' : 'border-white/10 border-dashed bg-white/[0.03] opacity-70 hover:opacity-100 hover:border-white/20'}`}
          >
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

            <div className={`${viewMode === 'grid' ? 'aspect-[16/9] w-full border-b' : 'w-20 md:w-24 aspect-square border-r'} relative flex shrink-0 items-center justify-center overflow-hidden border-white/10 bg-zinc-950/85`}>
              
              {handout.imageUrl ? (
                <img src={handout.imageUrl} alt={handout.title} className="absolute inset-0 w-full h-full object-cover scale-[1.25] transition-transform duration-500 group-hover:scale-[1.4]" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-zinc-900/70 to-zinc-950" />
              )}
              
              {!handout.imageUrl ? (
                <Icon className={`${viewMode === 'grid' ? 'w-10 h-10 md:w-12 md:h-12' : 'w-6 h-6 md:w-8 md:h-8'} text-amber-700/60 drop-shadow-md relative z-10`} strokeWidth={1.5} />
              ) : null}

              {role === 'gm' && viewMode === 'grid' ? (
                <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1.5 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSecretVisibility(handout.id); }}
                    className={`rounded-lg border bg-zinc-950/92 p-2 shadow-md transition-colors ${isSecretVisibleToPlayers(handout) ? 'border-cyan-500/45 text-cyan-300 hover:border-cyan-400' : 'border-white/10 text-stone-400 hover:border-cyan-500/35 hover:text-cyan-300'}`}
                    title={isSecretVisibleToPlayers(handout) ? 'Verberg Secret voor spelers' : 'Toon Secret aan alle spelers'}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(handout.id); }}
                    className="rounded-lg border border-white/10 bg-zinc-950/92 p-2 text-stone-400 shadow-md transition-colors hover:border-amber-500/35 hover:text-amber-300"
                    title={handout.isRevealed ? 'Verberg in de schaduwen' : 'Onthul aan de party'}
                  >
                    {handout.isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              ) : null}
              
              {role === 'player' && viewMode === 'grid' && isClaimableLoot(handout) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onClaim(handout.id); }}
                  className="absolute right-2 top-2 z-20 rounded-lg border border-amber-500/25 bg-zinc-950/92 p-2 text-amber-300 shadow-md transition-colors hover:border-amber-400 hover:text-amber-200 md:right-3 md:top-3"
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
                    className={`rounded-lg border bg-zinc-950/92 p-1.5 shadow-sm transition-colors md:p-2 ${isSecretVisibleToPlayers(handout) ? 'border-cyan-500/45 text-cyan-300 hover:border-cyan-400' : 'border-white/10 text-stone-400 hover:border-cyan-500/35 hover:text-cyan-300'}`}
                    title={isSecretVisibleToPlayers(handout) ? 'Verberg Secret voor spelers' : 'Toon Secret aan alle spelers'}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(handout.id); }}
                    className="rounded-lg border border-white/10 bg-zinc-950/92 p-1.5 text-stone-400 shadow-sm transition-colors hover:border-amber-500/35 hover:text-amber-300 md:p-2"
                    title={handout.isRevealed ? 'Verberg in de schaduwen' : 'Onthul aan de party'}
                  >
                    {handout.isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              ) : null}

              {role === 'player' && viewMode === 'list' && isClaimableLoot(handout) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onClaim(handout.id); }}
                  className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-lg border border-amber-500/25 bg-zinc-950/92 p-1.5 text-amber-300 shadow-sm transition-colors hover:border-amber-400 hover:text-amber-200 md:right-3 md:p-2"
                  title="Claim dit object"
                >
                  <Hand className="w-4 h-4" />
                </button>
              )}

              <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mb-2 md:mb-3 pr-10' : 'mb-1 pr-12'}`}>
                <span className={`rounded border border-amber-500/25 bg-amber-500/10 font-semibold uppercase tracking-widest text-amber-300 shrink-0 ${viewMode === 'list' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                  {handout.type}
                </span>
                
                {role === 'gm' && !handout.isRevealed && (
                  <span className={`flex items-center gap-1 rounded border border-white/10 bg-zinc-950 font-semibold uppercase tracking-widest text-stone-400 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <EyeOff className="w-2.5 h-2.5 md:w-3 md:h-3" /> Verborgen
                  </span>
                )}
                
                {role === 'gm' && handout.claimedBy && (
                  <span className={`flex items-center gap-1 rounded border border-indigo-500/25 bg-indigo-500/10 font-semibold uppercase tracking-widest text-indigo-300 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <Hand className="w-2.5 h-2.5 md:w-3 md:h-3" /> Geclaimd
                  </span>
                )}

                {role === 'gm' && handout.assignedToUid && (
                  <span className={`flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 font-semibold uppercase tracking-widest text-cyan-300 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <User className="w-2.5 h-2.5 md:w-3 md:h-3" /> Toegewezen
                  </span>
                )}

                {role === 'player' && handout.assignedToUid === currentPlayerId && (
                  <span className={`flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 font-semibold uppercase tracking-widest text-cyan-300 shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
                    <User className="w-2.5 h-2.5 md:w-3 md:h-3" /> Voor jou
                  </span>
                )}

                {viewMode === 'list' && (
                  <h3 className="truncate text-sm font-medium leading-snug tracking-[0.08em] text-stone-100 md:text-base">
                    {handout.title}
                  </h3>
                )}
              </div>
              
              {viewMode === 'grid' && (
                <h3 className="mb-2 text-base font-medium leading-snug tracking-[0.08em] text-stone-100 md:mb-3 md:text-lg">
                  {handout.title}
                </h3>
              )}
              
              <p className={`text-stone-300/85 leading-relaxed ${viewMode === 'grid' ? 'mb-3 line-clamp-3 text-xs md:mb-4 md:text-sm' : 'line-clamp-1 pr-12 text-[11px] md:line-clamp-2 md:text-xs'}`}>
                {handout.content}
              </p>

              {role === 'gm' && handout.type === 'npc' && (
                <div className={`flex flex-wrap gap-1.5 ${viewMode === 'grid' ? 'mb-3' : 'mb-1 pr-12'}`}>
                  <span className="rounded border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                    HP {Number(handout.npcHp ?? 15) || 15}
                  </span>
                  <span className="rounded border border-white/10 bg-zinc-950/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-stone-300">
                    AC {Number(handout.npcAc ?? 12) || 12}
                  </span>
                  <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                    Init {(Number(handout.npcInitMod ?? 2) || 0) >= 0 ? `+${Number(handout.npcInitMod ?? 2) || 0}` : Number(handout.npcInitMod ?? 2) || 0}
                  </span>
                </div>
              )}
              
              {role === 'gm' && handout.secret && (
                <div className={`${viewMode === 'grid' ? 'mt-auto p-2.5 md:p-3' : 'mt-1 mr-20 flex items-center gap-2 px-2 py-1'} overflow-hidden rounded-r border-l-2 border-amber-500/45 bg-amber-500/10 text-amber-100/90 italic shadow-inner`}>
                  <strong className={`block shrink-0 text-[9px] uppercase tracking-widest text-amber-300 ${viewMode === 'grid' ? 'mb-1' : ''}`}>Secret</strong>
                  <span className={`text-[10px] md:text-[11px] ${viewMode === 'list' ? 'truncate' : ''}`}>{handout.secret}</span>
                </div>
              )}

              {role === 'player' && handout.secret && isSecretVisibleToPlayers(handout) ? (
                <div className={`${viewMode === 'grid' ? 'mt-auto p-2.5 md:p-3' : 'mt-1 mr-12 flex items-center gap-2 px-2 py-1'} overflow-hidden rounded-r border-l-2 border-cyan-500/60 bg-cyan-500/10 text-cyan-100/90 shadow-inner`}>
                  <strong className={`block shrink-0 text-[9px] uppercase tracking-widest text-cyan-300 ${viewMode === 'grid' ? 'mb-1' : ''}`}>Secret</strong>
                  <span className={`text-[10px] md:text-[11px] ${viewMode === 'list' ? 'truncate' : ''}`}>{handout.secret}</span>
                </div>
              ) : null}
            </div>
          </div>
        )})}
        {processedHandouts.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-white/20 bg-zinc-950/65 py-16 text-center shadow-inner md:py-24">
            <p className="empty-state-text text-base md:text-lg">Geen handouts gevonden voor je huidige zoek- en filterinstellingen.</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">Pas filters of zoekterm aan om resultaten te tonen</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HandoutsView;
