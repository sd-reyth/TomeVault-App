import React, { useMemo, useState } from 'react';
import { ChevronDown, Coins, Hand, Package, Plus, Scroll, Search, Trash2 } from 'lucide-react';
import TreasureIcon from '../ui/TreasureIcon';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { formatWalletTotal, normalizeWalletShape } from '../lib/walletUtils';
import SegmentedControl from '../ui/SegmentedControl';
import TvImage from './TvImage';
import { getHandoutIcon, getHandoutTypeLabel } from '../lib/handoutUtils';
import WalletSection from './WalletSection';
import {
  getItemCategoryChipClass,
  getItemCategoryLabel,
  ITEM_CATEGORY_FILTER_OPTIONS,
  normalizeItemCategory,
} from '../lib/itemCategories';

function TreasureEmptyState({ variant }) {
  const isSearch = variant === 'search';

  return (
    <div className="tv-treasure-empty">
      <div className="tv-treasure-empty__glow" aria-hidden />
      <div className="tv-treasure-empty__icon" aria-hidden>
        {isSearch ? <Search className="h-6 w-6" /> : <TreasureIcon className="h-6 w-6" />}
      </div>
      <p className="tv-treasure-empty__title font-story">
        {isSearch ? 'Geen match' : 'Nog leeg'}
      </p>
    </div>
  );
}

function resolveOwnerLabel(ownerId, party) {
  if (ownerId === 'party') return 'Groep';
  const member = party.find((p) => p.id === ownerId);
  if (member) return member.name;
  return '—';
}

function ItemCard({
  item,
  role,
  currentPlayerId,
  ownerLabel,
  showOwner,
  onUpdateItemAmount,
  onDeleteItem,
}) {
  const description = String(item.desc || '').replace(/\s+/g, ' ').trim();
  const [imageFailed, setImageFailed] = useState(false);
  const category = getItemCategoryLabel(item.category);
  const categoryKey = normalizeItemCategory(item.category);

  return (
    <article className="tv-inventory-item" data-category={categoryKey}>
      <div className="tv-image-frame tv-inventory-item__thumb tv-inventory-item__thumb--item">
        {item.imageUrl && !imageFailed ? (
          <TvImage src={item.imageUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <Package className="h-5 w-5 tv-muted" aria-hidden />
        )}
      </div>

      <div className="tv-inventory-item__body">
        <div className="tv-inventory-item__head">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="truncate font-story text-sm font-medium tv-text">{item.name}</h4>
              <span className="tv-inventory-item__category">{category}</span>
              {showOwner && ownerLabel ? (
                <span className="tv-inventory-item__owner">{ownerLabel}</span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="tv-inventory-item__amount">×{item.amount}</span>
            {(role === 'gm' || item.ownerId === currentPlayerId) && (
              <div className="tv-inventory-item__actions">
                {role === 'gm' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Math.max(1, Number(item.amount || 1) - 1))}
                      className="tv-inventory-item__action"
                      title="Verlaag aantal"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Number(item.amount || 0) + 1)}
                      className="tv-inventory-item__action"
                      title="Verhoog aantal"
                    >
                      +
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteItem?.(item.id)}
                  className="tv-inventory-item__action tv-inventory-item__action--danger"
                  title="Verwijder item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {description ? (
          <p className="tv-inventory-item__desc">{description}</p>
        ) : null}
      </div>
    </article>
  );
}

