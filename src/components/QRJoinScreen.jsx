import React, { useEffect, useRef, useState } from 'react';
import { Flame, Loader2, LogIn, Mail, Scroll, ShieldCheck, Swords } from 'lucide-react';
import { formatCampaignDisplayName } from '../lib/sessionUtils';
import landingBackgroundVideo from '../../Video/landingBG.mp4';

export default function QRJoinScreen({
  inviteCode,
  campaignName = '',
  sessionNumber = null,
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
  const displayCampaignName = formatCampaignDisplayName(campaignName, '');
  const safeSessionNumber = Math.max(1, Number(sessionNumber) || 0);

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

        {displayCampaignName ? (
          <div className="tv-entry-hero-card w-full px-4 py-4 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] text-[color:var(--tv-accent)]">
              <Scroll className="h-4 w-4" />
            </div>
            <div className="font-fantasy text-xl tracking-[0.04em] tv-text">{displayCampaignName}</div>
            {safeSessionNumber > 0 ? (
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--tv-text-secondary)]">
                Sessie {safeSessionNumber}
              </div>
            ) : null}
            <p className="tv-meta mt-3 text-sm leading-relaxed">
              Je bent uitgenodigd om mee te spelen. Log in om verder te gaan.
            </p>
          </div>
        ) : null}

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[color-mix(in_srgb,var(--tv-border),transparent_20%)]" />
          <Swords className="tv-muted h-4 w-4" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[color-mix(in_srgb,var(--tv-border),transparent_20%)]" />
        </div>

        <div className="tv-entry-hero-card flex w-full flex-col gap-4 p-5">
          {!uid ? (
            <>
              <div className="rounded-xl border border-emerald-900/35 bg-emerald-950/18 px-4 py-3 text-sm font-story leading-relaxed text-emerald-100">
                <div className="flex items-center gap-2 font-fantasy text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Account vereist
                </div>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100/90">
                  Maak een account aan of log in om via deze uitnodiging mee te doen — zonder PIN.
                </p>
              </div>

              {displayError ? (
                <p className="rounded-lg tv-tone-enemy-surface px-4 py-2.5 font-story text-sm">
                  {displayError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => onSignInGoogle?.()}
                disabled={isBusy}
                className="tv-btn tv-button-primary tv-btn--block w-full gap-2.5 font-fantasy text-sm uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
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
                className="tv-btn tv-button-secondary tv-btn--block w-full gap-2.5 px-4 font-story text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                E-mail
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="tv-label mb-1.5 block">Karakternaam</label>
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
                <p className="rounded-lg tv-tone-enemy-surface px-4 py-2.5 font-story text-sm">
                  {displayError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleJoin}
                disabled={isBusy}
                className="tv-btn tv-button-primary tv-btn--block w-full gap-2.5 font-fantasy text-sm uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    …
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {displayCampaignName ? `Deelnemen aan ${displayCampaignName}` : 'Deelnemen'}
                  </>
                )}
              </button>
            </>
          )}
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
