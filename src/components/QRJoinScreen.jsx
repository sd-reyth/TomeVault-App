import React, { useEffect, useRef, useState } from 'react';
import { Flame, Loader2, LogIn, Mail, ShieldCheck, Swords } from 'lucide-react';
import landingBackgroundVideo from '../../Video/landingBG.mp4';

/**
 * Shown when the user arrives via a QR-code invite link (?code=…).
 * Joining stays PIN-free, but now requires an account before the player enters the session.
 */
export default function QRJoinScreen({
  inviteCode,
  uid,
  authLoading,
  sessionBusy,
  authError,
  sessionError,
  onSignInGoogle,
  onUseFullLogin,
  onJoin,
}) {
  const videoRef = useRef(null);
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  // Muted autoplay background video.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  const handleJoin = () => {
    setLocalError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Voer je naam in zodat de andere spelers je kennen.');
      return;
    }
    if (!uid) {
      setLocalError('Log eerst in voordat je via deze uitnodiging kunt deelnemen.');
      return;
    }
    onJoin(trimmedName, inviteCode);
  };

  const isBusy = authLoading || sessionBusy;
  const displayError = localError || authError || sessionError;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-stone-950">
      {/* Background video */}
      <video
        ref={videoRef}
        src={landingBackgroundVideo}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
        loop
        playsInline
        autoPlay
        muted
      />

      {/* Overlay gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-stone-950/60 via-transparent to-stone-950/90" />

      {/* Content card */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-6 py-12">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            <span className="font-fantasy text-2xl tracking-[0.22em] text-stone-100">
              TOME<span className="text-amber-500">VAULT</span>
            </span>
          </div>
          <span className="font-story text-sm text-stone-400 tracking-wide">
            Je bent uitgenodigd voor een sessie
          </span>
        </div>

        {/* Divider with swords icon */}
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-700/60" />
          <Swords className="h-4 w-4 text-stone-600" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-700/60" />
        </div>

        {/* Join form */}
        <div className="flex w-full flex-col gap-4">
          {!uid ? (
            <>
              <div className="rounded-2xl border border-emerald-900/35 bg-emerald-950/18 px-4 py-3 text-sm font-story leading-relaxed text-emerald-100">
                <div className="flex items-center gap-2 font-fantasy text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Account vereist
                </div>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100/90">
                  Log eerst in om via deze uitnodiging verder te gaan. Daarna kun je zonder PIN meteen aan tafel aanschuiven.
                </p>
              </div>

              {displayError && (
                <p className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-2.5 font-story text-sm text-rose-300">
                  {displayError}
                </p>
              )}

              <button
                type="button"
                onClick={() => onSignInGoogle?.()}
                disabled={isBusy}
                className="h-11 w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 font-fantasy text-sm uppercase tracking-[0.18em] text-stone-100 shadow-lg shadow-amber-900/30 transition-all hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verbinden…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Doorgaan met Google
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onUseFullLogin?.()}
                disabled={isBusy}
                className="h-11 w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-stone-700 bg-stone-900/85 px-4 font-story text-sm text-stone-200 transition-colors hover:border-amber-700/50 hover:text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-4 w-4" />
                Gebruik e-mail of maak een account
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                  Jouw naam aan tafel
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isBusy && handleJoin()}
                  placeholder="Bijv. Aragorn"
                  maxLength={32}
                  disabled={isBusy}
                  className="h-11 w-full rounded-lg border border-stone-700 bg-stone-900/80 px-4 font-story text-sm text-stone-200 placeholder-stone-600 transition-colors focus:border-amber-600/60 focus:outline-none disabled:opacity-50"
                />
              </div>

              {displayError && (
                <p className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-2.5 font-story text-sm text-rose-300">
                  {displayError}
                </p>
              )}

              <button
                type="button"
                onClick={handleJoin}
                disabled={isBusy}
                className="h-11 w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 font-fantasy text-sm uppercase tracking-[0.18em] text-stone-100 shadow-lg shadow-amber-900/30 transition-all hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deelnemen…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Direct deelnemen
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Session code hint */}
        <div className="flex flex-col items-center gap-1 opacity-40">
          <span className="font-fantasy text-[9px] uppercase tracking-[0.2em] text-stone-500">Sessiecode</span>
          <span className="font-fantasy text-xs tracking-[0.14em] text-amber-400/80">{inviteCode}</span>
        </div>

        {/* Fine print */}
        <p className="text-center font-story text-[11px] leading-5 text-stone-600">
          Via QR-code deelnemen vereist geen PIN, maar wel een account.
          <br />
          Lukt het niet?{' '}
          <button
            type="button"
            onClick={() => {
              onUseFullLogin?.();
            }}
            className="text-amber-500/70 underline underline-offset-2 hover:text-amber-400 transition-colors"
          >
            Gebruik het aanmeldformulier
          </button>
          .
        </p>
      </div>
    </div>
  );
}
