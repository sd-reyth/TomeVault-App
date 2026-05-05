import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  DoorOpen,
  Flame,
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
import { getJoinTagLookupVariants } from '../lib/sessionUtils';
import landingBackgroundVideo from '../../Video/landingBG.mp4';
import RuntimeBadge from './RuntimeBadge';

const LANDING_AMBIENCE_ENABLED_STORAGE_KEY = 'tomevault:landing:ambience-enabled';
const LANDING_AMBIENCE_VOLUME_STORAGE_KEY = 'tomevault:landing:ambience-volume';
const DEFAULT_LANDING_AMBIENCE_VOLUME = 12;

function clampLandingAmbienceVolume(value, fallback = DEFAULT_LANDING_AMBIENCE_VOLUME) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.min(24, Math.round(numericValue)));
}

function loadStoredLandingAmbienceEnabled() {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(LANDING_AMBIENCE_ENABLED_STORAGE_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function loadStoredLandingAmbienceVolume() {
  if (typeof window === 'undefined') return DEFAULT_LANDING_AMBIENCE_VOLUME;

  try {
    return clampLandingAmbienceVolume(window.localStorage.getItem(LANDING_AMBIENCE_VOLUME_STORAGE_KEY));
  } catch (_) {
    return DEFAULT_LANDING_AMBIENCE_VOLUME;
  }
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
  isGuest,
  displayName,
  authLoading,
  authError,
  onSignInGoogle,
  onSignInGuest,
  onSignInEmail,
  onSignUpEmail,
  onSignOut,
  sessionError,
  sessionInfo,
  sessionBusy,
  showSessionHub,
  onBackfillMemberships,
  runtimeBadge,
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
  const [{ inviteCode, isJoinPath }] = useState(() => getLandingJoinContext());
  const [activeRoleTab, setActiveRoleTab] = useState(() => {
    const initialContext = getLandingJoinContext();
    if (initialContext.inviteCode || initialContext.isJoinPath) return 'player';

    if (typeof window !== 'undefined') {
      const storedRole = window.localStorage.getItem('tv_landing_role');
      if (storedRole === 'gm' || storedRole === 'player') return storedRole;
    }

    return 'player';
  });
  const [rolePreferenceLocked, setRolePreferenceLocked] = useState(() => {
    const initialContext = getLandingJoinContext();
    if (initialContext.inviteCode || initialContext.isJoinPath) return true;

    if (typeof window !== 'undefined') {
      const storedRole = window.localStorage.getItem('tv_landing_role');
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
  const resolvedDisplayName = String(displayName || playerName || 'Avonturier').trim() || 'Avonturier';

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
    window.localStorage.setItem('tv_landing_role', activeRoleTab);
  }, [activeRoleTab, rolePreferenceLocked]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(LANDING_AMBIENCE_ENABLED_STORAGE_KEY, landingAmbienceEnabled ? '1' : '0');
    } catch (_) {
      // Ignore storage failures and keep local state as source of truth.
    }
  }, [landingAmbienceEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(LANDING_AMBIENCE_VOLUME_STORAGE_KEY, String(landingAmbienceVolume));
    } catch (_) {
      // Ignore storage failures and keep local state as source of truth.
    }
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
    {
      icon: BookOpen,
      label: 'Handouts',
      accentClassName: 'text-amber-400',
    },
    {
      icon: Wand2,
      label: 'Realtime',
      accentClassName: 'text-indigo-400',
    },
    {
      icon: ShieldCheck,
      label: 'Rollen',
      accentClassName: 'text-emerald-400',
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
  const showHeroHighlights = !uid || showSessionHub;

  const recentSessionsSection = uid && showSessionHub ? (
    <section className="mx-auto w-full max-w-5xl">
      <div className="landing-surface rounded-[26px] p-4 md:p-5 lg:p-6">
        <div className="text-center">
          <div className="landing-kicker text-amber-500">Recente sessies</div>
          <h2 className="mt-1 text-xl md:text-2xl font-fantasy tracking-[0.12em] text-stone-100">Hervat snel</h2>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => onBackfillMemberships?.()}
              disabled={sessionBusy}
              className="landing-action-button border-stone-700/80 bg-stone-950/75 text-stone-200 hover:border-amber-700/50 hover:text-amber-200 disabled:opacity-50"
              title="Herstel oude sessies waar je GM of speler bent"
            >
              Herstel oud
            </button>
            {hiddenRecentCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowHiddenSessions((value) => !value)}
                className="landing-action-button border-stone-700/80 bg-stone-950/75 text-stone-200 hover:border-indigo-700/50 hover:text-indigo-200"
              >
                {showHiddenSessions ? 'Verberg verborgen' : `Toon verborgen (${hiddenRecentCount})`}
              </button>
            ) : null}
        </div>

        {displayedRecentSessions.length === 0 ? (
          <div className="mt-4 rounded-[22px] border border-dashed border-stone-800/70 bg-stone-950/35 px-4 py-6 text-center">
            <p className="text-sm text-stone-300 font-story italic">Nog geen recente sessies.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {displayedRecentSessions.map((session) => {
              const displayCode = session.joinTag || session.sessionId;
              const roleLabel = session.role === 'dm' ? 'GM' : 'Speler';
              const defaultAsRole = session.role === 'dm' ? 'gm' : 'player';
              const isHidden = session.status === 'hidden';
              const roleAccent = session.role === 'dm'
                ? 'border-amber-900/50 bg-amber-950/30 text-amber-200'
                : 'border-indigo-900/50 bg-indigo-950/30 text-indigo-200';
              const primaryButtonAccent = session.role === 'dm'
                ? 'border-amber-700/50 bg-amber-900/30 text-amber-100 hover:bg-amber-800/40 hover:border-amber-600/70'
                : 'border-indigo-700/50 bg-indigo-900/30 text-indigo-100 hover:bg-indigo-800/40 hover:border-indigo-500/70';

              return (
                <article
                  key={session.sessionId}
                  className={`landing-session-card ${session.role === 'dm' ? 'border-amber-900/35 bg-[linear-gradient(180deg,rgba(120,53,15,0.16),rgba(12,10,9,0.82))] hover:border-amber-700/45' : 'border-indigo-900/35 bg-[linear-gradient(180deg,rgba(49,46,129,0.16),rgba(12,10,9,0.82))] hover:border-indigo-600/45'} ${isHidden ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-fantasy text-stone-100">{session.sessionName || 'Naamloze Sessie'}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                        <span>Code {displayCode}</span>
                        <span className="text-stone-700">•</span>
                        <span>{session.updatedAtLabel}</span>
                      </div>
                    </div>
                    <span className={`landing-chip ${roleAccent}`}>{roleLabel}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onResumeRecentSession?.(session, defaultAsRole)}
                      disabled={sessionBusy}
                      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-fantasy tracking-[0.16em] transition-all disabled:opacity-50 ${primaryButtonAccent}`}
                    >
                      <DoorOpen className="h-4 w-4" />
                      Hervat
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (isHidden ? onRestoreRecentSession?.(session.sessionId) : onHideRecentSession?.(session.sessionId))}
                      disabled={sessionBusy}
                      className={`landing-action-button border-stone-700/80 bg-stone-950/75 ${isHidden ? 'text-emerald-200 hover:border-emerald-700/50 hover:text-emerald-100' : 'text-stone-300 hover:border-amber-700/40 hover:text-amber-200'}`}
                      title={isHidden ? 'Zet terug in recente lijst' : 'Verberg uit deze lijst'}
                    >
                      {isHidden ? 'Herstel' : 'Verberg'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteFlow(session)}
                      disabled={sessionBusy}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-900/50 bg-rose-950/30 text-rose-200 transition-colors hover:bg-rose-900/45 hover:text-rose-100 disabled:opacity-50"
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
          <div className="landing-kicker text-amber-500">Wat is TomeVault</div>
          <p className="text-sm md:text-base text-stone-300 font-story leading-relaxed">
            Een rustige digitale tafel waar handouts, chat, notities en sessies samenkomen zonder dashboard-chaos.
          </p>
        </div>
        <div className="space-y-2 text-center md:text-left">
          <div className="landing-kicker text-emerald-400">Wie zijn wij</div>
          <p className="text-sm md:text-base text-stone-300 font-story leading-relaxed">
            We bouwen TomeVault voor groepen die sfeer, focus en duidelijkheid belangrijker vinden dan drukke tooling.
          </p>
        </div>
      </div>
    </section>
  ) : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-stone-950 bg-texture">
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

      <div className="fixed bottom-4 right-4 z-30 max-w-[calc(100vw-2rem)]">
        <div className="landing-ambience-dock">
          <button
            type="button"
            onClick={handleToggleLandingAmbience}
            title="De achtergrondvideo speelt altijd. Geluid blijft zacht en start pas na een tik."
            className={`landing-ambience-button ${landingAmbienceEnabled ? 'landing-ambience-button-active' : ''}`}
          >
            {landingAmbienceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{landingAmbienceLabel}</span>
          </button>
          {landingAmbienceEnabled ? (
            <div className="flex min-w-[8.75rem] items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Volume</span>
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
              {uid ? (
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <div className="landing-chip border-emerald-900/45 bg-emerald-950/18 text-emerald-200">
                    {resolvedDisplayName}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {!uid ? (
                  <>
                    <h1 className="max-w-4xl text-5xl leading-[0.9] font-fantasy tracking-[0.08em] text-stone-100 sm:text-6xl lg:text-7xl xl:text-[5.15rem]">
                      TOME<span className="text-amber-500">VAULT</span>
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg text-stone-300 font-story leading-relaxed">
                      Handouts, chat en sessies op een rustige plek.
                    </p>
                  </>
                ) : showSessionHub ? (
                  <>
                    <div className="landing-kicker text-emerald-400">Welkom terug</div>
                    <h1 className="max-w-4xl text-4xl leading-[0.96] font-fantasy tracking-[0.08em] text-stone-100 sm:text-5xl lg:text-6xl">
                      Alles staat klaar.
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg text-stone-300 font-story leading-relaxed">
                      Hervat een bekende wereld of open direct een nieuwe.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="landing-kicker text-emerald-400">Verbonden</div>
                    <h1 className="max-w-4xl text-4xl leading-[0.96] font-fantasy tracking-[0.08em] text-stone-100 sm:text-5xl lg:text-6xl">
                      Even geduld.
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg text-stone-300 font-story leading-relaxed">
                      We zoeken je laatste sessie erbij.
                    </p>
                  </>
                )}
              </div>

              {showHeroHighlights ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {compactFeatureHighlights.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <span key={feature.label} className="landing-chip border-stone-700/60 bg-stone-950/45 text-stone-200">
                        <Icon className={`h-3.5 w-3.5 ${feature.accentClassName}`} />
                        {feature.label}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {!uid ? (
              <div className="landing-surface w-full max-w-[34rem] rounded-[22px] p-5 md:p-6 text-left lg:max-w-[36rem]">
                <div className="landing-kicker text-amber-500 text-center">Schuif aan</div>
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={onSignInGoogle}
                    disabled={authLoading || sessionBusy}
                    className="landing-button landing-button-amber w-full disabled:opacity-60"
                  >
                    Doorgaan met Google
                  </button>
                  <button
                    type="button"
                    onClick={onSignInGuest}
                    disabled={authLoading || sessionBusy}
                    className="landing-button landing-button-muted w-full disabled:opacity-60"
                  >
                    Doorgaan als Gast
                  </button>
                </div>

                {inviteCode || isJoinPath ? (
                  <div className="mt-4 rounded-[20px] border border-indigo-900/35 bg-indigo-950/18 px-4 py-3 text-sm text-indigo-100 font-story leading-relaxed">
                    Uitnodiging herkend{inviteCode ? ` voor ${inviteCode.toUpperCase()}` : ''}.
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailAuthForm((value) => !value)}
                    className="landing-action-button border-stone-700/80 bg-stone-950/70 text-stone-200 hover:border-amber-700/40 hover:text-amber-200"
                  >
                    {showEmailAuthForm ? 'Verberg e-mail' : 'Gebruik e-mail'}
                  </button>
                </div>

                {showEmailAuthForm ? (
                  <form onSubmit={handleEmailAuth} className="mt-4 border-t border-stone-800/70 pt-4">
                    <div className="flex rounded-2xl border border-stone-800/90 bg-stone-950/80 p-1">
                      <button
                        type="button"
                        onClick={() => setEmailMode('login')}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${emailMode === 'login' ? 'bg-stone-800 text-stone-100' : 'text-stone-400 hover:text-stone-200'}`}
                      >
                        Inloggen
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailMode('signup')}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${emailMode === 'signup' ? 'bg-stone-800 text-stone-100' : 'text-stone-400 hover:text-stone-200'}`}
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
                          className="landing-input landing-input-amber"
                        />
                      ) : null}
                      <input
                        type="email"
                        placeholder="jij@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="landing-input landing-input-amber"
                      />
                      <input
                        type="password"
                        placeholder="Wachtwoord"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="landing-input landing-input-amber"
                      />
                      {emailMode === 'signup' ? (
                        <input
                          type="password"
                          placeholder="Bevestig wachtwoord"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="landing-input landing-input-amber"
                        />
                      ) : null}
                      <button
                        type="submit"
                        disabled={authLoading || sessionBusy}
                        className="landing-button landing-button-muted w-full disabled:opacity-60"
                      >
                        {emailMode === 'signup' ? 'Account Aanmaken' : 'Inloggen met E-mail'}
                      </button>
                    </div>
                  </form>
                ) : null}

                {(authError || localAuthError) ? (
                  <div className="mt-4 rounded-2xl border border-rose-900/50 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
                    {localAuthError || authError}
                  </div>
                ) : null}
              </div>
            ) : showSessionHub ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="landing-chip border-stone-700/60 bg-stone-950/55 text-stone-200">{activeRecentSessions.length} sessies</span>
                  {gmRecentCount > 0 ? (
                    <span className="landing-chip border-amber-900/50 bg-amber-950/20 text-amber-200">{gmRecentCount} GM</span>
                  ) : null}
                  {playerRecentCount > 0 ? (
                    <span className="landing-chip border-indigo-900/50 bg-indigo-950/20 text-indigo-200">{playerRecentCount} speler</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onSignOut?.()}
                  className="landing-action-button border-rose-900/50 bg-rose-950/25 text-rose-200 hover:border-rose-700/60 hover:bg-rose-950/40 hover:text-rose-100"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log uit
                </button>
              </div>
            ) : (
              <p className="max-w-xl text-sm md:text-base text-stone-400 font-story leading-relaxed">
                {sessionBusy
                  ? 'We proberen je meest recente sessie direct te openen.'
                  : 'We laden je sessies om te bepalen of je direct terug de wereld in kunt.'}
              </p>
            )}
          </div>
        </section>

        {landingAboutSection}

        {sessionError ? (
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-rose-900/50 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
            {sessionError}
          </div>
        ) : null}

        {sessionInfo ? (
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-emerald-900/50 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200">
            {sessionInfo}
          </div>
        ) : null}

        {recentSessionsSection}

        {showSessionHub ? (
          <section className={`mx-auto w-full max-w-5xl landing-surface rounded-[26px] p-4 md:p-5 lg:p-6 ${activeRoleTab === 'gm' ? 'border-amber-900/30' : 'border-indigo-900/30'}`}>
            <div className="text-center">
              <div>
                <div className="landing-kicker text-stone-400">Acties</div>
                <h2 className="mt-1 text-xl md:text-2xl font-fantasy tracking-[0.12em] text-stone-100">
                  {activeRoleTab === 'gm' ? 'Start een sessie' : 'Sluit aan bij een wereld'}
                </h2>
              </div>

              <div className="mt-4 flex justify-center">
                <div className="landing-role-toggle">
                  <button
                    type="button"
                    onClick={() => handleRoleToggle('player')}
                    className={`landing-role-toggle-button ${activeRoleTab === 'player' ? 'landing-role-toggle-button-indigo' : ''}`}
                  >
                    Speler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleToggle('gm')}
                    className={`landing-role-toggle-button ${activeRoleTab === 'gm' ? 'landing-role-toggle-button-amber' : ''}`}
                  >
                    Game Master
                  </button>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-5 w-full max-w-[34rem] lg:max-w-[38rem]">
              <div className="flex items-center justify-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${activeRoleTab === 'gm' ? 'border-amber-900/50 bg-amber-950/30' : 'border-indigo-900/50 bg-indigo-950/30'}`}>
                  {activeRoleTab === 'gm' ? <Swords className="h-5 w-5 text-amber-500" /> : <Users className="h-5 w-5 text-indigo-400" />}
                </div>
                <div className={`landing-kicker ${activeRoleTab === 'gm' ? 'text-amber-500' : 'text-indigo-400'}`}>{activeRoleTab === 'gm' ? 'Game Master' : 'Speler'}</div>
              </div>

              <div className="mt-4">
                {activeRoleTab === 'gm' ? (
                  <div className="grid gap-3">
                    <input
                      type="text"
                      placeholder="Sessienaam"
                      value={gmSessionName}
                      onChange={(e) => setGmSessionName(e.target.value)}
                      className="landing-input landing-input-amber"
                    />
                    <input
                      type="password"
                      placeholder="PIN (4-8 cijfers)"
                      value={gmSessionPin}
                      onChange={(e) => setGmSessionPin(e.target.value)}
                      className="landing-input landing-input-amber"
                    />
                    <button
                      type="button"
                      onClick={handleGmCreate}
                      disabled={!uid || sessionBusy}
                      className="landing-button landing-button-amber w-full disabled:opacity-60"
                    >
                      Sessie Ontwaken
                    </button>
                    {localGmError ? (
                      <div className="rounded-2xl border border-rose-900/50 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
                        {localGmError}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <input
                      type="text"
                      placeholder="Je karakternaam"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="landing-input landing-input-indigo"
                    />
                    <input
                      type="text"
                      placeholder="Sessie Code"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      className="landing-input landing-input-indigo uppercase"
                    />
                    <input
                      type="password"
                      placeholder={canJoinWithoutPin ? 'PIN niet nodig voor bekende sessie' : 'PIN (4-8 cijfers)'}
                      value={sessionPin}
                      onChange={(e) => setSessionPin(e.target.value)}
                      className={`landing-input ${canJoinWithoutPin ? 'landing-input-emerald' : 'landing-input-indigo'}`}
                    />
                    {canJoinWithoutPin ? (
                      <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200 font-story">
                        Bekende sessie gevonden. Je kunt direct zonder PIN verder.
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handlePlayerJoin}
                      disabled={!uid || sessionBusy}
                      className="landing-button landing-button-indigo w-full disabled:opacity-60"
                    >
                      Betreed de Wereld
                    </button>
                    {localPlayerError ? (
                      <div className="rounded-2xl border border-rose-900/50 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
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
              className="landing-action-button border-emerald-900/50 bg-emerald-950/20 text-emerald-200 hover:border-emerald-700/60 hover:text-emerald-100"
            >
              <Mail className="mr-2 h-4 w-4" />
              {showContactForm ? 'Verberg feedback' : 'Feedback'}
            </button>
          </div>

          {showContactForm ? (
            <div className="landing-surface mt-4 rounded-[24px] p-4 md:p-5">
              <form onSubmit={handleContactSubmit} className="grid gap-3 md:grid-cols-2 text-left">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Je naam"
                  className="landing-input landing-input-emerald"
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="E-mail"
                  className="landing-input landing-input-emerald"
                />
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  rows={4}
                  placeholder="Bericht"
                  className="landing-input landing-input-emerald md:col-span-2 resize-none"
                />
                <button
                  type="submit"
                  className="landing-button landing-button-emerald md:col-span-2"
                >
                  Verstuur via E-mail
                </button>
              </form>
            </div>
          ) : null}
        </section>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-900 border border-rose-900/40 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-800/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-300">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-fantasy tracking-wider text-stone-100">Sessie Permanent Wissen</h3>
              </div>
              <button onClick={closeDeleteFlow} className="text-stone-500 hover:text-stone-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!showGmDeleteWarning ? (
              <div className="p-5 space-y-4">
                <p className="text-sm text-stone-300 font-story leading-relaxed">
                  Om deze sessie permanent te verwijderen, typ de volledige sessienaam exact over zoals hieronder weergegeven.
                </p>
                <div className="rounded-xl border border-stone-800 bg-stone-950/40 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Te bevestigen sessie</div>
                  <div className="font-fantasy text-stone-100 font-bold break-words">{deleteTarget.sessionName || 'Naamloze Sessie'}</div>
                </div>
                <input
                  type="text"
                  value={deleteSessionNameInput}
                  onChange={(e) => setDeleteSessionNameInput(e.target.value)}
                  placeholder="Typ de sessienaam exact over"
                  className="w-full bg-stone-950/90 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-rose-600/50 transition-colors"
                />
                {deleteError && (
                  <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg px-3 py-2">
                    {deleteError}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeDeleteFlow}
                    className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors text-xs font-fantasy tracking-wider"
                  >
                    Annuleer
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteNameConfirm}
                    disabled={sessionBusy}
                    className="flex-1 py-2.5 rounded-lg border border-rose-900/60 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50 transition-colors text-xs font-fantasy tracking-wider disabled:opacity-50"
                  >
                    Bevestigen
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-sm text-stone-300 font-story leading-relaxed">
                  U bent de GM van deze sessie en staat op het punt de volledige campagne definitief te verwijderen. Spelers kunnen deze wereld daarna niet meer betreden en dit kan niet ongedaan worden gemaakt.
                </p>
                <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-sm text-rose-100 font-story leading-relaxed">
                  Weet u zeker dat u <strong>{deleteTarget.sessionName || 'Naamloze Sessie'}</strong> voorgoed wilt wissen?
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGmDeleteWarning(false)}
                    className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors text-xs font-fantasy tracking-wider"
                  >
                    Terug
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalDeleteConfirm}
                    disabled={sessionBusy}
                    className="flex-1 py-2.5 rounded-lg border border-rose-900/60 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50 transition-colors text-xs font-fantasy tracking-wider disabled:opacity-50"
                  >
                    Campagne Wissen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
