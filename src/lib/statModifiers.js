/** D20 ability-score modifier helpers (e.g. D&D 5e: floor((score - 10) / 2)). */

export function computeD20Modifier(score) {
  const value = Number(score ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.floor((value - 10) / 2);
}

export function formatSignedModifier(value) {
  const safeValue = Number(value ?? 0) || 0;
  return safeValue >= 0 ? `+${safeValue}` : String(safeValue);
}

export function formatCustomStatValue(stat) {
  const value = Number(stat?.value ?? 0) || 0;
  if (stat?.showModifier !== true) return String(value);
  return `${value} (${formatSignedModifier(computeD20Modifier(value))})`;
}

export function sanitizeCustomStats(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry, index) => ({
      id: entry?.id || `stat-${index}`,
      name: String(entry?.name || '').trim().toUpperCase(),
      value: Number(entry?.value ?? 0) || 0,
      showModifier: entry?.showModifier === true,
    }))
    .filter((entry) => entry.name.length > 0);
}
