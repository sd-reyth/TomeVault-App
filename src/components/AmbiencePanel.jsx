import { useEffect } from 'react';
import { DEFAULT_THEME } from '../lib/appThemes';
import { createPortal } from 'react-dom';
import {
  Castle,
  ChevronRight,
  Music2,
  Pause,
  Play,
  Trees,
  Volume2,
  VolumeX,
  Waves,
  Wine,
  X,
} from 'lucide-react';

const SCENE_ICONS = {
  warm: Wine,
  forest: Trees,
  dungeon: Castle,
  ocean: Waves,
};

function AmbienceSlider({ label, value, onChange, icon: Icon, muted = false, ariaLabel }) {
  return (
    <label className="tv-ambience-slider-block">
      <div className="tv-ambience-slider-block__head">
        <span className="tv-ambience-slider-block__label">
          {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
          {label}
        </span>
        <span className={`tv-ambience-slider-block__value ${muted ? 'tv-ambience-slider-block__value--muted' : ''}`}>
          {value}%
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="tv-ambience-slider"
        aria-label={ariaLabel}
      />
    </label>
  );
}

function SceneCard({ track, isActive, isPlaying, canControlSession, onSelect }) {
  const Icon = SCENE_ICONS[track.accentTone] || Music2;
  const tone = track.accentTone || 'warm';

  return (
    <button
      type="button"
      onClick={() => canControlSession && onSelect(track.id)}
      disabled={!canControlSession}
      className={`tv-ambience-scene-card tv-ambience-scene-card--${tone} ${isActive ? 'tv-ambience-scene-card--active' : ''} ${!canControlSession ? 'tv-ambience-scene-card--readonly' : ''}`}
      aria-pressed={isActive}
      aria-label={`Scene ${track.scene}${isActive ? ', actief' : ''}`}
    >
      <div className="tv-ambience-scene-card__glow" aria-hidden />
      <div className="tv-ambience-scene-card__icon-wrap">
        <Icon className="tv-ambience-scene-card__icon" aria-hidden />
      </div>
      <div className="tv-ambience-scene-card__copy">
        <div className="tv-ambience-scene-card__title-row">
          <span className="tv-ambience-scene-card__title">{track.scene}</span>
          {isActive ? (
            <span className={`tv-ambience-scene-card__live ${isPlaying ? 'tv-ambience-scene-card__live--on' : ''}`}>
              {isPlaying ? 'Live' : 'Gereed'}
            </span>
          ) : null}
        </div>
        <p className="tv-ambience-scene-card__subtitle">{track.subtitle}</p>
      </div>
    </button>
  );
}

export default function AmbiencePanel({
  role,
  theme,
  isOpen,
  currentTrack,
  isPlaying,
  sessionVolume,
  listenerVolume,
  verifiedTracks,
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
  const canControlSession = role === 'gm';
  const activeTone = currentTrack?.accentTone || 'warm';

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panel = (
    <div
      data-ambience-panel-root="true"
      data-theme={theme || DEFAULT_THEME}
      className="tv-ambience-shell tv-ambience-shell--mobile-full fixed inset-x-0 top-0 z-[60] flex md:inset-0 md:items-center md:justify-center md:p-4"
      onClick={onClose}
    >
      <div
        className={`tv-ambience-sheet tv-ambience-sheet--${activeTone}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tv-ambience-sheet__glow tv-ambience-sheet__glow--top" aria-hidden />
        <div className="tv-ambience-sheet__glow tv-ambience-sheet__glow--bottom" aria-hidden />

        <header className="tv-ambience-sheet__header">
          <div className="min-w-0">
            <span className="tv-ambience-sheet__badge">
              <Music2 className="h-3.5 w-3.5" aria-hidden />
              Sfeer
            </span>
            <h1 className="tv-ambience-sheet__title">Ambience</h1>
            <p className="tv-ambience-sheet__subtitle max-md:hidden">
              {canControlSession
                ? 'Kies een scene en stuur het geluid voor de hele tafel.'
                : 'Luister mee — volume pas je hieronder aan.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tv-icon-btn shrink-0"
            title="Sluiten"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="tv-ambience-sheet__body">
          <section className={`tv-ambience-hero tv-ambience-hero--${activeTone}`} aria-label="Nu speelt">
            <div className="tv-ambience-hero__backdrop" aria-hidden>
              <div className="tv-ambience-hero__waves">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    key={index}
                    className={`tv-ambience-hero__bar ${isPlaying ? 'tv-ambience-hero__bar--live' : ''}`}
                    style={{ animationDelay: `${index * 0.12}s` }}
                  />
                ))}
              </div>
            </div>

            <div className="tv-ambience-hero__content">
              <div className="tv-ambience-hero__meta">
                <span className="tv-ambience-hero__eyebrow">Nu speelt</span>
                {currentTrack ? (
                  <span className="tv-ambience-hero__scene-chip">{currentTrack.scene}</span>
                ) : null}
              </div>

              <h2 className="tv-ambience-hero__scene">
                {currentTrack?.scene || 'Geen scene'}
              </h2>
              {currentTrack?.subtitle ? (
                <p className="tv-ambience-hero__description">{currentTrack.subtitle}</p>
              ) : (
                <p className="tv-ambience-hero__description tv-ambience-hero__description--empty">
                  Selecteer een scene om te beginnen.
                </p>
              )}

              <div className="tv-ambience-hero__actions">
                <button
                  type="button"
                  onClick={canControlSession ? onTogglePlayback : onUnlockAudio}
                  className={`tv-ambience-play-btn ${isPlaying ? 'tv-ambience-play-btn--active' : ''}`}
                  title={canControlSession ? (isPlaying ? 'Pauzeer' : 'Start') : 'Activeer audio'}
                  aria-label={canControlSession ? (isPlaying ? 'Pauzeer sfeer' : 'Start sfeer') : 'Activeer audio'}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span>{isPlaying ? 'Pauzeer' : 'Afspelen'}</span>
                </button>
              </div>

              <div className={`tv-ambience-hero__mix ${canControlSession ? 'tv-ambience-hero__mix--dual' : ''}`}>
                {canControlSession ? (
                  <AmbienceSlider
                    label="Sessie"
                    value={sessionVolume}
                    onChange={onSessionVolumeChange}
                    ariaLabel="Sessievolume"
                  />
                ) : null}
                <AmbienceSlider
                  label="Mix"
                  value={listenerVolume}
                  onChange={onListenerVolumeChange}
                  icon={listenerVolume === 0 ? VolumeX : Volume2}
                  muted={listenerVolume === 0}
                  ariaLabel="Jouw volume"
                />
              </div>
            </div>
          </section>

          {needsAudioUnlock ? (
            <div className="tv-ambience-alert">
              <p className="tv-ambience-alert__text">Je browser blokkeert audio tot je het eenmalig toestaat.</p>
              <button
                type="button"
                onClick={onUnlockAudio}
                className="tv-ambience-alert__action"
                aria-label="Audio inschakelen"
              >
                <Music2 className="h-4 w-4" />
                Audio aan
              </button>
            </div>
          ) : null}

          {ambienceError ? (
            <div className="tv-ambience-alert tv-ambience-alert--error" role="alert">
              {ambienceError}
            </div>
          ) : null}

          <section className="tv-ambience-scenes" aria-labelledby="ambience-scenes-heading">
            <div className="tv-ambience-scenes__head">
              <h2 id="ambience-scenes-heading" className="tv-ambience-scenes__title">Scenes</h2>
              <span className="tv-ambience-scenes__count">{verifiedTracks.length}</span>
            </div>
            <div className="tv-ambience-scenes__grid">
              {verifiedTracks.map((track) => (
                <SceneCard
                  key={track.id}
                  track={track}
                  isActive={currentTrack?.id === track.id}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  canControlSession={canControlSession}
                  onSelect={onSelectTrack}
                />
              ))}
            </div>
          </section>

          <footer className="tv-ambience-footer">
            <button
              type="button"
              onClick={onOpenSourcelist}
              className="tv-ambience-footer__link"
              aria-label="Audiogebruik en credits"
            >
              <span>Audiogebruik & credits</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </footer>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(panel, document.body) : null;
}
