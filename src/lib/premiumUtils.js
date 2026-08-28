/**
 * Plan and entitlement helpers for TomeVault.
 * Free plans are implicit defaults per role; paid plans are role-scoped
 * entitlements stored under /users/{uid}/entitlements/{gm|player}.
 */

import i18n from '../i18n/index.js';
import { resolveActivePlan } from './accessPlans';

/**
 * Check if user has premium membership
 * @param {Object} entitlement - Role entitlement doc from Firestore
 * @param {string} role
 * @returns {boolean} True if premium and not expired
 */
export function isPremiumUser(entitlement = {}, role = 'player') {
  return resolveActivePlan({ role, entitlement }).tier !== 'free';
}

/**
 * Get remaining days of premium membership
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
 * Soft upgrade copy for limit prompts. Checkout is not live yet —
 * keep messaging honest during open beta.
 */
export function getPremiumUpgradeMessage(feature) {
  const key = `settings:plans.upgrade.${feature}`;
  if (i18n.exists(key)) return i18n.t(key);
  return i18n.t('settings:plans.upgrade.default');
}
