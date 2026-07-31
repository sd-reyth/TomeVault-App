import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Backpack,
  BookOpen,
  Check,
  ChevronDown,
  Crown,
  DoorOpen,
  EyeOff,
  KeyRound,
  LayoutGrid,
  List,
  LogOut,
  Loader2,
  Map,
  MessageSquare,
  NotebookPen,
  Plus,
  Scroll,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';
import { getJoinTagLookupVariants } from '../lib/sessionUtils';
import { playFeedback } from '../lib/uiFeedback';
import TreasureIcon from '../ui/TreasureIcon';
import { PLAN_DEFINITIONS, getPlanFeatureSummary } from '../lib/accessPlans';
import {
  getLandingAbout,
  getLandingAudiences,
  getLandingFaq,
  getLandingFeatures,
  getLandingHero,
  getLandingPricing,
} from '../lib/landingContent';
import { useLocale } from '../i18n/LocaleProvider.jsx';
import { useT } from '../i18n/useT';
import { Trans } from 'react-i18next';
import { LANDING_DEFAULT_THEME } from '../lib/appThemes';
import landingBackgroundVideo from '../../Video/landingBG.mp4';
import RuntimeBadge from './RuntimeBadge';
import Button from './Button';
import SegmentedControl from '../ui/SegmentedControl';
import { SHOW_MEMBERSHIP_BACKFILL_UI } from '../lib/supportFlags';
const LANDING_AMBIENCE_ENABLED_STORAGE_KEY = 'tomevault:landing:ambience-enabled';
const LANDING_AMBIENCE_VOLUME_STORAGE_KEY = 'tomevault:landing:ambience-volume';
const DEFAULT_LANDING_AMBIENCE_VOLUME = 12;
const TOMEVAULT_LOGO_SRC = '/references/tomeVaultLogo1.png';
const NUGGET_MARK_SRC = new URL('../../assets/nugget.svg', import.meta.url).href;

const FEATURE_ICONS = {
  handouts: ScrollText,
  chat: MessageSquare,
  combat: Swords,
  notes: BookOpen,
  inventory: Backpack,
  roles: ShieldCheck,
};

const SHOWCASE_NAV_KEYS = [
  { icon: Scroll, key: 'handouts', active: true },
  { icon: MessageSquare, key: 'whispers' },
  { icon: TreasureIcon, key: 'treasury' },
  { icon: Crown, key: 'preparations' },
  { icon: NotebookPen, key: 'chronicles' },
];

const SHOWCASE_HANDOUT_KEYS = [
  {
    key: 'cellarMap',
    type: 'map',
    icon: Map,
    revealed: true,
  },
  {
    key: 'goblinJournal',
    type: 'lore',
    icon: ScrollText,
    revealed: true,
    secretParty: true,
  },
  {
    key: 'sealedScroll',
    type: 'lore',
    icon: ScrollText,
    revealed: false,
    hidden: true,
  },
];


function clampLandingAmbienceVolume(value, fallback = DEFAULT_LANDING_AMBIENCE_VOLUME) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.min(24, Math.round(numericValue)));
}

function loadStoredLandingAmbienceEnabled() {
  if (typeof window === 'undefined') return false;

  return safeLocalStorageGet(LANDING_AMBIENCE_ENABLED_STORAGE_KEY) === '1';
}

function loadStoredLandingAmbienceVolume() {
  if (typeof window === 'undefined') return DEFAULT_LANDING_AMBIENCE_VOLUME;

  return clampLandingAmbienceVolume(safeLocalStorageGet(LANDING_AMBIENCE_VOLUME_STORAGE_KEY));
}

