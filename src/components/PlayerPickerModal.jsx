import React from 'react';
import ModalFrame from './ModalFrame';
import { resolveDisplayAvatar } from '../lib/placeholders';

export default function PlayerPickerModal({ isOpen, players, preparation, onClose, onAssign }) {
  if (!isOpen) return null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Toewijzen"
      subtitle={`Aan wie wil je ${preparation?.name || 'dit personage'} aanbieden?`}
      accent="amber"
      maxWidthClassName="max-w-lg"
      bodyClassName="max-h-[60vh] overflow-y-auto p-4 no-scrollbar sm:p-5"
    >
          {players.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-5 py-8 text-center text-sm leading-7 text-stone-400">
              Er zijn nog geen actieve spelers om deze voorbereiding aan toe te wijzen.
            </div>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onAssign?.(player.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-all duration-200 hover:border-amber-400/50 hover:bg-white/7"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-inner">
                    <img
                      src={resolveDisplayAvatar(player.avatar, player.id)}
                      alt={player.name}
                      className="h-full w-full object-cover scale-[1.15]"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-fantasy tracking-[0.08em] text-stone-100">{player.name}</div>
                    <div className="mt-1 text-sm italic text-stone-400">{player.subtitle || 'Speler'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
    </ModalFrame>
  );
}