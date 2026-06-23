import React, { useEffect, useState } from 'react';
import { getPlanFeatureSummary } from '../lib/accessPlans';
import { Crown, Download, LogOut, Save, Settings, SunMedium, SwatchBook, UserRound } from 'lucide-react';
import ModalFrame from './ModalFrame';
import { APP_THEMES } from '../lib/appThemes';

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
  currentAccessPlan = null,
  canOpenOwnerPanel = false,
  onOpenOwnerPanel,
}) {
  const [draftName, setDraftName] = useState(playerName || '');
  const [draftTheme, setDraftTheme] = useState(theme || 'midnight-tome');
  const [draftBrightness, setDraftBrightness] = useState(brightness !== undefined ? brightness : 2);
  const planFeatures = getPlanFeatureSummary(currentAccessPlan);

  useEffect(() => {
    if (!isOpen) return;
    setDraftName(playerName || '');
    setDraftTheme(theme || 'midnight-tome');
    setDraftBrightness(brightness !== undefined ? brightness : 2);
  }, [isOpen, playerName, theme, brightness]);

  const themes = APP_THEMES;

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
        <label className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub"><UserRound className="h-3.5 w-3.5" /> Mijn Naam</label>
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Je naam aan tafel"
          className="tv-field"
        />
      </div>

      <div>
        <label className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub"><SwatchBook className="h-3.5 w-3.5" /> Kleurenthema</label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {themes.map((themeOption) => {
            const isActive = draftTheme === themeOption.value;
            return (
              <button
                key={themeOption.value}
                type="button"
                onClick={() => handleThemeClick(themeOption.value)}
                title={themeOption.label}
                className={`group flex min-h-12 items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.985] ${isActive ? 'tv-surface tv-magic-glow' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset hover:tv-border-emphasis'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 flex-shrink-0 rounded-full tv-border-emphasis ring-1"
                    style={{ background: themeOption.swatch, boxShadow: isActive ? `0 0 6px ${themeOption.swatch}88` : undefined }}
                  />
                  <span className={`text-xs font-semibold tracking-[0.07em] transition-colors ${isActive ? 'tv-text' : 'tv-text group-hover:tv-text'}`}>
                    {themeOption.shortLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {themeOption.premium ? (
                    <span className="tv-plan-badge">Premium</span>
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
          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub"><SunMedium className="h-3.5 w-3.5" /> Helderheid</label>
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

      <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-4">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] tv-text-sub">Plan & sessie</label>
        {currentPlanLabel ? (
          <div className="tv-plan-summary space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em]">
              <span className="font-semibold tv-text-sub">Huidig plan</span>
              <span className="font-medium tv-accent">{currentPlanLabel}</span>
            </div>
            {planFeatures.length > 0 ? (
              <ul className="space-y-1.5 text-xs tv-text-sub">
                {planFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full tv-accent" style={{ background: 'var(--tv-accent)' }} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-[11px] leading-relaxed tv-muted">
              Upgraden en limieten worden later geactiveerd. Je huidige plan is alvast zichtbaar voor de toekomst.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onExportArchive?.()}
            disabled={exportBusy}
            className="tv-satisfy-pop flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium uppercase tracking-[0.16em] transition-all duration-200 ease-out disabled:cursor-wait border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-surface-raised tv-text tv-hover-surface"
          >
            <Download className="h-4 w-4" /> {exportBusy ? 'Laden...' : (role === 'gm' ? 'Archief' : 'Profiel')}
          </button>

          <button
            type="button"
            onClick={() => { onLogout(); onClose(); }}
            className="tv-satisfy-pop flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset text-rose-200 transition-all duration-200 ease-out active:scale-[0.985] tv-hover-surface"
          >
            <LogOut className="h-4 w-4" /> Verlaat
          </button>
        </div>

        {canOpenOwnerPanel ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOwnerPanel?.();
            }}
            className="tv-satisfy-pop flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text transition-all duration-200 ease-out active:scale-[0.985] tv-hover-surface"
          >
            <Crown className="h-4 w-4" /> Owner Panel
          </button>
        ) : null}
      </div>

      <div className="-mt-1 flex justify-stretch pt-1 sm:justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="tv-satisfy-pop inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium uppercase tracking-[0.16em] shadow-sm transition-all duration-200 ease-out active:scale-[0.985] sm:w-auto tv-button-primary"
        >
          <Save className="h-4 w-4" /> Opslaan
        </button>
      </div>
    </ModalFrame>
  );
}

export default SettingsModal;
