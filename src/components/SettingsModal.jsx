import React from 'react';
import { Settings, X, User, LogOut } from 'lucide-react';

function SettingsModal({ isOpen, onClose, playerName, setPlayerName, role, setRole, onLogout }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/50 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-stone-600/10 blur-[50px] pointer-events-none" />
        
        <div className="p-4 border-b border-stone-800/50 flex justify-between items-center relative z-10">
          <h3 className="font-fantasy font-bold text-stone-200 tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-400" /> Configuratie
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-rose-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 relative z-10 flex flex-col gap-6">
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Mijn Naam (Weergave)</label>
            <input 
              type="text" 
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Je naam aan tafel"
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-600/50 transition-colors font-story"
            />
          </div>

          <div className="pt-4 border-t border-stone-800/50">
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3">Sessie Acties</label>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { setRole(role === 'gm' ? 'player' : 'gm'); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 py-2.5 rounded-lg font-fantasy tracking-wider text-xs transition-colors"
              >
                <User className="w-4 h-4 text-amber-500" /> Switch naar {role === 'gm' ? 'Speler' : 'GM'} Modus
              </button>
              
              <button 
                onClick={() => { onLogout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-400 py-2.5 rounded-lg font-fantasy tracking-wider text-xs transition-colors"
              >
                <LogOut className="w-4 h-4" /> Verlaat Sessie
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
