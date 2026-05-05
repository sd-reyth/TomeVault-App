import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Clock3,
  DoorOpen,
  Flame,
  LogOut,
  Mail,
  ShieldCheck,
  Swords,
  Trash2,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { getJoinTagLookupVariants } from '../lib/sessionUtils';
import RuntimeBadge from './RuntimeBadge';

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
  const [sessionCode, setSessionCode] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [gmSessionName, setGmSessionName] = useState('');
  const [gmSessionPin, setGmSessionPin] = useState('');
  const [showHiddenSessions, setShowHiddenSessions] = useState(false);

  const [localGmError, setLocalGmError] = useState('');
  const [localPlayerError, setLocalPlayerError] = useState('');

  const [emailMode, setEmailMode] = useState('login');
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

  const handleRoleToggle = (nextRole) => {
    setActiveRoleTab(nextRole);
    setRolePreferenceLocked(true);
  };

  const featureHighlights = [
    {
      icon: BookOpen,
      title: 'Handouts zonder omweg',
      body: 'Deel lore, clues en kaarten zonder dat de tafel stilvalt.',
      iconClassName: 'text-amber-500',
      shellClassName: 'border-amber-900/30 bg-amber-950/10',
    },
    {
      icon: Wand2,
      title: 'Realtime samen spelen',
      body: 'Chat, notities en sessiestatus blijven voor iedereen synchroon.',
      iconClassName: 'text-indigo-400',
      shellClassName: 'border-indigo-900/30 bg-indigo-950/10',
    },
    {
      icon: ShieldCheck,
      title: 'Duidelijke rollen',
      body: 'GM en spelers delen dezelfde wereld, zonder door elkaar heen te werken.',
      iconClassName: 'text-emerald-400',
      shellClassName: 'border-emerald-900/30 bg-emerald-950/10',
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

  const heroProofs = !uid
    ? ['Handouts die echt sfeer dragen', 'Realtime voor de hele tafel', 'Doorgaan als Gast zonder drempel']
    : showSessionHub
      ? ['Jouw laatste sessies staan klaar', 'Keer terug als speler of GM', 'Alles voelt alsof je aan tafel aanschuift']
      : ['De tafel wordt alvast klaargezet', 'Je laatst gespeelde wereld wordt nagekeken', 'We leiden je zo terug de campagne in'];

  const roleStory = activeRoleTab === 'gm'
    ? {
        kicker: 'Voor de verteller',
        title: 'Open de deur naar een nieuwe campagne',
        body: 'Zet de toon met een sessienaam, sluit de poort met een PIN en nodig de rest van de tafel uit wanneer jij klaar bent.',
        shellClassName: 'border-amber-900/40 bg-amber-950/12',
        accentClassName: 'text-amber-300',
        lines: ['Veilige PIN om je tafel besloten te houden', 'Direct klaar om spelers uit te nodigen', 'Past bij one-shots en lange campagnes'],
      }
    : {
        kicker: 'Voor de speler',
        title: 'Schuif weer aan bij de groep',
        body: 'Gebruik je naam en sessiecode om meteen terug in het verhaal te vallen. Bekende werelden laat TomeVault herkennen zonder extra ruis.',
        shellClassName: 'border-indigo-900/40 bg-indigo-950/12',
        accentClassName: 'text-indigo-300',
        lines: ['Sessiecode direct ingevuld bij uitnodigingscontext', 'Bekende werelden kunnen zonder PIN verder', 'Werkt voor terugkerende spelers en nieuwe gasten'],
      };

  const rolePreview = activeRoleTab === 'gm' ? (
    <div className={`landing-preview-fragment ${roleStory.shellClassName}`}>
      <div className="landing-kicker text-amber-400">Voorproef</div>
      <div className="mt-3 rounded-[24px] border border-amber-900/35 bg-stone-950/65 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-amber-500/80">De Herberg van Sintels</div>
            <div className="mt-2 font-fantasy text-lg tracking-[0.12em] text-stone-100">Wereld in voorbereiding</div>
          </div>
          <div className="rounded-full border border-amber-800/50 bg-amber-950/35 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200">GM</div>
        </div>
        <div className="mt-4 space-y-2 text-sm text-stone-300 font-story">
          <div className="rounded-2xl border border-stone-800/70 bg-stone-900/70 px-4 py-3">Campagnenaam: klaar om spelers te ontvangen</div>
          <div className="rounded-2xl border border-stone-800/70 bg-stone-900/70 px-4 py-3">PIN ingesteld om de tafel besloten te houden</div>
        </div>
      </div>
    </div>
  ) : (
    <div className={`landing-preview-fragment ${roleStory.shellClassName}`}>
      <div className="landing-kicker text-indigo-400">Voorproef</div>
      <div className="mt-3 space-y-3 rounded-[24px] border border-indigo-900/35 bg-stone-950/65 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        <div className="rounded-[20px] border border-stone-800/70 bg-stone-900/75 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Laatste regel aan tafel</div>
          <div className="mt-2 font-story text-sm leading-6 text-stone-200">“De deur kraakte open en iedereen keek tegelijk naar de kaart op tafel.”</div>
        </div>
        <div className="rounded-[20px] border border-indigo-900/35 bg-indigo-950/22 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-300/80">Uitnodiging</div>
          <div className="mt-2 font-fantasy text-base tracking-[0.12em] text-stone-100">Code klaar om in te vullen</div>
          <div className="mt-1 text-sm text-stone-300 font-story">{inviteCode ? inviteCode.toUpperCase() : 'Voer je sessiecode in en pak de draad weer op.'}</div>
        </div>
      </div>
    </div>
  );

  const recentSessionsSection = uid && showSessionHub ? (
    <section className="w-full">
      <div className="landing-surface rounded-[32px] p-5 md:p-6 lg:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="landing-kicker text-amber-500">Haardvuur</div>
            <h2 className="text-2xl md:text-3xl font-fantasy tracking-[0.12em] text-stone-100">Pak het verhaal weer op</h2>
            <p className="max-w-2xl text-sm md:text-base text-stone-400 font-story leading-relaxed">
              {displayedRecentSessions.length > 0
                ? 'Je laatst bezochte werelden staan al klaar. Eén klik en je schuift weer aan alsof de dobbelstenen nog warm zijn.'
                : 'Zodra je een wereld opent of herstelt, verschijnt hier je vertrouwde route terug naar tafel.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
        </div>

        {displayedRecentSessions.length === 0 ? (
          <div className="mt-5 rounded-[28px] border border-dashed border-stone-800/70 bg-stone-950/40 px-5 py-8 text-center">
            <p className="text-base text-stone-300 font-story italic">Nog geen recente sessies gevonden voor dit account.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                      <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-stone-500">Code {displayCode}</div>
                    </div>
                    <span className={`landing-chip ${roleAccent}`}>{roleLabel}</span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-stone-300 font-story">
                    {session.role === 'dm'
                      ? 'De tafel die jij bewaakt staat nog klaar. Keer terug als verteller en open de wereld precies waar je bleef.'
                      : 'Jouw stoel aan tafel wacht nog. Spring direct terug naar de groep zonder opnieuw door menu’s te dwalen.'}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-sm text-stone-400 font-story leading-relaxed">
                    <Clock3 className="h-4 w-4 shrink-0 text-stone-500" />
                    <span>Laatst gezien: {session.updatedAtLabel}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-stone-950 bg-texture">
      {runtimeBadge ? (
        <div className="absolute right-4 top-4 z-20">
          <RuntimeBadge runtimeBadge={runtimeBadge} />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_60%)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-amber-900/12 blur-[130px]" />
      <div className="pointer-events-none absolute right-[-8%] top-56 h-80 w-80 rounded-full bg-indigo-900/10 blur-[120px]" />
      <div className="pointer-events-none absolute left-[6%] top-[26rem] h-72 w-72 rounded-full bg-emerald-900/8 blur-[120px]" />

      <div className="landing-content-rail relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-14 pt-12 sm:px-6 md:gap-6 md:pt-20">
        <section className="landing-hero rounded-[34px] px-5 py-6 md:px-8 md:py-8 lg:px-9 lg:py-10">
          <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_72%)] pointer-events-none" />
          <div className="absolute right-0 top-10 hidden h-44 w-44 rounded-full border border-stone-800/70 bg-stone-950/35 blur-3xl lg:block" />

          <div className={`relative z-10 grid gap-8 ${uid ? 'lg:grid-cols-[1.2fr_0.8fr] lg:items-start' : 'xl:grid-cols-[1.1fr_0.9fr] xl:items-start'}`}>
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="landing-chip border-amber-900/40 bg-amber-950/18 text-amber-200">
                  <Flame className="h-3.5 w-3.5" />
                  TomeVault
                </div>
                <div className={`landing-chip ${uid ? 'border-emerald-900/45 bg-emerald-950/18 text-emerald-200' : 'border-stone-700/65 bg-stone-950/55 text-stone-200'}`}>
                  {uid ? `Verbonden als ${resolvedDisplayName}` : 'Digitale herberg voor tabletop groepen'}
                </div>
              </div>

              <div className="space-y-4">
                {!uid ? (
                  <>
                    <h1 className="max-w-4xl text-5xl leading-[0.9] font-fantasy tracking-[0.08em] text-stone-100 sm:text-6xl lg:text-7xl xl:text-[5.15rem]">
                      TOME<span className="text-amber-500">VAULT</span>
                    </h1>
                    <p className="max-w-2xl text-base md:text-xl text-stone-300 font-story leading-relaxed">
                      Schuif aan in een warme digitale herberg voor campagnes die handouts, chat, notities en sessiebeheer bij elkaar willen houden zonder dashboard-ruis.
                    </p>
                  </>
                ) : showSessionHub ? (
                  <>
                    <div className="landing-kicker text-emerald-400">Welkom terug</div>
                    <h1 className="max-w-4xl text-4xl leading-[0.96] font-fantasy tracking-[0.08em] text-stone-100 sm:text-5xl lg:text-6xl">
                      Welkom terug aan tafel, <span className="text-amber-400">{resolvedDisplayName}</span>.
                    </h1>
                    <p className="max-w-2xl text-base md:text-xl text-stone-300 font-story leading-relaxed">
                      Je wereld, je notities en je laatste verhalen staan al klaar. Kies of je opnieuw aanschuift als speler of de deur opent als verteller.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="landing-kicker text-emerald-400">Verbonden</div>
                    <h1 className="max-w-4xl text-4xl leading-[0.96] font-fantasy tracking-[0.08em] text-stone-100 sm:text-5xl lg:text-6xl">
                      De haard brandt al.
                    </h1>
                    <p className="max-w-2xl text-base md:text-xl text-stone-300 font-story leading-relaxed">
                      We zoeken je laatst gebruikte wereld op zodat je zo weer verder kunt waar het verhaal de vorige keer stilviel.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {heroProofs.map((proof) => (
                  <span key={proof} className="landing-chip border-stone-700/60 bg-stone-950/55 text-stone-200">
                    {proof}
                  </span>
                ))}
              </div>
            </div>

            {!uid ? (
              <div className="landing-surface rounded-[30px] p-5 md:p-6">
                <div className="landing-kicker text-amber-500">Start hier</div>
                <h2 className="mt-2 text-2xl font-fantasy tracking-[0.12em] text-stone-100">Log in en open je tafel</h2>

                <div className="mt-5 space-y-3">
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
                  <div className="mt-4 rounded-[22px] border border-indigo-900/35 bg-indigo-950/18 px-4 py-3 text-sm text-indigo-100 font-story leading-relaxed">
                    Uitnodiging herkend{inviteCode ? ` voor code ${inviteCode.toUpperCase()}` : ''}. Log in en je schuift direct naar de spelerstoel.
                  </div>
                ) : null}

                <form onSubmit={handleEmailAuth} className="mt-5 border-t border-stone-800/70 pt-5">
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

                {(authError || localAuthError) ? (
                  <div className="mt-4 rounded-2xl border border-rose-900/50 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
                    {localAuthError || authError}
                  </div>
                ) : null}
              </div>
            ) : showSessionHub ? (
              <div className="landing-surface rounded-[30px] p-5 md:p-6">
                <div className="landing-kicker text-emerald-400">Je plek aan tafel</div>
                <h2 className="mt-2 text-2xl font-fantasy tracking-[0.12em] text-stone-100">Alles staat voor je klaar</h2>
                <p className="mt-3 text-sm md:text-base text-stone-400 font-story leading-relaxed">
                  {activeRecentSessions.length > 0
                    ? 'Hervat direct een bekende wereld of kies hieronder of je vandaag vooral speelt of leidt.'
                    : 'Je bent verbonden. Kies hieronder hoe je vandaag de wereld wilt betreden.'}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-stone-800/70 bg-stone-950/55 px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Actieve routes</div>
                    <div className="mt-2 font-fantasy text-2xl tracking-[0.12em] text-stone-100">{activeRecentSessions.length}</div>
                  </div>
                  <div className="rounded-[22px] border border-amber-900/35 bg-amber-950/16 px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-amber-400/80">GM</div>
                    <div className="mt-2 font-fantasy text-2xl tracking-[0.12em] text-amber-100">{gmRecentCount}</div>
                  </div>
                  <div className="rounded-[22px] border border-indigo-900/35 bg-indigo-950/16 px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300/80">Speler</div>
                    <div className="mt-2 font-fantasy text-2xl tracking-[0.12em] text-indigo-100">{playerRecentCount}</div>
                  </div>
                </div>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => onSignOut?.()}
                    className="landing-action-button border-rose-900/50 bg-rose-950/25 text-rose-200 hover:border-rose-700/60 hover:bg-rose-950/40 hover:text-rose-100"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log uit
                  </button>
                </div>
              </div>
            ) : (
              <div className="landing-surface rounded-[30px] p-5 md:p-6">
                <div className="landing-kicker text-emerald-400">Verbonden</div>
                <h2 className="mt-2 text-2xl font-fantasy tracking-[0.12em] text-stone-100">Even geduld</h2>
                <p className="mt-3 text-sm md:text-base text-stone-400 font-story leading-relaxed">
                  {sessionBusy
                    ? 'We proberen je meest recente sessie direct te openen.'
                    : 'We laden je sessies om te bepalen of je direct terug de wereld in kunt.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {sessionError ? (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
            {sessionError}
          </div>
        ) : null}

        {sessionInfo ? (
          <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200">
            {sessionInfo}
          </div>
        ) : null}

        {recentSessionsSection}

        {showSessionHub ? (
          <section className="landing-surface rounded-[32px] p-5 md:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="landing-kicker text-stone-400">Kies je stoel aan tafel</div>
                <h2 className="mt-2 text-2xl md:text-3xl font-fantasy tracking-[0.12em] text-stone-100">Start een wereld of schuif weer aan</h2>
                <p className="mt-3 text-sm md:text-base text-stone-400 font-story leading-relaxed">
                  Één rustige actieruimte is genoeg. Kies eerst je rol, daarna laten we alleen zien wat op dit moment relevant is.
                </p>
              </div>

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

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className={`landing-surface rounded-[28px] p-5 md:p-6 ${activeRoleTab === 'gm' ? 'border-amber-900/40 bg-amber-950/10' : 'border-indigo-900/40 bg-indigo-950/10'}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${activeRoleTab === 'gm' ? 'border-amber-900/50 bg-amber-950/30' : 'border-indigo-900/50 bg-indigo-950/30'}`}>
                    {activeRoleTab === 'gm' ? <Swords className="h-6 w-6 text-amber-500" /> : <Users className="h-6 w-6 text-indigo-400" />}
                  </div>
                  <div>
                    <div className={`landing-kicker ${activeRoleTab === 'gm' ? 'text-amber-500' : 'text-indigo-400'}`}>{activeRoleTab === 'gm' ? 'Game Master' : 'Speler'}</div>
                    <h3 className="mt-2 text-2xl font-fantasy tracking-[0.12em] text-stone-100">{activeRoleTab === 'gm' ? 'Start een sessie' : 'Sluit aan bij een wereld'}</h3>
                    <p className="mt-3 text-sm md:text-base text-stone-400 font-story leading-relaxed">
                      {activeRoleTab === 'gm'
                        ? 'Geef je campagne een naam, zet een PIN en open direct een nieuwe tafel voor je groep.'
                        : 'Gebruik je naam, sessiecode en PIN om meteen terug aan tafel te zitten.'}
                    </p>
                  </div>
                </div>

                {activeRoleTab === 'gm' ? (
                  <div className="mt-6 grid gap-3">
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
                  <div className="mt-6 grid gap-3">
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

              <div className="self-stretch">
                <div className="landing-kicker text-stone-500">Waarom dit helpt</div>
                <h3 className="mt-2 text-xl font-fantasy tracking-[0.12em] text-stone-100">{roleStory.title}</h3>
                <p className="mt-3 text-sm md:text-base text-stone-400 font-story leading-relaxed">{roleStory.body}</p>
                <div className="mt-4 space-y-2 text-sm font-story text-stone-300">
                  {roleStory.lines.map((line) => (
                    <div key={line} className="flex items-start gap-2 rounded-2xl border border-stone-800/70 bg-stone-950/45 px-4 py-3">
                      <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${activeRoleTab === 'gm' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5">{rolePreview}</div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <div className="landing-kicker text-amber-500">Waarom groepen TomeVault gebruiken</div>
            <h2 className="mt-2 text-2xl md:text-3xl font-fantasy tracking-[0.12em] text-stone-100">Minder systeemgevoel, meer kampvuursfeer</h2>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-stone-400 font-story leading-relaxed">
              Geen overvolle cockpit, maar kleine duidelijke signalen die je herinneren aan wat er op tafel gebeurt: een gedeelde notitie, een handout die opduikt, een wereld die op je wacht.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {featureHighlights.map((feature) => {
              const Icon = feature.icon;

              return (
                <div key={feature.title} className={`landing-surface rounded-[28px] p-5 md:p-6 ${feature.shellClassName}`}>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-800/70 bg-stone-950/60 ${feature.iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-base md:text-lg font-fantasy text-stone-100 tracking-[0.12em]">{feature.title}</h4>
                  <p className="mt-2 text-sm text-stone-400 font-story leading-relaxed">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-surface rounded-[32px] p-5 md:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-400" />
                <div className="landing-kicker text-emerald-400">Contact</div>
              </div>
              <h2 className="mt-2 text-2xl md:text-3xl font-fantasy tracking-[0.12em] text-stone-100">Stuur ons je feedback</h2>
              <p className="mt-3 max-w-xl text-sm md:text-base text-stone-400 font-story leading-relaxed">
                Heb je feedback of een feature-idee? Laat een bericht achter. We houden deze landing bewust kort en duidelijk, en diezelfde helderheid willen we ook in de rest van de app.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="grid gap-3 md:grid-cols-2">
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
                rows={5}
                placeholder="Waar kunnen we je mee helpen?"
                className="landing-input landing-input-emerald md:col-span-2 resize-none"
              />
              <button
                type="submit"
                className="landing-button landing-button-emerald md:col-span-2 md:w-fit"
              >
                Verstuur via E-mail
              </button>
            </form>
          </div>
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
