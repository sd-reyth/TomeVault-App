import React, { useEffect, useRef, useState } from 'react';
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
  LANDING_ABOUT,
  LANDING_AUDIENCES,
  LANDING_FAQ,
  LANDING_FEATURES,
  LANDING_HERO,
  LANDING_PRICING,
} from '../lib/landingContent';
import { LANDING_DEFAULT_THEME } from '../lib/appThemes';
import landingBackgroundVideo from '../../Video/landingBG.mp4';
import RuntimeBadge from './RuntimeBadge';
import Button from './Button';
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

const SHOWCASE_NAV = [
  { icon: Scroll, label: 'Handouts', active: true },
  { icon: MessageSquare, label: 'Fluisteringen' },
  { icon: TreasureIcon, label: 'Schatkamer' },
  { icon: Crown, label: 'Voorbereidingen' },
  { icon: NotebookPen, label: 'Kronieken' },
];

const SHOWCASE_HANDOUTS = [
  {
    title: 'Kaart van de Kelder',
    type: 'map',
    content: 'Vier gangen naar het noorden. De zuidelijke deur is verzegeld met runen.',
    icon: Map,
    revealed: true,
  },
  {
    title: 'Journaal van de Goblin Koning',
    type: 'lore',
    content: 'De laatste regels zijn geschreven in een trillende hand…',
    icon: ScrollText,
    revealed: true,
    secretParty: true,
  },
  {
    title: 'De Verzegelde Rol',
    type: 'lore',
    content: 'Nog verborgen voor de spelers tot jij klaar bent om te onthullen.',
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

function buildPricingColumns(audience) {
  const config = LANDING_PRICING[audience];
  const freeDef = PLAN_DEFINITIONS[config.free.planId];
  const paidDef = PLAN_DEFINITIONS[config.paid.planId];
  const freeFeatures = getPlanFeatureSummary(freeDef);
  const paidFeatures = getPlanFeatureSummary(paidDef);
  const lockedOnFree = paidFeatures.filter((feature) => !freeFeatures.includes(feature)).slice(0, 4);
  return { config, freeFeatures, paidFeatures, lockedOnFree };
}

function BackfillButton({ onBackfillMemberships }) {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="tv-entry-action border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text disabled:opacity-70 inline-flex items-center gap-2"
    >
      {loading ? (
        <>
          <svg className="h-3.5 w-3.5 animate-spin tv-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Sessies herstellen…
        </>
      ) : done ? (
        'Klaar — ververs de pagina als je sessie er niet bij staat'
      ) : (
        'Herstel oudere sessies'
      )}
    </button>
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
      setLocalGmError('Log eerst in voordat je een sessie start.');
      return;
    }

    const sessionName = String(gmSessionName || '').trim() || generateSessionCode();
    const pin = String(gmSessionPin || '').trim();
    if (!/^\d{4,8}$/.test(pin)) {
      setLocalGmError('Voer een PIN van 4 tot 8 cijfers in.');
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
      setLocalPlayerError('Log eerst in voordat je een sessie joint.');
      return;
    }
    if (!playerName.trim() || !sessionCode.trim()) {
      setLocalPlayerError('Vul een naam en een geldige sessie-code in.');
      return;
    }
    if (!canJoinWithoutPin && !/^\d{4,8}$/.test(sessionPin.trim())) {
      setLocalPlayerError('Voer een PIN van 4 tot 8 cijfers in.');
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
      setLocalAuthError('Vul e-mail en wachtwoord in.');
      return;
    }

    if (emailMode === 'signup') {
      if (password.length < 6) {
        setLocalAuthError('Wachtwoord moet minimaal 6 tekens hebben.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalAuthError('Wachtwoorden komen niet overeen.');
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

  const compactFeatureHighlights = [
    { icon: BookOpen, label: 'Handouts' },
    { icon: Wand2, label: 'Realtime' },
    { icon: ShieldCheck, label: 'Rollen' },
  ];

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
    const expectedName = String(deleteTarget.sessionName || 'Naamloze Sessie').trim();
    if (deleteSessionNameInput.trim() !== expectedName) {
      setDeleteError('De ingevoerde sessienaam komt niet exact overeen.');
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
    const subject = `Contact via TomeVault website - ${contactName || 'Onbekend'}`;
    const body = [
      `Naam: ${contactName || '-'}`,
      `E-mail: ${contactEmail || '-'}`,
      '',
      'Bericht:',
      contactMessage || '-',
    ].join('\n');

    window.location.href = `mailto:hello@tomevault.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const pricing = buildPricingColumns(pricingAudience);

  const landingAmbienceDock = (
    <div className={`lp-ambience ${landingAmbienceEnabled ? 'lp-ambience--open' : ''}`}>
      <button
        type="button"
        onClick={handleToggleLandingAmbience}
        title="De achtergrondvideo speelt altijd. Geluid blijft zacht en start pas na een tik."
        aria-label={landingAmbienceEnabled ? 'Geluid uitzetten' : 'Geluid aanzetten'}
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
          aria-label="Volume van sfeergeluid"
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
        placeholder="Je naam"
        className="tv-field"
      />
      <input
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        placeholder="E-mail"
        className="tv-field"
      />
      <textarea
        value={contactMessage}
        onChange={(e) => setContactMessage(e.target.value)}
        rows={4}
        placeholder="Bericht"
        className="tv-field md:col-span-2 resize-none"
      />
      <button type="submit" className="tv-button-primary md:col-span-2">
        Verstuur via E-mail
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
      <div className="tv-label text-center">Inloggen</div>
      <p className="lp-hero-login-lead mt-2 text-center">
        Maak gratis een account of log in om je sessies te openen.
      </p>
      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={onSignInGoogle}
          disabled={authLoading || sessionBusy}
          className="tv-button-primary h-11 w-full rounded-xl font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-60"
        >
          Doorgaan met Google
        </button>
      </div>

      {inviteCode || isJoinPath ? (
        <div className="mt-4 tv-alert-info rounded-xl px-4 py-3 text-sm font-story leading-relaxed">
          Uitnodiging herkend{inviteCode ? ` voor ${inviteCode.toUpperCase()}` : ''}. Meld je aan en we houden deze code voor je vast.
        </div>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowEmailAuthForm((value) => !value)}
          className="tv-entry-action h-11 w-full border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text"
        >
          {showEmailAuthForm ? 'Verberg e-mail' : 'Gebruik e-mail'}
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
              Inloggen
            </button>
            <button
              type="button"
              onClick={() => setEmailMode('signup')}
              className={`flex-1 rounded-xl px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${emailMode === 'signup' ? 'tv-panel-inset tv-text' : 'tv-text-sub hover:tv-text'}`}
            >
              Aanmaken
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {emailMode === 'signup' ? (
              <input
                type="text"
                placeholder="Weergavenaam"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="tv-field"
              />
            ) : null}
            <input
              type="email"
              placeholder="jij@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tv-field"
            />
            <input
              type="password"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tv-field"
            />
            {emailMode === 'signup' ? (
              <input
                type="password"
                placeholder="Bevestig wachtwoord"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="tv-field"
              />
            ) : null}
            <button
              type="submit"
              disabled={authLoading || sessionBusy}
              className="tv-button-secondary w-full disabled:opacity-60"
            >
              {emailMode === 'signup' ? 'Account Aanmaken' : 'Inloggen met E-mail'}
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
              <p className="text-sm font-medium">{appUpdateNotice}</p>
              <button
                type="button"
                onClick={() => onReloadApp?.()}
                className="tv-satisfy-pop rounded-lg border border-[color-mix(in_srgb,var(--tv-status-warning),transparent_42%)] tv-surface-raised px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition tv-hover-surface"
              >
                Nu verversen
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
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('functies')}>Functies</button>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('showcase')}>Aan tafel</button>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('prijzen')}>Prijzen</button>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('over')}>Over</button>
            </div>

            <div className="lp-nav-actions">
              <button type="button" className="lp-btn lp-btn--primary" onClick={() => scrollToSection('inloggen')}>
                Inloggen
              </button>
            </div>
          </div>
        </nav>

        {/* ─── Hero + inloggen ─── */}
        <header id="top" className="lp-hero">
          <div className="lp-shell lp-hero-shell">
            <div className="lp-hero-stack">
              <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="lp-hero-logo tv-logo-breathe" />
              <div className="lp-eyebrow">{LANDING_HERO.eyebrow}</div>
              <h1 className="lp-hero-title">
                TOME<span className="lp-accent">VAULT</span>
              </h1>
              <p className="lp-hero-sub">{LANDING_HERO.subtitle}</p>
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

              <p className="lp-hero-or" aria-hidden="true">Of</p>

              <div className="lp-hero-cta">
                <button type="button" className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => scrollToSection('functies')}>
                  {LANDING_HERO.secondaryCta}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Voor wie ─── */}
        <section className="lp-section">
          <div className="lp-shell lp-shell--narrow">
            <div className="lp-section-head">
              <div className="lp-eyebrow">Eén tafel, twee rollen</div>
              <h2 className="lp-h2">Gebouwd voor jouw groep</h2>
              <div className="lp-rule" />
            </div>
            <div className="lp-audience-grid">
              {LANDING_AUDIENCES.map((audience) => (
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
              <div className="lp-eyebrow">Wat biedt de Waard</div>
              <h2 className="lp-h2">Alles voor je tafel, op één plek</h2>
              <p className="lp-lead">
                Geen losse tools meer. TomeVault brengt je hele sessie samen in één rustige, warme ruimte.
              </p>
            </div>
            <div className="lp-feature-list">
              {LANDING_FEATURES.map((feature) => {
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
              <div className="lp-eyebrow">Het hart van TomeVault</div>
              <h2 className="lp-h2">Handouts op het juiste moment</h2>
              <p className="lp-lead">
                Deel kaarten, lore en geheimen wanneer jij de rol openrolt — spelers zien precies wat jij wilt onthullen.
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
                  Kelder van de Goblin Koning
                </span>
              </div>

              <div className="lp-showcase-app">
                <aside className="lp-showcase-nav tv-nav-bg">
                  {SHOWCASE_NAV.map((item) => {
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
                    <span className="lp-showcase-chip">GM</span>
                    <span className="lp-showcase-chip">Sessie #3</span>
                  </div>
                </aside>

                <div className="lp-showcase-main lp-showcase-handouts">
                  <div className="lp-showcase-handouts-head">
                    <span className="lp-showcase-handouts-title">
                      <Scroll className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      Handouts
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
                      {SHOWCASE_HANDOUTS.map((handout) => {
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
                                    <KeyRound className="h-2.5 w-2.5" aria-hidden /> Party ziet secret
                                  </span>
                                ) : null}
                                {handout.hidden ? (
                                  <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--muted">
                                    <EyeOff className="h-2.5 w-2.5" aria-hidden /> Verborgen
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
              <div className="lp-eyebrow">Gratis beginnen, groeien wanneer je wilt</div>
              <h2 className="lp-h2">Kies je pad</h2>
              <p className="lp-lead">
                TomeVault is gratis te gebruiken. Upgrade voor onbeperkte werelden en premium extra’s.
              </p>
            </div>

            <div className="mt-7 flex justify-center">
              <div className="tv-role-toggle">
                {LANDING_AUDIENCES.map((audience) => (
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
              Getoonde prijzen zijn indicatief. Je begint gratis — een betaalmethode is niet nodig om te starten.
            </p>
          </div>
        </section>

        {/* ─── Over + FAQ ─── */}
        <section id="over" className="lp-section lp-section--band">
          <div className="lp-shell lp-shell--narrow">
            <div className="lp-section-head">
              <div className="lp-eyebrow">{LANDING_ABOUT.eyebrow}</div>
              <h2 className="lp-h2">{LANDING_ABOUT.title}</h2>
              <p className="lp-lead">{LANDING_ABOUT.body}</p>
            </div>

            <div className="lp-faq">
              {LANDING_FAQ.map((item) => (
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
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('functies')}>Functies</button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('prijzen')}>Prijzen</button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('over')}>Over</button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToSection('inloggen')}>Inloggen</button>
              <button type="button" className="lp-footer-link" onClick={() => setShowContactForm((value) => !value)}>
                {showContactForm ? 'Sluit feedback' : 'Feedback'}
              </button>
            </div>
            <div className="lp-footer-legal">
              <span className="lp-footer-legal-copy">
                © {new Date().getFullYear()} TomeVault — Jouw magische tafel aan de taverne.
              </span>
              <span className="lp-footer-credit">
                <img src={NUGGET_MARK_SRC} alt="" className="lp-footer-credit-mark" aria-hidden="true" />
                Gesmeed door{' '}
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
            <p className="text-sm font-medium">{appUpdateNotice}</p>
            <button
              type="button"
              onClick={() => onReloadApp?.()}
              className="tv-satisfy-pop rounded-lg border border-[color-mix(in_srgb,var(--tv-status-warning),transparent_42%)] tv-surface-raised px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition tv-hover-surface"
            >
              Nu verversen
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
            className="tv-entry-action tv-tone-enemy-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log uit
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
                Kies je volgende stap.
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-base md:text-lg tv-text-sub font-story leading-relaxed">
                Hervat een wereld of open meteen een nieuwe sessie.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-4xl font-fantasy tracking-[0.08em] tv-text sm:text-5xl">
                Even geduld.
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-base md:text-lg tv-text-sub font-story leading-relaxed">
                {sessionBusy
                  ? 'We proberen je meest recente sessie direct te openen.'
                  : 'We laden je sessies om te bepalen of je direct terug de wereld in kunt.'}
              </p>
              <div className="mt-5 flex justify-center">
                <BackfillButton onBackfillMemberships={onBackfillMemberships} />
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
            <div className="lp-card p-4 md:p-5 lg:p-6">
              <div className="flex items-center justify-center gap-3 text-center">
                <h2 className="text-xl md:text-2xl font-fantasy tracking-[0.12em] tv-text">Recente sessies</h2>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onBackfillMemberships?.()}
                  disabled={sessionBusy}
                  className="tv-entry-action border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text disabled:opacity-50"
                  title="Herstel oude sessies waar je GM of speler bent"
                >
                  Herstel oud
                </button>
                {hiddenRecentCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowHiddenSessions((value) => !value)}
                    className="tv-entry-action border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text"
                  >
                    {showHiddenSessions ? 'Verberg verborgen' : `Toon verborgen (${hiddenRecentCount})`}
                  </button>
                ) : null}
              </div>

              {displayedRecentSessions.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-6 text-center">
                  <p className="text-sm tv-text font-story italic">Nog geen recente sessies.</p>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {displayedRecentSessions.map((session) => {
                    const displayCode = session.joinTag || session.sessionId;
                    const roleLabel = session.role === 'dm' ? 'GM' : 'Speler';
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
                            <div className="truncate text-lg font-fantasy tv-text">{session.sessionName || 'Naamloze Sessie'}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] tv-muted">
                              <span>Code {displayCode}</span>
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
                            Hervat
                            <ArrowRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => (isHidden ? onRestoreRecentSession?.(session.sessionId) : onHideRecentSession?.(session.sessionId))}
                            disabled={sessionBusy}
                            className={`tv-entry-action border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] ${isHidden ? 'tv-alert-warning' : 'tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text'}`}
                            title={isHidden ? 'Zet terug in recente lijst' : 'Verberg uit deze lijst'}
                          >
                            {isHidden ? 'Herstel' : 'Verberg'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteFlow(session)}
                            disabled={sessionBusy}
                            className="tv-alert-danger flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:brightness-110 disabled:opacity-50"
                            title="Verlaat en wis deze sessie permanent"
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
          <section className="lp-card mx-auto w-full max-w-3xl p-4 md:p-5 lg:p-6">
            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-fantasy tracking-[0.12em] tv-text">
                {activeRoleTab === 'gm' ? 'Nieuwe sessie' : 'Meedoen'}
              </h2>

              <div className="mt-4 flex justify-center">
                <div className="tv-role-toggle">
                  <button
                    type="button"
                    onClick={() => handleRoleToggle('player')}
                    className={`tv-role-toggle-btn ${activeRoleTab === 'player' ? 'tv-role-toggle-btn--active' : ''}`}
                  >
                    Speler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleToggle('gm')}
                    className={`tv-role-toggle-btn ${activeRoleTab === 'gm' ? 'tv-role-toggle-btn--active' : ''}`}
                  >
                    GM
                  </button>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-5 w-full max-w-[34rem] lg:max-w-[38rem]">
              <div className="mt-1">
                {activeRoleTab === 'gm' ? (
                  <div className="grid gap-3">
                    <input
                      type="text"
                      placeholder="Sessienaam"
                      value={gmSessionName}
                      onChange={(e) => setGmSessionName(e.target.value)}
                      className="tv-field"
                    />
                    <input
                      type="password"
                      placeholder="PIN (4-8 cijfers)"
                      value={gmSessionPin}
                      onChange={(e) => setGmSessionPin(e.target.value)}
                      className="tv-field"
                    />
                    <button
                      type="button"
                      onClick={handleGmCreate}
                      disabled={!uid || sessionBusy}
                      className="tv-button-primary h-11 w-full rounded-xl font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-60"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Start sessie
                    </button>
                    {localGmError ? (
                      <div className="tv-alert-danger rounded-xl px-4 py-3 text-sm">
                        {localGmError}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <input
                      type="text"
                      placeholder="Karakternaam"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="tv-field"
                    />
                    <input
                      type="text"
                      placeholder="Sessiecode"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="tv-field uppercase"
                    />
                    <input
                      type="password"
                      placeholder={canJoinWithoutPin ? 'PIN niet nodig' : 'PIN'}
                      value={sessionPin}
                      onChange={(e) => setSessionPin(e.target.value)}
                      className="tv-field"
                    />
                    {canJoinWithoutPin ? (
                      <div className="tv-alert-warning rounded-xl px-4 py-3 text-sm font-story">
                        Bekende sessie gevonden. Je kunt direct zonder PIN verder.
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handlePlayerJoin}
                      disabled={!uid || sessionBusy}
                      className="tv-button-primary h-11 w-full rounded-xl font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-60"
                    >
                      <DoorOpen className="mr-2 h-4 w-4" />
                      Meedoen
                    </button>
                    {localPlayerError ? (
                      <div className="tv-alert-danger rounded-xl px-4 py-3 text-sm">
                        {localPlayerError}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <div className="lp-hub-footer mt-8 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_55%)] pt-6 text-center">
          <button type="button" className="lp-footer-link" onClick={() => setShowContactForm((value) => !value)}>
            {showContactForm ? 'Sluit feedback' : 'Feedback'}
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
                <h3 className="font-fantasy tracking-wider tv-text">Sessie Permanent Wissen</h3>
              </div>
              <button onClick={closeDeleteFlow} className="tv-muted hover:tv-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!showGmDeleteWarning ? (
              <div className="space-y-4 px-5 py-5">
                <p className="text-sm tv-text font-story leading-relaxed">
                  Om deze sessie permanent te verwijderen, typ de volledige sessienaam exact over zoals hieronder weergegeven.
                </p>
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest tv-muted mb-1">Te bevestigen sessie</div>
                  <div className="font-fantasy tv-text font-bold break-words">{deleteTarget.sessionName || 'Naamloze Sessie'}</div>
                </div>
                <input
                  type="text"
                  value={deleteSessionNameInput}
                  onChange={(e) => setDeleteSessionNameInput(e.target.value)}
                  placeholder="Typ de sessienaam exact over"
                  className="w-full rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5 text-sm tv-text placeholder:tv-muted transition-colors focus:outline-none focus:border-[color-mix(in_srgb,var(--tv-tone-enemy),transparent_40%)]"
                />
                {deleteError && (
                  <div className="rounded-lg tv-tone-enemy-surface px-3 py-2 text-xs">
                    {deleteError}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" block onClick={closeDeleteFlow}>
                    Annuleren
                  </Button>
                  <Button variant="danger" block onClick={handleDeleteNameConfirm} disabled={sessionBusy}>
                    Bevestigen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-5 py-5">
                <p className="text-sm tv-text font-story leading-relaxed">
                  U bent de GM van deze sessie en staat op het punt de volledige campagne definitief te verwijderen. Spelers kunnen deze wereld daarna niet meer betreden en dit kan niet ongedaan worden gemaakt.
                </p>
                <div className="rounded-xl tv-tone-enemy-surface px-4 py-3 text-sm font-story leading-relaxed">
                  Weet u zeker dat u <strong>{deleteTarget.sessionName || 'Naamloze Sessie'}</strong> voorgoed wilt wissen?
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" block onClick={() => setShowGmDeleteWarning(false)}>
                    Terug
                  </Button>
                  <Button variant="danger" block onClick={handleFinalDeleteConfirm} disabled={sessionBusy}>
                    Campagne Wissen
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
