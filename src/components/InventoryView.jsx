import React from 'react';
import { Plus, Package, Trash2 } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';
import { getHandoutIcon } from '../lib/handoutUtils';
import WalletSection from './WalletSection';

function InventoryView({ role, inventory, wallets, party, currentPlayerId, handouts, onUnclaim, onOpenHandout, onOpenAddItem, onUpdateItemAmount, onDeleteItem, onAdjustWallet }) {
  const playersToShow = role === 'gm' 
    ? party.filter(p => !p.isNpc) 
    : party.filter(p => p.id === currentPlayerId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-end mb-6 md:mb-8 border-b border-stone-800/50 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-100 tracking-wider font-fantasy">De Schatkamer</h2>
          <p className="text-stone-400 text-xs md:text-sm mt-1 md:mt-2 font-story italic">Goudstukken, uitrusting en magische artefacten.</p>
        </div>
        {role === 'gm' && (
          <button onClick={onOpenAddItem} className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-all border border-stone-700 shadow-sm font-fantasy text-xs md:text-sm tracking-wider">
            <Plus className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Nieuw Item</span>
          </button>
        )}
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

        {playersToShow.map(player => {
           const playerItems = inventory.filter(i => i.ownerId === player.id);
           const playerWallet = wallets[player.id] || { platinum: 0, gold: 0, silver: 0, bronze: 0 };
           const playerClaimedHandouts = (handouts || []).filter(h => h.claimedBy === player.id);
           
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
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Uitrusting & Items</h4>
                  {playerItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {playerItems.map(item => (
                        <div key={item.id} className="bg-stone-950/60 border border-stone-800 rounded-lg p-3 flex items-start gap-3 shadow-sm hover:border-stone-700 transition-colors">
                           <div className="w-10 h-10 rounded bg-stone-900 border border-stone-700 flex items-center justify-center shrink-0 shadow-inner">
                             <Package className="w-5 h-5 text-stone-500" />
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start gap-2 mb-1">
                               <span className="font-bold text-stone-200 font-fantasy tracking-wide text-sm truncate">{item.name}</span>
                               <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                                 <span className="text-[10px] font-bold text-amber-600 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded shadow-sm">x{item.amount}</span>
                                 {role === 'gm' && (
                                   <div className="flex items-center gap-1 bg-stone-900/70 border border-stone-800 rounded px-1 py-0.5">
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
                             <p className="text-[11px] md:text-xs text-stone-400 font-story leading-relaxed">{item.desc}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-stone-800 rounded-lg bg-stone-950/30 mb-4">
                      <p className="text-sm text-stone-600 font-story italic">De tas is nog volledig leeg...</p>
                    </div>
                  )}

                  {playerClaimedHandouts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-stone-800/50">
                      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3">Geclaimde Handouts</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {playerClaimedHandouts.map(handout => {
                           const Icon = getHandoutIcon(handout.type);
                           return (
                             <div 
                               key={handout.id} 
                               className="bg-stone-950/60 border border-stone-800 rounded-lg p-3 flex items-start gap-3 shadow-sm hover:border-amber-900/50 transition-colors cursor-pointer group"
                               onClick={() => onOpenHandout(handout)}
                             >
                               <div className="w-10 h-10 rounded bg-stone-900 border border-stone-700 flex items-center justify-center shrink-0 shadow-inner overflow-hidden relative">
                                 {handout.imageUrl ? (
                                   <img src={handout.imageUrl} alt="" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
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
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               )}
                             </div>
                           )
                        })}
                      </div>
                    </div>
                  )}
                </div>
             </div>
           )
        })}
      </div>
    </div>
  )
}

export default InventoryView;
