import React, { useEffect, useState } from 'react';
import { Crown, Download, LogOut, Save, Settings } from 'lucide-react';
import ModalFrame from './ModalFrame';

function SettingsModal({
  isOpen,
  onClose,
  playerName,
  role,
  onLogout,
  onExportArchive,
  exportBusy = false,
  theme,
  brightness,
  onSaveSettings,
  currentPlanLabel = '',
  canOpenOwnerPanel = false,
  onOpenOwnerPanel,
}) {
  const [draftName, setDraftName] = useState(playerName || '');
  const [draftTheme, setDraftTheme] = useState(theme || 'purple');
  const [draftBrightness, setDraftBrightness] = useState(brightness !== undefined ? brightness : 2);
  const showBrightnessControl = draftTheme !== 'light';
  const isLightTheme = draftTheme === 'light';
  const resolvedAccent = draftTheme === 'purple' ? 'purple' : (draftTheme === 'green' ? 'emerald' : 'amber');
  const activeTagColor = draftTheme === 'purple' ? 'text-violet-300' : (draftTheme === 'green' ? 'text-emerald-300' : 'text-amber-300');
  const saveButtonClass = isLightTheme
    ? 'border-amber-500/60 bg-gradient-to-r from-amber-500 to-amber-400 text-stone-900 hover:from-amber-400 hover:to-amber-300 hover:shadow-lg hover:shadow-amber-300/40'
    : (draftTheme === 'purple'
      ? 'border-violet-500/35 bg-gradient-to-r from-violet-700 to-violet-600 text-stone-100 hover:from-violet-600 hover:to-violet-500 hover:shadow-lg hover:shadow-violet-700/40'
      : (draftTheme === 'green'
        ? 'border-emerald-500/35 bg-gradient-to-r from-emerald-700 to-emerald-600 text-stone-100 hover:from-emerald-600 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-700/40'
        : 'border-amber-500/35 bg-gradient-to-r from-amber-700 to-amber-600 text-stone-100 hover:from-amber-600 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-700/40'));

  useEffect(() => {
    if (!isOpen) return;
    setDraftName(playerName || '');
    setDraftTheme(theme || 'purple');
    setDraftBrightness(brightness !== undefined ? brightness : 2);
  }, [isOpen, playerName, theme, brightness]);

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
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Configuratie"
      icon={Settings}
      tone={isLightTheme ? 'light' : 'dark'}
      accent={isLightTheme ? 'amber' : resolvedAccent}
      bodyClassName="gap-5 sm:gap-6"
    >
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Mijn Naam (Weergave)</label>
            <input 
              type="text" 
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="Je naam aan tafel"
              className={`h-10 w-full rounded-xl px-3 text-sm transition-colors focus:outline-none ${isLightTheme ? 'border border-stone-300 bg-stone-100 text-stone-700 placeholder:text-stone-400 focus:border-amber-500/60' : 'border border-white/10 bg-white/5 text-stone-100 placeholder:text-stone-500 focus:border-amber-500/50 focus:bg-white/7'}`}
            />
          </div>

          <div>
            <label className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Kleurenthema</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeClick(t.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.985] ${draftTheme === t.id ? (isLightTheme ? 'border-amber-500/60 bg-amber-100 shadow-md shadow-amber-200/40' : 'border-amber-500/35 bg-white/7 shadow-md shadow-amber-950/20') : (isLightTheme ? 'border-stone-300 bg-stone-100 hover:border-stone-400' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7')}`}
                  title={t.sub}
                >
                  <div
                    className="w-full h-5 rounded"
                    style={{ background: `linear-gradient(to right, ${t.from}, ${t.to})` }}
                  />
                  <span className={`text-[9px] font-semibold uppercase tracking-widest ${isLightTheme ? 'text-stone-500' : 'text-stone-300'}`}>{t.label}</span>
                  {draftTheme === t.id && <span className={`text-[8px] uppercase tracking-widest ${activeTagColor}`}>Actief</span>}
                </button>
              ))}
            </div>
          </div>

          {showBrightnessControl && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Helderheid</label>
                <span className={`text-[10px] uppercase tracking-widest ${activeTagColor}`}>
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
              <div className="mt-2 flex justify-between text-[9px] uppercase tracking-widest text-stone-500">
                <span>Donker</span>
                <span>Normaal</span>
                <span>Licht</span>
              </div>
            </div>
          )}

          <div className={`flex flex-col gap-3 border-t pt-4 ${isLightTheme ? 'border-stone-200' : 'border-white/10'}`}>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Sessie Acties</label>
            {currentPlanLabel ? (
              <div className={`rounded-2xl border px-3 py-3 ${isLightTheme ? 'border-stone-200 bg-stone-100/80 text-stone-700' : 'border-white/10 bg-white/5 text-stone-300'}`}>
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em]">
                  <span className="font-semibold text-stone-500">Huidig plan</span>
                  <span className="font-medium text-amber-300">{currentPlanLabel}</span>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => onExportArchive?.()}
              disabled={exportBusy}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium uppercase tracking-[0.16em] transition-all duration-200 ease-out active:scale-[0.985] disabled:active:scale-100 ${exportBusy ? (isLightTheme ? 'cursor-wait border-stone-200 bg-stone-100 text-stone-400' : 'cursor-wait border-white/10 bg-white/5 text-stone-600') : (isLightTheme ? 'border-sky-300 bg-sky-50 text-sky-700 hover:border-sky-400 hover:bg-sky-100 hover:shadow-md hover:shadow-sky-200/40' : 'border-white/10 bg-white/7 text-stone-100 hover:bg-white/10 hover:shadow-md hover:shadow-black/20')}`}
            >
              <Download className="h-4 w-4" /> {exportBusy ? 'Laden...' : (role === 'gm' ? 'Download Archief' : 'Download Profiel')}
            </button>

            <button 
              onClick={() => { onLogout(); onClose(); }}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium uppercase tracking-[0.16em] transition-all duration-200 ease-out active:scale-[0.985] ${isLightTheme ? 'border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100 hover:shadow-md hover:shadow-rose-200/40' : 'border-white/10 bg-white/5 text-rose-200 hover:bg-rose-500/10 hover:text-rose-100 hover:shadow-md hover:shadow-black/20'}`}
            >
              <LogOut className="h-4 w-4" /> Verlaat
            </button>

            {canOpenOwnerPanel ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOwnerPanel?.();
                }}
                className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium uppercase tracking-[0.16em] transition-all duration-200 ease-out active:scale-[0.985] ${isLightTheme ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 hover:shadow-md hover:shadow-amber-200/40' : 'border-amber-500/25 bg-white/5 text-amber-200 hover:border-amber-400/35 hover:bg-amber-500/10 hover:shadow-md hover:shadow-black/20'}`}
              >
                <Crown className="h-4 w-4" /> Owner Panel
              </button>
            ) : null}
          </div>

          <div className="-mt-1 flex justify-stretch pt-1 sm:justify-end">
            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium uppercase tracking-[0.16em] shadow-sm transition-all duration-200 ease-out active:scale-[0.985] sm:w-auto ${saveButtonClass}`}
            >
              <Save className="h-4 w-4" /> Opslaan
            </button>
          </div>
    </ModalFrame>
  );
}

export default SettingsModal;
