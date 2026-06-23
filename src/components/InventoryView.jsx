import React, { useMemo, useState } from 'react';
import { Hand, Plus, Package, Search, Trash2 } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { getHandoutIcon } from '../lib/handoutUtils';
import WalletSection from './WalletSection';

function ItemCard({ item, role, currentPlayerId, canManageInventory, onUpdateItemAmount, onDeleteItem }) {
  const description = String(item.desc || '').replace(/\s+/g, ' ').trim();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-3 shadow-sm transition-all duration-200 ease-out hover:bg-white/7 hover:border-white/20">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-zinc-950/90 shadow-inner flex items-center justify-center">
        {item.imageUrl && !imageFailed ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover scale-[1.25]" onError={() => setImageFailed(true)} />
        ) : (
          <Package className="w-5 h-5 tv-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <span className="pr-2 text-sm font-medium leading-tight tracking-[0.08em] tv-text">{item.name}</span>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <span className="rounded border border-[var(--tv-accent)]/25 bg-[color-mix(in_srgb,var(--tv-accent),transparent_90%)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tv-accent)] shadow-sm">x{item.amount}</span>
            {(role === 'gm' || item.ownerId === currentPlayerId) && (
              <div className="flex items-center gap-1 rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-zinc-950/80 px-1 py-0.5">
                {role === 'gm' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Math.max(1, Number(item.amount || 1) - 1))}
                      className="h-4 w-4 rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] text-[10px] leading-none tv-text-sub transition-colors hover:border-rose-400/35 hover:text-rose-300 md:h-5 md:w-5 md:text-xs"
                      title="Verlaag aantal"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Number(item.amount || 0) + 1)}
                      className="h-4 w-4 rounded border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] text-[10px] leading-none tv-text-sub transition-colors hover:border-[var(--tv-accent)]/35 hover:text-[var(--tv-accent)] md:h-5 md:w-5 md:text-xs"
                      title="Verhoog aantal"
                    >
                      +
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteItem?.(item.id)}
                  className="rounded p-0.5 tv-muted transition-colors hover:tv-panel-inset hover:text-rose-300 md:p-1"
                  title="Verwijder item"
                >
                  <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {description && (
          <p className="max-w-[44ch] pr-1 text-left text-[12px] leading-[1.7] tv-text/90 line-clamp-3 md:text-[13px]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function InventoryView({ role, inventory, wallets, party, currentPlayerId, handouts, onUnclaim, onOpenHandout, onOpenAddItem, onUpdateItemAmount, onDeleteItem, onAdjustWallet }) {
  const [searchByPlayer, setSearchByPlayer] = useState({});
  const [filterByPlayer, setFilterByPlayer] = useState({});
  const partyWallet = wallets.party || { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totalBronze =
    Number(partyWallet.platinum || 0) * 1000000 +
    Number(partyWallet.gold || 0) * 10000 +
    Number(partyWallet.silver || 0) * 100 +
    Number(partyWallet.bronze || 0);
  const totalGoldEquivalent = totalBronze / 10000;

  const playersToShow = role === 'gm'
    ? party.filter((p) => !p.isNpc)
    : party.filter((p) => p.id === currentPlayerId);

  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'Alles' },
    { value: 'wapen', label: 'Wapen' },
    { value: 'pantser', label: 'Pantser' },
    { value: 'verbruikbaar', label: 'Verbruikbaar' },
    { value: 'magisch', label: 'Magisch' },
    { value: 'grondstof', label: 'Grondstof' },
    { value: 'quest', label: 'Quest' },
    { value: 'overig', label: 'Overig' },
  ], []);

  const formatGoldEquivalent = (value) => {
    if (value === 0) return '0';
    return Number(value.toFixed(2)).toLocaleString('nl-NL', {
      minimumFractionDigits: value < 1 ? 2 : 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="tv-view-shell relative z-10 h-full">
      <div className="tv-view-shell-header flex shrink-0 flex-col gap-4 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:p-4">
          <div>
            <h2 className="font-fantasy text-2xl font-bold tracking-[0.1em] tv-heading-shimmer md:text-3xl">De Schatkamer</h2>
            <p className="mt-1 text-xs italic tv-text-sub md:text-sm">Goudstukken, uitrusting en magische artefacten.</p>
          </div>

          <div className="flex w-full items-stretch sm:w-auto">
            <div className="flex min-w-0 flex-1 flex-col justify-center rounded-l-xl border px-3 py-2.5 tv-chip-surface sm:min-w-[190px]">
              <span className="text-[10px] uppercase tracking-[0.18em] tv-muted">Totale waarde</span>
              <span className="mt-1 truncate text-lg font-semibold tabular-nums tv-text md:text-xl">{formatGoldEquivalent(totalGoldEquivalent)} goud</span>
            </div>
            <button
              onClick={onOpenAddItem}
              title="Nieuw item"
              aria-label="Nieuw item"
              className="inline-flex min-w-13 items-center justify-center rounded-l-none rounded-r-xl border border-l-0 border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] px-0 transition-all duration-200 active:scale-[0.985] tv-button-primary"
            >
              <Plus className="h-6 w-6 shrink-0 md:h-7 md:w-7" />
            </button>
          </div>
        </div>

      <div className="relative z-10 flex-1 overflow-y-auto space-y-6 p-3 pb-10 no-scrollbar md:space-y-8 md:p-4">
        {role === 'gm' && wallets.party && (
          <div className="relative overflow-visible py-2 md:py-3">
            <WalletSection
              title="Gezamenlijke Kas (GM)"
              description="Hier bewaren jullie samen de buit van de groep. Verdeel slim en houd de balans in het oog."
              wallet={wallets.party}
              isGm={true}
              editable={true}
              onAdjust={(coinKey, delta) => onAdjustWallet?.('party', coinKey, delta)}
              onPrimaryAction={onOpenAddItem}
              primaryActionLabel="Nieuw item"
              hideSummaryCard={true}
            />
          </div>
        )}

        {playersToShow.map((player) => {
          const playerItems = inventory.filter((i) => i.ownerId === player.id);
          const playerWallet = wallets[player.id] || { platinum: 0, gold: 0, silver: 0, bronze: 0 };
          const playerClaimedHandouts = (handouts || []).filter((h) => h.claimedBy === player.id);
          const canManageInventory = role === 'gm' || player.id === currentPlayerId;

          const search = String(searchByPlayer[player.id] || '').toLowerCase();
          const filter = String(filterByPlayer[player.id] || 'all').toLowerCase();

          const filteredItems = playerItems.filter((item) => {
            const text = `${item.name || ''} ${item.desc || ''}`.toLowerCase();
            const matchesSearch = !search || text.includes(search);
            const matchesFilter = filter === 'all' || String(item.category || 'overig').toLowerCase() === filter;
            return matchesSearch && matchesFilter;
          });

          return (
            <div key={player.id} className="relative rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-4 shadow-md backdrop-blur-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-zinc-950 text-amber-300 shadow-inner">
                  <img src={resolveDisplayAvatar(player.avatar, player.id)} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-semibold tracking-[0.12em] text-[var(--tv-accent)] md:text-xl">{player.name}</h3>
              </div>

              <WalletSection
                title="Buidel"
                wallet={playerWallet}
                isGm={false}
                editable={role === 'gm'}
                onAdjust={(coinKey, delta) => onAdjustWallet?.(player.id, coinKey, delta)}
              />

              <div className="mt-6 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-6 md:mt-8">
                <div className="mb-4 flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 tv-muted" />
                      <input
                        type="text"
                        value={searchByPlayer[player.id] || ''}
                        onChange={(e) => setSearchByPlayer((prev) => ({ ...prev, [player.id]: e.target.value }))}
                        placeholder="Zoek item..."
                        className="h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset pl-7 pr-2 text-xs tv-text transition-colors focus:border-[var(--tv-accent)]/50 focus:bg-white/7 focus:outline-none sm:w-full"
                      />
                    </div>
                    <select
                      value={filterByPlayer[player.id] || 'all'}
                      onChange={(e) => setFilterByPlayer((prev) => ({ ...prev, [player.id]: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-2 text-xs tv-text transition-colors focus:border-[var(--tv-accent)]/50 focus:bg-white/7 focus:outline-none sm:w-auto sm:min-w-[140px]"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {playerItems.length > 0 && filteredItems.length === 0 && (
                  <div className="mb-4 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2 text-xs italic tv-muted">
                    Geen items gevonden voor deze filters.
                  </div>
                )}

                <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-zinc-950/45 p-3">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest tv-muted">Items</span>
                    <span className="text-[10px] tv-muted">{filteredItems.length} items</span>
                  </div>

                  {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {filteredItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          role={role}
                          currentPlayerId={currentPlayerId}
                          canManageInventory={canManageInventory}
                          onUpdateItemAmount={onUpdateItemAmount}
                          onDeleteItem={onDeleteItem}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset py-4 text-center">
                      <p className="text-xs italic tv-muted">
                        {playerItems.length > 0 ? 'Geen items gevonden voor deze filters.' : 'Nog geen items in deze inventaris.'}
                      </p>
                    </div>
                  )}
                </div>

                {playerClaimedHandouts.length > 0 && (
                  <div className="mt-4 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-4">
                    <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest tv-muted">Geclaimde Handouts</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {playerClaimedHandouts.map((handout) => {
                        const Icon = getHandoutIcon(handout.type);
                        return (
                          <div
                            key={handout.id}
                            className="group flex cursor-pointer items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-3 shadow-sm transition-all duration-200 ease-out hover:border-[var(--tv-accent)]/25 hover:bg-white/7"
                            onClick={() => onOpenHandout(handout)}
                          >
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-zinc-950 shadow-inner">
                              {handout.imageUrl ? (
                                <img src={handout.imageUrl} alt="" className="w-full h-full object-cover scale-[1.25]" />
                              ) : (
                                <Icon className="w-5 h-5 tv-muted" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <span className="truncate text-sm font-medium tracking-[0.08em] tv-text">{handout.title}</span>
                              <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--tv-accent)]">{handout.type}</span>
                            </div>

                            {(role === 'gm' || player.id === currentPlayerId) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onUnclaim(handout.id); }}
                                className="rounded p-1.5 tv-muted transition-colors hover:tv-panel-inset hover:text-rose-300"
                                title="Leg terug"
                              >
                                <Hand className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InventoryView;
