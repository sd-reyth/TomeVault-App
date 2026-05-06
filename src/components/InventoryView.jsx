import React, { useMemo, useState } from 'react';
import { Hand, Plus, Package, Search, Trash2 } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { getHandoutIcon } from '../lib/handoutUtils';
import WalletSection from './WalletSection';

function ItemCard({ item, role, currentPlayerId, canManageInventory, onUpdateItemAmount, onDeleteItem }) {
  const description = String(item.desc || '').replace(/\s+/g, ' ').trim();

  return (
    <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3 flex items-start gap-3 shadow-sm transition-colors hover:border-stone-700">
      <div className="w-10 h-10 rounded bg-stone-900 border border-stone-700 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover scale-[1.25]" />
        ) : (
          <Package className="w-5 h-5 text-stone-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <span className="font-bold text-stone-200 font-fantasy tracking-wide text-sm leading-tight pr-2">{item.name}</span>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <span className="text-[10px] font-bold text-amber-600 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded shadow-sm">x{item.amount}</span>
            {(role === 'gm' || item.ownerId === currentPlayerId) && (
              <div className="flex items-center gap-1 bg-stone-900/70 border border-stone-800 rounded px-1 py-0.5">
                {role === 'gm' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Math.max(1, Number(item.amount || 1) - 1))}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border border-stone-700 text-stone-400 hover:text-rose-400 hover:border-rose-800 text-[10px] md:text-xs leading-none"
                      title="Verlaag aantal"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateItemAmount?.(item.id, Number(item.amount || 0) + 1)}
                      className="w-4 h-4 md:w-5 md:h-5 rounded border border-stone-700 text-stone-400 hover:text-emerald-400 hover:border-emerald-800 text-[10px] md:text-xs leading-none"
                      title="Verhoog aantal"
                    >
                      +
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteItem?.(item.id)}
                  className="p-0.5 md:p-1 text-stone-500 hover:text-rose-500 hover:bg-stone-900 rounded transition-colors"
                  title="Verwijder item"
                >
                  <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {description && (
          <p className="max-w-[44ch] text-[12px] md:text-[13px] text-stone-300/85 font-story leading-[1.75] text-left line-clamp-3 pr-1">
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
      <div className="flex justify-between items-end mb-6 md:mb-8 border-b border-stone-800/50 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-100 tracking-wider font-fantasy">De Schatkamer</h2>
          <p className="text-stone-400 text-xs md:text-sm mt-1 md:mt-2 font-story italic">Goudstukken, uitrusting en magische artefacten.</p>
        </div>
        <button onClick={onOpenAddItem} className="h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-colors hover:from-amber-600 hover:to-amber-500">
          <Plus className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Nieuw</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 md:space-y-8 no-scrollbar pb-10">
        {role === 'gm' && wallets.party && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 md:p-6 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-2xl rounded-full" />
            <WalletSection
              title="Gezamenlijke Kas (GM)"
              wallet={wallets.party}
              isGm={true}
              editable={true}
              onAdjust={(coinKey, delta) => onAdjustWallet?.('party', coinKey, delta)}
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
            <div key={player.id} className="bg-stone-900/40 border border-stone-800/60 rounded-xl p-4 md:p-6 backdrop-blur-sm relative shadow-md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded bg-stone-950 border border-amber-900/30 flex items-center justify-center text-amber-500 font-fantasy font-bold shadow-inner overflow-hidden">
                  <img src={resolveDisplayAvatar(player.avatar, player.id)} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-amber-500 font-fantasy tracking-wider">{player.name}</h3>
              </div>

              <WalletSection
                title="Buidel"
                wallet={playerWallet}
                isGm={false}
                editable={role === 'gm'}
                onAdjust={(coinKey, delta) => onAdjustWallet?.(player.id, coinKey, delta)}
              />

              <div className="mt-6 md:mt-8 pt-6 border-t border-stone-800/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-600" />
                      <input
                        type="text"
                        value={searchByPlayer[player.id] || ''}
                        onChange={(e) => setSearchByPlayer((prev) => ({ ...prev, [player.id]: e.target.value }))}
                        placeholder="Zoek item..."
                        className="h-9 w-40 bg-stone-950/70 border border-stone-800 rounded-lg pl-7 pr-2 text-xs text-stone-300 focus:outline-none focus:border-amber-600/50"
                      />
                    </div>
                    <select
                      value={filterByPlayer[player.id] || 'all'}
                      onChange={(e) => setFilterByPlayer((prev) => ({ ...prev, [player.id]: e.target.value }))}
                      className="h-9 bg-stone-950/70 border border-stone-800 rounded-lg px-2 text-xs text-stone-300 focus:outline-none focus:border-amber-600/50"
                    >
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {playerItems.length > 0 && filteredItems.length === 0 && (
                  <div className="mb-4 rounded-lg border border-dashed border-stone-800 bg-stone-950/30 px-3 py-2 text-xs text-stone-500 font-story italic">
                    Geen items gevonden voor deze filters.
                  </div>
                )}

                <div className="mb-4 rounded-lg border border-stone-800/70 bg-stone-950/25 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Items</span>
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
                    <div className="text-center py-4 border border-dashed border-stone-800 bg-stone-950/30 rounded-lg">
                      <p className="text-xs font-story italic text-stone-600">
                        {playerItems.length > 0 ? 'Geen items gevonden voor deze filters.' : 'Nog geen items in deze inventaris.'}
                      </p>
                    </div>
                  )}
                </div>

                {playerClaimedHandouts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-800/50">
                    <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3">Geclaimde Handouts</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {playerClaimedHandouts.map((handout) => {
                        const Icon = getHandoutIcon(handout.type);
                        return (
                          <div
                            key={handout.id}
                            className="bg-stone-950/60 border border-stone-800 rounded-lg p-3 flex items-start gap-3 shadow-sm hover:border-amber-900/50 transition-colors cursor-pointer group"
                            onClick={() => onOpenHandout(handout)}
                          >
                            <div className="w-10 h-10 rounded bg-stone-900 border border-stone-700 flex items-center justify-center shrink-0 shadow-inner overflow-hidden relative">
                              {handout.imageUrl ? (
                                <img src={handout.imageUrl} alt="" className="w-full h-full object-cover scale-[1.25]" />
                              ) : (
                                <Icon className="w-5 h-5 text-stone-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <span className="font-bold text-stone-200 font-fantasy tracking-wide text-sm truncate">{handout.title}</span>
                              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">{handout.type}</span>
                            </div>

                            {(role === 'gm' || player.id === currentPlayerId) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onUnclaim(handout.id); }}
                                className="p-1.5 text-stone-500 hover:text-rose-500 hover:bg-stone-900 rounded transition-colors"
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
