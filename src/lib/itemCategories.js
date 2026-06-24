/** Canonical item categories (English keys). Legacy Dutch keys are normalized on read. */

export const ITEM_CATEGORIES = [
  { value: 'misc', label: 'Misc' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'armor', label: 'Armor' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'magic', label: 'Magic' },
  { value: 'resource', label: 'Resource' },
  { value: 'quest', label: 'Quest' },
];

const LEGACY_CATEGORY_MAP = {
  overig: 'misc',
  wapen: 'weapon',
  pantser: 'armor',
  verbruikbaar: 'consumable',
  magisch: 'magic',
  grondstof: 'resource',
  quest: 'quest',
  // Older doc / English variants
  weapon: 'weapon',
  armor: 'armor',
  potion: 'consumable',
  misc: 'misc',
};

const LABEL_BY_VALUE = Object.fromEntries(ITEM_CATEGORIES.map((c) => [c.value, c.label]));

const CHIP_CLASS_BY_VALUE = {
  misc: 'tv-inventory-filter-chip--misc',
  weapon: 'tv-inventory-filter-chip--weapon',
  armor: 'tv-inventory-filter-chip--armor',
  consumable: 'tv-inventory-filter-chip--consumable',
  magic: 'tv-inventory-filter-chip--magic',
  resource: 'tv-inventory-filter-chip--resource',
  quest: 'tv-inventory-filter-chip--quest',
};

export const DEFAULT_ITEM_CATEGORY = 'misc';

export function normalizeItemCategory(category) {
  const raw = String(category || DEFAULT_ITEM_CATEGORY).toLowerCase().trim();
  return LEGACY_CATEGORY_MAP[raw] || (LABEL_BY_VALUE[raw] ? raw : DEFAULT_ITEM_CATEGORY);
}

export function getItemCategoryLabel(category) {
  return LABEL_BY_VALUE[normalizeItemCategory(category)] || 'Misc';
}

export function getItemCategoryChipClass(category) {
  return CHIP_CLASS_BY_VALUE[normalizeItemCategory(category)] || CHIP_CLASS_BY_VALUE.misc;
}

export const ITEM_CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  ...ITEM_CATEGORIES.map(({ value, label }) => ({ value, label })),
];
