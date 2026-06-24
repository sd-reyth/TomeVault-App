import React from 'react';
import { AlertTriangle, Eraser, RefreshCw } from 'lucide-react';
import Button from './Button';

const TOMEVAULT_LOGO_SRC = '/references/tomeVaultLogo1.png';

function ErrorHero() {
  return (
    <div className="tv-runtime-error-hero" aria-hidden="true">
      <span className="tv-runtime-error-hero__ring" />
      <span className="tv-runtime-error-hero__glow tv-runtime-error-hero__glow--outer" />
      <span className="tv-runtime-error-hero__glow tv-runtime-error-hero__glow--inner" />
      <div className="tv-runtime-error-hero__icon">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.65} />
      </div>
    </div>
  );
}

export default function RuntimeErrorScreen({
  errorMessage,
  onReload,
  onClearStateAndReload,
}) {
  return (
    <div className="tv-runtime-error-page bg-texture font-ui">
      <div className="tv-runtime-error-ambient" aria-hidden="true" />

      <div
        className="tv-runtime-error-card relative w-full max-w-md overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_34%)] tv-surface shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
        role="alert"
        aria-live="assertive"
      >
        <div className="tv-modal-top-glow pointer-events-none absolute inset-x-0 top-0 h-36 blur-[48px]" />
        <div className="tv-runtime-error-card__sheen pointer-events-none absolute inset-x-6 top-0 h-px" aria-hidden="true" />

        <div className="relative z-10 px-6 pb-7 pt-7 text-center sm:px-8 sm:pb-8 sm:pt-8">
          <img
            src={TOMEVAULT_LOGO_SRC}
            alt=""
            className="mx-auto mb-6 h-9 w-auto opacity-90"
            draggable={false}
          />

          <ErrorHero />

          <p className="tv-type-label mt-5">Runtimefout</p>

          <h1 className="mt-2 font-fantasy text-[1.35rem] leading-tight tracking-[0.1em] tv-text sm:text-2xl">
            De tome is even dichtgevallen
          </h1>

          <p className="mx-auto mt-3 max-w-[34ch] font-story text-sm italic leading-relaxed tv-text-sub">
            Meestal lost een herstart dit op. Je sessie blijft bewaard in de cloud.
          </p>

          <div className="mt-6 space-y-2">
            <Button variant="primary" block icon={RefreshCw} onClick={onReload}>
              Opnieuw laden
            </Button>
            <button
              type="button"
              onClick={onClearStateAndReload}
              className="tv-btn tv-button-ghost tv-btn--block gap-2 text-xs tv-muted transition-colors hover:tv-text-sub"
            >
              <Eraser className="h-3.5 w-3.5 opacity-70" />
              Browserstatus wissen en herladen
            </button>
          </div>

          <div className="tv-divider my-6" />

          <details className="tv-runtime-error-panel group text-left" open>
            <summary className="tv-runtime-error-panel__summary tv-type-label cursor-pointer list-none">
              <span>Foutmelding</span>
              <span className="tv-runtime-error-panel__hint group-open:hidden">Tonen</span>
              <span className="tv-runtime-error-panel__hint hidden group-open:inline">Verbergen</span>
            </summary>
            <pre className="tv-runtime-error-message">{errorMessage}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
