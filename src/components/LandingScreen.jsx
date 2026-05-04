import React, { useState } from 'react';
import { AlertTriangle, Flame, Swords, Terminal, Trash2, Users, X } from 'lucide-react';
import { getJoinTagLookupVariants } from '../lib/sessionUtils';

export default function LandingScreen({
  onJoin,
  onResumeRecentSession,
  onHideRecentSession,
  onRestoreRecentSession,
  onDeleteRecentSession,
  onQuickTestGm,
  onQuickTestPlayer,
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
  sessionError,
  sessionInfo,
  sessionBusy,
  onBackfillMemberships,
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

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden bg-texture">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-amber-900/20 blur-[100px] md:blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl z-10 mb-6 mt-12 md:mt-20">
        <div className="bg-gradient-to-b from-stone-900/85 to-stone-950/80 backdrop-blur-md border border-stone-800/80 rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 left-1/3 w-64 h-64 bg-amber-700/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 right-1/3 w-72 h-72 bg-indigo-700/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-stone-100 font-fantasy tracking-wider text-lg md:text-xl">Poort van de Vault</h3>
              <p className="text-stone-500 text-xs md:text-sm font-story italic mt-1">Authenticeer eerst, dan opent de sessiewereld zich.</p>
            </div>
            {uid ? (
              <div className="text-xs md:text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1.5 rounded-full">
                Verbonden als {displayName || (isGuest ? 'Gast' : 'Avonturier')}
              </div>
            ) : (
              <div className="text-xs md:text-sm text-stone-400 bg-stone-950/80 border border-stone-800 px-3 py-1.5 rounded-full">
                Ontgrendel met Google, Gast of E-mail
              </div>
            )}
          </div>

          {!uid && (
            <div className="relative z-10 mt-5 grid md:grid-cols-[1.05fr_1fr] gap-4 md:gap-5">
              <div className="rounded-xl border border-amber-900/40 bg-stone-950/50 p-3 md:p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-600 font-semibold">Snelle toegang</div>
                <button
                  onClick={onSignInGoogle}
                  disabled={authLoading || sessionBusy}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 disabled:opacity-60 text-stone-100 font-fantasy font-bold tracking-widest text-xs md:text-sm rounded-lg transition-all shadow-[0_0_12px_rgba(217,119,6,0.2)]"
                >
                  Doorgaan met Google
                </button>
                <button
                  onClick={onSignInGuest}
                  disabled={authLoading || sessionBusy}
                  className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 disabled:opacity-60 text-stone-200 font-fantasy font-bold tracking-widest text-xs md:text-sm rounded-lg transition-all border border-stone-700"
                >
                  Doorgaan als Gast
                </button>
                <div className="text-[11px] text-stone-500 font-story italic pt-1">Gastmodus is handig om direct te testen zonder account.</div>
              </div>

              <form onSubmit={handleEmailAuth} className="rounded-xl border border-stone-800 bg-stone-950/45 p-3 md:p-4 space-y-2.5">
                <div className="flex bg-stone-950/80 border border-stone-800 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setEmailMode('login')}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${emailMode === 'login' ? 'bg-stone-800 text-stone-100' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    Inloggen
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailMode('signup')}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${emailMode === 'signup' ? 'bg-stone-800 text-stone-100' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    Aanmaken
                  </button>
                </div>
                {emailMode === 'signup' && (
                  <input
                    type="text"
                    placeholder="Weergavenaam"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-stone-950/90 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors"
                  />
                )}
                <input
                  type="email"
                  placeholder="jij@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-950/90 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Wachtwoord"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-950/90 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors"
                />
                {emailMode === 'signup' && (
                  <input
                    type="password"
                    placeholder="Bevestig wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-stone-950/90 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors"
                  />
                )}
                <button
                  type="submit"
                  disabled={authLoading || sessionBusy}
                  className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 disabled:opacity-60 text-stone-200 font-fantasy font-bold tracking-widest text-xs md:text-sm rounded-lg transition-all border border-stone-700"
                >
                  {emailMode === 'signup' ? 'Account Aanmaken' : 'Inloggen met E-mail'}
                </button>
              </form>
            </div>
          )}

          {(authError || localAuthError) && (
            <div className="relative z-10 mt-3 text-xs text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg px-3 py-2">
              {localAuthError || authError}
            </div>
          )}
        </div>
      </div>
      
      <div className="z-10 text-center mb-10 md:mb-16 relative mt-6 md:mt-4">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 md:w-32 md:h-32 bg-amber-500/10 blur-2xl rounded-full" />
        <div className="inline-flex items-center justify-center p-4 bg-stone-900/80 border border-amber-900/30 rounded-2xl mb-4 md:mb-6 shadow-2xl relative">
          <Flame className="w-10 h-10 md:w-12 md:h-12 text-amber-500" />
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold text-stone-100 mb-4 font-fantasy tracking-wider drop-shadow-lg">
          TOME<span className="text-amber-500">VAULT</span>
        </h1>
        <p className="text-stone-400 text-base md:text-xl max-w-xl mx-auto font-story italic px-4">
          Ontsluit de geheimen van de wereld. Deel artefacten, verzamel je reisgenoten en weef jullie eigen legende.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl z-10 pb-10">
        <div className="group bg-stone-900/60 backdrop-blur-sm border border-stone-800 p-6 md:p-8 rounded-xl hover:border-amber-600/50 transition-all shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-950/30 border border-amber-900/50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
            <Swords className="text-amber-500 w-6 h-6 md:w-7 md:h-7" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-stone-100 mb-2 font-fantasy">De Game Master</h2>
          <p className="text-sm md:text-base text-stone-400 mb-4 font-story">Smeed het verhaal. Creëer duistere kerkers, mysterieuze handouts en beheer het lot van de party.</p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Sessienaam (bijv. Ruins of Emberfall)"
              value={gmSessionName}
              onChange={(e) => setGmSessionName(e.target.value)}
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-4 py-3 text-sm md:text-base text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors font-story"
            />
            <input
              type="password"
              placeholder="PIN (4-8 cijfers)"
              value={gmSessionPin}
              onChange={(e) => setGmSessionPin(e.target.value)}
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-4 py-3 text-sm md:text-base text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors font-story"
            />
            <button
              onClick={handleGmCreate}
              disabled={!uid || sessionBusy}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-100 font-fantasy font-bold tracking-widest text-sm md:text-base rounded-lg transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)]"
            >
              Sessie Ontwaken
            </button>
            {localGmError && (
              <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg px-3 py-2">
                {localGmError}
              </div>
            )}
          </div>
        </div>

        <div className="group bg-stone-900/60 backdrop-blur-sm border border-stone-800 p-6 md:p-8 rounded-xl hover:border-indigo-600/50 transition-all shadow-2xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-700/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-950/30 border border-indigo-900/50 rounded-lg flex items-center justify-center mb-4 md:mb-6">
            <Users className="text-indigo-400 w-6 h-6 md:w-7 md:h-7" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-stone-100 mb-2 font-fantasy">De Avonturier</h2>
          <p className="text-sm md:text-base text-stone-400 mb-6 font-story">Treed binnen in de sessie van je Game Master en ontdek wat er in de schaduwen verborgen ligt.</p>
          
          <div className="mt-auto space-y-3 md:space-y-4">
            <input 
              type="text" 
              placeholder="Je Karakter Naam..." 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-4 py-3 text-sm md:text-base text-stone-200 placeholder-stone-600 focus:outline-none focus:border-indigo-500 transition-colors font-story italic"
            />
            <input 
              type="text" 
              placeholder="Sessie Code (bijv. #DRAAK-1234)" 
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-4 py-3 text-sm md:text-base text-stone-200 placeholder-stone-600 focus:outline-none focus:border-indigo-500 transition-colors font-story uppercase"
            />
            <input
              type="password"
              placeholder={canJoinWithoutPin ? 'PIN niet nodig voor bekende sessie' : 'PIN (4-8 cijfers)'}
              value={sessionPin}
              onChange={(e) => setSessionPin(e.target.value)}
              className={`w-full bg-stone-950/80 border rounded-lg px-4 py-3 text-sm md:text-base text-stone-200 placeholder-stone-600 focus:outline-none transition-colors font-story ${canJoinWithoutPin ? 'border-emerald-800/60 focus:border-emerald-500' : 'border-stone-700 focus:border-indigo-500'}`}
            />
            {canJoinWithoutPin && (
              <div className="text-[11px] text-emerald-400 font-story italic px-1">
                Deze sessie staat in je recente lijst. Je kunt direct zonder PIN binnenkomen.
              </div>
            )}
            <button 
              onClick={handlePlayerJoin}
              disabled={!uid || sessionBusy}
              className="w-full py-3 px-4 bg-stone-800 hover:bg-indigo-900/40 text-stone-200 hover:text-indigo-200 font-fantasy font-bold tracking-widest text-sm md:text-base rounded-lg transition-all border border-stone-700 hover:border-indigo-500/50"
            >
              Betreed de Wereld
            </button>
            {localPlayerError && (
              <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg px-3 py-2">
                {localPlayerError}
              </div>
            )}
          </div>
        </div>
      </div>

      {uid && (
        <div className="w-full max-w-4xl z-10 mb-6">
          <div className="bg-stone-900/60 backdrop-blur-sm border border-stone-800 rounded-xl p-4 md:p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-stone-100 font-fantasy tracking-wider text-sm md:text-base">Recente Sessies</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onBackfillMemberships?.()}
                  disabled={sessionBusy}
                  className="text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-amber-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  title="Herstel oude sessies waar je GM of speler bent"
                >
                  Herstel oud
                </button>
                {hiddenRecentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHiddenSessions((v) => !v)}
                    className="text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-amber-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-2 py-1 rounded transition-colors"
                  >
                    {showHiddenSessions ? 'Verberg verborgen' : `Toon verborgen (${hiddenRecentCount})`}
                  </button>
                )}
                <span className="text-[10px] uppercase tracking-widest text-stone-500">Zonder PIN hervatten</span>
              </div>
            </div>

            {visibleRecentSessions.length === 0 ? (
              <div className="border border-dashed border-stone-800 rounded-lg px-4 py-6 text-center bg-stone-950/35">
                <p className="text-sm text-stone-400 font-story italic">
                  Nog geen recente sessies gevonden voor dit account.
                </p>
                <p className="text-[11px] text-stone-500 mt-2">
                  Gebruik Herstel oud om eerdere sessies toe te voegen, of join eerst een sessie.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleRecentSessions.slice(0, 8).map((session) => {
                  const displayCode = session.joinTag || session.sessionId;
                  const roleLabel = session.role === 'dm' ? 'GM' : 'Speler';
                  const defaultAsRole = session.role === 'dm' ? 'gm' : 'player';
                  const isHidden = session.status === 'hidden';

                  return (
                    <div key={session.sessionId} className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-lg px-3 py-2.5 ${isHidden ? 'border-stone-800/60 bg-stone-950/30 opacity-80' : 'border-stone-800 bg-stone-950/50'}`}>
                      <div className="min-w-0">
                        <div className="text-stone-200 text-sm font-fantasy truncate">{session.sessionName || 'Naamloze Sessie'}</div>
                        <div className="text-[10px] text-stone-500 uppercase tracking-widest truncate">{displayCode} • Laatst actief: {session.updatedAtLabel}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${session.role === 'dm' ? 'text-amber-500 border-amber-900/50 bg-amber-950/20' : 'text-indigo-400 border-indigo-900/50 bg-indigo-950/20'}`}>
                          {roleLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => (isHidden ? onRestoreRecentSession?.(session.sessionId) : onHideRecentSession?.(session.sessionId))}
                          disabled={sessionBusy}
                          className={`text-[11px] font-bold bg-stone-800 hover:bg-stone-700 border border-stone-700 px-2 py-1.5 rounded transition-colors ${isHidden ? 'text-emerald-300 hover:text-emerald-200' : 'text-stone-400 hover:text-rose-300'}`}
                          title={isHidden ? 'Zet terug in recente lijst' : 'Verberg uit deze lijst'}
                        >
                          {isHidden ? 'Herstel' : 'Verberg'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteFlow(session)}
                          disabled={sessionBusy}
                          className="h-8 w-8 flex items-center justify-center text-rose-300 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 rounded transition-colors disabled:opacity-50"
                          title="Verlaat en wis deze sessie permanent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onResumeRecentSession?.(session, defaultAsRole)}
                          disabled={sessionBusy}
                          className="text-[11px] font-bold text-stone-200 hover:text-amber-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1.5 rounded transition-colors"
                        >
                          Hervat
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {sessionError && (
        <div className="w-full max-w-4xl z-10 mb-4 text-xs md:text-sm text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg px-4 py-3">
          {sessionError}
        </div>
      )}

      {sessionInfo && (
        <div className="w-full max-w-4xl z-10 mb-4 text-xs md:text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 rounded-lg px-4 py-3">
          {sessionInfo}
        </div>
      )}

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

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity bg-stone-950/80 p-2 rounded-lg border border-stone-800 backdrop-blur-sm">
        <div className="text-[10px] font-sans text-stone-500 uppercase tracking-widest flex items-center gap-1.5 mr-2">
          <Terminal className="w-3.5 h-3.5" /> Test Modus
        </div>
        <button 
          onClick={() => {
            if (uid) onQuickTestGm?.();
          }}
          disabled={!uid || sessionBusy}
          className="text-[10px] font-bold text-amber-600 hover:text-amber-400 uppercase tracking-wider bg-stone-900 px-3 py-1.5 rounded border border-stone-800 hover:border-amber-900/50 transition-colors"
        >
          GM
        </button>
        <button 
          onClick={() => {
            if (!playerName) setPlayerName('Elara');
            if (uid) onQuickTestPlayer?.();
          }}
          disabled={!uid || sessionBusy}
          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider bg-stone-900 px-3 py-1.5 rounded border border-stone-800 hover:border-indigo-900/50 transition-colors"
        >
          Speler
        </button>
      </div>
    </div>
  );
}
