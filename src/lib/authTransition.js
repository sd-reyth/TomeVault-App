import i18n from '../i18n/index.js';

export const AUTH_TRANSITION_SLOW_MS = {
  boot: 2000,
  'sign-in-google': 3000,
  default: 2000,
};

export const AUTH_TRANSITION_TIMEOUT_MS = {
  boot: 7000,
  'sign-in-google': 30000,
  default: 10000,
};

export function getAuthTransitionSlowMs(kind) {
  return AUTH_TRANSITION_SLOW_MS[kind] ?? AUTH_TRANSITION_SLOW_MS.default;
}

export function getAuthTransitionTimeoutMs(kind) {
  return AUTH_TRANSITION_TIMEOUT_MS[kind] ?? AUTH_TRANSITION_TIMEOUT_MS.default;
}

function transitionKey(kind) {
  return ['boot', 'sign-in-google', 'sign-in-email', 'sign-in-guest', 'sign-out'].includes(kind)
    ? kind
    : 'default';
}

export function getAuthTransitionTitle(kind, phase) {
  if (phase === 'timeout') {
    return i18n.t('auth:transition.timeout.title');
  }

  const key = transitionKey(kind);
  if (key === 'sign-in-google' && phase === 'slow') {
    return i18n.t('auth:transition.sign-in-google.slowTitle');
  }

  return i18n.t(`auth:transition.${key}.title`);
}

export function getAuthTransitionHint(kind, phase) {
  const key = transitionKey(kind);

  if (phase === 'timeout') {
    return i18n.t(`auth:transition.${key}.timeoutHint`, {
      defaultValue: i18n.t('auth:transition.default.timeoutHint'),
    });
  }

  if (phase === 'slow') {
    return i18n.t(`auth:transition.${key}.slowHint`, {
      defaultValue: i18n.t('auth:transition.default.slowHint'),
    });
  }

  if (key === 'sign-in-google' || key === 'sign-out') {
    return i18n.t(`auth:transition.${key}.hint`, { defaultValue: '' });
  }

  return '';
}

export function getAuthTransitionTimeoutError(kind) {
  const key = transitionKey(kind);
  return i18n.t(`auth:transition.timeoutErrors.${key}`, {
    defaultValue: i18n.t('auth:transition.timeoutErrors.default'),
  });
}

export function isSignInTransition(kind) {
  return kind === 'sign-in-google' || kind === 'sign-in-email' || kind === 'sign-in-guest';
}
