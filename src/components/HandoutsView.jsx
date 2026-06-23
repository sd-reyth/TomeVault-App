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

  const visibleBaseHandouts = useMemo(() => handouts.filter((handout) => {
    if (role === 'gm') {
      if (allClaimedHidden && handout.claimedBy) return false;
      return true;
    }
    if (!handout.isRevealed) return false;
    if (handout.assignedToUid && handout.assignedToUid !== currentPlayerId) return false;
    if (handout.claimedBy) return false;
    return true;
  }), [allClaimedHidden, currentPlayerId, handouts, role]);

  const typeOptions = useMemo(() => {
    const uniqueTypes = Array.from(new Set(handouts.map((handout) => String(handout.type || 'clue').toLowerCase())));
    uniqueTypes.sort((a, b) => a.localeCompare(b, 'nl-NL'));
    return uniqueTypes;
  }, [handouts]);

  const claimedCount = useMemo(() => handouts.filter((handout) => handout.claimedBy).length, [handouts]);

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

    const filtered = visibleBaseHandouts.filter((handout) => {
      if (typeFilter !== 'all' && String(handout.type || '').toLowerCase() !== typeFilter) return false;

      if (query) {
        const haystack = `${handout.title || ''} ${handout.content || ''} ${handout.secret || ''} ${handout.type || ''} ${handout.npcSubtitle || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (statusFilter === 'revealed' && !handout.isRevealed) return false;
      if (statusFilter === 'hidden' && handout.isRevealed) return false;
      if (statusFilter === 'assigned' && !handout.assignedToUid) return false;
      if (statusFilter === 'mine' && handout.assignedToUid !== currentPlayerId) return false;
      if (statusFilter === 'secret' && !(handout.secret && isSecretVisibleToPlayers(handout))) return false;
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
    <div className="tv-view-shell relative z-10 h-full">
      <div className="tv-view-shell-header flex shrink-0 flex-col gap-4 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:p-4">
        <div>
          <h2 className="font-fantasy text-2xl font-bold tracking-[0.1em] tv-heading-shimmer md:text-3xl">Oude Geschriften</h2>
          <p className="tv-panel-copy mt-1 text-xs md:text-sm">Documenten, kaarten en magische voorwerpen ontdekt tijdens de reis.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="tv-view-toolbar flex w-full items-center justify-center rounded-xl p-1 sm:w-auto sm:justify-start">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ease-out ${viewMode === 'list' ? 'border-[var(--tv-accent)]/30 bg-[color-mix(in_srgb,var(--tv-accent),transparent_85%)] text-[var(--tv-accent)] shadow-sm' : 'border-transparent tv-muted hover:border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-hover-surface hover:tv-text'}`}
              title="Lijst weergave"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ease-out ${viewMode === 'grid' ? 'border-[var(--tv-accent)]/30 bg-[color-mix(in_srgb,var(--tv-accent),transparent_85%)] text-[var(--tv-accent)] shadow-sm' : 'border-transparent tv-muted hover:border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-hover-surface hover:tv-text'}`}
              title="Blok weergave"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {role === 'gm' ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                onClick={toggleClaimedVisibility}
                disabled={claimedCount === 0}
                className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-[10px] uppercase tracking-[0.14em] shadow-sm transition-all duration-200 ease-out sm:w-auto ${claimedCount > 0 ? 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[var(--tv-accent)]/25 tv-hover-surface hover:text-[var(--tv-accent)] active:scale-[0.985]' : 'cursor-not-allowed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-muted'}`}
                title={allClaimedHidden ? 'Maak geclaimde handouts zichtbaar' : 'Verberg geclaimde handouts'}
              >
                {allClaimedHidden ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">Geclaimd ({claimedCount})</span>
              </button>

              <button
                onClick={onCreateHandout}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm uppercase tracking-[0.16em] active:scale-[0.985] sm:w-auto tv-button-primary"
              >
                <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">Nieuw</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tv-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Zoek op titel, inhoud, type of secret..."
                className="tv-input-surface h-10 w-full rounded-xl pl-9 pr-3 text-sm outline-none transition-colors"
              />
            </label>

            <label className="relative">
              <SlidersHorizontal className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tv-muted" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="tv-input-surface h-10 w-full rounded-xl pl-9 pr-3 text-sm outline-none transition-colors"
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
              className="tv-input-surface h-10 w-full rounded-xl px-3 text-sm outline-none transition-colors"
            >
              <option value="all">Alle types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="tv-input-surface h-10 w-full rounded-xl px-3 text-sm outline-none transition-colors"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="text-[11px] tv-muted">
            {processedHandouts.length} van {visibleBaseHandouts.length} handouts zichtbaar
          </div>
        </div>

        <div className={viewMode === 'grid' ? 'mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3' : 'mt-4 flex flex-col gap-2 md:gap-3'}>
          {processedHandouts.map((handout) => {
            const Icon = getHandoutIcon(handout.type);

            return (
              <div
                key={handout.id}
                onClick={() => onOpenHandout(handout)}
                className={`group relative flex cursor-pointer overflow-hidden rounded-2xl transition-all duration-200 ease-out ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-stretch'} backdrop-blur-sm ${handout.isRevealed ? 'tv-handout-card shadow-lg' : 'tv-handout-card tv-handout-card--hidden'}`}
              >
                <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

                <div className={`tv-handout-media ${viewMode === 'grid' ? 'aspect-[16/9] w-full border-b' : 'aspect-square w-20 border-r md:w-24'} relative flex shrink-0 items-center justify-center overflow-hidden`}>
                  {handout.imageUrl ? (
                    <img src={handout.imageUrl} alt={handout.title} className="absolute inset-0 h-full w-full object-cover scale-[1.25] transition-transform duration-500 group-hover:scale-[1.4]" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] via-[color-mix(in_srgb,var(--tv-bg-surface),transparent_20%)] to-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_10%)]" />
                  )}

                  {!handout.imageUrl ? (
                    <Icon className={`${viewMode === 'grid' ? 'h-10 w-10 md:h-12 md:w-12' : 'h-6 w-6 md:h-8 md:w-8'} relative z-10 tv-muted drop-shadow-md`} strokeWidth={1.5} />
                  ) : null}

                  {role === 'gm' && viewMode === 'grid' ? (
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 md:right-3 md:top-3">
                      <button
                        onClick={(event) => { event.stopPropagation(); toggleSecretVisibility(handout.id); }}
                        className={`tv-icon-action rounded-lg p-2 shadow-md ${isSecretVisibleToPlayers(handout) ? 'border-cyan-500/45 text-cyan-300 hover:border-cyan-400' : ''}`}
                        title={isSecretVisibleToPlayers(handout) ? 'Verberg Secret voor spelers' : 'Toon Secret aan alle spelers'}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); toggleVisibility(handout.id); }}
                        className="tv-icon-action rounded-lg p-2 shadow-md"
                        title={handout.isRevealed ? 'Verberg in de schaduwen' : 'Onthul aan de party'}
                      >
                        {handout.isRevealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : null}

                  {role === 'player' && viewMode === 'grid' && isClaimableLoot(handout) ? (
                    <button
                      onClick={(event) => { event.stopPropagation(); onClaim(handout.id); }}
                      className="tv-icon-action absolute right-2 top-2 z-20 rounded-lg border border-amber-500/25 p-2 text-amber-300 shadow-md md:right-3 md:top-3"
                      title="Claim dit object"
                    >
                      <Hand className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className={`relative z-10 flex flex-1 flex-col overflow-hidden ${viewMode === 'grid' ? 'p-4 md:p-5' : 'justify-center p-2 md:p-3'}`}>
                  {role === 'gm' && viewMode === 'list' ? (
                    <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1.5 md:right-3">
                      <button
                        onClick={(event) => { event.stopPropagation(); toggleSecretVisibility(handout.id); }}
                        className={`rounded-lg border tv-input-surface p-1.5 shadow-sm transition-colors md:p-2 ${isSecretVisibleToPlayers(handout) ? 'border-cyan-500/45 text-cyan-300 hover:border-cyan-400' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-text-sub hover:border-cyan-500/35 hover:text-cyan-300'}`}
                        title={isSecretVisibleToPlayers(handout) ? 'Verberg Secret voor spelers' : 'Toon Secret aan alle spelers'}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); toggleVisibility(handout.id); }}
                        className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-input-surface p-1.5 tv-text-sub shadow-sm transition-colors hover:border-amber-500/35 hover:text-amber-300 md:p-2"
                        title={handout.isRevealed ? 'Verberg in de schaduwen' : 'Onthul aan de party'}
                      >
                        {handout.isRevealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : null}

                  {role === 'player' && viewMode === 'list' && isClaimableLoot(handout) ? (
                    <button
                      onClick={(event) => { event.stopPropagation(); onClaim(handout.id); }}
                      className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-lg border border-amber-500/25 tv-input-surface p-1.5 text-amber-300 shadow-sm transition-colors hover:border-amber-400 hover:text-amber-200 md:right-3 md:p-2"
                      title="Claim dit object"
                    >
                      <Hand className="h-4 w-4" />
                    </button>
                  ) : null}

                  <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mb-2 pr-10 md:mb-3' : 'mb-1 pr-12'}`}>
                    <span className={`shrink-0 rounded border border-amber-500/25 bg-amber-500/10 font-semibold uppercase tracking-widest text-amber-300 ${viewMode === 'list' ? 'px-2 py-1 text-[9px]' : 'px-1.5 py-0.5 text-[8px]'}`}>
                      {handout.type}
                    </span>

                    {role === 'gm' && !handout.isRevealed ? (
                      <span className={`flex shrink-0 items-center gap-1 rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-input-surface font-semibold uppercase tracking-widest tv-text-sub ${viewMode === 'grid' ? 'px-2 py-1 text-[9px]' : 'px-1.5 py-0.5 text-[8px]'}`}>
                        <EyeOff className="h-2.5 w-2.5 md:h-3 md:w-3" /> Verborgen
                      </span>
                    ) : null}

                    {role === 'gm' && handout.claimedBy ? (
                      <span className={`flex shrink-0 items-center gap-1 rounded border border-indigo-500/25 bg-indigo-500/10 font-semibold uppercase tracking-widest text-indigo-300 ${viewMode === 'grid' ? 'px-2 py-1 text-[9px]' : 'px-1.5 py-0.5 text-[8px]'}`}>
                        <Hand className="h-2.5 w-2.5 md:h-3 md:w-3" /> Geclaimd
                      </span>
                    ) : null}

                    {role === 'gm' && handout.assignedToUid ? (
                      <span className={`flex shrink-0 items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 font-semibold uppercase tracking-widest text-cyan-300 ${viewMode === 'grid' ? 'px-2 py-1 text-[9px]' : 'px-1.5 py-0.5 text-[8px]'}`}>
                        <User className="h-2.5 w-2.5 md:h-3 md:w-3" /> Toegewezen
                      </span>
                    ) : null}

                    {role === 'player' && handout.assignedToUid === currentPlayerId ? (
                      <span className={`flex shrink-0 items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/10 font-semibold uppercase tracking-widest text-cyan-300 ${viewMode === 'grid' ? 'px-2 py-1 text-[9px]' : 'px-1.5 py-0.5 text-[8px]'}`}>
                        <User className="h-2.5 w-2.5 md:h-3 md:w-3" /> Voor jou
                      </span>
                    ) : null}

                    {viewMode === 'list' ? (
                      <h3 className="truncate text-sm font-medium leading-snug tracking-[0.08em] tv-text md:text-base">
                        {handout.title}
                      </h3>
                    ) : null}
                  </div>

                  {viewMode === 'grid' ? (
                    <h3 className="mb-2 text-base font-medium leading-snug tracking-[0.08em] tv-text md:mb-3 md:text-lg">
                      {handout.title}
                    </h3>
                  ) : null}

                  <p className={`tv-muted leading-relaxed ${viewMode === 'grid' ? 'mb-3 line-clamp-3 text-xs md:mb-4 md:text-sm' : 'line-clamp-1 pr-12 text-[11px] md:line-clamp-2 md:text-xs'}`}>
                    {handout.content}
                  </p>

                  {role === 'gm' && handout.type === 'npc' ? (
                    <div className={`flex flex-wrap gap-1.5 ${viewMode === 'grid' ? 'mb-3' : 'mb-1 pr-12'}`}>
                      <span className="rounded border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                        HP {Number(handout.npcHp ?? 15) || 15}
                      </span>
                      <span className="rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-input-surface px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] tv-text">
                        AC {Number(handout.npcAc ?? 12) || 12}
                      </span>
                      <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                        Init {(Number(handout.npcInitMod ?? 2) || 0) >= 0 ? `+${Number(handout.npcInitMod ?? 2) || 0}` : (Number(handout.npcInitMod ?? 2) || 0)}
                      </span>
                    </div>
                  ) : null}

                  {role === 'gm' && handout.secret ? (
                    <div className={`${viewMode === 'grid' ? 'mt-auto p-2.5 md:p-3' : 'mt-1 mr-20 flex items-center gap-2 px-2 py-1'} overflow-hidden rounded-r border-l-2 border-amber-500/45 bg-amber-500/10 text-amber-100/90 italic shadow-inner`}>
                      <strong className={`block shrink-0 text-[9px] uppercase tracking-widest text-amber-300 ${viewMode === 'grid' ? 'mb-1' : ''}`}>Secret</strong>
                      <span className={`text-[10px] md:text-[11px] ${viewMode === 'list' ? 'truncate' : ''}`}>{handout.secret}</span>
                    </div>
                  ) : null}

                  {role === 'player' && handout.secret && isSecretVisibleToPlayers(handout) ? (
                    <div className={`${viewMode === 'grid' ? 'mt-auto p-2.5 md:p-3' : 'mt-1 mr-12 flex items-center gap-2 px-2 py-1'} overflow-hidden rounded-r border-l-2 border-cyan-500/60 bg-cyan-500/10 text-cyan-100/90 shadow-inner`}>
                      <strong className={`block shrink-0 text-[9px] uppercase tracking-widest text-cyan-300 ${viewMode === 'grid' ? 'mb-1' : ''}`}>Secret</strong>
                      <span className={`text-[10px] md:text-[11px] ${viewMode === 'list' ? 'truncate' : ''}`}>{handout.secret}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {processedHandouts.length === 0 ? (
            <div className="tv-empty-state col-span-full md:py-16">
              <p className="tv-empty-state-title">Geen handouts gevonden</p>
              <p className="text-sm">Pas filters of zoekterm aan, of maak een nieuwe handout aan.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default HandoutsView;
