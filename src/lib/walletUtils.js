const COIN_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

const UNIT_FACTOR = {
  platinum: 1_000_000,
  gold: 10_000,
  silver: 100,
  bronze: 1,
};

export function normalizeWalletShape(wallet) {
  const w = wallet || {};
  return {
    platinum: Math.max(0, Number(w.platinum ?? 0)),
    gold: Math.max(0, Number(w.gold ?? 0)),
    silver: Math.max(0, Number(w.silver ?? 0)),
    bronze: Math.max(0, Number(w.bronze ?? w.copper ?? 0)),
  };
}

export function walletTotalBronze(wallet) {
  const safe = normalizeWalletShape(wallet);
  return (
    safe.platinum * UNIT_FACTOR.platinum +
    safe.gold * UNIT_FACTOR.gold +
    safe.silver * UNIT_FACTOR.silver +
    safe.bronze
  );
}

export function walletGoldEquivalent(wallet) {
  return walletTotalBronze(wallet) / UNIT_FACTOR.gold;
}

/** Compact label for headers — always reflects copper/silver, not rounded away. */
export function formatWalletTotal(wallet) {
  const totalBronze = walletTotalBronze(wallet);
  if (totalBronze === 0) return '0 goud';

  const gold = Math.floor(totalBronze / UNIT_FACTOR.gold);
  const remainder = totalBronze % UNIT_FACTOR.gold;
  const silver = Math.floor(remainder / UNIT_FACTOR.silver);
  const copper = remainder % UNIT_FACTOR.silver;

  if (gold > 0 && silver === 0 && copper === 0) {
    return `${gold.toLocaleString('nl-NL')} goud`;
  }

  if (gold === 0 && silver > 0 && copper === 0) {
    return `${silver.toLocaleString('nl-NL')} zilver`;
  }

  if (gold === 0 && silver === 0 && copper > 0) {
    return `${copper.toLocaleString('nl-NL')} koper`;
  }

  const parts = [];
  if (gold > 0) parts.push(`${gold} goud`);
  if (silver > 0) parts.push(`${silver} zilver`);
  if (copper > 0) parts.push(`${copper} koper`);
  return parts.join(', ');
}

export { COIN_ORDER, UNIT_FACTOR };
