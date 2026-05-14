/**
 * Plan and entitlement helpers for TomeVault.
 * Free plans are implicit defaults per role; paid plans are role-scoped
 * entitlements stored under /users/{uid}/entitlements/{gm|player}.
 */

import { resolveActivePlan } from './accessPlans';

/**
 * Check if user has premium membership
 * @param {Object} membershipData - User's membership doc from Firestore
 * @returns {boolean} True if premium and not expired
 */
export function isPremiumUser(entitlement = {}, role = 'player') {
  return resolveActivePlan({ role, entitlement }).tier !== 'free';
}

/**
 * Get remaining days of premium membership
 * @param {Object} membershipData
 * @returns {number|null} Days remaining, or null if lifetime/expired
 */
export function getPremiumDaysRemaining(entitlement = {}, role = 'player') {
  if (!isPremiumUser(entitlement, role)) return null;
  if (!entitlement?.expiresAt) return null;

  const now = Date.now();
  const expiryMs = entitlement.expiresAt?.toMillis?.() || entitlement.expiresAt?.getTime?.() || 0;
  const daysMs = expiryMs - now;
  return Math.ceil(daysMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if user can perform premium action
 * Example: canExport, canUnlimitedNpcs, canMultiCampaign
 */
export function canExportArchive(entitlement, role = 'gm') {
  return Boolean(resolveActivePlan({ role, entitlement }).features.exportArchive);
}

export function hasUnlimitedNpcs(entitlement, role = 'gm') {
  return resolveActivePlan({ role, entitlement }).limits.npcsPerSession == null;
}

export function canHaveMultipleCampaigns(entitlement, role = 'gm') {
  return resolveActivePlan({ role, entitlement }).limits.activeCampaigns == null;
}

export function canUseAdvancedPreparation(entitlement, role = 'gm') {
  return Boolean(resolveActivePlan({ role, entitlement }).features.advancedPreparation);
}

export function getMaxNpcCount(entitlement, role = 'gm') {
  const value = resolveActivePlan({ role, entitlement }).limits.npcsPerSession;
  return value == null ? Infinity : value;
}

export function getMaxTemplateCount(entitlement, role = 'gm') {
  const value = resolveActivePlan({ role, entitlement }).limits.preparationTemplates;
  return value == null ? Infinity : value;
}

/**
 * Format premium upgrade message for UI
 */
export function getPremiumUpgradeMessage(feature) {
  const messages = {
    export: 'Upgrade naar GM Premium om sessies te exporteren',
    npcs: 'Upgrade naar GM Premium voor onbeperkte NPCs',
    templates: 'Upgrade naar GM Premium voor onbeperkte voorbereidingen',
    campaigns: 'Upgrade naar GM Premium voor meerdere actieve campagnes',
    themes: 'Upgrade naar Player Plus of GM Premium voor extra thema-opties',
  };
  return messages[feature] || 'Upgrade naar Premium voor deze functie';
}
