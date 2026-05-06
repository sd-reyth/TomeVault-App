import React from 'react';

export default function RuntimeBadge({ runtimeBadge, compact = false, className = '' }) {
  if (!runtimeBadge) return null;

  const toneClasses = compact
    ? 'border-stone-700/70 bg-stone-950/70 text-stone-200 shadow-inner'
    : (runtimeBadge.warning
      ? 'border-amber-800/60 bg-amber-950/80 text-amber-100'
      : 'border-sky-900/50 bg-sky-950/75 text-sky-100');
  const metaClasses = compact
    ? 'text-stone-500'
    : (runtimeBadge.warning ? 'text-amber-300/80' : 'text-sky-300/80');
  const roleChipClasses = compact
    ? 'rounded-full border border-amber-800/35 bg-amber-950/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300'
    : 'rounded-full border border-current/15 bg-black/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]';

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${compact ? '' : 'shadow-[0_12px_28px_rgba(0,0,0,0.18)]'} backdrop-blur ${toneClasses} ${className}`.trim()}
      title={runtimeBadge.warning || `${runtimeBadge.environmentLabel} · ${runtimeBadge.hostLabel} · ${runtimeBadge.sourceLabel}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.22em]">{runtimeBadge.environmentLabel}</span>
        <span className={roleChipClasses}>
          {runtimeBadge.roleLabel}
        </span>
        <span className={`text-[9px] uppercase tracking-[0.16em] ${metaClasses}`}>{runtimeBadge.hostLabel}</span>
      </div>

      {compact ? null : (
        <>
          <div className={`mt-1 text-[9px] uppercase tracking-[0.18em] ${metaClasses}`}>{runtimeBadge.sourceLabel}</div>
          {runtimeBadge.warning ? (
            <p className="mt-1 max-w-[240px] text-[10px] leading-4 text-stone-300">{runtimeBadge.warning}</p>
          ) : null}
        </>
      )}
    </div>
  );
}