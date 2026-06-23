import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Music2, Pause, Play, Volume2, VolumeX, ExternalLink, X } from 'lucide-react';

export default function AmbiencePanel({
  role,
  theme,
  isOpen,
  currentTrack,
  isPlaying,
  sessionVolume,
  listenerVolume,
  verifiedTracks,
  archivedTracks,
  needsAudioUnlock,
  ambienceError,
  onClose,
  onTogglePlayback,
  onSelectTrack,
  onSessionVolumeChange,
  onListenerVolumeChange,
  onUnlockAudio,
  onOpenSourcelist,
}) {
  if (!isOpen) return null;

  const canControlSession = role === 'gm';

  const SceneList = () => {
    const [expandedId, setExpandedId] = useState(null);

    return (
      <div className="flex flex-col gap-1">
        {verifiedTracks.map((track) => {
          const isActive = currentTrack?.id === track.id;
          const isExpanded = expandedId === track.id;

          return (
            <div
              key={track.id}
              className={`tv-ambience-track relative overflow-hidden transition-all ${isActive ? 'tv-ambience-track--active' : ''}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${track.accentClassName} pointer-events-none`} />

              <div className="relative flex h-11 items-center">
                <button
                  type="button"
                  onClick={() => canControlSession && onSelectTrack(track.id)}
                  disabled={!canControlSession}
                  className={`flex h-full min-w-0 flex-1 items-center gap-3 pr-2 pl-3 text-left ${!canControlSession ? 'cursor-default' : ''}`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'tv-magic-glow bg-[color-mix(in_srgb,var(--tv-accent),#fff_40%)]' : 'bg-[color-mix(in_srgb,var(--tv-border),transparent_20%)]'}`}
                  />
                  <span className={`truncate font-fantasy text-sm tracking-[0.1em] ${isActive ? 'tv-text' : 'tv-text-sub'}`}>
                    {track.scene}
                  </span>
                  {isActive ? (
                    <span className="tv-chip-surface shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] tv-accent">
                      {isPlaying ? 'Live' : '·'}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : track.id)}
                  aria-label={isExpanded ? 'Sluit details' : 'Toon details'}
                  className={`flex h-11 w-10 shrink-0 items-center justify-center transition-colors ${isExpanded ? 'tv-accent' : 'tv-muted hover:tv-text-sub'}`}
                >
                  {isExpanded ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                </button>
              </div>

              {isExpanded ? (
                <div className="tv-ambience-track-expand relative px-4 py-3">
                  <p className="tv-meta mb-2">{track.subtitle}</p>
                  <div className="tv-muted mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                    <span>{track.source.creator} · {track.source.platform}</span>
                    <span>{track.source.license}</span>
                  </div>
                  <a
                    href={track.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tv-text-sub inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors hover:tv-accent"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Bron
                  </a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const panel = (
    <div
      data-ambience-panel-root="true"
      data-theme={theme || 'midnight-tome'}
      className="tv-ambience-shell fixed inset-0 z-[60] flex flex-col"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 16%, color-mix(in srgb, var(--tv-accent), transparent 84%), transparent 34%), radial-gradient(circle at 82% 10%, color-mix(in srgb, var(--tv-accent), transparent 88%), transparent 30%), radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--tv-accent), transparent 90%), transparent 42%)',
        }}
      />

      <div className="tv-ambience-header relative z-10 shrink-0 px-4 py-4 md:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <Music2 className="tv-accent h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-fantasy text-base font-bold leading-none tracking-wide tv-text md:text-lg">
              Ambience
            </h1>
            {currentTrack ? (
              <div className="tv-chip-surface mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]">
                <span className="tv-accent truncate">{currentTrack.scene}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tv-icon-btn ml-auto shrink-0"
            title="Sluiten"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
          <div className="tv-panel-shell p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="tv-label">Nu</div>
                <div className="mt-2 truncate font-fantasy text-xl tracking-[0.08em] tv-text">
                  {currentTrack?.scene || '—'}
                </div>
                {currentTrack?.subtitle ? (
                  <div className="tv-meta mt-1 truncate">{currentTrack.subtitle}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={canControlSession ? onTogglePlayback : onUnlockAudio}
                className={`tv-icon-btn h-11 w-11 shrink-0 ${isPlaying ? 'tv-button-accent-muted' : ''}`}
                title={canControlSession ? (isPlaying ? 'Pauzeer' : 'Start') : 'Activeer audio'}
                aria-label={canControlSession ? (isPlaying ? 'Pauzeer sfeer' : 'Start sfeer') : 'Activeer audio'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>

            <div className={`mt-5 grid gap-3 ${canControlSession ? 'sm:grid-cols-2' : ''}`}>
              {canControlSession ? (
                <label className="tv-panel-block px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="tv-label" title="Sessievolume">Sessie</div>
                    <div className="font-fantasy text-sm tracking-[0.12em] tv-accent">{sessionVolume}%</div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sessionVolume}
                    onChange={(event) => onSessionVolumeChange(Number(event.target.value))}
                    className="ambience-slider mt-3 w-full"
                    aria-label="Sessievolume"
                  />
                </label>
              ) : null}

              <label className="tv-panel-block px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="tv-label" title="Jouw volume">Mix</div>
                  <div className="flex items-center gap-2 font-fantasy text-sm tracking-[0.12em] tv-text">
                    {listenerVolume === 0 ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 tv-text-sub" />}
                    <span>{listenerVolume}%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={listenerVolume}
                  onChange={(event) => onListenerVolumeChange(Number(event.target.value))}
                  className="ambience-slider mt-3 w-full"
                  aria-label="Jouw volume"
                />
              </label>
            </div>
          </div>

          {needsAudioUnlock ? (
            <div className="rounded-xl border border-rose-700/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-100">
              <button
                type="button"
                onClick={onUnlockAudio}
                className="tv-icon-btn h-9 w-full gap-2 text-rose-50"
                aria-label="Audio inschakelen"
              >
                <Music2 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Audio aan</span>
              </button>
            </div>
          ) : null}

          {ambienceError ? (
            <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {ambienceError}
            </div>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="tv-label">Scenes</div>
              <div className="tv-muted text-[10px]">{verifiedTracks.length}</div>
            </div>
            <SceneList />
          </section>

          <div className="border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-4 pb-2">
            <button
              type="button"
              onClick={onOpenSourcelist}
              aria-label="Audiogebruik en credits"
              className="tv-view-card flex w-full items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left transition-all duration-200"
            >
              <Info className="tv-muted h-4 w-4 shrink-0" />
              <span className="tv-text-sub min-w-0 flex-1 truncate text-[11px] uppercase tracking-[0.16em]">
                Credits
              </span>
              <span className="tv-muted whitespace-nowrap text-[10px]">{verifiedTracks.length} →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(panel, document.body) : null;
}
