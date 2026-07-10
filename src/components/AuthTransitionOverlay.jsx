import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import Button from './Button';
import {
  getAuthTransitionHint,
  getAuthTransitionTitle,
} from '../lib/authTransition';
import { useT } from '../i18n/useT';

const TOMEVAULT_LOGO_SRC = '/references/tomeVaultLogo1.png';

export default function AuthTransitionOverlay({
  kind,
  phase = 'loading',
  error = '',
  onRetry,
}) {
  const { t } = useT('auth');

  if (!kind) return null;

  const isTimeout = phase === 'timeout';
  const title = isTimeout ? getAuthTransitionTitle(kind, 'timeout') : getAuthTransitionTitle(kind, phase);
  const hint = error || getAuthTransitionHint(kind, phase);

  return (
    <div
      className="tv-auth-transition-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-busy={!isTimeout}
      aria-label={title}
    >
      <div className="tv-auth-transition-overlay__card tv-surface">
        <img
          src={TOMEVAULT_LOGO_SRC}
          alt=""
          className="tv-auth-transition-overlay__logo"
          draggable={false}
        />

        {!isTimeout ? (
          <div className="tv-auth-transition-overlay__spinner" aria-hidden="true">
            <Loader2 className="h-8 w-8 animate-spin tv-accent" strokeWidth={1.75} />
          </div>
        ) : null}

        <p className="tv-type-label mt-4">{title}</p>

        {hint ? (
          <p className="mt-2 font-story text-sm leading-relaxed tv-text-sub">
            {hint}
          </p>
        ) : null}

        {isTimeout && onRetry ? (
          <div className="mt-5">
            <Button variant="primary" block icon={RefreshCw} onClick={onRetry}>
              {t('retry')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
