/**
 * Marketing copy + placeholder pricing for the landing page.
 * Kept separate from accessPlans.js (the source of truth for entitlements)
 * so prices and sales copy can be tuned without touching access logic.
 *
 * NOTE: prices below are PLACEHOLDERS for the sales layout — adjust freely.
 */
import { PLAN_IDS } from './accessPlans';

export const LANDING_HERO = {
  eyebrow: 'De digitale tafel voor je tafelrollenspel',
  title: 'TOMEVAULT',
  subtitle:
    'Eén warme, rustige tafel waar spelleiders en spelers samenkomen. Handouts, chat, slagorde, notities en je hele wereld — realtime, zonder dashboard-chaos.',
  primaryCta: 'Begin gratis',
  secondaryCta: 'Ontdek de functies',
};

export const LANDING_FEATURES = [
  {
    icon: 'handouts',
    title: 'Handouts zonder omweg',
    description:
      'Onthul lore, kaarten en aanwijzingen op het juiste moment. Verzegeld tot jij de rol openrolt.',
  },
  {
    icon: 'chat',
    title: 'Realtime aan tafel',
    description:
      'Chat, dobbelworpen en de status van de wereld blijven voor iedere speler direct synchroon.',
  },
  {
    icon: 'combat',
    title: 'Slagorde die meeleeft',
    description:
      'Initiatief, HP, condities en beurten in één helder gevechtspaneel — premium en overzichtelijk.',
  },
  {
    icon: 'notes',
    title: 'Notities & kronieken',
    description:
      'Leg de wereld vast: privé GM-notities, gedeelde kronieken en alles wat je later terugzoekt.',
  },
  {
    icon: 'inventory',
    title: 'Inventaris & buit',
    description:
      'Beheer voorwerpen, valuta en beloningen. Spelers houden hun eigen rugzak bij de hand.',
  },
  {
    icon: 'roles',
    title: 'GM en speler, elk hun rol',
    description:
      'Eén herberg, afgeschermde rollen. De spelleider stuurt, spelers zien precies wat ze mogen zien.',
  },
];

export const LANDING_AUDIENCES = [
  {
    id: 'gm',
    label: 'Spelleider',
    title: 'Voor de spelleider',
    description:
      'Bouw werelden, leid het gevecht en deel onthullingen op jouw tempo — zonder voorbereiding kwijt te raken.',
  },
  {
    id: 'player',
    label: 'Speler',
    title: 'Voor de speler',
    description:
      'Stap je personage in, gooi je dobbelstenen en houd je rugzak en aantekeningen bij de hand.',
  },
];

/**
 * Placeholder pricing per audience. Feature lijsten zelf komen uit
 * accessPlans (getPlanFeatureSummary) zodat ze niet uit de pas lopen.
 */
export const LANDING_PRICING = {
  gm: {
    free: {
      planId: PLAN_IDS.GM_FREE,
      name: 'Verkenner',
      tagline: 'Start je eerste campagne — gratis, voor altijd.',
      price: 'Gratis',
      period: 'geen kaart nodig',
      cta: 'Begin gratis',
      featured: false,
    },
    paid: {
      planId: PLAN_IDS.GM_PREMIUM,
      name: 'Spelleider Premium',
      tagline: 'Onbeperkte werelden voor de serieuze GM.',
      price: '€7,99',
      period: 'per maand',
      altPrice: 'of €79 per jaar',
      cta: 'Word Premium',
      featured: true,
      badge: 'Meest gekozen',
    },
  },
  player: {
    free: {
      planId: PLAN_IDS.PLAYER_FREE,
      name: 'Avonturier',
      tagline: 'Doe mee aan elke sessie — gratis.',
      price: 'Gratis',
      period: 'geen kaart nodig',
      cta: 'Maak account',
      featured: false,
    },
    paid: {
      planId: PLAN_IDS.PLAYER_PLUS,
      name: 'Held (Plus)',
      tagline: 'Je personages en spullen, over al je campagnes heen.',
      price: '€3,99',
      period: 'per maand',
      altPrice: 'of €39 per jaar',
      cta: 'Word Plus',
      featured: true,
      badge: 'Populair',
    },
  },
};

export const LANDING_FAQ = [
  {
    q: 'Heb ik iets nodig om te beginnen?',
    a: 'Nee. Maak een gratis account, start een sessie als spelleider of voeg je toe met een code als speler. Alles draait in je browser.',
  },
  {
    q: 'Wat kost het?',
    a: 'TomeVault is gratis te gebruiken. Premium-abonnementen ontgrendelen extra’s zoals onbeperkte campagnes, exporteren en premium thema’s. De getoonde prijzen zijn indicatief.',
  },
  {
    q: 'Werkt het ook op mijn telefoon?',
    a: 'Ja. De tafel is gebouwd voor desktop én mobiel, zodat spelers vanaf elk scherm kunnen meedoen.',
  },
  {
    q: 'Kan ik later upgraden?',
    a: 'Zeker. Je begint gratis en stapt op elk moment over naar Premium of Plus — je campagnes en personages blijven bewaard.',
  },
];

export const LANDING_ABOUT = {
  eyebrow: 'Over TomeVault',
  title: 'Sfeer, focus en duidelijkheid',
  body:
    'We bouwen TomeVault voor groepen die hun verhaal centraal stellen, niet hun tooling. Een rustige digitale herberg waar handouts, chat, gevecht en notities samenkomen — warm, cohesief en zonder ruis.',
};
