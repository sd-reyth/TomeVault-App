import React, { useEffect, useMemo, useState } from 'react';
import { getPlanFeatureSummary } from '../lib/accessPlans';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Download,
  Save,
  Settings,
  SunMedium,
  Volume2,
} from 'lucide-react';
import ModalFrame from './ModalFrame';
import Button from './Button';
import { APP_THEMES } from '../lib/appThemes';

const BRIGHTNESS_LABELS = ['Donker', 'Iets donkerder', 'Normaal', 'Iets lichter', 'Lichter'];

function getInitials(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function SettingsFold({ title, badge, open, onToggle, children }) {
  return (
    <div className="tv-profile-fold">
      <button
        type="button"
        onClick={onToggle}
        className="tv-profile-fold__trigger"
        aria-expanded={open}
      >
        <span className="tv-profile-fold__title">{title}</span>
        <span className="inline-flex items-center gap-2">
          {badge ? <span className="tv-profile-fold__badge">{badge}</span> : null}
          {open ? <ChevronUp className="h-4 w-4 tv-muted" /> : <ChevronDown className="h-4 w-4 tv-muted" />}
        </span>
      </button>
      {open ? <div className="tv-profile-fold__body">{children}</div> : null}
    </div>
  );
}

const SETTINGS_PANELS = {
  display: 'display',
  sound: 'sound',
  session: 'session',
};

function SettingsModal({
  isOpen,
  onClose,
  playerName,
  role,
  onExportArchive,
  exportBusy = false,
  theme,
  brightness,
  uiSounds = true,
  onSaveSettings,
  currentPlanLabel = '',
  currentAccessPlan = null,
  canOpenOwnerPanel = false,
  onOpenOwnerPanel,
}) {
  const [draftName, setDraftName] = useState(playerName || '');
  const [draftTheme, setDraftTheme] = useState(theme || 'midnight-tome');
  const [draftBrightness, setDraftBrightness] = useState(brightness !== undefined ? brightness : 2);
  const [draftUiSounds, setDraftUiSounds] = useState(uiSounds !== false);
  const [openPanel, setOpenPanel] = useState(null);
  const planFeatures = getPlanFeatureSummary(currentAccessPlan);

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  useEffect(() => {
    if (!isOpen) return;
    setDraftName(playerName || '');
    setDraftTheme(theme || 'midnight-tome');
    setDraftBrightness(brightness !== undefined ? brightness : 2);
    setDraftUiSounds(uiSounds !== false);
    setOpenPanel(null);
  }, [isOpen, playerName, theme, brightness, uiSounds]);

  const themes = APP_THEMES;
  const activeTheme = themes.find((entry) => entry.value === draftTheme) || themes[2];
  const roleLabel = role === 'gm' ? 'Game Master' : 'Speler';
  const roleShort = role === 'gm' ? 'GM' : 'Speler';
  const initials = useMemo(() => getInitials(draftName || playerName), [draftName, playerName]);
  const brightnessLabel = BRIGHTNESS_LABELS[draftBrightness] || 'Normaal';
  const displayBadge = `${activeTheme.shortLabel} · ${brightnessLabel}`;
  const soundBadge = draftUiSounds ? 'Aan' : 'Uit';

  const persistDraft = (patch) => {
    onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: draftTheme,
      nextBrightness: draftBrightness,
      nextUiSounds: draftUiSounds,
      ...patch,
    });
  };

  const handleSave = async () => {
    await onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: draftTheme,
      nextBrightness: Number(draftBrightness),
      nextUiSounds: draftUiSounds,
    });
    onClose();
  };

  const handleThemeClick = (themeValue) => {
    setDraftTheme(themeValue);
    persistDraft({ nextTheme: themeValue });
  };

  const handleBrightnessChange = (nextBrightness) => {
    setDraftBrightness(nextBrightness);
    persistDraft({ nextBrightness });
  };

  const handleUiSoundsToggle = () => {
    const next = !draftUiSounds;
    setDraftUiSounds(next);
    persistDraft({ nextUiSounds: next });
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Configuratie"
      icon={Settings}
      maxWidthClassName="max-w-md"
      bodyClassName="!p-0"
      footer={(
        <Button variant="primary" block onClick={handleSave}>
          <Save className="h-4 w-4" /> Opslaan
        </Button>
      )}
      footerClassName="tv-modal-footer--settings"
    >
      <div className="tv-settings-sheet">
        <section className="tv-settings-identity">
          <div
            className="tv-settings-identity-avatar"
            style={{
              borderColor: `${activeTheme.swatch}55`,
              background: `color-mix(in srgb, ${activeTheme.swatch}, transparent 82%)`,
              color: `color-mix(in srgb, ${activeTheme.swatch}, #fff 35%)`,
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="settings-player-name" className="tv-profile-section-label">
              Mijn naam
            </label>
            <input
              id="settings-player-name"
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Je naam aan tafel"
              className="tv-field mt-1.5"
            />
            <p className="mt-2 text-xs tv-muted">
              {roleShort} · {roleLabel}
            </p>
          </div>
        </section>

        <SettingsFold
          title="Weergave"
          badge={displayBadge}
          open={openPanel === SETTINGS_PANELS.display}
          onToggle={() => togglePanel(SETTINGS_PANELS.display)}
        >
          <div>
            <p className="tv-profile-section-label mb-3">Kleurenthema</p>
            <div className="tv-settings-theme-row">
              {themes.map((themeOption) => {
                const isActive = draftTheme === themeOption.value;
                return (
                  <button
                    key={themeOption.value}
                    type="button"
                    onClick={() => handleThemeClick(themeOption.value)}
                    title={themeOption.label}
                    aria-pressed={isActive}
                    className={`tv-settings-theme-pick ${isActive ? 'is-active' : ''}`}
                  >
                    <span
                      className="tv-settings-theme-pick__swatch"
                      style={{
                        background: themeOption.swatch,
                        boxShadow: isActive ? `0 0 10px ${themeOption.swatch}88` : undefined,
                      }}
                    />
                    <span className="tv-settings-theme-pick__label">{themeOption.shortLabel}</span>
                    {themeOption.premium ? <span className="tv-settings-theme-pick__pro">Pro</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm tv-text">
                <SunMedium className="h-4 w-4 tv-muted" />
                Helderheid
              </span>
              <span className="text-xs tv-muted">{brightnessLabel}</span>
            </div>
            <div className="tv-settings-brightness-steps" role="group" aria-label="Helderheid">
              {BRIGHTNESS_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={draftBrightness === index}
                  onClick={() => handleBrightnessChange(index)}
                  className={`tv-settings-brightness-step ${draftBrightness === index ? 'is-active' : ''}`}
                />
              ))}
            </div>
          </div>
        </SettingsFold>

        <SettingsFold
          title="Geluid"
          badge={soundBadge}
          open={openPanel === SETTINGS_PANELS.sound}
          onToggle={() => togglePanel(SETTINGS_PANELS.sound)}
        >
          <div className="tv-settings-row-head">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-sm tv-text">
                <Volume2 className="h-4 w-4 tv-muted" />
                Interfacegeluiden
              </span>
              <p className="mt-1 text-xs tv-muted">Klik- en beurtgeluiden aan tafel</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draftUiSounds}
              onClick={handleUiSoundsToggle}
              className={`tv-settings-toggle ${draftUiSounds ? 'is-on' : ''}`}
            >
              <span className="tv-settings-toggle-knob" />
            </button>
          </div>
        </SettingsFold>

        <SettingsFold
          title="Sessie"
          badge={currentPlanLabel || null}
          open={openPanel === SETTINGS_PANELS.session}
          onToggle={() => togglePanel(SETTINGS_PANELS.session)}
        >
          {currentPlanLabel ? (
            <div className="space-y-2">
              <p className="text-sm tv-text-sub">
                Plan: <span className="tv-accent">{currentPlanLabel}</span>
              </p>
              {planFeatures.length > 0 ? (
                <ul className="space-y-1.5 text-sm tv-muted">
                  {planFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              block
              onClick={() => onExportArchive?.()}
              disabled={exportBusy}
            >
              <Download className="h-4 w-4" /> {exportBusy ? 'Laden...' : (role === 'gm' ? 'Archief exporteren' : 'Profiel exporteren')}
            </Button>

            {canOpenOwnerPanel ? (
              <Button
                variant="secondary"
                block
                onClick={() => {
                  onClose();
                  onOpenOwnerPanel?.();
                }}
              >
                <Crown className="h-4 w-4" /> Owner Panel
              </Button>
            ) : null}
          </div>
        </SettingsFold>
      </div>
    </ModalFrame>
  );
}

export default SettingsModal;
