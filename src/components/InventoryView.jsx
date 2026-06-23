import React, { useMemo, useState } from 'react';
import { Hand, Plus, Package, Search, Trash2 } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { getHandoutIcon } from '../lib/handoutUtils';
import WalletSection from './WalletSection';

function ItemCard({ item, role, currentPlayerId, canManageInventory, onUpdateItemAmount, onDeleteItem }) {
  const description = String(item.desc || '').replace(/\s+/g, ' ').trim();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm transition-all duration-200 ease-out hover:bg-white/7 hover:border-white/20">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950/90 shadow-inner flex items-center justify-center">
        {item.imageUrl && !imageFailed ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover scale-[1.25]" onError={() => setImageFailed(true)} />
        ) : (
          <Package className="w-5 h-5 text-stone-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <span className="pr-2 text-sm font-medium leading-tight tracking-[0.08em] text-stone-100">{item.name}</span>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 shadow-sm">x{item.amount}</span>
            {(role === 'gm' || item.ownerId === currentPlayerId) && (
              <div className="flex items-center gap-1 rounded border border-white/10 bg-zinc-950/80 px-1 py-0.5">
                {role === 'gm' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Math.max(1, Number(item.amount || 1) - 1))}
                      className="h-4 w-4 rounded border border-white/10 text-[10px] leading-none text-stone-400 transition-colors hover:border-rose-400/35 hover:text-rose-300 md:h-5 md:w-5 md:text-xs"
                      title="Verlaag aantal"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Number(item.amount || 0) + 1)}
                      className="h-4 w-4 rounded border border-white/10 text-[10px] leading-none text-stone-400 transition-colors hover:border-amber-400/35 hover:text-amber-300 md:h-5 md:w-5 md:text-xs"
                      title="Verhoog aantal"
                    >
                      +
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteItem?.(item.id)}
                  className="rounded p-0.5 text-stone-500 transition-colors hover:bg-white/5 hover:text-rose-300 md:p-1"
                  title="Verwijder item"
                >
                  <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {description && (
          <p className="max-w-[44ch] pr-1 text-left text-[12px] leading-[1.7] text-stone-300/90 line-clamp-3 md:text-[13px]">
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

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 md:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[0.12em] text-stone-100 md:text-3xl">De Schatkamer</h2>
          <p className="mt-1 text-xs italic text-stone-400 md:mt-2 md:text-sm">Goudstukken, uitrusting en magische artefacten.</p>
        </div>
        <button onClick={onOpenAddItem} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm uppercase tracking-[0.16em] active:scale-[0.985] sm:w-auto tv-button-primary">
          <Plus className="h-4 w-4 shrink-0" /> <span>Nieuw item</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 md:space-y-8 no-scrollbar pb-10">
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
            <div key={player.id} className="relative rounded-2xl border border-white/10 bg-white/5 p-4 shadow-md backdrop-blur-sm md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950 text-amber-300 shadow-inner">
                  <img src={resolveDisplayAvatar(player.avatar, player.id)} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-semibold tracking-[0.12em] text-amber-300 md:text-xl">{player.name}</h3>
              </div>

              <WalletSection
                title="Buidel"
                wallet={playerWallet}
                isGm={false}
                editable={role === 'gm'}
                onAdjust={(coinKey, delta) => onAdjustWallet?.(player.id, coinKey, delta)}
              />

              <div className="mt-6 border-t border-white/10 pt-6 md:mt-8">
                <div className="mb-4 flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        value={searchByPlayer[player.id] || ''}
                        onChange={(e) => setSearchByPlayer((prev) => ({ ...prev, [player.id]: e.target.value }))}
                        placeholder="Zoek item..."
                        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-7 pr-2 text-xs text-stone-200 transition-colors focus:border-amber-500/50 focus:bg-white/7 focus:outline-none sm:w-full"
                      />
                    </div>
                    <select
                      value={filterByPlayer[player.id] || 'all'}
                      onChange={(e) => setFilterByPlayer((prev) => ({ ...prev, [player.id]: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-2 text-xs text-stone-200 transition-colors focus:border-amber-500/50 focus:bg-white/7 focus:outline-none sm:w-auto sm:min-w-[140px]"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {playerItems.length > 0 && filteredItems.length === 0 && (
                  <div className="mb-4 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs italic text-stone-500">
                    Geen items gevonden voor deze filters.
                  </div>
                )}

                <div className="mb-4 rounded-xl border border-white/10 bg-zinc-950/45 p-3">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">Items</span>
                    <span className="text-[10px] text-stone-600">{filteredItems.length} items</span>
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
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/5 py-4 text-center">
                      <p className="text-xs italic text-stone-600">
                        {playerItems.length > 0 ? 'Geen items gevonden voor deze filters.' : 'Nog geen items in deze inventaris.'}
                      </p>
                    </div>
                  )}
                </div>

                {playerClaimedHandouts.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone-500">Geclaimde Handouts</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {playerClaimedHandouts.map((handout) => {
                        const Icon = getHandoutIcon(handout.type);
                        return (
                          <div
                            key={handout.id}
                            className="group flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm transition-all duration-200 ease-out hover:border-amber-500/25 hover:bg-white/7"
                            onClick={() => onOpenHandout(handout)}
                          >
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-inner">
                              {handout.imageUrl ? (
                                <img src={handout.imageUrl} alt="" className="w-full h-full object-cover scale-[1.25]" />
                              ) : (
                                <Icon className="w-5 h-5 text-stone-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <span className="truncate text-sm font-medium tracking-[0.08em] text-stone-100">{handout.title}</span>
                              <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-amber-300">{handout.type}</span>
                            </div>

                            {(role === 'gm' || player.id === currentPlayerId) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onUnclaim(handout.id); }}
                                className="rounded p-1.5 text-stone-500 transition-colors hover:bg-white/5 hover:text-rose-300"
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
