import React, { useEffect, useState } from 'react';
import { Save, Settings, X, LogOut, Download } from 'lucide-react';

function SettingsModal({ isOpen, onClose, playerName, role, onLogout, onExportArchive, exportBusy = false, theme, brightness, onSaveSettings }) {
  const [draftName, setDraftName] = useState(playerName || '');
  const [draftTheme, setDraftTheme] = useState(theme || 'purple');
  const [draftBrightness, setDraftBrightness] = useState(brightness !== undefined ? brightness : 2);
  const showBrightnessControl = draftTheme !== 'light';
  const isLightTheme = draftTheme === 'light';

  useEffect(() => {
    if (!isOpen) return;
    setDraftName(playerName || '');
    setDraftTheme(theme || 'purple');
    setDraftBrightness(brightness !== undefined ? brightness : 2);
  }, [isOpen, playerName, theme, brightness]);

  if (!isOpen) return null;

  const themes = [
    { id: 'purple',    label: 'Paars',     sub: 'Violet / Donker',    from: '#6d28d9', to: '#a78bfa' },
    { id: 'amber',     label: 'Amber',     sub: 'Oranje / Bruin',     from: '#b45309', to: '#f59e0b' },
    { id: 'green',     label: 'Groen',     sub: 'Smaragd / Donker',   from: '#15803d', to: '#4ade80' },
    { id: 'light',     label: 'Licht',     sub: 'Helder / Zonnig',    from: '#fef3c7', to: '#fde68a' },
  ];

  const handleSave = async () => {
    await onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: draftTheme,
      nextBrightness: Number(draftBrightness),
    });
    onClose();
  };

  const handleThemeClick = (themeId) => {
    setDraftTheme(themeId);
    onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: themeId,
      nextBrightness: draftBrightness,
    });
  };

  const handleBrightnessChange = (nextBrightness) => {
    setDraftBrightness(nextBrightness);
    onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: draftTheme,
      nextBrightness,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/80 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className={`settings-modal relative flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border shadow-2xl sm:max-h-[calc(100dvh-2rem)] ${isLightTheme ? 'settings-modal-light bg-stone-50 border-stone-200 text-stone-700' : 'settings-modal-dark bg-stone-900 border-stone-700/50 text-stone-300'}`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-[50px] pointer-events-none ${isLightTheme ? 'bg-amber-400/10' : 'bg-stone-600/10'}`} />
        
        <div className={`relative z-10 flex shrink-0 items-center justify-between border-b p-4 ${isLightTheme ? 'border-stone-200' : 'border-stone-800/50'}`}>
          <h3 className={`font-fantasy font-bold tracking-wider flex items-center gap-2 ${isLightTheme ? 'text-stone-700' : 'text-stone-200'}`}>
            <Settings className={`w-5 h-5 ${isLightTheme ? 'text-stone-500' : 'text-stone-400'}`} /> Configuratie
          </h3>
          <button onClick={onClose} className={`${isLightTheme ? 'text-stone-500 hover:text-rose-500' : 'text-stone-400 hover:text-rose-400'} transition-colors`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative z-10 flex flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isLightTheme ? 'text-stone-500' : 'text-stone-500'}`}>Mijn Naam (Weergave)</label>
            <input 
              type="text" 
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="Je naam aan tafel"
              className={`h-9 w-full rounded-lg px-3 text-sm focus:outline-none transition-colors font-story ${isLightTheme ? 'bg-stone-100 border border-stone-300 text-stone-700 placeholder:text-stone-400 focus:border-amber-500/60' : 'bg-stone-950/80 border border-stone-700 text-stone-200 focus:border-amber-600/50'}`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-3 ${isLightTheme ? 'text-stone-500' : 'text-stone-500'}`}>Kleurenthema</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeClick(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${draftTheme === t.id ? (isLightTheme ? 'border-amber-500/60 bg-amber-100 shadow-md shadow-amber-200/40' : 'border-amber-600/60 bg-amber-950/20 shadow-md shadow-amber-900/20') : (isLightTheme ? 'border-stone-300 hover:border-stone-400 bg-stone-100' : 'border-stone-800 hover:border-stone-600 bg-stone-950/40')}`}
                  title={t.sub}
                >
                  <div
                    className="w-full h-5 rounded"
                    style={{ background: `linear-gradient(to right, ${t.from}, ${t.to})` }}
                  />
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${isLightTheme ? 'text-stone-500' : 'text-stone-400'}`}>{t.label}</span>
                  {draftTheme === t.id && <span className="text-[8px] text-amber-500 uppercase tracking-widest">Actief</span>}
                </button>
              ))}
            </div>
          </div>

          {showBrightnessControl && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${isLightTheme ? 'text-stone-500' : 'text-stone-500'}`}>Helderheid</label>
                <span className="text-[10px] uppercase tracking-widest text-amber-500">
                  {['Donker', 'Iets donkerder', 'Normaal', 'Iets lichter', 'Lichter'][draftBrightness] || 'Normaal'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={draftBrightness}
                onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                className="brightness-slider w-full"
                aria-label="Helderheid"
              />
              <div className={`mt-2 flex justify-between text-[9px] uppercase tracking-widest ${isLightTheme ? 'text-stone-500' : 'text-stone-500'}`}>
                <span>Donker</span>
                <span>Normaal</span>
                <span>Licht</span>
              </div>
            </div>
          )}

          <div className={`pt-4 flex flex-col gap-3 ${isLightTheme ? 'border-t border-stone-200' : 'border-t border-stone-800/50'}`}>
            <label className={`block text-[10px] font-bold uppercase tracking-widest ${isLightTheme ? 'text-stone-500' : 'text-stone-500'}`}>Sessie Acties</label>
            <button
              type="button"
              onClick={() => onExportArchive?.()}
              disabled={exportBusy}
              className={`h-10 w-full flex items-center justify-center gap-2 rounded-lg border font-fantasy text-sm uppercase tracking-[0.16em] transition-colors ${exportBusy ? (isLightTheme ? 'cursor-wait border-stone-200 bg-stone-100 text-stone-400' : 'cursor-wait border-stone-800 bg-stone-950/60 text-stone-600') : (isLightTheme ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-400' : 'border-sky-700/60 bg-sky-950/40 text-sky-200 hover:bg-sky-900/50 hover:border-sky-600/80')}`}
            >
              <Download className="h-4 w-4" /> {exportBusy ? 'Laden...' : (role === 'gm' ? 'Download Archief' : 'Download Profiel')}
            </button>

            <button 
              onClick={() => { onLogout(); onClose(); }}
              className={`h-10 w-full flex items-center justify-center gap-2 rounded-lg border font-fantasy text-sm uppercase tracking-[0.16em] transition-colors ${isLightTheme ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-400' : 'border-rose-800/60 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50 hover:border-rose-700/80'}`}
            >
              <LogOut className="h-4 w-4" /> Verlaat
            </button>
          </div>

          <div className="-mt-1 flex justify-stretch pt-1 sm:justify-end">
            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-4 font-fantasy text-sm uppercase tracking-[0.16em] shadow-sm transition-colors sm:w-auto ${isLightTheme ? 'border-amber-500/60 bg-gradient-to-r from-amber-500 to-amber-400 text-stone-900 hover:from-amber-400 hover:to-amber-300' : 'border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 text-stone-100 hover:from-amber-600 hover:to-amber-500'}`}
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
