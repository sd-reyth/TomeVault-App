import React from 'react';
import { ExternalLink, Music } from 'lucide-react';
import ModalFrame from './ModalFrame';

export default function SourcelistModal({
  isOpen,
  onClose,
  verifiedTracks,
  archivedTracks,
}) {
  if (!isOpen) return null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Credits"
      subtitle="Bronnen voor sfeerlagen"
      icon={Music}
      maxWidthClassName="max-w-5xl"
      panelClassName="h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)]"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-8">
          {verifiedTracks.length > 0 && (
            <section>
              <div className="tv-label tv-accent mb-3">Geverifieerd</div>
              <div className="space-y-3">
                {verifiedTracks.map((track) => (
                  <div
                    key={track.id}
                    className="tv-view-card rounded-xl p-4 transition-all duration-200"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="tv-muted mb-0.5 text-[9px] uppercase tracking-[0.2em]">
                          {track.scene}
                        </div>
                        <h3 className="font-fantasy text-base tracking-[0.08em] tv-text">
                          {track.title}
                        </h3>
                      </div>
                      <div className="tv-chip-surface whitespace-nowrap rounded px-2 py-1 text-[9px] uppercase tracking-[0.14em] tv-muted">
                        {track.source.license}
                      </div>
                    </div>

                    <div className="tv-text-sub mb-2.5 flex flex-wrap gap-1.5 text-xs">
                      <span className="font-story">{track.source.creator}</span>
                      <span>·</span>
                      <span className="tv-muted">{track.source.platform}</span>
                    </div>

                    <div className="tv-panel-inset mb-3 rounded-lg border-l-2 border-l-[var(--tv-accent)] px-3 py-2.5">
                      <p className="font-story text-sm leading-5 tv-text italic">
                        "{track.source.thankYou}"
                      </p>
                    </div>

                    <a
                      href={track.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="tv-button-secondary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-fantasy uppercase tracking-[0.14em]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Bron
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {archivedTracks.length > 0 && (
            <section>
              <div className="tv-label mb-3">Archief</div>
              <div className="tv-empty-state space-y-2 !min-h-0 items-stretch !text-left">
                {archivedTracks.map((track) => (
                  <div key={track.id} className="flex items-start gap-3">
                    <div className="flex-1 tv-muted">
                      <div className="font-fantasy text-xs tracking-[0.08em] tv-text-sub">
                        {track.scene}: {track.title}
                      </div>
                      <div className="mt-0.5 text-[11px] opacity-70">{track.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {verifiedTracks.length === 0 && archivedTracks.length === 0 && (
            <div className="tv-empty-state py-12">
              <p className="font-story tv-muted">Geen audiogegevens.</p>
            </div>
          )}

          <div className="tv-muted border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-6 pb-4 text-center text-[11px] leading-relaxed">
            Alle rechten bij de oorspronkelijke makers.
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
