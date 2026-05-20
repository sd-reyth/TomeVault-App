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
  const [draftTheme, setDraftTheme] = useState(theme || 'midnight-tome');
  const [draftBrightness, setDraftBrightness] = useState(brightness !== undefined ? brightness : 2);

  useEffect(() => {
    if (!isOpen) return;
    setDraftName(playerName || '');
    setDraftTheme(theme || 'midnight-tome');
    setDraftBrightness(brightness !== undefined ? brightness : 2);
  }, [isOpen, playerName, theme, brightness]);

  const themes = [
    { value: 'dawn-parchment', label: 'Dawn Parchment', swatch: '#9c6f2e', premium: false },
    { value: 'midnight-tome',  label: 'Midnight Tome',  swatch: '#9f7dff', premium: false },
    { value: 'ember-forge',    label: 'Ember Forge',    swatch: '#ff9d42', premium: false },
    { value: 'forest-scroll',  label: 'Forest Scroll',  swatch: '#6bc66b', premium: false },
    { value: 'blood-moon',     label: 'Blood Moon',     swatch: '#c41e3a', premium: true  },
  ];

  const handleSave = async () => {
    await onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: draftTheme,
      nextBrightness: Number(draftBrightness),
    });
    onClose();
  };

  const handleThemeClick = (themeValue) => {
    setDraftTheme(themeValue);
    onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: themeValue,
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
      bodyClassName="gap-5 sm:gap-6"
    >
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub">Mijn Naam (Weergave)</label>
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Je naam aan tafel"
          className="h-10 w-full rounded-xl border px-3 text-sm transition-colors focus:outline-none tv-surface tv-text"
        />
      </div>

      <div>
        <label className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub">Kleurenthema</label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {themes.map((themeOption) => {
            const isActive = draftTheme === themeOption.value;
            return (
              <button
                key={themeOption.value}
                type="button"
                onClick={() => handleThemeClick(themeOption.value)}
                className={`group flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.985] ${isActive ? 'tv-surface tv-magic-glow' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-white/20"
                    style={{ background: themeOption.swatch, boxShadow: isActive ? `0 0 6px ${themeOption.swatch}88` : undefined }}
                  />
                  <span className={`text-xs font-semibold tracking-[0.07em] transition-colors ${isActive ? 'tv-text' : 'text-stone-300 group-hover:text-stone-100'}`}>
                    {themeOption.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {themeOption.premium ? (
                    <span style={{ border: '1px solid rgba(196,30,58,0.55)', background: 'rgba(196,30,58,0.18)', color: '#f5a0a8' }}
                      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]">
                      Premium
                    </span>
                  ) : null}
                  {isActive ? (
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: themeOption.swatch }} />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub">Helderheid</label>
          <span className="text-[10px] uppercase tracking-widest tv-accent">
            {['Donker', 'Iets donkerder', 'Normaal', 'Iets lichter', 'Lichter'][draftBrightness] || 'Normaal'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={draftBrightness}
          onChange={(event) => handleBrightnessChange(Number(event.target.value))}
          className="brightness-slider w-full"
          aria-label="Helderheid"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub">Sessie Acties</label>
        {currentPlanLabel ? (
          <div className="rounded-2xl border px-3 py-3 tv-surface tv-text">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em]">
              <span className="font-semibold tv-text-sub">Huidig plan</span>
              <span className="font-medium tv-accent">{currentPlanLabel}</span>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onExportArchive?.()}
          disabled={exportBusy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium uppercase tracking-[0.16em] transition-all duration-200 ease-out active:scale-[0.985] disabled:cursor-wait border-white/10 bg-white/7 tv-text"
        >
          <Download className="h-4 w-4" /> {exportBusy ? 'Laden...' : (role === 'gm' ? 'Download Archief' : 'Download Profiel')}
        </button>

        <button
          type="button"
          onClick={() => { onLogout(); onClose(); }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-rose-200 transition-all duration-200 ease-out active:scale-[0.985]"
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
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 tv-text transition-all duration-200 ease-out active:scale-[0.985]"
          >
            <Crown className="h-4 w-4" /> Owner Panel
          </button>
        ) : null}
      </div>

      <div className="-mt-1 flex justify-stretch pt-1 sm:justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium uppercase tracking-[0.16em] shadow-sm transition-all duration-200 ease-out active:scale-[0.985] sm:w-auto tv-surface tv-text"
        >
          <Save className="h-4 w-4" /> Opslaan
        </button>
      </div>
    </ModalFrame>
  );
}

export default SettingsModal;