function getLandingJoinContext() {
  if (typeof window === 'undefined') {
    return {
      inviteCode: '',
      isJoinPath: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    inviteCode: String(params.get('code') || params.get('sessionCode') || '').trim(),
    isJoinPath: window.location.pathname.toLowerCase().startsWith('/join'),
  };
}

function buildPricingColumns(audience, landingPricing) {
  const config = landingPricing[audience];
  const freeDef = PLAN_DEFINITIONS[config.free.planId];
  const paidDef = PLAN_DEFINITIONS[config.paid.planId];
  const freeFeatures = getPlanFeatureSummary(freeDef);
  const paidFeatures = getPlanFeatureSummary(paidDef);
  const lockedOnFree = paidFeatures.filter((feature) => !freeFeatures.includes(feature)).slice(0, 4);
  return { config, freeFeatures, paidFeatures, lockedOnFree };
}

function BackfillButton({ onBackfillMemberships, label, disabled = false, t }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setDone(false);
    try {
      await onBackfillMemberships?.();
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  const displayLabel = loading
    ? t('landing:sessionHub.backfillBusy')
    : done
      ? t('landing:sessionHub.backfillDone')
      : (label || t('landing:sessionHub.backfillDefault'));

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={loading || disabled}
      loading={loading}
      title={t('landing:sessionHub.backfillTitle')}
    >
      {displayLabel}
    </Button>
  );
}

export default function LandingScreen({
  onJoin,
  onResumeRecentSession,
  onHideRecentSession,
  onRestoreRecentSession,
  onDeleteRecentSession,
  recentSessions,
  playerName,
  setPlayerName,
  uid,
  authLoading,
  authBusy = false,
  authError,
  onSignInGoogle,
  onSignInEmail,
  onSignUpEmail,
  onSignOut,
  sessionError,
  sessionInfo,
  sessionBusy,
  showSessionHub,
  onBackfillMemberships,
  runtimeBadge,
  theme,
  onThemeChange,
  appUpdateNotice,
  onReloadApp,
}) {
  const { locale } = useLocale();
  const { t } = useT(['landing', 'common', 'auth']);
  const landingHero = useMemo(() => getLandingHero(), [locale]);
  const landingAudiences = useMemo(() => getLandingAudiences(), [locale]);
  const landingFeatures = useMemo(() => getLandingFeatures(), [locale]);
  const landingPricing = useMemo(() => getLandingPricing(), [locale]);
  const landingAbout = useMemo(() => getLandingAbout(), [locale]);
  const landingFaq = useMemo(() => getLandingFaq(), [locale]);
  const landingVideoRef = useRef(null);
  const [sessionCode, setSessionCode] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [gmSessionName, setGmSessionName] = useState('');
  const [gmSessionPin, setGmSessionPin] = useState('');
  const [showHiddenSessions, setShowHiddenSessions] = useState(false);
  const [landingAmbienceEnabled, setLandingAmbienceEnabled] = useState(loadStoredLandingAmbienceEnabled);
  const [landingAmbienceVolume, setLandingAmbienceVolume] = useState(loadStoredLandingAmbienceVolume);
  const [landingAmbienceRequiresGesture, setLandingAmbienceRequiresGesture] = useState(false);

  const [localGmError, setLocalGmError] = useState('');
  const [localPlayerError, setLocalPlayerError] = useState('');

  const [emailMode, setEmailMode] = useState('login');
  const [showEmailAuthForm, setShowEmailAuthForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [localAuthError, setLocalAuthError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSessionNameInput, setDeleteSessionNameInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showGmDeleteWarning, setShowGmDeleteWarning] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const isAuthActionBusy = authBusy || sessionBusy;
  const [pricingAudience, setPricingAudience] = useState('gm');
  const [{ inviteCode, isJoinPath }] = useState(() => getLandingJoinContext());
  const [activeRoleTab, setActiveRoleTab] = useState(() => {
    const initialContext = getLandingJoinContext();
    if (initialContext.inviteCode || initialContext.isJoinPath) return 'player';

    if (typeof window !== 'undefined') {
      const storedRole = safeLocalStorageGet('tv_landing_role');
      if (storedRole === 'gm' || storedRole === 'player') return storedRole;
    }

    return 'player';
  });
  const [rolePreferenceLocked, setRolePreferenceLocked] = useState(() => {
    const initialContext = getLandingJoinContext();
    if (initialContext.inviteCode || initialContext.isJoinPath) return true;

    if (typeof window !== 'undefined') {
      const storedRole = safeLocalStorageGet('tv_landing_role');
      return storedRole === 'gm' || storedRole === 'player';
    }

    return false;
  });

  const generateSessionCode = () => {
    const words = ['DRAAK', 'WOLF', 'ZWAARD', 'SCHILD', 'MAGIE', 'KROON', 'RAAF', 'SCHADUW', 'VUUR', 'KELK'];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#${word}-${num}`;
  };

  const handleGmCreate = (event) => {
    setLocalGmError('');
    if (!uid) {
      setLocalGmError(t('landing:auth.errors.loginRequiredGm'));
      return;
    }

    const sessionName = String(gmSessionName || '').trim() || generateSessionCode();
    const pin = String(gmSessionPin || '').trim();
    if (!/^\d{4,8}$/.test(pin)) {
      setLocalGmError(t('landing:auth.errors.pinInvalid'));
      return;
    }

    playFeedback({ sound: 'paper', element: event?.currentTarget, variant: 'gold' });
    onJoin('gm', sessionName, {
      skipPinPrompt: true,
      defaultPin: pin,
      forceSessionName: sessionName,
    });
  };

  const knownJoinVariants = getJoinTagLookupVariants(sessionCode);
  const knownRecentMatch = (recentSessions || []).find((s) => {
    if (!s || s.status === 'hidden') return false;
    const recVariants = getJoinTagLookupVariants(s.joinTag || s.sessionId);
    return recVariants.some((v) => knownJoinVariants.includes(v));
  });
  const canJoinWithoutPin = Boolean(knownRecentMatch);

  const handlePlayerJoin = (event) => {
    setLocalPlayerError('');
    if (!uid) {
      setLocalPlayerError(t('landing:auth.errors.loginRequiredPlayer'));
      return;
    }
    if (!playerName.trim() || !sessionCode.trim()) {
      setLocalPlayerError(t('landing:auth.errors.playerFieldsRequired'));
      return;
    }
    if (!canJoinWithoutPin && !/^\d{4,8}$/.test(sessionPin.trim())) {
      setLocalPlayerError(t('landing:auth.errors.pinInvalid'));
      return;
    }
    playFeedback({ sound: 'paper', element: event?.currentTarget, variant: 'gold' });
    onJoin('player', sessionCode.toUpperCase(), {
      pin: sessionPin.trim(),
      skipPin: canJoinWithoutPin,
      playerName,
    });
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLocalAuthError('');

    if (!email.trim() || !password.trim()) {
      setLocalAuthError(t('landing:auth.errors.emailPasswordRequired'));
      return;
    }

    if (emailMode === 'signup') {
      if (password.length < 6) {
        setLocalAuthError(t('landing:auth.errors.passwordTooShort'));
        return;
      }
      if (password !== confirmPassword) {
        setLocalAuthError(t('landing:auth.errors.passwordMismatch'));
        return;
      }
      await onSignUpEmail({ name: authName, email, password });
    } else {
      await onSignInEmail({ email, password });
    }
  };

  const visibleRecentSessions = (recentSessions || []).filter(
    (s) => showHiddenSessions || s.status !== 'hidden'
  );
  const hiddenRecentCount = (recentSessions || []).filter((s) => s.status === 'hidden').length;
  const displayedRecentSessions = visibleRecentSessions.slice(0, 8);
  const activeRecentSessions = (recentSessions || []).filter((s) => s.status !== 'hidden');
  const gmRecentCount = activeRecentSessions.filter((s) => s.role === 'dm').length;
  const playerRecentCount = activeRecentSessions.filter((s) => s.role !== 'dm').length;
  const resolvedLandingTheme = LANDING_DEFAULT_THEME;

  useEffect(() => {
    if (inviteCode) {
      setSessionCode((current) => current || inviteCode.toUpperCase());
      setActiveRoleTab('player');
      setRolePreferenceLocked(true);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (!showSessionHub || rolePreferenceLocked) return;

    if (gmRecentCount > 0 && playerRecentCount === 0) {
      setActiveRoleTab('gm');
      return;
    }

    if (playerRecentCount > 0) {
      setActiveRoleTab('player');
    }
  }, [gmRecentCount, playerRecentCount, rolePreferenceLocked, showSessionHub]);

  useEffect(() => {
    if (typeof window === 'undefined' || !rolePreferenceLocked) return;
    safeLocalStorageSet('tv_landing_role', activeRoleTab);
  }, [activeRoleTab, rolePreferenceLocked]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    safeLocalStorageSet(LANDING_AMBIENCE_ENABLED_STORAGE_KEY, landingAmbienceEnabled ? '1' : '0');
  }, [landingAmbienceEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    safeLocalStorageSet(LANDING_AMBIENCE_VOLUME_STORAGE_KEY, String(landingAmbienceVolume));
  }, [landingAmbienceVolume]);

  useEffect(() => {
    if (authError || localAuthError) {
      setShowEmailAuthForm(true);
    }
  }, [authError, localAuthError]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleScroll = () => setNavScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const video = landingVideoRef.current;
    if (!video) return;

    video.volume = clampLandingAmbienceVolume(landingAmbienceVolume) / 100;
    video.defaultMuted = !landingAmbienceEnabled;
    video.muted = !landingAmbienceEnabled;

    const playAttempt = video.play();
    if (!playAttempt || typeof playAttempt.then !== 'function') {
      return;
    }

    playAttempt
      .then(() => {
        if (landingAmbienceEnabled) {
          setLandingAmbienceRequiresGesture(false);
        }
      })
      .catch(() => {
        if (!landingAmbienceEnabled) return;
        video.muted = true;
        setLandingAmbienceEnabled(false);
        setLandingAmbienceRequiresGesture(true);
      });
  }, [landingAmbienceEnabled, landingAmbienceVolume]);

  const handleRoleToggle = (nextRole) => {
    setActiveRoleTab(nextRole);
    setRolePreferenceLocked(true);
  };

  const handleToggleLandingAmbience = async () => {
    const video = landingVideoRef.current;
    if (!video) {
      setLandingAmbienceEnabled((current) => !current);
      return;
    }

    if (landingAmbienceEnabled) {
      video.muted = true;
      setLandingAmbienceEnabled(false);
      setLandingAmbienceRequiresGesture(false);
      return;
    }

    try {
      video.muted = false;
      video.volume = clampLandingAmbienceVolume(landingAmbienceVolume) / 100;
      await video.play();
      setLandingAmbienceEnabled(true);
      setLandingAmbienceRequiresGesture(false);
    } catch (_) {
      video.muted = true;
      setLandingAmbienceEnabled(false);
      setLandingAmbienceRequiresGesture(true);
    }
  };

  const handleLandingAmbienceVolumeChange = (event) => {
    const nextVolume = clampLandingAmbienceVolume(event.target.value);
    setLandingAmbienceVolume(nextVolume);

    if (landingVideoRef.current) {
      landingVideoRef.current.volume = nextVolume / 100;
    }
  };

  const scrollToSection = (id) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  };

  const showcaseNav = useMemo(
    () => SHOWCASE_NAV_KEYS.map((item) => ({
      ...item,
      label: t(`showcase.nav.${item.key}`),
    })),
    [t]
  );
  const showcaseHandouts = useMemo(
    () => SHOWCASE_HANDOUT_KEYS.map((item) => ({
      ...item,
      title: t(`showcase.handouts.${item.key}.title`),
      content: t(`showcase.handouts.${item.key}.content`),
    })),
    [t]
  );
  const compactFeatureHighlights = useMemo(() => ([
    { icon: BookOpen, label: t('highlights.handouts') },
    { icon: Wand2, label: t('highlights.realtime') },
    { icon: ShieldCheck, label: t('highlights.roles') },
  ]), [t]);

  const closeDeleteFlow = () => {
    setDeleteTarget(null);
    setDeleteSessionNameInput('');
    setDeleteError('');
    setShowGmDeleteWarning(false);
  };

  const handleOpenDeleteFlow = (session) => {
    setDeleteTarget(session);
    setDeleteSessionNameInput('');
    setDeleteError('');
    setShowGmDeleteWarning(false);
  };

  const handleDeleteNameConfirm = () => {
    if (!deleteTarget) return;
    const expectedName = String(deleteTarget.sessionName || t('common:fallbacks.unnamedSession')).trim();
    if (deleteSessionNameInput.trim() !== expectedName) {
      setDeleteError(t('landing:sessionHub.delete.nameMismatch'));
      return;
    }

    setDeleteError('');
    if (deleteTarget.role === 'dm') {
      setShowGmDeleteWarning(true);
      return;
    }

    onDeleteRecentSession?.(deleteTarget);
    closeDeleteFlow();
  };

  const handleFinalDeleteConfirm = () => {
    if (!deleteTarget) return;
    onDeleteRecentSession?.(deleteTarget);
    closeDeleteFlow();
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const subject = t('landing:contact.subject', { name: contactName || t('landing:contact.unknownName') });
    const body = [
      `${t('landing:contact.namePlaceholder')}: ${contactName || '-'}`,
      `${t('landing:contact.emailPlaceholder')}: ${contactEmail || '-'}`,
      '',
      t('landing:contact.bodyIntro'),
      contactMessage || '-',
    ].join('\n');

    window.location.href = `mailto:hello@tomevault.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handlePremiumInterest = () => {
    const subject = t('landing:marketing.premiumInterestSubject');
    const body = t('landing:marketing.premiumInterestBody');
    window.location.href = `mailto:hello@tomevault.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const pricing = buildPricingColumns(pricingAudience, landingPricing);

  const landingAmbienceDock = (
    <div className={`lp-ambience ${landingAmbienceEnabled ? 'lp-ambience--open' : ''}`}>
      <button
        type="button"
        onClick={handleToggleLandingAmbience}
        title={t('landing:ambience.toggleTitle')}
        aria-label={landingAmbienceEnabled ? t('landing:ambience.mute') : t('landing:ambience.unmute')}
        aria-pressed={landingAmbienceEnabled}
        className="lp-ambience-toggle tv-toolbar-icon-btn"
      >
        {landingAmbienceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      {landingAmbienceEnabled ? (
        <input
          type="range"
          min="0"
          max="24"
          step="1"
          value={landingAmbienceVolume}
          onChange={handleLandingAmbienceVolumeChange}
          className="lp-ambience-slider ambience-slider"
          aria-label={t('landing:ambience.volumeAria')}
        />
      ) : null}
    </div>
  );

  const contactFormMarkup = (
    <form onSubmit={handleContactSubmit} className="grid gap-3 md:grid-cols-2 text-left">
      <input
        type="text"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        placeholder={t('landing:contact.namePlaceholder')}
        className="tv-field"
      />
      <input
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        placeholder={t('landing:contact.emailPlaceholder')}
        className="tv-field"
      />
      <textarea
        value={contactMessage}
        onChange={(e) => setContactMessage(e.target.value)}
        rows={4}
        placeholder={t('landing:contact.messagePlaceholder')}
        className="tv-field md:col-span-2 resize-none"
      />
      <button type="submit" className="tv-button-primary md:col-span-2">
        {t('landing:contact.submit')}
      </button>
    </form>
  );

  const contactFormPanel = showContactForm ? (
    <div className="lp-footer-contact">
      <div className="lp-card p-4 md:p-5">{contactFormMarkup}</div>
    </div>
  ) : null;

  const loginCard = (
    <div className="lp-card lp-hero-login-card w-full p-5 text-left md:p-6">
      <div className="tv-label text-center">{t('landing:auth.title')}</div>
      <p className="lp-hero-login-lead mt-2 text-center">
        {t('landing:auth.lead')}
      </p>
      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={onSignInGoogle}
          disabled={isAuthActionBusy}
          className="tv-button-primary h-11 w-full rounded-xl font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-60"
        >
          {authBusy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('landing:auth.busy')}
            </span>
          ) : (
            t('landing:auth.google')
          )}
        </button>
      </div>

      {inviteCode || isJoinPath ? (
        <div className="mt-4 tv-alert-info rounded-xl px-4 py-3 text-sm font-story leading-relaxed">
          {t('landing:auth.inviteRecognized', {
            codeSuffix: inviteCode ? t('landing:auth.inviteCodeSuffix', { code: inviteCode.toUpperCase() }) : '',
          })}
        </div>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowEmailAuthForm((value) => !value)}
          className="tv-entry-action h-11 w-full border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text"
        >
          {showEmailAuthForm ? t('landing:auth.hideEmail') : t('landing:auth.useEmail')}
        </button>
      </div>

      {showEmailAuthForm ? (
        <form onSubmit={handleEmailAuth} className="mt-4 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-4">
          <div className="flex rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-1">
            <button
              type="button"
              onClick={() => setEmailMode('login')}
              className={`flex-1 rounded-xl px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${emailMode === 'login' ? 'tv-panel-inset tv-text' : 'tv-text-sub hover:tv-text'}`}
            >
              {t('landing:auth.loginTab')}
            </button>
            <button
              type="button"
              onClick={() => setEmailMode('signup')}
              className={`flex-1 rounded-xl px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${emailMode === 'signup' ? 'tv-panel-inset tv-text' : 'tv-text-sub hover:tv-text'}`}
            >
              {t('landing:auth.signupTab')}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {emailMode === 'signup' ? (
              <input
                type="text"
                placeholder={t('landing:auth.displayNamePlaceholder')}
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="tv-field"
              />
            ) : null}
            <input
              type="email"
              placeholder={t('landing:auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tv-field"
            />
            <input
              type="password"
              placeholder={t('landing:auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tv-field"
            />
            {emailMode === 'signup' ? (
              <input
                type="password"
                placeholder={t('landing:auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="tv-field"
              />
            ) : null}
            <button
              type="submit"
              disabled={isAuthActionBusy}
              className="tv-button-secondary w-full disabled:opacity-60"
            >
              {authBusy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('landing:auth.busy')}
                </span>
              ) : (
                emailMode === 'signup' ? t('landing:auth.signupSubmit') : t('landing:auth.loginSubmit')
              )}
            </button>
          </div>
        </form>
      ) : null}

      {(authError || localAuthError) ? (
        <div className="mt-4 rounded-xl tv-tone-enemy-surface px-4 py-3 text-sm">
          {localAuthError || authError}
        </div>
      ) : null}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // LOGGED-OUT MARKETING SITE
  // ─────────────────────────────────────────────────────────────
  if (!uid) {
    return (
      <div
        data-theme={resolvedLandingTheme}
        data-landing-theme={resolvedLandingTheme}
        className="lp-root tv-entry-root bg-texture"
      >
        <div className="landing-video-backdrop" aria-hidden="true">
          <video
            ref={landingVideoRef}
            className="landing-video-element"
            src={landingBackgroundVideo}
            autoPlay
            loop
            playsInline
            muted
            preload="auto"
            disablePictureInPicture
          />
        </div>
        <div className="lp-scrim" aria-hidden="true" />

        {runtimeBadge ? (
          <div className="lp-runtime-badge fixed bottom-4 left-4 z-40">
            <RuntimeBadge runtimeBadge={runtimeBadge} compact />
          </div>
        ) : null}

        {appUpdateNotice ? (
          <div className="tv-alert-warning fixed left-4 right-4 top-20 z-40 mx-auto max-w-4xl rounded-xl px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">{t('common:updateBanner.message')}</p>
              <button
                type="button"
                onClick={() => onReloadApp?.()}
                className="tv-satisfy-pop rounded-lg border border-[color-mix(in_srgb,var(--tv-status-warning),transparent_42%)] tv-surface-raised px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition tv-hover-surface"
              >
                {t('common:updateBanner.refresh')}
              </button>
            </div>
          </div>
        ) : null}

        {/* ─── Top navigation ─── */}
        <nav className="lp-nav" data-scrolled={navScrolled ? 'true' : 'false'}>
          <div className="lp-nav-inner">
            <button type="button" className="lp-brand" onClick={() => scrollToSection('top')}>
              <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="lp-brand-mark" />
              <span className="lp-brand-word">TomeVault</span>
            </button>

            <div className="lp-nav-links">
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('functies')}>{t('landing:nav.features')}</button>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('showcase')}>{t('landing:nav.showcase')}</button>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('prijzen')}>{t('landing:nav.pricing')}</button>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('over')}>{t('landing:nav.about')}</button>
            </div>

            <div className="lp-nav-actions">
              <button type="button" className="lp-btn lp-btn--primary" onClick={() => scrollToSection('inloggen')}>
                {t('landing:nav.login')}
              </button>
            </div>
          </div>
        </nav>

        {/* ─── Hero + inloggen ─── */}
        <header id="top" className="lp-hero">
          <div className="lp-shell lp-hero-shell">
            <div className="lp-hero-stack">
              <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="lp-hero-logo tv-logo-breathe" />
              <div className="lp-eyebrow">{landingHero.eyebrow}</div>
              <h1 className="lp-hero-title">
                TOME<span className="lp-accent">VAULT</span>
              </h1>
              <p className="lp-hero-sub">{landingHero.subtitle}</p>
              <div className="lp-trust-row">
                {compactFeatureHighlights.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <span key={feature.label} className="tv-entry-chip border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text">
                      <Icon className="h-3.5 w-3.5 tv-accent" />
                      {feature.label}
                    </span>
                  );
                })}
              </div>

              <div id="inloggen" className="lp-hero-login">
                {loginCard}
              </div>

              <div className="lp-hero-cta">
                <button type="button" className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => scrollToSection('functies')}>
                  {landingHero.secondaryCta}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Voor wie ─── */}
        <section className="lp-section">
          <div className="lp-shell lp-shell--narrow">
            <div className="lp-section-head">
              <div className="lp-eyebrow">{t('landing:marketing.audiencesEyebrow')}</div>
              <h2 className="lp-h2">{t('landing:marketing.audiencesTitle')}</h2>
              <div className="lp-rule" />
            </div>
            <div className="lp-audience-grid">
              {landingAudiences.map((audience) => (
                <article key={audience.id} className="lp-card lp-audience-card">
                  <div className="lp-feature-icon">
                    {audience.id === 'gm' ? <Crown className="h-6 w-6" /> : <Swords className="h-6 w-6" />}
                  </div>
                  <div className="lp-audience-body">
                    <h3 className="lp-feature-title">{audience.title}</h3>
                    <p className="lp-feature-text">{audience.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Functies ─── */}
        <section id="functies" className="lp-section">
          <div className="lp-shell lp-shell--narrow">
            <div className="lp-section-head">
              <div className="lp-eyebrow">{t('landing:marketing.featuresEyebrow')}</div>
              <h2 className="lp-h2">{t('landing:marketing.featuresTitle')}</h2>
              <p className="lp-lead">
                {t('landing:marketing.featuresLead')}
              </p>
            </div>
            <div className="lp-feature-list">
              {landingFeatures.map((feature) => {
                const Icon = FEATURE_ICONS[feature.icon] || Sparkles;
                return (
                  <article key={feature.title} className="lp-feature-item">
                    <Icon className="lp-feature-item-icon h-5 w-5" aria-hidden="true" />
                    <div className="lp-feature-item-body">
                      <h3 className="lp-feature-item-title">{feature.title}</h3>
                      <p className="lp-feature-item-text">{feature.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Showcase ─── */}
        <section id="showcase" className="lp-section">
          <div className="lp-shell lp-shell--narrow">
            <div className="lp-section-head">
              <div className="lp-eyebrow">{t('landing:marketing.showcaseEyebrow')}</div>
              <h2 className="lp-h2">{t('landing:marketing.showcaseTitle')}</h2>
              <p className="lp-lead">
                {t('landing:marketing.showcaseLead')}
              </p>
            </div>

            <div className="lp-card lp-showcase">
              <div className="lp-showcase-bar">
                <span className="lp-showcase-dots">
                  <span className="lp-showcase-dot" />
                  <span className="lp-showcase-dot" />
                  <span className="lp-showcase-dot" />
                </span>
                <span className="lp-showcase-title">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t('landing:marketing.showcaseCampaign')}
                </span>
              </div>

              <div className="lp-showcase-app">
                <aside className="lp-showcase-nav tv-nav-bg">
                  {showcaseNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`lp-showcase-nav-item ${item.active ? 'lp-showcase-nav-item--active' : ''}`}
                      >
                        <Icon className="lp-showcase-nav-icon h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                  <div className="lp-showcase-nav-spacer" />
                  <div className="lp-showcase-nav-foot">
                    <span className="lp-showcase-chip">{t('common:roles.gmShort')}</span>
                    <span className="lp-showcase-chip">{t('landing:marketing.showcaseSessionChip')}</span>
                  </div>
                </aside>

                <div className="lp-showcase-main lp-showcase-handouts">
                  <div className="lp-showcase-handouts-head">
                    <span className="lp-showcase-handouts-title">
                      <Scroll className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      {t('landing:showcase.nav.handouts')}
                    </span>
                    <div className="lp-showcase-handouts-tools">
                      <div className="tv-view-toolbar flex items-center rounded-xl p-1">
                        <span className="tv-view-toolbar__btn" aria-hidden>
                          <List className="h-4 w-4" />
                        </span>
                        <span className="tv-view-toolbar__btn tv-view-toolbar__btn--active" aria-hidden>
                          <LayoutGrid className="h-4 w-4" />
                        </span>
                      </div>
                      <span className="lp-showcase-handouts-add tv-toolbar-icon-btn tv-button-primary" aria-hidden>
                        <Plus className="h-4 w-4" />
                      </span>
                    </div>
                  </div>

                  <div className="lp-showcase-handouts-body">
                    <div className="lp-showcase-handouts-grid">
                      {showcaseHandouts.map((handout) => {
                        const Icon = handout.icon;
                        return (
                          <article
                            key={handout.title}
                            className={`lp-showcase-handout tv-handout-card flex flex-col overflow-hidden rounded-2xl shadow-lg ${handout.revealed ? '' : 'tv-handout-card--hidden'}`}
                          >
                            <div className="tv-handout-media tv-image-frame aspect-[16/9] w-full border-b relative flex shrink-0 items-center justify-center overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] via-[color-mix(in_srgb,var(--tv-bg-surface),transparent_20%)] to-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_10%)]" />
                              <Icon className="relative z-10 h-10 w-10 tv-muted drop-shadow-md md:h-12 md:w-12" strokeWidth={1.5} aria-hidden />
                            </div>
                            <div className="relative z-10 flex flex-1 flex-col overflow-hidden p-4 md:p-5">
                              <div className="mb-2 flex flex-wrap items-center gap-1.5 md:mb-3">
                                <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--type">{handout.type}</span>
                                {handout.secretParty ? (
                                  <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--secret">
                                    <KeyRound className="h-2.5 w-2.5" aria-hidden /> {t('landing:showcase.handouts.partySeesSecret')}
                                  </span>
                                ) : null}
                                {handout.hidden ? (
                                  <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--muted">
                                    <EyeOff className="h-2.5 w-2.5" aria-hidden /> {t('landing:showcase.handouts.hidden')}
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="mb-2 text-base font-medium leading-snug tracking-[0.08em] tv-text md:mb-3 md:text-lg">
                                {handout.title}
                              </h3>
                              <p className="tv-muted line-clamp-3 text-xs leading-relaxed md:text-sm">
                                {handout.content}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Prijzen ─── */}
        <section id="prijzen" className="lp-section lp-section--band">
          <div className="lp-shell lp-shell--narrow">
            <div className="lp-section-head">
              <div className="lp-eyebrow">{t('landing:marketing.pricingEyebrow')}</div>
              <h2 className="lp-h2">{t('landing:marketing.pricingTitle')}</h2>
              <p className="lp-lead">
                {t('landing:marketing.pricingLead')}
              </p>
            </div>

            <div className="mt-7 flex justify-center">
              <div className="tv-role-toggle">
                {landingAudiences.map((audience) => (
                  <button
                    key={audience.id}
                    type="button"
                    onClick={() => setPricingAudience(audience.id)}
                    className={`tv-role-toggle-btn ${pricingAudience === audience.id ? 'tv-role-toggle-btn--active' : ''}`}
                  >
                    {audience.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lp-price-grid">
              {/* Free plan */}
              <article className="lp-card lp-price-card">
                <div className="lp-price-name">{pricing.config.free.name}</div>
                <p className="lp-price-tagline">{pricing.config.free.tagline}</p>
                <div className="lp-price-amount-row">
                  <span className="lp-price-amount">{pricing.config.free.price}</span>
                  <span className="lp-price-period">{pricing.config.free.period}</span>
                </div>
                <div className="lp-price-features">
                  {pricing.freeFeatures.map((feature) => (
                    <div key={feature} className="lp-price-feature">
                      <Check className="h-4 w-4" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {pricing.lockedOnFree.map((feature) => (
                    <div key={feature} className="lp-price-feature lp-price-feature--muted">
                      <X className="h-4 w-4" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection('inloggen')}
                  className="lp-btn lp-btn--ghost lp-btn--block lp-price-cta"
                >
                  {pricing.config.free.cta}
                </button>
              </article>

              {/* Paid plan */}
              <article className="lp-card lp-price-card lp-price-card--featured">
                {pricing.config.paid.badge ? (
                  <span className="lp-price-badge">
                    <Sparkles className="h-3.5 w-3.5" />
                    {pricing.config.paid.badge}
                  </span>
                ) : null}
                <div className="lp-price-name">{pricing.config.paid.name}</div>
                <p className="lp-price-tagline">{pricing.config.paid.tagline}</p>
                <div className="lp-price-amount-row">
                  <span className="lp-price-amount">{pricing.config.paid.price}</span>
                  <span className="lp-price-period">{pricing.config.paid.period}</span>
                </div>
                {pricing.config.paid.altPrice ? (
                  <div className="lp-price-alt">{pricing.config.paid.altPrice}</div>
                ) : null}
                <div className="lp-price-features">
                  {pricing.paidFeatures.map((feature) => (
                    <div key={feature} className="lp-price-feature">
                      <Check className="h-4 w-4" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection('inloggen')}
                  className="lp-btn lp-btn--primary lp-btn--block lp-price-cta"
                >
                  {pricing.config.paid.cta}
                </button>
              </article>
            </div>

            <p className="lp-price-note">
              {t('landing:marketing.pricingNote')}
            </p>
            <div className="lp-price-interest">
              <button
                type="button"
                className="lp-btn lp-btn--ghost"
                onClick={handlePremiumInterest}
              >
                {t('landing:marketing.premiumInterest')}
              </button>
            </div>
          </div>
        </section>

        {/* ─── Over + FAQ ─── */}
        <section id="over" className="lp-section lp-section--band">
          <div className="lp-shell lp-shell--narrow">
            <div className="lp-section-head">
              <div className="lp-eyebrow">{landingAbout.eyebrow}</div>
              <h2 className="lp-h2">{landingAbout.title}</h2>
              <p className="lp-lead">{landingAbout.body}</p>
            </div>

            <div className="lp-faq">
              {landingFaq.map((item) => (
                <details key={item.q} className="lp-card lp-faq-item">
                  <summary className="lp-faq-q">
                    {item.q}
                    <ChevronDown className="lp-faq-chevron h-5 w-5" />
                  </summary>
                  <div className="lp-faq-a">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <div className="lp-brand">
              <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="lp-brand-mark" />
              <span className="lp-brand-word">TomeVault</span>
            </div>
            <div className="lp-footer-links">
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('functies')}>{t('landing:nav.features')}</button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('prijzen')}>{t('landing:nav.pricing')}</button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('over')}>{t('landing:nav.about')}</button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('inloggen')}>{t('landing:nav.login')}</button>
              <button type="button" className="lp-footer-link" onClick={() => setShowContactForm((value) => !value)}>
                {showContactForm ? t('landing:contact.toggleClose') : t('landing:contact.toggleOpen')}
              </button>
            </div>
            <div className="lp-footer-legal">
              <span className="lp-footer-legal-copy">
                {t('landing:marketing.footerTagline', { year: new Date().getFullYear() })}
              </span>
              <span className="lp-footer-credit">
                <img src={NUGGET_MARK_SRC} alt="" className="lp-footer-credit-mark" aria-hidden="true" />
                {t('landing:marketing.forgedBy')}{' '}
                <span className="lp-footer-credit-name">SneezingDonkey</span>
              </span>
            </div>
          </div>
          {contactFormPanel ? (
            <div className="lp-shell lp-shell--narrow lp-footer-contact-shell">
              {contactFormPanel}
            </div>
          ) : null}
        </footer>

        {/* ─── Ambience dock ─── */}
        <div className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
          {landingAmbienceDock}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LOGGED-IN SESSION EXPERIENCE
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      data-theme={resolvedLandingTheme}
      data-landing-theme={resolvedLandingTheme}
      className="lp-root tv-entry-root bg-texture"
    >
      <div className="landing-video-backdrop" aria-hidden="true">
        <video
          ref={landingVideoRef}
          className="landing-video-element"
          src={landingBackgroundVideo}
          autoPlay
          loop
          playsInline
          muted
          preload="auto"
          disablePictureInPicture
        />
      </div>
      <div className="lp-scrim" aria-hidden="true" />

      {runtimeBadge ? (
        <div className="lp-runtime-badge fixed bottom-4 left-4 z-30">
          <RuntimeBadge runtimeBadge={runtimeBadge} compact />
        </div>
      ) : null}

      {appUpdateNotice ? (
        <div className="tv-alert-warning absolute left-4 right-4 top-4 z-30 mx-auto max-w-4xl rounded-xl px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{t('common:updateBanner.message')}</p>
            <button
              type="button"
              onClick={() => onReloadApp?.()}
              className="tv-satisfy-pop rounded-lg border border-[color-mix(in_srgb,var(--tv-status-warning),transparent_42%)] tv-surface-raised px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition tv-hover-surface"
            >
              {t('common:updateBanner.refresh')}
            </button>
          </div>
        </div>
      ) : null}

      {/* Session top bar */}
      <div className="lp-session-topbar">
        <div className="lp-brand">
          <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="lp-brand-mark" />
          <span className="lp-brand-word">TomeVault</span>
        </div>
        {showSessionHub ? (
          <button
            type="button"
            onClick={() => onSignOut?.()}
            disabled={isAuthActionBusy}
            className="tv-entry-action tv-tone-enemy-button disabled:opacity-60"
          >
            {authBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('landing:sessionHub.signOutBusy')}
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                {t('landing:sessionHub.signOut')}
              </>
            )}
          </button>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-14 pt-4 sm:px-6 md:gap-6">
        {/* Hero */}
        <section className="text-center">
          <div className="flex justify-center">
            <div className="landing-logo-shell h-16 w-16 md:h-20 md:w-20">
              <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="landing-logo" />
            </div>
          </div>
          {showSessionHub ? (
            <>
              <h1 className="mt-5 text-4xl font-fantasy tracking-[0.08em] tv-text sm:text-5xl">
                {t('landing:sessionHub.chooseNext')}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-base md:text-lg tv-text-sub font-story leading-relaxed">
                {t('landing:sessionHub.chooseNextLead')}
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-4xl font-fantasy tracking-[0.08em] tv-text sm:text-5xl">
                {t('landing:sessionHub.pleaseWait')}
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-base md:text-lg tv-text-sub font-story leading-relaxed">
                {sessionBusy
                  ? t('landing:sessionHub.openingRecentBusy')
                  : t('landing:sessionHub.loadingSessions')}
              </p>
              <div className="mt-5 flex justify-center">
                {SHOW_MEMBERSHIP_BACKFILL_UI ? (
                  <BackfillButton onBackfillMemberships={onBackfillMemberships} t={t} />
                ) : null}
              </div>
            </>
          )}
        </section>

        {sessionError ? (
          <div className="mx-auto w-full max-w-3xl tv-alert-danger rounded-xl px-4 py-3 text-sm">
            {sessionError}
          </div>
        ) : null}

        {sessionInfo ? (
          <div className="mx-auto w-full max-w-3xl tv-alert-warning rounded-xl px-4 py-3 text-sm">
            {sessionInfo}
          </div>
        ) : null}

        {/* Recent sessions */}
        {showSessionHub ? (
          <section className="mx-auto w-full max-w-3xl">
            <div className="tv-entry-hero-card p-5 md:p-6">
              <div className="flex items-center justify-center gap-3 text-center">
                <h2 className="tv-title-section text-base md:text-lg">{t('landing:sessionHub.recentSessions')}</h2>
              </div>

              {(SHOW_MEMBERSHIP_BACKFILL_UI || hiddenRecentCount > 0) ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SHOW_MEMBERSHIP_BACKFILL_UI ? (
                    <BackfillButton
                      onBackfillMemberships={onBackfillMemberships}
                      label={t('landing:sessionHub.backfillOld')}
                      disabled={sessionBusy}
                      t={t}
                    />
                  ) : null}
                  {hiddenRecentCount > 0 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowHiddenSessions((value) => !value)}
                    >
                      {showHiddenSessions ? t('landing:sessionHub.hideHidden') : t('landing:sessionHub.showHidden', { count: hiddenRecentCount })}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {displayedRecentSessions.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-6 text-center">
                  <p className="text-sm tv-text font-story italic">{t('landing:sessionHub.noRecent')}</p>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {displayedRecentSessions.map((session) => {
                    const displayCode = session.joinTag || session.sessionId;
                    const roleLabel = session.role === 'dm' ? t('common:roles.gmShort') : t('common:roles.player');
                    const defaultAsRole = session.role === 'dm' ? 'gm' : 'player';
                    const isHidden = session.status === 'hidden';
                    const roleChipClass = session.role === 'dm' ? 'tv-role-chip--gm' : 'tv-role-chip--player';
                    const sessionCardClass = session.role === 'dm' ? 'tv-session-card--gm' : 'tv-session-card--player';
                    const sessionActionClass = session.role === 'dm' ? 'tv-session-action--gm' : 'tv-session-action--player';

                    return (
                      <article
                        key={session.sessionId}
                        className={`tv-session-card ${sessionCardClass} ${isHidden ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-lg font-fantasy tv-text">{session.sessionName || t('common:fallbacks.unnamedSession')}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] tv-muted">
                              <span>{t('landing:sessionHub.codeLabel', { code: displayCode })}</span>
                              <span className="tv-muted">•</span>
                              <span>{session.updatedAtLabel}</span>
                            </div>
                          </div>
                          <span className={`tv-entry-chip ${roleChipClass}`}>{roleLabel}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              playFeedback({ sound: 'paper', element: event.currentTarget, variant: 'gold' });
                              onResumeRecentSession?.(session, defaultAsRole);
                            }}
                            disabled={sessionBusy}
                            className={`tv-satisfy-pop inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-fantasy tracking-[0.16em] transition-all disabled:opacity-50 ${sessionActionClass}`}
                          >
                            <DoorOpen className="h-4 w-4" />
                            {t('landing:sessionHub.resume')}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => (isHidden ? onRestoreRecentSession?.(session.sessionId) : onHideRecentSession?.(session.sessionId))}
                            disabled={sessionBusy}
                            className={`tv-entry-action border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] ${isHidden ? 'tv-alert-warning' : 'tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text'}`}
                            title={isHidden ? t('landing:sessionHub.restoreList') : t('landing:sessionHub.hideFromList')}
                          >
                            {isHidden ? t('landing:sessionHub.restore') : t('landing:sessionHub.hide')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteFlow(session)}
                            disabled={sessionBusy}
                            className="tv-alert-danger flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:brightness-110 disabled:opacity-50"
                            title={t('landing:sessionHub.deleteTitle')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Join / create hub */}
        {showSessionHub ? (
          <section className="tv-entry-hero-card mx-auto w-full max-w-3xl p-5 md:p-6">
            <div className="text-center">
              <h2 className="tv-title-section text-base md:text-lg">
                {activeRoleTab === 'gm' ? t('landing:sessionHub.newSession') : t('landing:sessionHub.joinSession')}
              </h2>

              <div className="mx-auto mt-4 max-w-xs">
                <SegmentedControl
                  value={activeRoleTab}
                  options={[
                    { value: 'player', label: t('common:roles.player') },
                    { value: 'gm', label: t('common:roles.gmShort') },
                  ]}
                  onChange={handleRoleToggle}
                  block
                  aria-label={t('landing:sessionHub.roleAria')}
                />
              </div>
            </div>

            <div className="mx-auto mt-5 w-full max-w-[34rem]">
              {activeRoleTab === 'gm' ? (
                <div className="grid gap-4">
                  <div>
                    <label className="tv-label mb-1.5 block" htmlFor="gm-session-name">
                      {t('landing:sessionHub.sessionName')}
                    </label>
                    <input
                      id="gm-session-name"
                      type="text"
                      placeholder={t('landing:sessionHub.sessionNamePlaceholder')}
                      value={gmSessionName}
                      onChange={(e) => setGmSessionName(e.target.value)}
                      className="tv-field"
                    />
                  </div>
                  <div>
                    <label className="tv-label mb-1.5 block" htmlFor="gm-session-pin">
                      {t('landing:sessionHub.pin')}
                    </label>
                    <input
                      id="gm-session-pin"
                      type="password"
                      inputMode="numeric"
                      placeholder={t('landing:sessionHub.pinPlaceholder')}
                      value={gmSessionPin}
                      onChange={(e) => setGmSessionPin(e.target.value)}
                      className="tv-field"
                    />
                  </div>
                  {localGmError ? (
                    <p className="rounded-lg tv-tone-enemy-surface px-4 py-2.5 font-story text-sm">
                      {localGmError}
                    </p>
                  ) : null}
                  <Button
                    variant="primary"
                    block
                    icon={Plus}
                    onClick={handleGmCreate}
                    disabled={!uid || sessionBusy}
                  >
                    {t('landing:sessionHub.startSession')}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div>
                    <label className="tv-label mb-1.5 block" htmlFor="player-name">
                      {t('landing:sessionHub.characterName')}
                    </label>
                    <input
                      id="player-name"
                      type="text"
                      placeholder={t('landing:sessionHub.characterPlaceholder')}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="tv-field"
                    />
                  </div>
                  <div>
                    <label className="tv-label mb-1.5 block" htmlFor="session-code">
                      {t('landing:sessionHub.sessionCode')}
                    </label>
                    <input
                      id="session-code"
                      type="text"
                      placeholder={t('landing:sessionHub.sessionCodePlaceholder')}
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="tv-field uppercase"
                    />
                  </div>
                  <div>
                    <label className="tv-label mb-1.5 block" htmlFor="session-pin">
                      {t('landing:sessionHub.pin')}
                    </label>
                    <input
                      id="session-pin"
                      type="password"
                      inputMode="numeric"
                      placeholder={canJoinWithoutPin ? t('landing:sessionHub.pinKnownSession') : t('landing:sessionHub.pinPlaceholder')}
                      value={sessionPin}
                      onChange={(e) => setSessionPin(e.target.value)}
                      disabled={canJoinWithoutPin}
                      className="tv-field disabled:opacity-60"
                    />
                  </div>
                  {canJoinWithoutPin ? (
                    <div className="tv-alert-warning rounded-xl px-4 py-3 text-sm font-story">
                      {t('landing:sessionHub.knownSessionHint')}
                    </div>
                  ) : null}
                  {localPlayerError ? (
                    <p className="rounded-lg tv-tone-enemy-surface px-4 py-2.5 font-story text-sm">
                      {localPlayerError}
                    </p>
                  ) : null}
                  <Button
                    variant="primary"
                    block
                    icon={DoorOpen}
                    onClick={handlePlayerJoin}
                    disabled={!uid || sessionBusy}
                  >
                    {t('landing:sessionHub.join')}
                  </Button>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <div className="lp-hub-footer mt-8 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_55%)] pt-6 text-center">
          <button type="button" className="lp-footer-link" onClick={() => setShowContactForm((value) => !value)}>
            {showContactForm ? t('landing:contact.toggleClose') : t('landing:contact.toggleOpen')}
          </button>
          {contactFormPanel ? (
            <div className="mx-auto mt-4 max-w-xl text-left">{contactFormPanel}</div>
          ) : null}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center tv-backdrop p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-surface shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="tv-surface-faint flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] px-4 py-4">
              <div className="flex items-center gap-2 tv-tone-enemy-text">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-fantasy tracking-wider tv-text">{t('landing:sessionHub.delete.title')}</h3>
              </div>
              <button onClick={closeDeleteFlow} className="tv-muted hover:tv-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!showGmDeleteWarning ? (
              <div className="space-y-4 px-5 py-5">
                <p className="text-sm tv-text font-story leading-relaxed">
                  {t('landing:sessionHub.delete.intro')}
                </p>
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest tv-muted mb-1">{t('landing:sessionHub.delete.confirmLabel')}</div>
                  <div className="font-fantasy tv-text font-bold break-words">{deleteTarget.sessionName || t('common:fallbacks.unnamedSession')}</div>
                </div>
                <input
                  type="text"
                  value={deleteSessionNameInput}
                  onChange={(e) => setDeleteSessionNameInput(e.target.value)}
                  placeholder={t('landing:sessionHub.delete.namePlaceholder')}
                  className="w-full rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5 text-sm tv-text placeholder:tv-muted transition-colors focus:outline-none focus:border-[color-mix(in_srgb,var(--tv-tone-enemy),transparent_40%)]"
                />
                {deleteError && (
                  <div className="rounded-lg tv-tone-enemy-surface px-3 py-2 text-xs">
                    {deleteError}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" block onClick={closeDeleteFlow}>
                    {t('common:actions.cancel')}
                  </Button>
                  <Button variant="danger" block onClick={handleDeleteNameConfirm} disabled={sessionBusy}>
                    {t('common:actions.confirm')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-5 py-5">
                <p className="text-sm tv-text font-story leading-relaxed">
                  {t('landing:sessionHub.delete.gmWarning')}
                </p>
                <div className="rounded-xl tv-tone-enemy-surface px-4 py-3 text-sm font-story leading-relaxed">
                  <Trans
                    i18nKey="landing:sessionHub.delete.gmConfirm"
                    values={{ name: deleteTarget.sessionName || t('common:fallbacks.unnamedSession') }}
                    components={{ strong: <strong /> }}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" block onClick={() => setShowGmDeleteWarning(false)}>
                    {t('landing:sessionHub.delete.back')}
                  </Button>
                  <Button variant="danger" block onClick={handleFinalDeleteConfirm} disabled={sessionBusy}>
                    {t('landing:sessionHub.delete.confirmDelete')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ambience dock */}
      <div className="fixed bottom-4 right-4 z-30 max-w-[calc(100vw-2rem)]">
        {landingAmbienceDock}
      </div>
    </div>
  );
}
