import React, { useEffect, useRef, useState } from 'react';
import { Flame, Loader2, LogIn, Mail, ShieldCheck, Swords } from 'lucide-react';
import landingBackgroundVideo from '../../Video/landingBG.mp4';

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
  theme = 'ember-forge',
}) {
  const videoRef = useRef(null);
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

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
      setLocalError('Voer je naam in.');
      return;
    }
    if (!uid) {
      setLocalError('Log eerst in.');
      return;
    }
    onJoin(trimmedName, inviteCode);
  };

  const isBusy = authLoading || sessionBusy;
  const displayError = localError || authError || sessionError;

  return (
    <div data-theme={theme} className="tv-entry-root relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={landingBackgroundVideo}
        className="landing-video-element pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
        loop
        playsInline
        autoPlay
        muted
      />
      <div className="landing-video-darkener pointer-events-none absolute inset-0" />

      <div className="tv-entry-rail relative z-10 flex w-full max-w-sm flex-col items-center gap-6 px-6 py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Flame className="tv-accent h-8 w-8 tv-magic-glow" />
            <span className="font-fantasy text-2xl tracking-[0.22em] tv-text">
              TOME<span className="tv-accent">VAULT</span>
            </span>
          </div>
          <span className="tv-label">Uitnodiging</span>
        </div>

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[color-mix(in_srgb,var(--tv-border),transparent_20%)]" />
          <Swords className="tv-muted h-4 w-4" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[color-mix(in_srgb,var(--tv-border),transparent_20%)]" />
        </div>

        <div className="tv-entry-hero-card flex w-full flex-col gap-4 p-5">
          {!uid ? (
            <>
              <div className="rounded-2xl border border-emerald-900/35 bg-emerald-950/18 px-4 py-3 text-sm font-story leading-relaxed text-emerald-100">
                <div className="flex items-center gap-2 font-fantasy text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Account
                </div>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100/90">
                  Log in om via deze uitnodiging mee te doen — zonder PIN.
                </p>
              </div>

              {displayError ? (
                <p className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-2.5 font-story text-sm text-rose-300">
                  {displayError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => onSignInGoogle?.()}
                disabled={isBusy}
                className="tv-button-primary flex h-11 w-full items-center justify-center gap-2.5 rounded-xl font-fantasy text-sm uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    …
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Google
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onUseFullLogin?.()}
                disabled={isBusy}
                className="tv-button-secondary flex h-11 w-full items-center justify-center gap-2.5 rounded-xl px-4 font-story text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                E-mail
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="tv-label mb-1.5 block">Naam</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isBusy && handleJoin()}
                  placeholder="Bijv. Aragorn"
                  maxLength={32}
                  disabled={isBusy}
                  className="tv-field"
                />
              </div>

              {displayError ? (
                <p className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-4 py-2.5 font-story text-sm text-rose-300">
                  {displayError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleJoin}
                disabled={isBusy}
                className="tv-button-primary flex h-11 w-full items-center justify-center gap-2.5 rounded-xl font-fantasy text-sm uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    …
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Deelnemen
                  </>
                )}
              </button>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 opacity-60">
          <span className="tv-label">Code</span>
          <span className="font-fantasy text-xs tracking-[0.14em] tv-accent">{inviteCode}</span>
        </div>

        <button
          type="button"
          onClick={() => onUseFullLogin?.()}
          className="tv-muted text-center font-story text-[11px] underline-offset-2 hover:tv-accent hover:underline"
        >
          Aanmeldformulier
        </button>
      </div>
    </div>
  );
}
