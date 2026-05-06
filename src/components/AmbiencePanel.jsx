import React from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Music2, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';

export default function AmbiencePanel({
  role,
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
}) {
  if (!isOpen) return null;

  const canControlSession = role === 'gm';

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      data-ambience-panel-root="true"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-stone-950/98 backdrop-blur-xl md:inset-x-auto md:right-5 md:top-[4.6rem] md:bottom-auto md:max-h-[min(78vh,46rem)] md:w-[min(92vw,31rem)] md:rounded-[1.4rem] md:border md:border-stone-700/80 md:bg-stone-950/95 md:shadow-[0_28px_80px_rgba(0,0,0,0.52)]"
    >
        <div className="shrink-0 border-b border-stone-800/80 bg-gradient-to-r from-amber-900/30 via-stone-950 to-stone-950 px-4 py-4 md:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300/80">Sferen</div>
              <h3 className="mt-1 font-fantasy text-xl tracking-[0.08em] text-stone-100">Ambience aan tafel</h3>
              <p className="mt-2 max-w-[28rem] text-sm leading-6 text-stone-400">
                Kies een situatie, stuur de sessiemix en houd de bronvermelding netjes zichtbaar voor iedereen.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-800 bg-stone-900/80 text-stone-400 transition-colors hover:border-stone-700 hover:text-stone-200"
              title="Sluit sferenpaneel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-stone-800/80 bg-stone-900/70 p-3 md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Nu actief</div>
                <div className="mt-2 font-fantasy text-lg tracking-[0.08em] text-stone-100">{currentTrack?.scene || 'Geen sfeer gekozen'}</div>
                <div className="mt-1 text-sm text-stone-400">{currentTrack?.subtitle || 'Kies een geverifieerde track om de tafel te kleuren.'}</div>
              </div>
              <button
                type="button"
                onClick={canControlSession ? onTogglePlayback : onUnlockAudio}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-fantasy text-sm tracking-[0.14em] transition-colors sm:w-auto ${isPlaying ? 'border-amber-700/50 bg-amber-950/40 text-amber-100 hover:bg-amber-900/45' : 'border-stone-700 bg-stone-950 text-stone-200 hover:border-amber-700/40 hover:text-amber-100'}`}
                title={canControlSession ? (isPlaying ? 'Pauzeer sessiesfeer' : 'Start sessiesfeer') : 'Audio inschakelen'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{canControlSession ? (isPlaying ? 'Pauzeer' : 'Start sfeer') : 'Activeer audio'}</span>
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-stone-800/80 bg-stone-950/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Sessievolume</div>
                    <div className="mt-1 text-sm text-stone-300">{canControlSession ? 'Wat iedereen als basis hoort.' : 'Door de GM bepaald.'}</div>
                  </div>
                  <div className="font-fantasy text-sm tracking-[0.12em] text-amber-300">{sessionVolume}%</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sessionVolume}
                  onChange={(event) => onSessionVolumeChange(Number(event.target.value))}
                  disabled={!canControlSession}
                  className="ambience-slider mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40"
                />
              </label>

              <label className="rounded-2xl border border-stone-800/80 bg-stone-950/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Jouw mix</div>
                    <div className="mt-1 text-sm text-stone-300">Pas lokaal aan zonder de rest van de tafel te veranderen.</div>
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] md:px-5 md:pb-4">
        {needsAudioUnlock ? (
          <div className="mb-4 rounded-2xl border border-amber-700/40 bg-amber-950/35 px-4 py-3 text-sm text-amber-100">
            <div className="font-fantasy tracking-[0.12em]">Audio wacht op een klik</div>
            <p className="mt-1 text-amber-100/80">De browser blokkeerde autoplay. Gebruik deze knop om de sfeer direct te activeren.</p>
            <button
              type="button"
              onClick={onUnlockAudio}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-600/50 bg-amber-800/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-50 transition-colors hover:bg-amber-700/45"
            >
              <Music2 className="h-4 w-4" />
              Audio inschakelen
            </button>
          </div>
        ) : null}

        {ambienceError ? (
          <div className="mb-4 rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {ambienceError}
          </div>
        ) : null}

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Geverifieerde scenes</div>
              <h4 className="mt-1 font-fantasy text-lg tracking-[0.08em] text-stone-100">Snel kiezen per situatie</h4>
            </div>
            <div className="text-xs text-stone-500">{canControlSession ? 'GM bestuurt de actieve sfeer' : 'Alleen bekijken en lokaal aanpassen'}</div>
          </div>

          <div className="mt-4 grid gap-3">
            {verifiedTracks.map((track) => {
              const isActiveTrack = currentTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => canControlSession && onSelectTrack(track.id)}
                  disabled={!canControlSession}
                  className={`group relative overflow-hidden rounded-[1.35rem] border p-3 text-left transition-all md:p-4 ${isActiveTrack ? 'border-amber-600/50 bg-stone-900 shadow-[0_18px_50px_rgba(245,158,11,0.1)]' : 'border-stone-800/80 bg-stone-950/80 hover:border-stone-700'} ${!canControlSession ? 'cursor-default' : ''}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${track.accentClassName} opacity-90`} />
                  <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-stone-400">{track.scene}</div>
                      <div className="mt-2 font-fantasy text-lg tracking-[0.08em] text-stone-100">{track.title}</div>
                      <p className="mt-2 max-w-[26rem] text-sm leading-6 text-stone-300">{track.subtitle}</p>
                      <div className="mt-3 text-xs text-stone-400">{track.source.creator} via {track.source.platform}</div>
                    </div>
                    <div className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${isActiveTrack ? 'border-amber-400/40 bg-amber-200/10 text-amber-100' : 'border-stone-700 bg-stone-950/80 text-stone-400'}`}>
                      {isActiveTrack ? (isPlaying ? 'Live' : 'Geselecteerd') : 'Scene'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-[1.4rem] border border-stone-800/80 bg-stone-950/80 p-4 md:p-5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-stone-500">Bronnen & dankwoord</div>
          <h4 className="mt-1 font-fantasy text-lg tracking-[0.08em] text-stone-100">Credits die altijd zichtbaar mogen blijven</h4>
          <p className="mt-2 text-sm leading-6 text-stone-400">
            Dank aan alle makers van deze sfeerlagen. Elke actieve of beschikbare track houdt hier zijn maker, licentie en directe bronlink.
          </p>

          <div className="mt-4 space-y-3">
            {verifiedTracks.map((track) => (
              <div key={`${track.id}-credit`} className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="font-fantasy text-base tracking-[0.08em] text-stone-100">{track.title}</div>
                    <div className="mt-1 text-sm text-stone-300">{track.source.thankYou}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">{track.source.creator} · {track.source.platform} · {track.source.license}</div>
                  </div>
                  <a
                    href={track.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-200 transition-colors hover:border-amber-600/40 hover:text-amber-100 sm:w-auto"
                  >
                    Open bron
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {archivedTracks.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-stone-700/80 bg-stone-950/70 px-4 py-3 text-sm text-stone-400">
              <div className="font-fantasy tracking-[0.08em] text-stone-200">Archieftracks nog niet vrijgegeven</div>
              <div className="mt-2 space-y-1">
                {archivedTracks.map((track) => (
                  <div key={track.id}>{track.scene}: {track.title} - {track.status}</div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(panel, document.body) : null;
}