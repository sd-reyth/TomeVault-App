import React, { useState } from 'react';
import { LayoutGrid, List, Plus, Eye, EyeOff, Hand } from 'lucide-react';
import { getHandoutIcon } from '../lib/handoutUtils';

function HandoutsView({ role, handouts, onToggleVisibility, onOpenHandout, onCreateHandout, onClaim }) {
  const [viewMode, setViewMode] = useState('grid');

  const toggleVisibility = (id) => {
    if (role !== 'gm') return;
    onToggleVisibility?.(id);
  };

  const visibleHandouts = handouts.filter(h => {
    if (role === 'gm') return true; 
    if (!h.isRevealed) return false; 
    if (h.claimedBy) return false; 
    return true;
  });

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
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-amber-900/40 text-amber-500 shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
              title="Blok weergave"
            >
              <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-amber-900/40 text-amber-500 shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
              title="Lijst weergave"
            >
              <List className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {role === 'gm' && (
            <button 
              onClick={onCreateHandout}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-100 px-4 py-2.5 sm:py-2 rounded-lg transition-all shadow-[0_0_10px_rgba(217,119,6,0.2)] font-fantasy text-sm tracking-wider"
            >
              <Plus className="w-4 h-4 shrink-0" /> <span className="truncate">Vervaardig</span>
            </button>
          )}
        </div>
      </div>

      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6" 
          : "flex flex-col gap-2 md:gap-3"
      }>
        {visibleHandouts.map(handout => {
          const Icon = getHandoutIcon(handout.type);
          return (
          <div 
            key={handout.id} 
            onClick={() => onOpenHandout(handout)}
            className={`group bg-stone-900/80 border ${handout.isRevealed ? 'border-amber-900/30 shadow-lg' : 'border-stone-800 border-dashed opacity-60'} rounded-xl overflow-hidden hover:border-amber-600/50 transition-all flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-stretch'} backdrop-blur-sm relative cursor-pointer hover:shadow-xl hover:shadow-amber-900/10`}
          >
            <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

            <div className={`${viewMode === 'grid' ? 'h-28 md:h-32 border-b' : 'w-16 md:w-20 border-r'} bg-stone-950/80 relative overflow-hidden flex items-center justify-center border-stone-800/50 shrink-0`}>
              
              {handout.imageUrl ? (
                <img src={handout.imageUrl} alt={handout.title} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-transparent opacity-80" />
              )}
              
              <Icon className={`${viewMode === 'grid' ? 'w-10 h-10 md:w-12 md:h-12' : 'w-6 h-6 md:w-8 md:h-8'} ${handout.imageUrl ? 'text-stone-300 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]' : 'text-stone-700 drop-shadow-md'} relative z-10`} strokeWidth={1.5} />
              
              {role === 'gm' && viewMode === 'grid' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(handout.id); }}
                  className="absolute top-2 right-2 md:top-3 md:right-3 p-2 bg-stone-900/90 rounded text-stone-400 hover:text-amber-400 border border-stone-700 hover:border-amber-700 transition-colors z-20 shadow-md"
                  title={handout.isRevealed ? "Verberg in de schaduwen" : "Onthul aan de party"}
                >
                  {handout.isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
              
              {role === 'player' && viewMode === 'grid' && handout.claimable && !handout.claimedBy && (
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
              
              {role === 'gm' && viewMode === 'list' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(handout.id); }}
                  className="absolute top-1/2 -translate-y-1/2 right-2 md:right-3 p-1.5 md:p-2 bg-stone-900/90 rounded text-stone-400 hover:text-amber-400 border border-stone-700 hover:border-amber-700 transition-colors z-20 shadow-sm"
                  title={handout.isRevealed ? "Verberg in de schaduwen" : "Onthul aan de party"}
                >
                  {handout.isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}

              {role === 'player' && viewMode === 'list' && handout.claimable && !handout.claimedBy && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onClaim(handout.id); }}
                  className="absolute top-1/2 -translate-y-1/2 right-2 md:right-3 p-1.5 md:p-2 bg-stone-900/90 rounded text-amber-500 hover:text-amber-300 border border-amber-900/50 hover:border-amber-500 transition-colors z-20 shadow-sm"
                  title="Claim dit object"
                >
                  <Hand className="w-4 h-4" />
                </button>
              )}

              <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mb-2 md:mb-3 pr-10' : 'mb-1 pr-12'}`}>
                <span className={`font-bold uppercase tracking-widest text-amber-600 bg-amber-950/50 border border-amber-900/30 rounded shrink-0 ${viewMode === 'grid' ? 'text-[9px] px-2 py-1' : 'text-[8px] px-1.5 py-0.5'}`}>
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
              
              <p className={`text-stone-400 font-story leading-relaxed ${viewMode === 'grid' ? 'text-xs md:text-sm mb-3 md:mb-4' : 'text-[11px] md:text-xs line-clamp-1 md:line-clamp-2 pr-12'}`}>
                {handout.content}
              </p>
              
              {role === 'gm' && handout.secret && (
                <div className={`${viewMode === 'grid' ? 'mt-auto p-2.5 md:p-3' : 'mt-1 py-1 px-2 flex items-center gap-2 mr-12'} bg-stone-950/80 border-l-2 border-amber-700 rounded-r text-amber-500/90 font-story italic shadow-inner overflow-hidden`}>
                  <strong className={`font-sans text-[9px] uppercase tracking-widest text-amber-700 shrink-0 block ${viewMode === 'grid' ? 'mb-1' : ''}`}>GM Inzicht</strong>
                  <span className={`text-[10px] md:text-[11px] ${viewMode === 'list' ? 'truncate' : ''}`}>{handout.secret}</span>
                </div>
              )}
            </div>
          </div>
        )})}
        {visibleHandouts.length === 0 && (
          <div className="col-span-full py-16 md:py-24 text-center text-stone-600 border-2 border-dashed border-stone-800 rounded-xl font-story italic text-base md:text-lg bg-stone-900/20">
            De bibliotheek is leeg. Geen kennis is hier nog gedeeld.
          </div>
        )}
      </div>
    </div>
  );
}

export default HandoutsView;
