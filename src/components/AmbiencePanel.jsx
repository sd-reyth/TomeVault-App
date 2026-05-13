import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, Music2, Pause, Play, Volume2, VolumeX, ArrowLeft, ExternalLink, X } from 'lucide-react';

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
  const isLightTheme = theme === 'light';

  const SceneList = () => {
    const [expandedId, setExpandedId] = useState(null);

    return (
      <div className="flex flex-col gap-1">
        {verifiedTracks.map((track) => {
          const isActive = currentTrack?.id === track.id;
          const isExpanded = expandedId === track.id;

          return (
            <div key={track.id} className={`relative overflow-hidden rounded-xl border transition-all ${isActive ? 'border-amber-600/40' : 'border-stone-800/70 hover:border-stone-700/80'}`}>
              {/* Color accent layer */}
              <div className={`absolute inset-0 bg-gradient-to-r ${track.accentClassName} pointer-events-none`} />

              {/* Main row */}
              <div className="relative flex items-center h-11">
                {/* Select zone */}
                <button
                  type="button"
                  onClick={() => canControlSession && onSelectTrack(track.id)}
                  disabled={!canControlSession}
                  className={`flex-1 flex items-center gap-3 h-full pl-3 pr-2 text-left min-w-0 ${!canControlSession ? 'cursor-default' : ''}`}
                >
                  {/* Active dot */}
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${isActive ? (isPlaying ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]' : 'bg-amber-400') : 'bg-stone-700'}`} />

                  {/* Scene name */}
                  <span className={`font-fantasy text-sm tracking-[0.1em] truncate ${isActive ? 'text-stone-100' : 'text-stone-300'}`}>
                    {track.scene}
                  </span>

                  {/* Active badge */}
                  {isActive && (
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">
                      {isPlaying ? 'Live' : 'Klaar'}
                    </span>
                  )}
                </button>

                {/* Info toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : track.id)}
                  className={`shrink-0 h-11 w-10 flex items-center justify-center transition-colors ${isExpanded ? 'text-amber-400' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  {isExpanded ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Expanded info */}
              {isExpanded && (
                <div className="relative border-t border-stone-800/60 px-4 py-3 bg-stone-950/60">
                  <p className="text-xs text-stone-300 font-story mb-2">{track.subtitle}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-stone-500 mb-3">
                    <span>{track.source.creator} · {track.source.platform}</span>
                    <span>{track.source.license}</span>
                  </div>
                  <a
                    href={track.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-stone-400 hover:text-amber-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open bron
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const panel = (
    <div
      data-ambience-panel-root="true"
      data-theme={theme || 'purple'}
      className={`fixed inset-0 z-[60] flex flex-col ${isLightTheme ? 'bg-stone-900 text-stone-300' : 'bg-stone-950 text-stone-300'}`}
    >

      {/* Header */}
      <div className={`shrink-0 border-b backdrop-blur-sm px-4 md:px-8 py-4 flex items-center gap-4 ${isLightTheme ? 'border-stone-600/80 bg-stone-900/95' : 'border-stone-800/60 bg-stone-950/95'}`}>
        <button
          type="button"
          onClick={onClose}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${isLightTheme ? 'border-stone-600 bg-stone-900 text-stone-300 hover:border-stone-500 hover:text-stone-100' : 'border-stone-800 bg-stone-900/80 text-stone-400 hover:border-stone-700 hover:text-stone-200'}`}
          title="Sluiten"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Music2 className={`w-4 h-4 shrink-0 ${isLightTheme ? 'text-amber-600' : 'text-amber-500/70'}`} />
          <div className="min-w-0">
            <h1 className="font-fantasy font-bold text-stone-100 tracking-wide text-base md:text-lg leading-none truncate">Ambience aan tafel</h1>
            <p className={`text-[10px] uppercase tracking-[0.16em] mt-1 ${isLightTheme ? 'text-stone-400' : 'text-stone-500'}`}>Sfeer voor de hele tafel</p>
          </div>
        </div>
        {currentTrack && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className={`text-[10px] uppercase tracking-[0.16em] ${isLightTheme ? 'text-stone-400' : 'text-stone-500'}`}>Nu actief:</div>
            <div className="text-sm font-fantasy text-amber-300/80">{currentTrack.scene}</div>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className={`ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${isLightTheme ? 'border-stone-600 bg-stone-900 text-stone-300 hover:border-stone-500 hover:text-stone-100' : 'border-stone-800 bg-stone-900/80 text-stone-400 hover:border-stone-700 hover:text-stone-200'}`}
          title="Sluiten"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-6">

          {/* Now playing + play button */}
          <div className={`rounded-2xl border p-5 ${isLightTheme ? 'border-stone-600 bg-stone-950/70 shadow-sm' : 'border-stone-800/80 bg-stone-900/40'}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className={`text-[10px] uppercase tracking-[0.22em] ${isLightTheme ? 'text-stone-400' : 'text-stone-500'}`}>Nu actief</div>
                <div className="mt-2 font-fantasy text-xl tracking-[0.08em] text-stone-100">{currentTrack?.scene || 'Geen sfeer gekozen'}</div>
                <div className={`mt-1 text-sm ${isLightTheme ? 'text-stone-300' : 'text-stone-400'}`}>{currentTrack?.subtitle || 'Kies een geverifieerde track om de tafel te kleuren.'}</div>
              </div>
              <button
                type="button"
                onClick={canControlSession ? onTogglePlayback : onUnlockAudio}
                className={`h-10 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 font-fantasy text-sm uppercase tracking-[0.16em] transition-colors sm:w-auto shrink-0 ${isPlaying ? 'border-amber-700/50 bg-amber-950/40 text-amber-100 hover:bg-amber-900/45' : (isLightTheme ? 'border-stone-600 bg-stone-900 text-stone-200 hover:border-amber-700/40 hover:text-amber-200' : 'border-stone-700 bg-stone-950 text-stone-200 hover:border-amber-700/40 hover:text-amber-100')}`}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{canControlSession ? (isPlaying ? 'Pauzeer' : 'Start sfeer') : 'Activeer audio'}</span>
              </button>
            </div>

            {/* Volume sliders */}
            <div className={`mt-5 grid gap-3 ${canControlSession ? 'sm:grid-cols-2' : ''}`}>
              {canControlSession ? (
                <label className={`rounded-xl border px-4 py-3 ${isLightTheme ? 'border-stone-600 bg-stone-950/75' : 'border-stone-800/80 bg-stone-950/60'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`text-[10px] uppercase tracking-[0.2em] ${isLightTheme ? 'text-stone-400' : 'text-stone-500'}`}>Sessievolume</div>
                      <div className={`mt-1 text-xs ${isLightTheme ? 'text-stone-300' : 'text-stone-400'}`}>Wat iedereen als basis hoort.</div>
                    </div>
                    <div className="font-fantasy text-sm tracking-[0.12em] text-amber-300">{sessionVolume}%</div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sessionVolume}
                    onChange={(event) => onSessionVolumeChange(Number(event.target.value))}
                    className="ambience-slider mt-3 w-full"
                  />
                </label>
              ) : null}

              <label className={`rounded-xl border px-4 py-3 ${isLightTheme ? 'border-stone-600 bg-stone-950/75' : 'border-stone-800/80 bg-stone-950/60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={`text-[10px] uppercase tracking-[0.2em] ${isLightTheme ? 'text-stone-400' : 'text-stone-500'}`}>Jouw mix</div>
                    <div className={`mt-1 text-xs ${isLightTheme ? 'text-stone-300' : 'text-stone-400'}`}>Pas lokaal aan zonder anderen te veranderen.</div>
                  </div>
                  <div className="flex items-center gap-2 font-fantasy text-sm tracking-[0.12em] text-stone-200">
                    {listenerVolume === 0 ? <VolumeX className="h-4 w-4 text-rose-300" /> : <Volume2 className="h-4 w-4 text-stone-400" />}
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
                />
              </label>
            </div>

            {!canControlSession ? (
              <p className={`mt-3 text-xs ${isLightTheme ? 'text-stone-400' : 'text-stone-500'}`}>
                De GM kiest de scene. Jij kunt hier altijd je eigen volume afstellen of audio opnieuw activeren als je browser autoplay blokkeert.
              </p>
            ) : null}
          </div>

          {/* Audio unlock warning */}
          {needsAudioUnlock && (
            <div className="rounded-xl border border-amber-700/40 bg-amber-950/35 px-4 py-3 text-sm text-amber-100">
              <div className="font-fantasy tracking-[0.12em]">Audio wacht op een klik</div>
              <p className="mt-1 text-amber-100/80">De browser blokkeerde autoplay. Gebruik deze knop om de sfeer direct te activeren.</p>
              <button
                type="button"
                onClick={onUnlockAudio}
                className="mt-3 h-9 inline-flex items-center gap-2 rounded-lg border border-amber-600/50 bg-amber-800/40 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-50 transition-colors hover:bg-amber-700/45"
              >
                <Music2 className="h-4 w-4" />
                Audio inschakelen
              </button>
            </div>
          )}

          {/* Error */}
          {ambienceError && (
            <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {ambienceError}
            </div>
          )}

          {/* Scene selector */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className={`text-[10px] uppercase tracking-[0.24em] ${isLightTheme ? 'text-stone-400' : 'text-stone-500'}`}>Geverifieerde scenes</div>
              <div className={`text-[10px] ${isLightTheme ? 'text-stone-400' : 'text-stone-600'}`}>{canControlSession ? 'GM kiest · tik op een rij' : 'Alleen bekijken'}</div>
            </div>
            <SceneList />
          </section>

          {/* Credits link */}
          <div className="border-t border-stone-800/40 pt-4 pb-2">
            <button
              type="button"
              onClick={onOpenSourcelist}
              className="flex w-full items-center justify-between gap-2 text-left rounded-xl border border-stone-800/60 bg-stone-900/40 px-4 py-3 transition-colors hover:border-stone-700 hover:bg-stone-900/60"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Info className="h-4 w-4 text-stone-500 shrink-0" />
                <span className="text-[11px] uppercase tracking-[0.16em] text-stone-400">Audiogebruik & credits</span>
              </div>
              <span className="text-[10px] text-stone-600 whitespace-nowrap">{verifiedTracks.length} bronnen →</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(panel, document.body) : null;
}