function InventoryView({
  role,
  inventory,
  wallets,
  party,
  currentPlayerId,
  handouts,
  onUnclaim,
  onOpenHandout,
  onOpenAddItem,
  onUpdateItemAmount,
  onDeleteItem,
  onAdjustWallet,
}) {
  const humanPlayers = useMemo(
    () => party.filter((p) => !p.isNpc),
    [party]
  );

  const [gmScope, setGmScope] = useState('all');
  const [walletOpen, setWalletOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const categoryOptions = ITEM_CATEGORY_FILTER_OPTIONS;

  const scopeCounts = useMemo(() => {
    const counts = {
      all: inventory.length,
      party: inventory.filter((item) => item.ownerId === 'party').length,
    };
    humanPlayers.forEach((player) => {
      counts[player.id] = inventory.filter((item) => item.ownerId === player.id).length;
    });
    return counts;
  }, [humanPlayers, inventory]);

  const gmScopeOptions = useMemo(() => {
    const withCount = (value, label) => {
      const count = scopeCounts[value] || 0;
      return { value, label: count > 0 ? `${label} · ${count}` : label };
    };

    const options = [
      withCount('all', 'Alles'),
      withCount('party', 'Groep'),
    ];
    humanPlayers.forEach((player) => {
      options.push(withCount(player.id, player.name));
    });
    return options;
  }, [humanPlayers, scopeCounts]);

  const scopedItems = useMemo(() => {
    if (role !== 'gm') {
      return inventory.filter((item) => item.ownerId === currentPlayerId);
    }
    if (gmScope === 'all') return inventory;
    if (gmScope === 'party') return inventory.filter((item) => item.ownerId === 'party');
    return inventory.filter((item) => item.ownerId === gmScope);
  }, [currentPlayerId, gmScope, inventory, role]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const category = filter.toLowerCase();

    return scopedItems.filter((item) => {
      const text = `${item.name || ''} ${item.desc || ''}`.toLowerCase();
      const matchesSearch = !query || text.includes(query);
      const matchesFilter = category === 'all' || normalizeItemCategory(item.category) === category;
      return matchesSearch && matchesFilter;
    });
  }, [filter, scopedItems, search]);

  const scopedClaimedHandouts = useMemo(() => {
    if (role !== 'gm') {
      return (handouts || []).filter((h) => h.claimedBy === currentPlayerId);
    }
    if (gmScope === 'all') {
      return (handouts || []).filter((h) => Boolean(h.claimedBy));
    }
    if (gmScope === 'party') return [];
    return (handouts || []).filter((h) => h.claimedBy === gmScope);
  }, [currentPlayerId, gmScope, handouts, role]);

  const activeWallet = useMemo(() => {
    if (role !== 'gm') return normalizeWalletShape(wallets[currentPlayerId]);
    if (gmScope === 'party' || gmScope === 'all') return normalizeWalletShape(wallets.party);
    return normalizeWalletShape(wallets[gmScope]);
  }, [currentPlayerId, gmScope, role, wallets]);

  const headerWallet = role === 'gm'
    ? normalizeWalletShape(wallets.party)
    : normalizeWalletShape(wallets[currentPlayerId]);

  const walletOwnerId = role === 'gm'
    ? (gmScope === 'all' || gmScope === 'party' ? 'party' : gmScope)
    : currentPlayerId;

  const showOwnerOnItems = role === 'gm' && gmScope === 'all';

  const walletTitle = role === 'gm'
    ? (walletOwnerId === 'party' ? 'Groepskas' : resolveOwnerLabel(walletOwnerId, party))
    : 'Buidel';

  const preferredOwnerForAdd = role === 'gm'
    ? (gmScope === 'all' ? 'party' : gmScope)
    : currentPlayerId;

  const resultLabel = filteredItems.length === scopedItems.length
    ? `${scopedItems.length}`
    : `${filteredItems.length}/${scopedItems.length}`;

  return (
    <div className="tv-view-shell tv-inventory-view relative z-10 h-full">
      <div className="tv-view-shell-header flex shrink-0 flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
        <h2 className="flex items-center gap-2 font-fantasy text-xs font-medium uppercase tracking-[0.18em] tv-text md:text-sm">
          <TreasureIcon className="tv-view-title-icon" aria-hidden />
          Schatkamer
        </h2>

        <div className="tv-toolbar w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setWalletOpen((open) => !open)}
            className="tv-toolbar__stat tv-inventory-wallet-pill"
            aria-expanded={walletOpen}
            title="Munten"
          >
            <Coins className="h-3.5 w-3.5 shrink-0 tv-inventory-wallet-pill__icon" aria-hidden />
            <span className="tv-toolbar__stat-value">{formatWalletTotal(headerWallet)}</span>
            <ChevronDown className={`tv-inventory-wallet-pill__chevron ${walletOpen ? 'is-open' : ''}`} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onOpenAddItem?.(preferredOwnerForAdd)}
            title="Nieuw item"
            aria-label="Nieuw item"
            className="tv-toolbar__btn tv-toolbar__btn--square tv-button-primary"
          >
            <Plus className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      {walletOpen ? (
        <div className="tv-inventory-wallet-drawer shrink-0 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_55%)] px-3 py-3 md:px-4">
          {role === 'gm' && walletOwnerId !== 'party' ? (
            <div className="mb-2 flex items-center gap-2">
              <div className="tv-image-frame flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-input-surface shadow-inner">
                <TvImage
                  src={resolveDisplayAvatar(
                    humanPlayers.find((p) => p.id === walletOwnerId)?.avatar,
                    walletOwnerId
                  )}
                  alt=""
                />
              </div>
              <span className="text-xs font-medium text-[var(--tv-accent)]">
                {walletTitle}
              </span>
            </div>
          ) : (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
              {walletTitle}
            </p>
          )}
          <WalletSection
            wallet={activeWallet}
            editable={role === 'gm'}
            onAdjust={(coinKey, delta) => onAdjustWallet?.(walletOwnerId, coinKey, delta)}
          />
        </div>
      ) : null}

      <div className="tv-view-shell-body relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {role === 'gm' ? (
          <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_55%)] px-3 py-2 md:px-4">
            <SegmentedControl
              block
              value={gmScope}
              options={gmScopeOptions}
              onChange={setGmScope}
              aria-label="Schatkamer weergave"
            />
          </div>
        ) : null}

        <div className="tv-inventory-sticky-tools shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_55%)] px-3 py-2.5 backdrop-blur-md md:px-4">
          <div className="flex items-center gap-2">
            <span className="tv-inventory-count" aria-label={`${scopedItems.length} items`}>
              {resultLabel}
            </span>
            <div className="tv-inventory-search-wrap min-w-0 flex-1">
              <Search className="tv-inventory-search__icon" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoeken…"
                className="tv-inventory-search"
              />
            </div>
          </div>

          <div className="tv-inventory-filter-chips-wrap">
          <div className="tv-inventory-filter-chips no-scrollbar" role="group" aria-label="Filter op soort">
            {categoryOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={[
                  'tv-inventory-filter-chip',
                  getItemCategoryChipClass(opt.value),
                  filter === opt.value ? 'is-active' : '',
                ].filter(Boolean).join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-6 no-scrollbar md:p-4">
          {filteredItems.length > 0 ? (
            <div className="tv-inventory-list tv-inventory-list--grid">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  role={role}
                  currentPlayerId={currentPlayerId}
                  showOwner={showOwnerOnItems}
                  ownerLabel={resolveOwnerLabel(item.ownerId, party)}
                  onUpdateItemAmount={onUpdateItemAmount}
                  onDeleteItem={onDeleteItem}
                />
              ))}
            </div>
          ) : (
            <TreasureEmptyState variant={scopedItems.length > 0 ? 'search' : 'empty'} />
          )}

          {scopedClaimedHandouts.length > 0 ? (
            <div className="tv-inventory-claimed-block">
              <div className="tv-inventory-claimed-block__head">
                <Scroll className="h-3.5 w-3.5 shrink-0 tv-accent" aria-hidden />
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] tv-text">
                  Handouts
                </h4>
                <span className="tv-inventory-count tv-inventory-count--inline">
                  {scopedClaimedHandouts.length}
                </span>
              </div>
              <div className="tv-inventory-list">
                {scopedClaimedHandouts.map((handout) => {
                  const Icon = getHandoutIcon(handout.type);
                  const typeLabel = getHandoutTypeLabel(handout.type);
                  const ownerLabel = resolveOwnerLabel(handout.claimedBy, party);
                  return (
                    <div
                      key={handout.id}
                      className="tv-inventory-item tv-inventory-item--handout tv-inventory-item--clickable"
                      onClick={() => onOpenHandout(handout)}
                    >
                      <div className="tv-inventory-item__thumb">
                        {handout.imageUrl ? (
                          <TvImage src={handout.imageUrl} alt="" />
                        ) : (
                          <Icon className="h-5 w-5 tv-muted" />
                        )}
                      </div>
                      <div className="tv-inventory-item__body">
                        <div className="tv-inventory-item__head">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="truncate text-sm font-medium tv-text">{handout.title}</h4>
                              <span className="tv-inventory-item__category">{typeLabel}</span>
                              {showOwnerOnItems ? (
                                <span className="tv-inventory-item__owner">{ownerLabel}</span>
                              ) : null}
                            </div>
                          </div>
                          {(role === 'gm' || handout.claimedBy === currentPlayerId) && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onUnclaim(handout.id); }}
                              className="tv-inventory-item__action tv-inventory-item__action--danger"
                              title="Terugleggen"
                            >
                              <Hand className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default InventoryView;
