import React from 'react';

export default function RuntimeBadge({ runtimeBadge, compact = false, dot = false, className = '' }) {
  if (!runtimeBadge) return null;

  const fullSummary = runtimeBadge.warning
    || `${runtimeBadge.environmentLabel} · ${runtimeBadge.roleLabel} · ${runtimeBadge.hostLabel} · ${runtimeBadge.sourceLabel}`;

  if (dot) {
    return (
      <span
        className={`tv-runtime-dot ${runtimeBadge.warning ? 'tv-runtime-dot--warning' : ''} ${className}`.trim()}
        title={fullSummary}
        aria-label={`Runtime: ${fullSummary}`}
        role="img"
      />
    );
  }

  if (compact) {
    return (
      <div
        className={`tv-topbar-chip tv-topbar-chip--text tv-topbar-chip--static gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${className}`.trim()}
        title={runtimeBadge.warning || `${runtimeBadge.environmentLabel} · ${runtimeBadge.hostLabel} · ${runtimeBadge.sourceLabel}`}
      >
        <span className="tv-text">{runtimeBadge.environmentLabel}</span>
        <span className="tv-muted opacity-60">·</span>
        <span className="text-[color:var(--tv-accent)]">{runtimeBadge.roleLabel}</span>
        <span className="tv-muted hidden opacity-60 lg:inline">·</span>
        <span className="tv-muted hidden lg:inline">{runtimeBadge.hostLabel}</span>
      </div>
    );
  }

  const toneClasses = runtimeBadge.warning
    ? 'tv-runtime-badge tv-runtime-badge--warning'
    : 'tv-runtime-badge tv-runtime-badge--info';

  return (
    <div
      className={`rounded-xl border px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur ${toneClasses} ${className}`.trim()}
      title={runtimeBadge.warning || `${runtimeBadge.environmentLabel} · ${runtimeBadge.hostLabel} · ${runtimeBadge.sourceLabel}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.22em]">{runtimeBadge.environmentLabel}</span>
        <span className="tv-tag border border-current/15 bg-black/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]">
          {runtimeBadge.roleLabel}
        </span>
        <span className="tv-runtime-badge__meta text-[9px] uppercase tracking-[0.16em]">{runtimeBadge.hostLabel}</span>
      </div>

      <div className="tv-runtime-badge__meta mt-1 text-[9px] uppercase tracking-[0.18em]">{runtimeBadge.sourceLabel}</div>
      {runtimeBadge.warning ? (
        <p className="mt-1 max-w-[240px] text-[10px] leading-4 tv-text-sub">{runtimeBadge.warning}</p>
      ) : null}
    </div>
  );
}
