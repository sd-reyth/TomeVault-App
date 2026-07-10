/**
 * Marketing copy + placeholder pricing for the landing page.
 * Kept separate from accessPlans.js (the source of truth for entitlements)
 * so prices and sales copy can be tuned without touching access logic.
 *
 * NOTE: prices below are PLACEHOLDERS for the sales layout — adjust freely.
 */
import i18n from '../i18n/index.js';
import { PLAN_IDS } from './accessPlans';

const FEATURE_ICONS = ['handouts', 'chat', 'combat', 'notes', 'inventory', 'roles'];
const AUDIENCE_IDS = ['gm', 'player'];
const FAQ_KEYS = ['start', 'cost', 'mobile', 'upgrade'];

export function getLandingHero() {
  return {
    eyebrow: i18n.t('landing:hero.eyebrow'),
    title: i18n.t('landing:hero.title'),
    subtitle: i18n.t('landing:hero.subtitle'),
    primaryCta: i18n.t('landing:hero.primaryCta'),
    secondaryCta: i18n.t('landing:hero.secondaryCta'),
  };
}

export function getLandingFeatures() {
  return FEATURE_ICONS.map((icon) => ({
    icon,
    title: i18n.t(`landing:features.${icon}.title`),
    description: i18n.t(`landing:features.${icon}.description`),
  }));
}

export function getLandingAudiences() {
  return AUDIENCE_IDS.map((id) => ({
    id,
    label: i18n.t(`landing:audiences.${id}.label`),
    title: i18n.t(`landing:audiences.${id}.title`),
    description: i18n.t(`landing:audiences.${id}.description`),
  }));
}

/**
 * Placeholder pricing per audience. Feature lists come from
 * accessPlans (getPlanFeatureSummary) so they stay in sync.
 */
export function getLandingPricing() {
  return {
    gm: {
      free: {
        planId: PLAN_IDS.GM_FREE,
        name: i18n.t('landing:pricing.gm.free.name'),
        tagline: i18n.t('landing:pricing.gm.free.tagline'),
        price: i18n.t('landing:pricing.gm.free.price'),
        period: i18n.t('landing:pricing.gm.free.period'),
        cta: i18n.t('landing:pricing.gm.free.cta'),
        featured: false,
      },
      paid: {
        planId: PLAN_IDS.GM_PREMIUM,
        name: i18n.t('landing:pricing.gm.paid.name'),
        tagline: i18n.t('landing:pricing.gm.paid.tagline'),
        price: i18n.t('landing:pricing.gm.paid.price'),
        period: i18n.t('landing:pricing.gm.paid.period'),
        altPrice: i18n.t('landing:pricing.gm.paid.altPrice'),
        cta: i18n.t('landing:pricing.gm.paid.cta'),
        featured: true,
        badge: i18n.t('landing:pricing.gm.paid.badge'),
      },
    },
    player: {
      free: {
        planId: PLAN_IDS.PLAYER_FREE,
        name: i18n.t('landing:pricing.player.free.name'),
        tagline: i18n.t('landing:pricing.player.free.tagline'),
        price: i18n.t('landing:pricing.player.free.price'),
        period: i18n.t('landing:pricing.player.free.period'),
        cta: i18n.t('landing:pricing.player.free.cta'),
        featured: false,
      },
      paid: {
        planId: PLAN_IDS.PLAYER_PLUS,
        name: i18n.t('landing:pricing.player.paid.name'),
        tagline: i18n.t('landing:pricing.player.paid.tagline'),
        price: i18n.t('landing:pricing.player.paid.price'),
        period: i18n.t('landing:pricing.player.paid.period'),
        altPrice: i18n.t('landing:pricing.player.paid.altPrice'),
        cta: i18n.t('landing:pricing.player.paid.cta'),
        featured: true,
        badge: i18n.t('landing:pricing.player.paid.badge'),
      },
    },
  };
}

export function getLandingFaq() {
  return FAQ_KEYS.map((key) => ({
    q: i18n.t(`landing:faq.${key}.q`),
    a: i18n.t(`landing:faq.${key}.a`),
  }));
}

export function getLandingAbout() {
  return {
    eyebrow: i18n.t('landing:about.eyebrow'),
    title: i18n.t('landing:about.title'),
    body: i18n.t('landing:about.body'),
  };
}
