import i18n from '../i18n/index.js';

export const PLAN_IDS = {
  GM_FREE: 'gm_free',
  GM_PREMIUM: 'gm_premium',
  PLAYER_FREE: 'player_free',
  PLAYER_PLUS: 'player_plus',
};

const OWNER_GRANT_DURATION_DEFS = {
  '1month': { days: 30 },
  '3months': { days: 90 },
  '6months': { days: 180 },
  lifetime: { days: null },
};

export const OWNER_GRANTABLE_PLAN_IDS = [PLAN_IDS.GM_PREMIUM, PLAN_IDS.PLAYER_PLUS];

export function getOwnerGrantDurations() {
  return Object.fromEntries(
    Object.entries(OWNER_GRANT_DURATION_DEFS).map(([key, value]) => [
      key,
      {
        ...value,
        label: i18n.t(`settings:plans.grantDurations.${key}`),
      },
    ]),
  );
}

export function getPlanLabel(planId) {
  return i18n.t(`settings:plans.labels.${planId}`);
}

const PLAN_DEFINITIONS_BASE = {
  [PLAN_IDS.GM_FREE]: {
    id: PLAN_IDS.GM_FREE,
    audience: 'gm',
    tier: 'free',
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

export const PLAN_DEFINITIONS = Object.fromEntries(
  Object.entries(PLAN_DEFINITIONS_BASE).map(([planId, plan]) => [
    planId,
    {
      ...plan,
      label: getPlanLabel(planId),
    },
  ]),
);

export function getDefaultPlanIdForRole(role = 'player') {
  return role === 'gm' ? PLAN_IDS.GM_FREE : PLAN_IDS.PLAYER_FREE;
}

export function getPlanDefinition(planId, fallbackRole = 'player') {
  const base = PLAN_DEFINITIONS_BASE[planId] || PLAN_DEFINITIONS_BASE[getDefaultPlanIdForRole(fallbackRole)];
  return {
    ...base,
    label: getPlanLabel(base.id),
  };
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
    if (plan.limits.activeCampaigns == null) {
      items.push(i18n.t('settings:plans.features.gmMultipleCampaigns'));
    } else {
      items.push(i18n.t('settings:plans.features.gmSingleCampaign', { count: plan.limits.activeCampaigns }));
    }

    if (plan.limits.npcsPerSession == null) {
      items.push(i18n.t('settings:plans.features.gmUnlimitedNpcs'));
    } else {
      items.push(i18n.t('settings:plans.features.gmMaxNpcs', { count: plan.limits.npcsPerSession }));
    }

    if (plan.limits.preparationTemplates == null) {
      items.push(i18n.t('settings:plans.features.gmUnlimitedPreparations'));
    } else {
      items.push(i18n.t('settings:plans.features.gmMaxPreparations', { count: plan.limits.preparationTemplates }));
    }

    if (plan.features.exportArchive) items.push(i18n.t('settings:plans.features.gmExportArchive'));
    if (plan.features.customThemes) items.push(i18n.t('settings:plans.features.gmPremiumThemes'));
    if (plan.features.advancedPreparation) items.push(i18n.t('settings:plans.features.gmAdvancedPreparation'));
    return items;
  }

  const items = [i18n.t('settings:plans.features.playerCore')];
  if (plan.features.personalExport) items.push(i18n.t('settings:plans.features.playerPersonalExport'));
  if (plan.features.crossCampaignVault) items.push(i18n.t('settings:plans.features.playerCrossCampaignVault'));
  if (plan.features.customPlayerThemes) items.push(i18n.t('settings:plans.features.playerCustomThemes'));
  if (plan.limits.privateMediaStorageMb > 0) {
    items.push(i18n.t('settings:plans.features.playerPrivateMedia', { count: plan.limits.privateMediaStorageMb }));
  }
  return items;
}
