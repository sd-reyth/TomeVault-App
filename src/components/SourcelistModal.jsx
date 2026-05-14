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
      title="Audiogebruik & Dankwoord"
      subtitle="Credits voor alle sfeerlagen en hun oorspronkelijke makers."
      icon={Music}
      accent="amber"
      maxWidthClassName="max-w-5xl"
      panelClassName="h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)]"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-6">
          
          {/* Verified Tracks */}
          {verifiedTracks.length > 0 && (
            <section>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600/80 mb-3">
                Geverifieerde bronnen
              </div>
              <div className="space-y-3">
                {verifiedTracks.map((track) => (
                  <div
                    key={track.id}
                    className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 hover:border-stone-700/80 transition-colors"
                  >
                    {/* Track title + scene */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-stone-500 mb-0.5">
                          {track.scene}
                        </div>
                        <h3 className="font-fantasy text-base tracking-[0.08em] text-stone-100">
                          {track.title}
                        </h3>
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.14em] text-stone-500 whitespace-nowrap px-2 py-1 rounded bg-stone-900/50 border border-stone-800">
                        {track.source.license}
                      </div>
                    </div>

                    {/* Creator info */}
                    <div className="text-xs text-stone-400 mb-2.5 flex flex-wrap gap-1.5">
                      <span className="font-story">{track.source.creator}</span>
                      <span>·</span>
                      <span className="text-stone-500">{track.source.platform}</span>
                    </div>

                    {/* Thank you quote */}
                    <div className="mb-3 rounded-lg border border-stone-800/60 bg-stone-900/70 px-3 py-2.5 border-l-2 border-l-amber-600/40">
                      <p className="text-sm leading-5 text-stone-300 font-story italic">
                        "{track.source.thankYou}"
                      </p>
                    </div>

                    {/* Open source button */}
                    <a
                      href={track.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/80 px-3 py-1.5 text-xs font-fantasy uppercase tracking-[0.14em] text-stone-300 transition-colors hover:border-amber-600/50 hover:bg-stone-900/80 hover:text-amber-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open bron
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Archived Tracks */}
          {archivedTracks.length > 0 && (
            <section>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600 mb-3">
                Gearchiveerde tracks
              </div>
              <div className="rounded-xl border border-dashed border-stone-700/60 bg-stone-950/40 p-4 space-y-2">
                {archivedTracks.map((track) => (
                  <div key={track.id} className="flex items-start gap-3">
                    <div className="text-stone-600 flex-1">
                      <div className="text-xs font-fantasy text-stone-400 tracking-[0.08em]">
                        {track.scene}: {track.title}
                      </div>
                      <div className="text-[11px] text-stone-700 mt-0.5">{track.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {verifiedTracks.length === 0 && archivedTracks.length === 0 && (
            <div className="flex items-center justify-center py-12 text-center">
              <p className="text-stone-500 font-story">Geen audiogegevensbeschikbaar.</p>
            </div>
          )}

          {/* Footer note */}
          <div className="border-t border-stone-800/40 pt-6 pb-4 text-[11px] text-stone-600 text-center leading-relaxed">
            Alle artiest- en platformrechten behoren tot hun oorspronkelijke scheppers.<br />
            <span className="text-stone-700">TomeVault ondersteunt het werk van onafhankelijke makers.</span>
          </div>

        </div>
      </div>
    </ModalFrame>
  );
}
