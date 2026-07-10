import i18n from '../i18n/index.js';

export function isBenignFirebaseAuthRaceError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('pending promise was never set')
    || message.includes('internal assertion failed');
}

export function toFriendlyAuthError(error, fallbackKey = 'auth:errors.fallbackGoogleSignIn') {
  if (isBenignFirebaseAuthRaceError(error)) {
    return i18n.t('auth:errors.googleLoginSlow');
  }

  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('popup-closed-by-user')) {
    return i18n.t('auth:errors.popupClosed');
  }

  if (code.includes('popup-blocked')) {
    return i18n.t('auth:errors.popupBlocked');
  }

  if (code.includes('unauthorized-domain')) {
    return i18n.t('auth:errors.unauthorizedDomain');
  }

  if (code.includes('invalid-credential') || message.includes('redirect_uri_mismatch')) {
    return i18n.t('auth:errors.invalidCredential');
  }

  return i18n.t(fallbackKey);
}
