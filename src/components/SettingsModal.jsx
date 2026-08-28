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
  Languages,
  Mail,
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
import { useT } from '../i18n/useT';
import { confirmDialog } from '../i18n/dialogs';
import { LOCALE_PICKER_LABEL, SUPPORTED_LOCALES } from '../i18n/constants';

const BRIGHTNESS_KEYS = ['dark', 'darker', 'normal', 'lighter', 'light'];

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
  locale,
  onLocaleChange,
  onSaveSettings,
  currentPlanLabel = '',
  currentAccessPlan = null,
  sessionPlayerProfile = null,
  canOpenOwnerPanel = false,
  onOpenOwnerPanel,
  profileBackups = [],
  onRestoreProfileBackup,
}) {
  const { t } = useT('settings');
  const [draftName, setDraftName] = useState(playerName || '');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(sessionPlayerProfile?.avatar || null);
  const [draftAvatarFile, setDraftAvatarFile] = useState(null);
  const [draftGmParticipates, setDraftGmParticipates] = useState(
    sessionPlayerProfile?.combatParticipation !== COMBAT_PARTICIPATION_STATUS.REMOVED
  );
  const [draftTheme, setDraftTheme] = useState(theme || DEFAULT_THEME);
  const [draftBrightness, setDraftBrightness] = useState(brightness !== undefined ? brightness : 2);
  const [draftUiSounds, setDraftUiSounds] = useState(uiSounds !== false);
  const [draftLocale, setDraftLocale] = useState(locale || 'en');
  const [openPanel, setOpenPanel] = useState(null);
  const wasOpenRef = useRef(false);
  const planFeatures = getPlanFeatureSummary(currentAccessPlan);
  const isFreePlan = currentAccessPlan?.tier === 'free';

  const handlePremiumInterest = () => {
    const subject = t('session.premiumInterestSubject');
    const body = t('session.premiumInterestBody');
    window.location.href = `mailto:hello@tomevault.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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
    setDraftLocale(locale || 'en');

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      const expandAll = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
      setOpenPanel(expandAll ? SETTINGS_PANELS.all : null);
    }
  }, [isOpen, playerName, sessionPlayerProfile, theme, brightness, uiSounds, locale]);

  const themes = APP_THEMES;
  const activeTheme = themes.find((entry) => entry.value === draftTheme) || themes.find((entry) => entry.value === DEFAULT_THEME) || themes[0];
  const roleShort = role === 'gm' ? t('common:roles.gmShort') : t('common:roles.playerShort');
  const initials = useMemo(() => getInitials(draftName || playerName), [draftName, playerName]);
  const brightnessKey = BRIGHTNESS_KEYS[draftBrightness] || 'normal';
  const brightnessLabel = t(`common:brightness.${brightnessKey}`);
  const displayBadge = `${activeTheme.shortLabel} · ${brightnessLabel}`;
  const soundBadge = draftUiSounds ? t('common:status.on') : t('common:status.off');

  const persistDraft = (patch) => {
    onSaveSettings?.({
      nextPlayerName: draftName,
      nextTheme: draftTheme,
      nextBrightness: draftBrightness,
      nextUiSounds: draftUiSounds,
      nextLocale: draftLocale,
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
      nextLocale: draftLocale,
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

  const handleLocaleChange = (nextLocale) => {
    setDraftLocale(nextLocale);
    onLocaleChange?.(nextLocale);
    persistDraft({ nextLocale });
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

  const getBackupReasonLabel = (backup) => {
    if (backup?.reason) {
      const key = `backups.reason.${backup.reason}`;
      const label = t(key);
      if (label !== key) return label;
    }
    return backup?.reasonLabel || t('common:fallbacks.backupPoint');
  };

  const handleRestoreBackup = (backup) => {
    if (!backup) return;
    const label = backup.createdAtLabel
      ? t('backups.confirmRestoreLabelPrefix', { date: backup.createdAtLabel })
      : '';
    const confirmed = confirmDialog('settings:backups.confirmRestore', { label });
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
      title={t('title')}
      icon={Settings}
      mobileFullScreen
      maxWidthClassName="max-w-md"
      bodyClassName="!p-0"
      footer={(
        <Button variant="primary" block onClick={handleSave}>
          <Save className="h-4 w-4" /> {t('common:actions.save')}
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
            title={t('profile.avatarTitle')}
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
              {t('profile.section')}
            </label>
            <input
              id="settings-player-name"
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={t('profile.namePlaceholder')}
              className="tv-field mt-1.5"
            />
            <p className="mt-2 text-xs tv-muted">
              {role === 'gm'
                ? `${roleShort} · ${draftGmParticipates ? t('profile.gmParticipates') : t('profile.gmLeadOnly')}`
                : `${roleShort} · ${t('profile.playerLinked')}`}
            </p>
          </div>
        </section>

        {role === 'gm' ? (
          <section className={`tv-settings-combat-profile ${draftGmParticipates ? 'is-active' : ''}`}>
            <div className="min-w-0">
              <p className="tv-profile-section-label mb-1">{t('combatRole.section')}</p>
              <p className="text-sm tv-text">
                {draftGmParticipates ? t('combatRole.plays') : t('combatRole.leadOnly')}
              </p>
              <p className="mt-1 text-xs leading-5 tv-muted">
                {draftGmParticipates ? t('combatRole.participatesHint') : t('combatRole.leadOnlyHint')}
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
                <span>{t('combatRole.lead')}</span>
              </span>
              <span className="tv-settings-combat-switch__option">
                <Swords className="h-4 w-4" aria-hidden="true" />
                <span>{t('combatRole.play')}</span>
              </span>
            </button>
          </section>
        ) : null}

        <div
          className="tv-settings-language-row"
          role="group"
          aria-label={LOCALE_PICKER_LABEL}
          title={t('display.language.hint')}
        >
          <span className="tv-settings-language-row__label">
            <Languages className="h-4 w-4 tv-muted" aria-hidden="true" />
            <span className="tv-profile-fold__title">{LOCALE_PICKER_LABEL}</span>
          </span>
          <div className="tv-settings-language-row__pick">
            {SUPPORTED_LOCALES.map((localeOption) => {
              const isActive = draftLocale === localeOption;
              const localeLabel = t(`display.language.${localeOption}`);
              return (
                <button
                  key={localeOption}
                  type="button"
                  onClick={() => handleLocaleChange(localeOption)}
                  aria-pressed={isActive}
                  aria-label={localeLabel}
                  className={`tv-settings-language-row__option ${isActive ? 'is-active' : ''}`}
                >
                  {localeLabel}
                </button>
              );
            })}
          </div>
        </div>

        <SettingsFold
          title={t('display.title')}
          badge={displayBadge}
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.display)}
          onToggle={() => togglePanel(SETTINGS_PANELS.display)}
        >
          <div>
            <p className="tv-profile-section-label mb-3">{t('display.theme')}</p>
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
                    {themeOption.premium ? <span className="tv-settings-theme-pick__pro">{t('display.pro')}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm tv-text">
                <SunMedium className="h-4 w-4 tv-muted" />
                {t('display.brightness')}
              </span>
              <span className="text-xs tv-muted">{brightnessLabel}</span>
            </div>
            <div className="tv-settings-brightness-steps" role="group" aria-label={t('display.brightnessAria')}>
              {BRIGHTNESS_KEYS.map((key, index) => {
                const label = t(`common:brightness.${key}`);
                return (
                  <button
                    key={key}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={draftBrightness === index}
                    onClick={() => handleBrightnessChange(index)}
                    className={`tv-settings-brightness-step ${draftBrightness === index ? 'is-active' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        </SettingsFold>

        <SettingsFold
          title={t('sound.title')}
          badge={soundBadge}
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.sound)}
          onToggle={() => togglePanel(SETTINGS_PANELS.sound)}
        >
          <div className="tv-settings-row-head">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-sm tv-text">
                <Volume2 className="h-4 w-4 tv-muted" />
                {t('sound.uiSounds')}
              </span>
              <p className="mt-1 text-xs tv-muted max-md:hidden">{t('sound.uiSoundsHint')}</p>
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
          title={t('session.title')}
          badge={currentPlanLabel || null}
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.session)}
          onToggle={() => togglePanel(SETTINGS_PANELS.session)}
        >
          {currentPlanLabel ? (
            <div className="space-y-2">
              <p className="text-sm tv-text-sub">
                {t('session.plan', { label: currentPlanLabel })}
              </p>
              {planFeatures.length > 0 ? (
                <ul className="space-y-1.5 text-sm tv-muted">
                  {planFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : null}
              {isFreePlan ? (
                <p className="text-xs leading-relaxed tv-muted">
                  {t('session.betaNote')}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {isFreePlan ? (
              <Button
                variant="secondary"
                block
                onClick={handlePremiumInterest}
              >
                <Mail className="h-4 w-4" /> {t('session.premiumInterest')}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              block
              onClick={() => onExportArchive?.()}
              disabled={exportBusy}
            >
              <Download className="h-4 w-4" /> {exportBusy
                ? t('common:actions.exporting')
                : (role === 'gm' ? t('session.exportGm') : t('session.exportPlayer'))}
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
                <Crown className="h-4 w-4" /> {t('session.ownerPanel')}
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-center text-[10px] tracking-wide tv-muted">
            {t('about.version', { version: __APP_VERSION__ })}
          </p>
        </SettingsFold>

        <SettingsFold
          title={t('backups.title')}
          badge={backupBadge}
          flat={mobileFlatLayout}
          open={isPanelOpen(SETTINGS_PANELS.backups)}
          onToggle={() => togglePanel(SETTINGS_PANELS.backups)}
        >
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-xs tv-muted">
              <History className="h-3.5 w-3.5" />
              {t('backups.hint')}
            </p>

            {hasBackups ? (
              <ul className="space-y-2">
                {profileBackups.map((backup) => (
                  <li
                    key={backup.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm tv-text">{backup.snapshot?.name || t('common:fallbacks.adventurer')}</p>
                      <p className="mt-0.5 truncate text-xs tv-muted">
                        {backup.createdAtLabel || t('common:status.recent')} · {getBackupReasonLabel(backup)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={() => handleRestoreBackup(backup)}
                    >
                      {t('common:actions.restore')}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[var(--tv-radius)] border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] px-3 py-4 text-center text-xs tv-muted">
                {t('backups.empty')}
              </p>
            )}
          </div>
        </SettingsFold>
      </div>
    </ModalFrame>
  );
}

export default SettingsModal;
