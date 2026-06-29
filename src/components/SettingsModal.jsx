import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getPlanFeatureSummary } from '../lib/accessPlans';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Download,
  Flame,
  History,
  ImagePlus,
  RotateCcw,
  Save,
  Settings,
  SunMedium,
  Swords,
  Volume2,
} from 'lucide-react';
import ModalFrame from './ModalFrame';
import Button from './Button';
import TvImage from './TvImage';
import { APP_THEMES, DEFAULT_THEME } from '../lib/appThemes';
import { COMBAT_PARTICIPATION_STATUS } from '../lib/battleUtils';

const BRIGHTNESS_LABELS = ['Donker', 'Iets donkerder', 'Normaal', 'Iets lichter', 'Lichter'];

function getInitials(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function SettingsFold({ title, badge, open, onToggle, children, flat = false }) {
  if (flat) {
    return (
      <section className="tv-profile-fold tv-profile-fold--flat">
        <div className="tv-profile-fold__heading">
          <span className="tv-profile-fold__title">{title}</span>
          {badge ? <span className="tv-profile-fold__badge">{badge}</span> : null}
        </div>
        <div className="tv-profile-fold__body">{children}</div>
      </section>
    );
  }

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
  backups: 'backups',
  all: 'all',
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
  sessionPlayerProfile = null,
  canOpenOwnerPanel = false,
  onOpenOwnerPanel,
  profileBackups = [],
  onRestoreProfileBackup,
}) {
  const [draftName, setDraftName] = useState(playerName || '');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(sessionPlayerProfile?.avatar || null);
  const [draftAvatarFile, setDraftAvatarFile] = useState(null);
  const [draftGmParticipates, setDraftGmParticipates] = useState(
    sessionPlayerProfile?.combatParticipation !== COMBAT_PARTICIPATION_STATUS.REMOVED
  );
  const [draftTheme, setDraftTheme] = useState(theme || DEFAULT_THEME);
  const [draftBrightness, setDraftBrightness] = useState(brightness !== undefined ? brightness : 2);
  const [draftUiSounds, setDraftUiSounds] = useState(uiSounds !== false);
  const [openPanel, setOpenPanel] = useState(null);
  const wasOpenRef = useRef(false);
  const planFeatures = getPlanFeatureSummary(currentAccessPlan);

  const togglePanel = (panel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const isPanelOpen = (panel) => openPanel === SETTINGS_PANELS.all || openPanel === panel;
  const mobileFlatLayout = openPanel === SETTINGS_PANELS.all;

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    setDraftName(playerName || '');
    setDraftAvatarUrl(sessionPlayerProfile?.avatar || null);
    setDraftAvatarFile(null);
    setDraftGmParticipates(sessionPlayerProfile?.combatParticipation !== COMBAT_PARTICIPATION_STATUS.REMOVED);
    setDraftTheme(theme || DEFAULT_THEME);
    setDraftBrightness(brightness !== undefined ? brightness : 2);
    setDraftUiSounds(uiSounds !== false);

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      const expandAll = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
      setOpenPanel(expandAll ? SETTINGS_PANELS.all : null);
    }
  }, [isOpen, playerName, sessionPlayerProfile, theme, brightness, uiSounds]);

  const themes = APP_THEMES;
  const activeTheme = themes.find((entry) => entry.value === draftTheme) || themes.find((entry) => entry.value === DEFAULT_THEME) || themes[0];
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
      nextAvatarFile: draftAvatarFile,
      nextAvatarUrl: draftAvatarUrl,
      nextGmParticipates: draftGmParticipates,
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

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDraftAvatarFile(file);
    setDraftAvatarUrl(URL.createObjectURL(file));
  };

  const handleRestoreBackup = (backup) => {
    if (!backup) return;
    const label = backup.createdAtLabel ? ` van ${backup.createdAtLabel}` : '';
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Profiel herstellen naar het herstelpunt${label}? Je huidige profielgegevens worden overschreven.`)
      : true;
    if (!confirmed) return;
    onRestoreProfileBackup?.(backup);
    onClose?.();
  };

  const hasBackups = Array.isArray(profileBackups) && profileBackups.length > 0;
  const backupBadge = hasBackups ? `${profileBackups.length}/3` : null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Configuratie"
      icon={Settings}
      mobileFullScreen
      maxWidthClassName="max-w-md"
      bodyClassName="!p-0"
      footer={(
        <Button variant="primary" block onClick={handleSave}>
          <Save className="h-4 w-4" /> Opslaan
        </Button>
      )}
      footerClassName="tv-modal-footer--settings"
    >
      <div className={`tv-settings-sheet ${mobileFlatLayout ? 'tv-settings-sheet--flat' : ''}`}>
        <section className="tv-settings-identity">
          <label
            className="tv-settings-identity-avatar tv-settings-identity-avatar--editable"
            style={{
              borderColor: `${activeTheme.swatch}55`,
              background: `color-mix(in srgb, ${activeTheme.swatch}, transparent 82%)`,
              color: `color-mix(in srgb, ${activeTheme.swatch}, #fff 35%)`,
            }}
            title="Profielafbeelding wijzigen"
          >
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            {draftAvatarUrl ? (
              <TvImage src={draftAvatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
            <span className="tv-settings-identity-avatar__edit" aria-hidden="true">
              <ImagePlus className="h-3.5 w-3.5" />
            </span>
          </label>
          <div className="min-w-0 flex-1">
            <label htmlFor="settings-player-name" className="tv-profile-section-label">
              Mijn profiel
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
              {role === 'gm'
                ? `${roleShort} · ${draftGmParticipates ? 'Speelt mee in slagorde' : 'Alleen leiden'}`
                : `${roleShort} · gekoppeld aan je slagordekaart`}
            </p>
          </div>
        </section>

        {role === 'gm' ? (
          <section className={`tv-settings-combat-profile ${draftGmParticipates ? 'is-active' : ''}`}>
            <div className="min-w-0">
              <p className="tv-profile-section-label mb-1">Slagorde rol</p>
              <p className="text-sm tv-text">
                {draftGmParticipates ? 'Speelt mee' : 'Alleen leiden'}
              </p>
              <p className="mt-1 text-xs leading-5 tv-muted">
                {draftGmParticipates
                  ? 'Je GM-profiel verschijnt als eigen kaart in de slagorde.'
                  : 'Je GM-profiel blijft bewaard, maar doet niet mee aan initiatief.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draftGmParticipates}
              onClick={() => setDraftGmParticipates((current) => !current)}
              className={`tv-settings-combat-switch ${draftGmParticipates ? 'is-active' : ''}`}
            >
              <span className="tv-settings-combat-switch__option">
                <Flame className="h-4 w-4" aria-hidden="true" />
                <span>Leiden</span>
              </span>
              <span className="tv-settings-combat-switch__option">
                <Swords className="h-4 w-4" aria-hidden="true" />
                <span>Spelen</span>
              </span>
            </button>
          </section>
        ) : null}

        <SettingsFold
          title="Weergave"
          badge={displayBadge}
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.display)}
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
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.sound)}
          onToggle={() => togglePanel(SETTINGS_PANELS.sound)}
        >
          <div className="tv-settings-row-head">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-sm tv-text">
                <Volume2 className="h-4 w-4 tv-muted" />
                Interfacegeluiden
              </span>
              <p className="mt-1 text-xs tv-muted max-md:hidden">Klik- en beurtgeluiden aan tafel</p>
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
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.session)}
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
              <Download className="h-4 w-4" /> {exportBusy ? 'Exporteren...' : (role === 'gm' ? 'GM-dossier exporteren' : 'Spelerkroniek exporteren')}
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

        <SettingsFold
          title="Herstelpunten"
          badge={backupBadge}
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.backups)}
          onToggle={() => togglePanel(SETTINGS_PANELS.backups)}
        >
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-xs tv-muted">
              <History className="h-3.5 w-3.5" />
              Je laatste 3 profielversies. Automatisch bewaard bij opslaan en verlaten.
            </p>

            {hasBackups ? (
              <ul className="space-y-2">
                {profileBackups.map((backup) => (
                  <li
                    key={backup.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm tv-text">{backup.snapshot?.name || 'Avonturier'}</p>
                      <p className="mt-0.5 truncate text-xs tv-muted">
                        {backup.createdAtLabel || 'Onlangs'} · {backup.reasonLabel}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={() => handleRestoreBackup(backup)}
                    >
                      Herstel
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[var(--tv-radius)] border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] px-3 py-4 text-center text-xs tv-muted">
                Nog geen herstelpunten. Sla je profiel op om er een te maken.
              </p>
            )}
          </div>
        </SettingsFold>
      </div>
    </ModalFrame>
  );
}

export default SettingsModal;
