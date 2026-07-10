import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, LayoutGrid, List, Plus, Eye, EyeOff, Hand, User, KeyRound, Search, SlidersHorizontal, Scroll, Trash2, X } from 'lucide-react';
import { getHandoutIcon, getHandoutSecretToggleMeta, getHandoutTypeLabel, isHandoutAtPlayer, isHandoutDeleted } from '../lib/handoutUtils';
import { getAvatarObjectPosition, normalizeAvatarPosition } from '../lib/placeholders';
import { playUiSound } from '../lib/uiFeedback';
import { useT } from '../i18n/useT';
import TvImage from './TvImage';

function HandoutsView({ role, handouts, currentPlayerId, onToggleVisibility, onToggleSecretVisibility, onOpenHandout, onCreateHandout, onClaim, trashCount = 0, onOpenTrash }) {
  const { t } = useT('handouts');
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showPlayerHandouts, setShowPlayerHandouts] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isClaimableLoot = (handout) => (
    handout.claimable
    && !handout.claimedBy
    && String(handout.type || '').toLowerCase() === 'loot'
  );

  const [secretToggleHint, setSecretToggleHint] = useState(null);

  const isSecretVisibleToPlayers = (handout) => handout.secretRevealed === true;

  const sortLabels = useMemo(() => ({
    newest: t('sort.newest'),
    oldest: t('sort.oldest'),
    'title-asc': t('sort.titleAsc'),
    'title-desc': t('sort.titleDesc'),
    type: t('sort.type'),
  }), [t]);

  const translateSecretMeta = (meta) => {
    if (meta.state === 'missing') {
      return {
        ...meta,
        label: t('secretToggle.meta.noSecret'),
        hint: t('secretToggle.meta.noSecretHint'),
      };
    }
    if (meta.state === 'revealed') {
      return {
        ...meta,
        label: t('secretToggle.meta.partySees'),
        hint: t('secretToggle.meta.partySeesHint'),
      };
    }
    return {
      ...meta,
      label: t('secretToggle.meta.gmOnly'),
      hint: t('secretToggle.meta.gmOnlyHint'),
    };
  };

  const secretToggleErrorMessage = (reason) => {
    const key = reason ? `secretToggle.errors.${reason}` : 'secretToggle.errors.unknown';
    const translated = t(key);
    return translated === key ? t('secretToggle.errors.unknown') : translated;
  };

  const handleSecretToggleClick = async (event, handout) => {
    event.stopPropagation();
    const meta = translateSecretMeta(getHandoutSecretToggleMeta(handout));
    if (!meta.canToggle) {
      setSecretToggleHint({ handoutId: handout.id, message: meta.hint });
      return;
    }

    const result = await onToggleSecretVisibility?.(handout.id);
    if (!result?.ok) {
      const message = secretToggleErrorMessage(result?.reason);
      playUiSound('warning');
      setSecretToggleHint({ handoutId: handout.id, message, reason: result?.reason || 'unknown' });
      return;
    }

    if (result.reason === 'no-session') {
      playUiSound('warning');
      setSecretToggleHint({
        handoutId: handout.id,
        message: secretToggleErrorMessage('no-session'),
        reason: 'no-session',
      });
      return;
    }

    playUiSound('paper');
    setSecretToggleHint(null);
  };

  const handoutGmActionClass = (active) => (
    `tv-handout-card__action${active ? ' tv-handout-card__action--on' : ''}`
  );

  const renderSecretToggleButton = (handout) => {
    const meta = translateSecretMeta(getHandoutSecretToggleMeta(handout));
    if (!meta.canToggle) return null;

    const revealed = meta.state === 'revealed';

    return (
      <button
        type="button"
        onClick={(event) => handleSecretToggleClick(event, handout)}
        className={handoutGmActionClass(revealed)}
        title={meta.hint}
        aria-pressed={revealed}
        aria-label={meta.label}
      >
        {revealed ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
        <span>{revealed ? t('visibility.secretOpen') : t('visibility.secretClosed')}</span>
      </button>
    );
  };

  const truncateSecretPreview = (text, max = 140) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max).trimEnd()}…`;
  };

  const renderHandoutSecretSnippet = (handout, variant = 'gm') => (
    <div className={`tv-handout-card__secret tv-handout-card__secret--footer ${variant === 'gm' ? 'tv-handout-card__secret--gm' : 'tv-handout-card__secret--revealed'}`}>
      <p className={`truncate font-story text-[11px] leading-snug md:text-xs ${variant === 'gm' ? 'italic tv-text-sub' : 'tv-text'}`}>
        {truncateSecretPreview(handout.secret)}
      </p>
    </div>
  );

  const renderGmFooter = (handout) => (
    <div
      className="tv-handout-card__footer"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {handout.secret && isSecretVisibleToPlayers(handout)
        ? renderHandoutSecretSnippet(handout, 'gm')
        : <span className="tv-handout-card__footer-spacer" aria-hidden />}

      <div className="tv-handout-card__footer-actions">
        {renderSecretToggleButton(handout)}
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); toggleVisibility(handout.id); }}
          className={handoutGmActionClass(handout.isRevealed)}
          title={handout.isRevealed ? t('visibility.hideTitle') : t('visibility.revealTitle')}
          aria-pressed={Boolean(handout.isRevealed)}
          aria-label={handout.isRevealed ? t('visibility.visibleAria') : t('visibility.hiddenAria')}
        >
          {handout.isRevealed ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
          <span>{handout.isRevealed ? t('visibility.visible') : t('visibility.hidden')}</span>
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (!secretToggleHint) return undefined;
    const timer = window.setTimeout(() => setSecretToggleHint(null), 5000);
    return () => window.clearTimeout(timer);
  }, [secretToggleHint]);

  const toggleVisibility = (id) => {
    if (role !== 'gm') return;
    onToggleVisibility?.(id);
  };

  const visibleBaseHandouts = useMemo(() => handouts.filter((handout) => {
    if (isHandoutDeleted(handout)) return false;
    if (role === 'gm') {
      const atPlayer = isHandoutAtPlayer(handout);
      // Pool view: only unassigned / unclaimed. Geclaimd view: claimed + assigned.
      return showPlayerHandouts ? atPlayer : !atPlayer;
    }
    if (!handout.isRevealed) return false;
    if (handout.assignedToUid) return false;
    if (handout.claimedBy) return false;
    return true;
  }), [handouts, role, showPlayerHandouts]);

  const typeOptions = useMemo(() => {
    const uniqueTypes = Array.from(new Set(handouts.map((handout) => String(handout.type || 'clue').toLowerCase())));
    uniqueTypes.sort((a, b) => a.localeCompare(b, 'nl-NL'));
    return uniqueTypes;
  }, [handouts]);

  const playerHandoutCount = useMemo(
    () => handouts.filter((handout) => !isHandoutDeleted(handout) && isHandoutAtPlayer(handout)).length,
    [handouts]
  );

  useEffect(() => {
    if (playerHandoutCount === 0 && showPlayerHandouts) {
      setShowPlayerHandouts(false);
    }
  }, [playerHandoutCount, showPlayerHandouts]);

  const togglePlayerHandoutsView = () => {
    if (role !== 'gm' || playerHandoutCount === 0) return;
    setShowPlayerHandouts((previous) => !previous);
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

  const statusOptions = useMemo(() => (role === 'gm'
    ? [
      { value: 'all', label: t('filter.all') },
      { value: 'revealed', label: t('filter.revealed') },
      { value: 'hidden', label: t('filter.hidden') },
      { value: 'assigned', label: t('filter.assigned') },
    ]
    : [
      { value: 'all', label: t('filter.all') },
      { value: 'mine', label: t('filter.mine') },
      { value: 'secret', label: t('filter.secret') },
    ]), [role, t]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sortBy !== 'newest') count += 1;
    if (typeFilter !== 'all') count += 1;
    if (statusFilter !== 'all') count += 1;
    return count;
  }, [sortBy, typeFilter, statusFilter]);

  const filterSummary = useMemo(() => {
    const statusLabel = statusOptions.find((option) => option.value === statusFilter)?.label || t('filter.all');
    const typeLabel = typeFilter === 'all' ? t('view.allTypes') : getHandoutTypeLabel(typeFilter);
    return t('filter.summary', {
      sort: sortLabels[sortBy] || t('sort.newest'),
      type: typeLabel,
      status: statusLabel,
    });
  }, [sortBy, sortLabels, statusFilter, statusOptions, t, typeFilter]);

  const sortOptionValues = ['newest', 'oldest', 'title-asc', 'title-desc', 'type'];

  return (
    <div className="tv-view-shell relative z-10 h-full">
      <div className="tv-view-shell-header flex shrink-0 flex-wrap flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
        <h2 className="flex items-center gap-2 font-fantasy text-xs font-medium uppercase tracking-[0.18em] tv-text md:text-sm">
          <Scroll className="tv-view-title-icon" strokeWidth={1.5} aria-hidden />
          {t('view.title')}
        </h2>

        <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="tv-view-toolbar flex w-full items-center justify-center rounded-xl p-1 sm:w-auto sm:justify-start">
            <button
              onClick={() => setViewMode('list')}
              className={`tv-view-toolbar__btn ${viewMode === 'list' ? 'tv-view-toolbar__btn--active' : ''}`}
              title={t('view.listView')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`tv-view-toolbar__btn ${viewMode === 'grid' ? 'tv-view-toolbar__btn--active' : ''}`}
              title={t('view.gridView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {role === 'gm' ? (
            <div className="flex w-full flex-row items-stretch gap-2 sm:w-auto sm:items-center">
              <button
                onClick={togglePlayerHandoutsView}
                disabled={playerHandoutCount === 0}
                aria-pressed={showPlayerHandouts}
                aria-label={showPlayerHandouts
                  ? t('playerPool.backAria', { count: playerHandoutCount })
                  : t('playerPool.showAria', { count: playerHandoutCount })}
                className={`tv-toolbar__btn shrink-0 px-0 max-sm:w-[var(--tv-control-height)] sm:w-auto sm:gap-1.5 sm:px-3 ${playerHandoutCount > 0 ? 'tv-panel-inset tv-text tv-hover-surface hover:text-[var(--tv-accent)] active:scale-[0.985]' : 'cursor-not-allowed tv-panel-inset tv-muted'} ${showPlayerHandouts ? 'tv-view-toolbar__btn--active' : ''}`}
                title={showPlayerHandouts
                  ? t('view.backToPoolShort')
                  : t('view.showAtPlayers')}
              >
                {showPlayerHandouts ? <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> : <Eye className="h-4 w-4 shrink-0" aria-hidden />}
                <span className="hidden truncate sm:inline">{t('view.claimed', { count: playerHandoutCount })}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playUiSound('paper');
                  onOpenTrash?.();
                }}
                className="tv-toolbar-icon-btn tv-panel-inset tv-text tv-hover-surface relative shrink-0 hover:text-[var(--tv-accent)] active:scale-[0.985]"
                title={trashCount > 0 ? t('view.trashWithCount', { count: trashCount }) : t('view.trash')}
                aria-label={trashCount > 0 ? t('view.trashAria', { count: trashCount }) : t('view.trash')}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {trashCount > 0 ? (
                  <span className="tv-handout-trash-badge absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none">
                    {trashCount > 9 ? '9+' : trashCount}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => {
                  playUiSound('paper');
                  onCreateHandout?.();
                }}
                className="tv-toolbar__btn tv-button-primary min-w-0 flex-1 gap-2 px-4 text-sm uppercase tracking-[0.16em] active:scale-[0.985] sm:flex-none sm:w-auto"
              >
                <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">{t('view.new')}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {secretToggleHint ? (
        <div className="tv-handout-feedback tv-alert-warning mx-3 md:mx-4" role="alert">
          <AlertTriangle className="tv-handout-feedback__icon h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{secretToggleHint.message}</p>
            {secretToggleHint.reason === 'missing' ? (
              <p className="mt-1 text-xs opacity-85">{t('view.missingTip')}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setSecretToggleHint(null)}
            className="tv-toolbar-icon-btn shrink-0"
            aria-label={t('view.dismissAlert')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:hidden">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tv-muted" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('view.searchMobile')}
                className="tv-input-surface tv-chat-compose-input w-full pl-9 pr-3 text-sm outline-none transition-colors"
              />
            </label>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              className={`tv-toolbar-icon-btn relative shrink-0 ${mobileFiltersOpen || activeFilterCount > 0 ? 'tv-toolbar-icon-btn--active' : ''}`}
              title={mobileFiltersOpen ? t('view.hideFilters') : t('view.showFilters')}
              aria-expanded={mobileFiltersOpen}
              aria-label={mobileFiltersOpen ? t('view.hideFilters') : t('view.showFilters')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 ? (
                <span className="tv-handout-filter-badge" aria-hidden>{activeFilterCount}</span>
              ) : null}
            </button>
          </div>

          <div className={`tv-handout-filter-panel md:hidden ${mobileFiltersOpen ? 'is-open' : ''}`}>
            <p className="tv-handout-filter-panel__summary">{filterSummary}</p>
            <label className="tv-handout-filter-field">
              <span className="tv-handout-filter-field__label">{t('view.sort')}</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="tv-input-surface tv-chat-compose-input w-full px-3 text-sm outline-none transition-colors"
              >
                {sortOptionValues.map((value) => (
                  <option key={value} value={value}>{sortLabels[value]}</option>
                ))}
              </select>
            </label>
            <label className="tv-handout-filter-field">
              <span className="tv-handout-filter-field__label">{t('view.type')}</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="tv-input-surface tv-chat-compose-input w-full px-3 text-sm outline-none transition-colors"
              >
                <option value="all">{t('view.allTypes')}</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{getHandoutTypeLabel(type)}</option>
                ))}
              </select>
            </label>
            <label className="tv-handout-filter-field">
              <span className="tv-handout-filter-field__label">{t('view.status')}</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="tv-input-surface tv-chat-compose-input w-full px-3 text-sm outline-none transition-colors"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_160px] md:gap-2">
            <label className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tv-muted" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('view.searchDesktop')}
                className="tv-input-surface tv-chat-compose-input w-full pl-9 pr-3 text-sm outline-none transition-colors"
              />
            </label>

            <label className="relative">
              <SlidersHorizontal className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 tv-muted" aria-hidden />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="tv-input-surface tv-chat-compose-input w-full pl-9 pr-3 text-sm outline-none transition-colors"
              >
                {sortOptionValues.map((value) => (
                  <option key={value} value={value}>{sortLabels[value]}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="hidden md:grid md:grid-cols-2 md:gap-2">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="tv-input-surface tv-chat-compose-input w-full px-3 text-sm outline-none transition-colors"
            >
              <option value="all">{t('view.allTypes')}</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{getHandoutTypeLabel(type)}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="tv-input-surface tv-chat-compose-input w-full px-3 text-sm outline-none transition-colors"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="text-[11px] tv-muted max-md:hidden">
            {t('view.visibleCount', { shown: processedHandouts.length, total: visibleBaseHandouts.length })}
          </div>
        </div>

        <div className={viewMode === 'grid' ? 'mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3' : 'mt-4 flex flex-col gap-2 md:gap-3'}>
          {processedHandouts.map((handout) => {
            const Icon = getHandoutIcon(handout.type);

            return (
              <div
                key={handout.id}
                onClick={() => {
                  playUiSound('book');
                  onOpenHandout(handout);
                }}
                className={`group relative flex cursor-pointer overflow-hidden rounded-2xl transition-all duration-200 ease-out ${viewMode === 'grid' ? 'flex-col tv-handout-card--grid' : 'flex-row items-stretch tv-handout-card--list'} backdrop-blur-sm ${handout.isRevealed ? 'tv-handout-card shadow-lg' : 'tv-handout-card tv-handout-card--hidden'}`}
              >
                <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

                <div className={`tv-handout-media tv-image-frame tv-image-frame--zoom-hover ${viewMode === 'grid' ? 'aspect-[16/9] w-full border-b' : 'aspect-square w-20 border-r md:w-24'} relative flex shrink-0 items-center justify-center overflow-hidden`}>
                  {handout.imageUrl ? (
                    <TvImage
                      src={handout.imageUrl}
                      alt={handout.title}
                      className="absolute inset-0"
                      style={{ objectPosition: getAvatarObjectPosition(normalizeAvatarPosition(handout.imagePosition)) }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] via-[color-mix(in_srgb,var(--tv-bg-surface),transparent_20%)] to-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_10%)]" />
                  )}

                  {!handout.imageUrl ? (
                    <Icon className={`${viewMode === 'grid' ? 'h-10 w-10 md:h-12 md:w-12' : 'h-6 w-6 md:h-8 md:w-8'} relative z-10 tv-muted drop-shadow-md`} strokeWidth={1.5} />
                  ) : null}

                  {role === 'player' && viewMode === 'grid' && isClaimableLoot(handout) ? (
                    <button
                      onClick={(event) => { event.stopPropagation(); onClaim(handout.id); }}
                      className="tv-icon-action absolute right-2 top-2 z-20 rounded-lg border border-[color-mix(in_srgb,var(--tv-accent),transparent_60%)] p-2 tv-accent shadow-md md:right-3 md:top-3"
                      title={t('view.claimItem')}
                    >
                      <Hand className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className={`relative z-10 flex flex-1 flex-col overflow-hidden ${viewMode === 'grid' ? 'p-4 md:p-5' : 'p-2 md:p-3'}`}>
                  <div className={`flex flex-wrap items-center gap-1.5 ${viewMode === 'grid' ? 'mb-2 md:mb-3' : 'mb-1'}`}>
                    <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--type">
                      {getHandoutTypeLabel(handout.type)}
                    </span>

                    {role === 'gm' && handout.secret && isSecretVisibleToPlayers(handout) ? (
                      <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--secret">
                        <KeyRound className="h-2.5 w-2.5" aria-hidden /> {t('tags.partySeesSecret')}
                      </span>
                    ) : null}

                    {role === 'gm' && handout.secret && !isSecretVisibleToPlayers(handout) ? (
                      <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--muted">
                        <KeyRound className="h-2.5 w-2.5" aria-hidden /> {t('tags.gmSecret')}
                      </span>
                    ) : null}

                    {role === 'gm' && !handout.isRevealed ? (
                      <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--muted">
                        <EyeOff className="h-2.5 w-2.5" aria-hidden /> {t('tags.hidden')}
                      </span>
                    ) : null}

                    {role === 'gm' && handout.claimedBy ? (
                      <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--ally">
                        <Hand className="h-2.5 w-2.5" aria-hidden /> {t('tags.claimed')}
                      </span>
                    ) : null}

                    {role === 'gm' && handout.assignedToUid ? (
                      <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--ally">
                        <User className="h-2.5 w-2.5" aria-hidden /> {t('tags.assigned')}
                      </span>
                    ) : null}

                    {role === 'player' && handout.assignedToUid === currentPlayerId ? (
                      <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--ally">
                        <User className="h-2.5 w-2.5" aria-hidden /> {t('tags.forYou')}
                      </span>
                    ) : null}
                  </div>

                  {viewMode === 'list' ? (
                    <h3 className="mb-1 truncate text-sm font-medium leading-snug tracking-[0.08em] tv-text md:text-base">
                      {handout.title}
                    </h3>
                  ) : null}

                  {viewMode === 'grid' ? (
                    <h3 className="mb-2 line-clamp-1 text-base font-medium leading-snug tracking-[0.08em] tv-text md:mb-3 md:text-lg">
                      {handout.title}
                    </h3>
                  ) : null}

                  <p className={`tv-muted leading-relaxed tv-handout-card__content ${viewMode === 'grid' ? 'mb-3 line-clamp-3 text-xs md:mb-4 md:text-sm' : `${handout.type === 'npc' ? 'line-clamp-1' : 'line-clamp-2'} text-[11px] md:text-xs`}`}>
                    {handout.content}
                  </p>

                  {role === 'gm' && handout.type === 'npc' ? (
                    <div className={`flex flex-wrap gap-1.5 ${viewMode === 'grid' ? 'mb-3' : 'mb-1'}`}>
                      <span className="rounded tv-tone-enemy-chip px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]">
                        HP {Number(handout.npcHp ?? 15) || 15}
                      </span>
                      <span className="rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-input-surface px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] tv-text">
                        AC {Number(handout.npcAc ?? 12) || 12}
                      </span>
                      <span className="rounded tv-chip-surface tv-accent px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]">
                        Init {(Number(handout.npcInitMod ?? 2) || 0) >= 0 ? `+${Number(handout.npcInitMod ?? 2) || 0}` : (Number(handout.npcInitMod ?? 2) || 0)}
                      </span>
                    </div>
                  ) : null}

                  {role === 'gm' ? renderGmFooter(handout) : null}

                  {role === 'player' && handout.secret && isSecretVisibleToPlayers(handout) ? (
                    <div className="tv-handout-card__footer tv-handout-card__footer--player">
                      {renderHandoutSecretSnippet(handout, 'player')}
                    </div>
                  ) : null}

                  {role === 'player' && viewMode === 'list' && isClaimableLoot(handout) ? (
                    <div className="mt-2 flex justify-end border-t border-[color-mix(in_srgb,var(--tv-border),transparent_55%)] pt-2">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); onClaim(handout.id); }}
                        className="tv-btn tv-button-primary gap-2 px-3 text-[11px] uppercase tracking-[0.12em]"
                        title={t('view.claimItem')}
                      >
                        <Hand className="h-3.5 w-3.5" /> {t('view.claim')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {processedHandouts.length === 0 ? (
            <div className="tv-empty-state col-span-full md:py-16">
              <p className="tv-empty-state-title">{t('view.emptyTitle')}</p>
              <p className="text-sm">{t('view.emptyHint')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default HandoutsView;
