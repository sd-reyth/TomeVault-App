import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  DoorOpen,
  Eye,
  LogOut,
  Mail,
  ShieldCheck,
  Swords,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';
import { getJoinTagLookupVariants } from '../lib/sessionUtils';
import landingBackgroundVideo from '../../Video/landingBG.mp4';
import RuntimeBadge from './RuntimeBadge';
import Button from './Button';
const LANDING_AMBIENCE_ENABLED_STORAGE_KEY = 'tomevault:landing:ambience-enabled';
const LANDING_AMBIENCE_VOLUME_STORAGE_KEY = 'tomevault:landing:ambience-volume';
const DEFAULT_LANDING_AMBIENCE_VOLUME = 12;
const TOMEVAULT_LOGO_SRC = '/references/tomeVaultLogo1.png';


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
  const [showMarketing, setShowMarketing] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
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

  const handleGmCreate = () => {
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

  const handlePlayerJoin = () => {
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
  const resolvedLandingTheme = theme || 'ember-forge';

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

  const compactFeatureHighlights = [
    { icon: BookOpen, label: 'Handouts' },
    { icon: Wand2, label: 'Realtime' },
    { icon: ShieldCheck, label: 'Rollen' },
  ];

  const landingFeatureCards = [
    {
      icon: BookOpen,
      title: 'Perkament zonder omweg',
      description: 'Deel lore, aanwijzingen en kaarten over tafel zonder het rollenspel te breken.',
    },
    {
      icon: Wand2,
      title: 'Echte tijd, echte magie',
      description: 'Chat, notities en de status van de wereld blijven voor elke speler synchroon.',
    },
    {
      icon: ShieldCheck,
      title: 'Orde in de chaos',
      description: 'Spelleider en spelers delen dezelfde herberg, met eigen afgeschermde rollen.',
    },
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

  const landingAmbienceLabel = 'Geluid';
  const showHeroHighlights = !uid;

  const recentSessionsSection = uid && showSessionHub ? (
    <section className="mx-auto w-full max-w-5xl">
      <div className="tv-entry-hero-card rounded-[26px] p-4 md:p-5 lg:p-6">
        <div className="flex items-center justify-center gap-3 text-center">
          <div className="landing-logo-shell h-11 w-11 shrink-0">
            <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="landing-logo" />
          </div>
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
          <div className="mt-4 rounded-[22px] border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-6 text-center">
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
                      onClick={() => onResumeRecentSession?.(session, defaultAsRole)}
                      disabled={sessionBusy}
                      className={`tv-satisfy-pop inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-fantasy tracking-[0.16em] transition-all disabled:opacity-50 ${sessionActionClass}`}
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
                      className="tv-alert-danger flex h-11 w-11 items-center justify-center rounded-2xl transition-colors hover:brightness-110 disabled:opacity-50"
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
  ) : null;

  const landingAboutSection = !uid ? (
    <section className="landing-copy-rail mx-auto w-full max-w-5xl">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="space-y-2 text-center md:text-left">
          <div className="landing-kicker tv-landing-kicker">Wat is TomeVault</div>
          <p className="text-sm md:text-base tv-text font-story leading-relaxed">
            Een rustige digitale tafel waar handouts, chat, notities en sessies samenkomen zonder dashboard-chaos.
          </p>
        </div>
        <div className="space-y-2 text-center md:text-left">
          <div className="landing-kicker tv-landing-kicker">Wie zijn wij</div>
          <p className="text-sm md:text-base tv-text font-story leading-relaxed">
            We bouwen TomeVault voor groepen die sfeer, focus en duidelijkheid belangrijker vinden dan drukke tooling.
          </p>
        </div>
      </div>
    </section>
  ) : null;

  const landingFeatureSection = !uid ? (
    <section className="mx-auto w-full max-w-6xl pt-3 md:pt-5">
      <div className="landing-panel rounded-[32px] px-5 py-8 md:px-7 md:py-10 lg:px-10">
        <div className="text-center">
          <h2 className="text-3xl font-fantasy tracking-[0.18em] tv-text md:text-4xl">
            Wat biedt de Waard?
          </h2>
          <div className="mx-auto mt-5 h-px w-28 tv-landing-divider" />
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-3 md:gap-6 lg:gap-10">
          {landingFeatureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="mx-auto flex max-w-xs flex-col items-center gap-4 text-center">
                <div className={`tv-entry-feature-icon h-18 w-18`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-story font-semibold tv-text md:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="text-sm font-story leading-relaxed tv-text-sub md:text-base">
                    {feature.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  ) : null;

  const landingShowcaseSection = !uid ? (
    <section className="mx-auto w-full max-w-6xl pt-5 md:pt-7">
      <div className="flex items-center justify-center gap-3 tv-muted">
        <span className="h-px w-20 tv-landing-divider md:w-24" />
        <span className="h-2 w-2 rotate-45 border border-current" />
        <span className="h-2 w-2 rotate-45 border border-current opacity-80" />
        <span className="h-2 w-2 rotate-45 border border-current" />
        <span className="h-px w-20 tv-landing-divider md:w-24" />
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-4xl font-fantasy tracking-[0.18em] tv-text md:text-5xl lg:text-6xl">
          Aanschouw de Tafel
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-base font-story leading-relaxed tv-text-sub md:text-lg">
          Werp de dobbelstenen of bekijk het perkament. De herberg wacht.
        </p>
      </div>

      <div className="mt-8 landing-panel rounded-[32px] p-3 md:p-5 lg:p-6">
        <div className="tv-landing-showcase-frame">
          <div className="tv-landing-showcase-toolbar">
            <div className="flex items-center gap-2">
              <span className="tv-landing-showcase-dot" />
              <span className="tv-landing-showcase-dot opacity-80" />
              <span className="tv-landing-showcase-dot opacity-60" />
            </div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] tv-muted md:text-xs">
              <BookOpen className="h-3.5 w-3.5 tv-accent" />
              Kelder van de Goblin Koning
            </div>
          </div>

          <div className="grid min-h-[28rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="tv-landing-showcase-sidebar flex flex-col justify-between">
              <div className="space-y-4 px-4 py-5 md:px-5 md:py-6">
                <div className="tv-landing-showcase-bubble">
                  Jullie horen een zwaar gerommel uit de diepte...
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] tv-accent">Reyth</div>
                  <div className="tv-landing-showcase-bubble tv-landing-showcase-bubble--player mt-2">
                    Ik trek mijn zwaard en ga voor de deur staan.
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] tv-accent">Jij</div>
                  <div className="tv-landing-showcase-bubble tv-landing-showcase-bubble--accent mt-2 flex max-w-[14rem] items-center gap-4 px-3 py-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl tv-input-surface text-3xl font-semibold tv-accent">
                      16
                    </div>
                    <div className="font-story text-sm italic tv-text-sub">Werpt een steen...</div>
                  </div>
                </div>

                <div className="pt-1 text-center font-story text-xs italic tv-muted">
                  Je rolt de perkamentrol open.
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-0 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-3">
                <div className="flex min-h-11 items-center rounded-l-[14px] border border-r-0 border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] px-4 font-story text-sm tv-muted">
                  Schrijf met de veer...
                </div>
                <button
                  type="button"
                  className="tv-satisfy-pop flex min-h-11 items-center justify-center rounded-r-[14px] border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-surface-raised px-4 tv-text transition-colors tv-hover-surface"
                  aria-label="Voorbeeldactie versturen"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="tv-landing-showcase-stage landing-grid flex items-center justify-center px-4 py-6 md:px-6 lg:px-8">
              <div className="tv-landing-showcase-card">
                <div className="tv-landing-showcase-fragment landing-preview-fragment md:min-h-[15rem]">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="tv-showcase-glow flex h-16 w-16 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)] tv-entry-feature-icon">
                      <Eye className="h-9 w-9 tv-accent" />
                    </div>
                    <div className="text-sm font-fantasy uppercase tracking-[0.26em] tv-text md:text-base">
                      Open de verzegelde rol
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  return (
    <div data-theme={resolvedLandingTheme} data-landing-theme={resolvedLandingTheme} className="tv-entry-root landing-root relative min-h-screen overflow-x-hidden bg-texture">
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
        <div className="landing-video-darkener" />
        <div className="landing-video-vignette" />
      </div>

      {runtimeBadge ? (
        <div className="absolute right-4 top-4 z-20">
          <RuntimeBadge runtimeBadge={runtimeBadge} />
        </div>
      ) : null}

      {appUpdateNotice ? (
        <div className="tv-alert-warning absolute left-4 right-4 top-4 z-20 mx-auto max-w-4xl rounded-xl px-4 py-3 shadow-lg backdrop-blur">
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

      <div className="fixed bottom-4 right-4 z-30 max-w-[calc(100vw-2rem)]">
        <div className="tv-ambience-dock">
          <button
            type="button"
            onClick={handleToggleLandingAmbience}
            title="De achtergrondvideo speelt altijd. Geluid blijft zacht en start pas na een tik."
            className={`tv-entry-action ${landingAmbienceEnabled ? 'tv-button-accent-muted' : ''}`}
          >
            {landingAmbienceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{landingAmbienceLabel}</span>
          </button>
          {landingAmbienceEnabled ? (
            <div className="flex min-w-[8.75rem] items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.22em] tv-muted">Volume</span>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={landingAmbienceVolume}
                onChange={handleLandingAmbienceVolumeChange}
                className="ambience-slider w-24 sm:w-28"
                aria-label="Volume van sfeergeluid"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="landing-content-rail relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-14 pt-12 sm:px-6 md:gap-6 md:pt-20">
        <section className="landing-hero mx-auto w-full max-w-5xl px-5 py-6 md:px-7 md:py-8 lg:px-8 lg:py-10">
          <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-7 text-center">
            <div className="max-w-3xl space-y-5">
              <div className="space-y-3">
                {!uid ? (
                  <>
                    <div className="flex justify-center">
                      <div className="landing-logo-shell tv-logo-breathe h-24 w-24 md:h-28 md:w-28 lg:h-32 lg:w-32">
                        <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="landing-logo" />
                      </div>
                    </div>
                    <h1 className="max-w-4xl text-5xl leading-[0.9] font-fantasy tracking-[0.08em] tv-text sm:text-6xl lg:text-7xl xl:text-[5.15rem]">
                      TOME<span className="tv-accent">VAULT</span>
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg tv-text-sub font-story leading-relaxed">
                      Jouw magische tafel aan de taverne.
                    </p>
                  </>
                ) : showSessionHub ? (
                  <>
                    <div className="flex justify-center">
                      <div className="landing-logo-shell h-18 w-18 md:h-20 md:w-20">
                        <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="landing-logo" />
                      </div>
                    </div>
                    <h1 className="max-w-4xl text-4xl leading-[0.96] font-fantasy tracking-[0.08em] tv-text sm:text-5xl lg:text-6xl">
                      Kies je volgende stap.
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg tv-text font-story leading-relaxed">
                      Hervat een wereld of open meteen een nieuwe sessie.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <div className="landing-logo-shell h-18 w-18 md:h-20 md:w-20">
                        <img src={TOMEVAULT_LOGO_SRC} alt="TomeVault logo" className="landing-logo" />
                      </div>
                    </div>
                    <h1 className="max-w-4xl text-4xl leading-[0.96] font-fantasy tracking-[0.08em] tv-text sm:text-5xl lg:text-6xl">
                      Even geduld.
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg tv-text font-story leading-relaxed">
                      We zoeken je laatste sessie erbij.
                    </p>
                    {uid && (
                      <div className="mt-4">
                        <BackfillButton onBackfillMemberships={onBackfillMemberships} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {showHeroHighlights ? (
                <div className="flex flex-wrap justify-center gap-2">
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
              ) : null}
            </div>

            {!uid ? (
              <div className="tv-entry-hero-card tv-entry-rail w-full rounded-[22px] p-5 text-left md:p-6">
                <div className="tv-label text-center">Inloggen</div>
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={onSignInGoogle}
                    disabled={authLoading || sessionBusy}
                    className="tv-button-primary h-11 w-full rounded-xl font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-60"
                  >
                    Google
                  </button>
                </div>

                {inviteCode || isJoinPath ? (
                  <div className="mt-4 tv-alert-info rounded-[20px] px-4 py-3 text-sm font-story leading-relaxed">
                    Uitnodiging herkend{inviteCode ? ` voor ${inviteCode.toUpperCase()}` : ''}. Meld je aan en we houden deze code voor je vast.
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailAuthForm((value) => !value)}
                    className="tv-entry-action border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text"
                  >
                    {showEmailAuthForm ? 'Verberg e-mail' : 'Gebruik e-mail'}
                  </button>
                </div>

                {showEmailAuthForm ? (
                  <form onSubmit={handleEmailAuth} className="mt-4 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-4">
                    <div className="flex rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-1">
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
                  <div className="mt-4 rounded-2xl tv-tone-enemy-surface px-4 py-3 text-sm">
                    {localAuthError || authError}
                  </div>
                ) : null}
              </div>
            ) : showSessionHub ? (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => onSignOut?.()}
                  className="tv-entry-action tv-tone-enemy-button"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log uit
                </button>
              </div>
            ) : (
              <p className="max-w-xl text-sm md:text-base tv-text-sub font-story leading-relaxed">
                {sessionBusy
                  ? 'We proberen je meest recente sessie direct te openen.'
                  : 'We laden je sessies om te bepalen of je direct terug de wereld in kunt.'}
              </p>
            )}
          </div>
        </section>

        {showMarketing ? landingAboutSection : null}

        {showMarketing ? landingFeatureSection : null}

        {showMarketing ? landingShowcaseSection : null}

        {!uid ? (
          <div className="mx-auto w-full max-w-5xl text-center">
            <button
              type="button"
              onClick={() => setShowMarketing((value) => !value)}
              className="tv-button-secondary rounded-xl px-4 py-2 text-xs font-fantasy uppercase tracking-[0.16em]"
            >
              {showMarketing ? 'Minder' : 'Over TomeVault'}
            </button>
          </div>
        ) : null}

        {sessionError ? (
          <div className="mx-auto w-full max-w-5xl tv-alert-danger rounded-2xl px-4 py-3 text-sm">
            {sessionError}
          </div>
        ) : null}

        {sessionInfo ? (
          <div className="mx-auto w-full max-w-5xl tv-alert-warning rounded-2xl px-4 py-3 text-sm">
            {sessionInfo}
          </div>
        ) : null}

        {recentSessionsSection}

        {showSessionHub ? (
          <section className={`tv-entry-rail tv-entry-hero-card tv-entry-sheet mx-auto w-full max-w-5xl p-4 md:p-5 lg:p-6`}>
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
                      Start
                    </button>
                    {localGmError ? (
                      <div className="tv-alert-danger rounded-2xl px-4 py-3 text-sm">
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
                      <div className="tv-alert-warning rounded-2xl px-4 py-3 text-sm font-story">
                        Bekende sessie gevonden. Je kunt direct zonder PIN verder.
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handlePlayerJoin}
                      disabled={!uid || sessionBusy}
                      className="tv-button-primary h-11 w-full rounded-xl font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-60"
                    >
                      Join
                    </button>
                    {localPlayerError ? (
                      <div className="tv-alert-danger rounded-2xl px-4 py-3 text-sm">
                        {localPlayerError}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mx-auto w-full max-w-xl pt-1 text-center">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowContactForm((value) => !value)}
              className="tv-entry-action border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset tv-text hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] hover:tv-text"
            >
              <Mail className="mr-2 h-4 w-4" />
              {showContactForm ? 'Verberg feedback' : 'Feedback'}
            </button>
          </div>

          {showContactForm ? (
            <div className="tv-entry-hero-card mt-4 rounded-[24px] p-4 md:p-5">
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
                <button
                  type="submit"
                  className="tv-button-primary md:col-span-2"
                >
                  Verstuur via E-mail
                </button>
              </form>
            </div>
          ) : null}
        </section>
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

    </div>
  );
}
