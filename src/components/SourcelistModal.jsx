import { useEffect } from 'react';
import { DEFAULT_THEME } from '../lib/appThemes';
import { createPortal } from 'react-dom';
import {
  Castle,
  ExternalLink,
  Music2,
  Trees,
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

function CreditRow({ track }) {
  const Icon = SCENE_ICONS[track.accentTone] || Music2;
  const tone = track.accentTone || 'warm';

  return (
    <article className={`tv-sourcelist-row tv-sourcelist-row--${tone}`}>
      <div className="tv-sourcelist-row__accent" aria-hidden />
      <div className="tv-sourcelist-row__icon-wrap">
        <Icon className="tv-sourcelist-row__icon" aria-hidden />
      </div>

      <div className="tv-sourcelist-row__main">
        <div className="tv-sourcelist-row__head">
          <div className="min-w-0">
            <span className="tv-sourcelist-row__scene">{track.scene}</span>
            <h3 className="tv-sourcelist-row__title">{track.title}</h3>
          </div>
          <span className="tv-sourcelist-row__license">{track.source.license}</span>
        </div>

        <p className="tv-sourcelist-row__meta">
          <span>{track.source.creator}</span>
          <span aria-hidden>·</span>
          <span>{track.source.platform}</span>
        </p>

        {track.subtitle ? (
          <p className="tv-sourcelist-row__description">{track.subtitle}</p>
        ) : null}

        <p className="tv-sourcelist-row__thanks">{track.source.thankYou}</p>

        <a
          href={track.source.url}
          target="_blank"
          rel="noreferrer"
          className="tv-sourcelist-row__link"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Bron
        </a>
      </div>
    </article>
  );
}

function ArchivedRow({ track }) {
  return (
    <div className="tv-sourcelist-archived-row">
      <div className="tv-sourcelist-archived-row__dot" aria-hidden />
      <div className="min-w-0">
        <div className="tv-sourcelist-archived-row__title">
          {track.scene}: {track.title}
        </div>
        <p className="tv-sourcelist-archived-row__status">{track.status}</p>
      </div>
    </div>
  );
}

export default function SourcelistModal({
  isOpen,
  onClose,
  theme,
  verifiedTracks,
  archivedTracks,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modal = (
    <div
      data-sourcelist-modal-root="true"
      data-theme={theme || DEFAULT_THEME}
      className="tv-sourcelist-shell fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="tv-sourcelist-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sourcelist-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tv-sourcelist-sheet__glow tv-sourcelist-sheet__glow--top" aria-hidden />
        <div className="tv-sourcelist-sheet__glow tv-sourcelist-sheet__glow--bottom" aria-hidden />

        <header className="tv-sourcelist-sheet__header">
          <div className="min-w-0">
            <span className="tv-sourcelist-sheet__badge">
              <Music2 className="h-3.5 w-3.5" aria-hidden />
              Credits
            </span>
            <h1 id="sourcelist-title" className="tv-sourcelist-sheet__title">
              Audiogebruik
            </h1>
            <p className="tv-sourcelist-sheet__subtitle">
              Bronnen en dankwoord voor de sfeerlagen in TomeVault.
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

        <div className="tv-sourcelist-sheet__body">
          {verifiedTracks.length > 0 ? (
            <section className="tv-sourcelist-section" aria-label="Geverifieerde bronnen">
              <div className="tv-sourcelist-section__head">
                <h2 className="tv-sourcelist-section__title">Geverifieerd</h2>
                <span className="tv-sourcelist-section__count">{verifiedTracks.length}</span>
              </div>
              <div className="tv-sourcelist-list">
                {verifiedTracks.map((track) => (
                  <CreditRow key={track.id} track={track} />
                ))}
              </div>
            </section>
          ) : null}

          {archivedTracks.length > 0 ? (
            <section className="tv-sourcelist-section tv-sourcelist-section--archived" aria-label="Archief">
              <div className="tv-sourcelist-section__head">
                <h2 className="tv-sourcelist-section__title">Archief</h2>
                <span className="tv-sourcelist-section__count">{archivedTracks.length}</span>
              </div>
              <div className="tv-sourcelist-archived-list">
                {archivedTracks.map((track) => (
                  <ArchivedRow key={track.id} track={track} />
                ))}
              </div>
            </section>
          ) : null}

          {verifiedTracks.length === 0 && archivedTracks.length === 0 ? (
            <div className="tv-sourcelist-empty">
              <p>Geen audiogegevens beschikbaar.</p>
            </div>
          ) : null}

          <p className="tv-sourcelist-disclaimer">
            Alle rechten bij de oorspronkelijke makers. TomeVault host alleen de bestanden voor sessiegebruik.
          </p>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
