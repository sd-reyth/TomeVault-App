import React, { useEffect, useState } from 'react';
import { Save, Settings, X, LogOut } from 'lucide-react';

function SettingsModal({ isOpen, onClose, playerName, role, onLogout, theme, onSaveSettings }) {
  const [draftName, setDraftName] = useState(playerName || '');
  const [draftTheme, setDraftTheme] = useState(theme || 'purple');

  useEffect(() => {
    if (!isOpen) return;
    setDraftName(playerName || '');
    setDraftTheme(theme || 'purple');
  }, [isOpen, playerName, theme]);

  if (!isOpen) return null;

  const themes = [
    { id: 'purple',    label: 'Paars',     sub: 'Violet / Donker',    from: '#6d28d9', to: '#a78bfa' },
    { id: 'amber',     label: 'Amber',     sub: 'Oranje / Bruin',     from: '#b45309', to: '#f59e0b' },
    { id: 'green',     label: 'Groen',     sub: 'Smaragd / Donker',   from: '#15803d', to: '#4ade80' },
  ];

  const handleSave = async () => {
    await onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: draftTheme,
    });
    onClose();
  };

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
        
        <div className="p-6 relative z-10 flex flex-col gap-5">
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Mijn Naam (Weergave)</label>
            <input 
              type="text" 
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="Je naam aan tafel"
              className="h-9 w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 text-sm text-stone-200 focus:outline-none focus:border-amber-600/50 transition-colors font-story"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3">Kleurenthema</label>
            <div className="grid grid-cols-4 gap-2">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setDraftTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${draftTheme === t.id ? 'border-amber-600/60 bg-amber-950/20 shadow-md shadow-amber-900/20' : 'border-stone-800 hover:border-stone-600 bg-stone-950/40'}`}
                  title={t.sub}
                >
                  <div
                    className="w-full h-5 rounded"
                    style={{ background: `linear-gradient(to right, ${t.from}, ${t.to})` }}
                  />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{t.label}</span>
                  {draftTheme === t.id && <span className="text-[8px] text-amber-500 uppercase tracking-widest">Actief</span>}
                </button>
              ))}
            </div>
          </div>



          <div className="pt-3 border-t border-stone-800/50">
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3">Sessie Acties</label>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => { onLogout(); onClose(); }}
                className="h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-900/50 bg-rose-950/30 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-rose-300 transition-colors hover:bg-rose-900/40"
              >
                <LogOut className="h-4 w-4" /> Verlaat Sessie
              </button>
            </div>
          </div>

          <div className="pt-1 -mt-1 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-colors hover:from-amber-600 hover:to-amber-500"
            >
              <Save className="h-4 w-4" /> Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
