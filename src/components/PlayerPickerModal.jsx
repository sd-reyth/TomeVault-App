import React from 'react';
import { X } from 'lucide-react';
import { resolveDisplayAvatar } from '../lib/placeholders';

export default function PlayerPickerModal({ isOpen, players, preparation, onClose, onAssign }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-800/60 bg-stone-900/85 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Toewijzen</div>
            <h2 className="mt-1 font-fantasy text-lg tracking-[0.14em] text-stone-100">Aan wie wil je {preparation?.name || 'dit personage'} aanbieden?</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-800 hover:text-rose-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 no-scrollbar">
          {players.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-800 bg-stone-950/40 px-5 py-8 text-center text-sm leading-7 text-stone-500">
              Er zijn nog geen actieve spelers om deze voorbereiding aan toe te wijzen.
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onAssign?.(player.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-stone-800 bg-stone-950/55 px-3 py-3 text-left transition-colors hover:border-amber-700/50 hover:bg-stone-900/80"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-800 bg-stone-900 shadow-inner">
                    <img
                      src={resolveDisplayAvatar(player.avatar, player.id)}
                      alt={player.name}
                      className="h-full w-full object-cover scale-[1.15]"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-fantasy tracking-[0.08em] text-stone-100">{player.name}</div>
                    <div className="mt-1 text-sm italic text-stone-500">{player.subtitle || 'Speler'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}