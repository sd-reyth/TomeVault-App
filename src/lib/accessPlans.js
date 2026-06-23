export const PLAN_IDS = {
  GM_FREE: 'gm_free',
  GM_PREMIUM: 'gm_premium',
  PLAYER_FREE: 'player_free',
  PLAYER_PLUS: 'player_plus',
};

export const OWNER_GRANT_DURATIONS = {
  '1month': { label: '1 maand', days: 30 },
  '3months': { label: '3 maanden', days: 90 },
  '6months': { label: '6 maanden', days: 180 },
  'lifetime': { label: 'Lifetime', days: null },
};

export const OWNER_GRANTABLE_PLAN_IDS = [PLAN_IDS.GM_PREMIUM, PLAN_IDS.PLAYER_PLUS];

export const PLAN_DEFINITIONS = {
  [PLAN_IDS.GM_FREE]: {
    id: PLAN_IDS.GM_FREE,
    audience: 'gm',
    tier: 'free',
    label: 'GM Free',
    limits: {
      activeCampaigns: 1,
      npcsPerSession: 5,
      preparationTemplates: 3,
    },
    features: {
      exportArchive: false,
      advancedPreparation: false,
      campaignHistory: false,
      customThemes: false,
      prioritySupport: false,
    },
  },
  [PLAN_IDS.GM_PREMIUM]: {
    id: PLAN_IDS.GM_PREMIUM,
    audience: 'gm',
    tier: 'paid',
    label: 'GM Premium',
    limits: {
      activeCampaigns: null,
      npcsPerSession: null,
      preparationTemplates: null,
    },
    features: {
      exportArchive: true,
      advancedPreparation: true,
      campaignHistory: true,
      customThemes: true,
      prioritySupport: true,
    },
  },
  [PLAN_IDS.PLAYER_FREE]: {
    id: PLAN_IDS.PLAYER_FREE,
    audience: 'player',
    tier: 'free',
    label: 'Player Free',
    limits: {
      privateMediaStorageMb: 0,
      characterVaultSlots: 0,
    },
    features: {
      sessionChat: true,
      sessionNotes: true,
      handouts: true,
      inventory: true,
      combat: true,
      personalExport: false,
      crossCampaignVault: false,
      customPlayerThemes: false,
    },
  },
  [PLAN_IDS.PLAYER_PLUS]: {
    id: PLAN_IDS.PLAYER_PLUS,
    audience: 'player',
    tier: 'paid',
    label: 'Player Plus',
    limits: {
      privateMediaStorageMb: 512,
      characterVaultSlots: null,
    },
    features: {
      sessionChat: true,
      sessionNotes: true,
      handouts: true,
      inventory: true,
      combat: true,
      personalExport: true,
      crossCampaignVault: true,
      customPlayerThemes: true,
    },
  },
};

export function getDefaultPlanIdForRole(role = 'player') {
  return role === 'gm' ? PLAN_IDS.GM_FREE : PLAN_IDS.PLAYER_FREE;
}

export function getPlanDefinition(planId, fallbackRole = 'player') {
  return PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS[getDefaultPlanIdForRole(fallbackRole)];
}

function toMillis(value) {
  return value?.toMillis?.() || value?.getTime?.() || 0;
}

export function isEntitlementActive(entitlement = {}) {
  if (!entitlement || typeof entitlement !== 'object' || !entitlement.planId) return false;

  const normalizedStatus = String(entitlement.status || 'active').trim().toLowerCase();
  if (normalizedStatus === 'expired' || normalizedStatus === 'revoked' || normalizedStatus === 'cancelled') {
    return false;
  }

  if (!entitlement.expiresAt) return true;
  return toMillis(entitlement.expiresAt) > Date.now();
}

export function resolveActivePlan({ role = 'player', entitlement = null } = {}) {
  if (isEntitlementActive(entitlement)) {
    return getPlanDefinition(entitlement.planId, role);
  }

  return getPlanDefinition(getDefaultPlanIdForRole(role), role);
}

export function getPlanFeatureSummary(plan) {
  if (!plan) return [];

  if (plan.audience === 'gm') {
    const items = [];
    if (plan.limits.activeCampaigns == null) items.push('Meerdere actieve campagnes');
    else items.push(`${plan.limits.activeCampaigns} actieve campagne`);

    if (plan.limits.npcsPerSession == null) items.push('Onbeperkt NPC\'s per sessie');
    else items.push(`Max ${plan.limits.npcsPerSession} NPC's per sessie`);

    if (plan.limits.preparationTemplates == null) items.push('Onbeperkte voorbereidingen');
    else items.push(`Max ${plan.limits.preparationTemplates} voorbereidingssjablonen`);

    if (plan.features.exportArchive) items.push('Sessie-archief exporteren');
    if (plan.features.customThemes) items.push('Premium thema\'s');
    if (plan.features.advancedPreparation) items.push('Geavanceerde voorbereiding');
    return items;
  }

  const items = ['Chat, notities, handouts & inventaris'];
  if (plan.features.personalExport) items.push('Persoonlijk profiel exporteren');
  if (plan.features.crossCampaignVault) items.push('Karakterkluis over campagnes');
  if (plan.features.customPlayerThemes) items.push('Eigen spelerthema\'s');
  if (plan.limits.privateMediaStorageMb > 0) {
    items.push(`${plan.limits.privateMediaStorageMb} MB privé-media`);
  }
  return items;
}
