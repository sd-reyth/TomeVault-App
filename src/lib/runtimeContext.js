export function isLocalDevHost(hostname) {
  const host = String(
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')
  ).toLowerCase();

  return host === 'localhost' || host === '127.0.0.1';
}

function buildBootstrapConfig({
  role,
  roleSource,
  host,
  joinTag,
  pin,
  sessionName,
  playerName,
  environment,
}) {
  return {
    role,
    roleSource,
    host,
    joinTag,
    pin,
    sessionName,
    playerName,
    environment,
  };
}

export function getLocalDevBootstrapConfig() {
  if (typeof window === 'undefined' || !isLocalDevHost(window.location.hostname)) return null;

  const host = String(window.location.hostname || '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const rawDev = String(params.get('dev') || '').trim().toLowerCase();
  if (!rawDev) return null;

  const rawRole = String(params.get('role') || params.get('devRole') || '').trim().toLowerCase();
  const roleFromDevFlag = rawDev === 'gm' || rawDev === 'player' ? rawDev : '';
  const fallbackRole = window.location.hostname === '127.0.0.1' ? 'gm' : 'player';
  const role = String(rawRole || roleFromDevFlag || fallbackRole).trim().toLowerCase();
  if (!['gm', 'player'].includes(role)) return null;

  const roleSource = rawRole ? 'query' : roleFromDevFlag ? 'dev-flag' : 'host-default';

  const joinTag = rawDev === '1' || rawDev === 'gm' || rawDev === 'player'
    ? String(params.get('tag') || params.get('devTag') || 'dev-lab-0000').trim()
    : rawDev;

  return buildBootstrapConfig({
    role,
    roleSource,
    host,
    joinTag: joinTag || 'dev-lab-0000',
    pin: String(params.get('pin') || params.get('devPin') || '1234').trim() || '1234',
    sessionName: String(params.get('session') || params.get('devSession') || 'Dev Lab').trim() || 'Dev Lab',
    playerName: String(params.get('name') || params.get('devName') || 'Elara').trim() || 'Elara',
    environment: 'local-dev',
  });
}

export function getRuntimeBadgeState({ role, localDevBootstrap }) {
  if (typeof window === 'undefined') return null;

  const host = String(window.location.hostname || '').toLowerCase();
  if (!isLocalDevHost(host)) return null;

  return {
    environmentLabel: 'LOCAL DEV',
    roleLabel: role === 'gm' ? 'GM' : role === 'player' ? 'PLAYER' : 'AUTH',
    hostLabel: host,
    sourceLabel: localDevBootstrap
      ? localDevBootstrap.roleSource === 'query'
        ? 'expliciet'
        : localDevBootstrap.roleSource === 'dev-flag'
          ? 'via dev'
          : 'fallback host'
      : 'handmatig',
    warning: localDevBootstrap?.roleSource === 'host-default'
      ? 'Voeg devRole=gm of devRole=player toe om host-afhankelijke defaults te vermijden.'
      : '',
  };
}