import React from 'react';
import ModalFrame from './ModalFrame';
import { resolveDisplayAvatar } from '../lib/placeholders';
import TvImage from './TvImage';
import { useT } from '../i18n/useT';

export default function PlayerPickerModal({
  isOpen,
  players,
  preparation,
  onClose,
  onAssign,
  onSelect,
  mode = 'assign',
}) {
  const { t } = useT('preparations');

  if (!isOpen) return null;

  const isImport = mode === 'import';
  const title = isImport ? t('picker.importTitle') : t('picker.assignTitle');
  const subtitle = isImport
    ? t('picker.importSubtitle')
    : (preparation?.name || t('picker.characterFallback'));

  const handlePick = (player) => {
    if (isImport) onSelect?.(player);
    else onAssign?.(player.id);
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidthClassName="max-w-lg"
      bodyClassName="max-h-[60vh] overflow-y-auto p-4 no-scrollbar sm:p-5"
    >
      {players.length === 0 ? (
        <div className="tv-empty-state !min-h-0 px-5 py-8">
          <p className="text-sm leading-7 tv-text-sub">{t('picker.noPlayers')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => handlePick(player)}
              className="tv-view-card flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
            >
              <div className="tv-image-frame h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset shadow-inner">
                <TvImage
                  src={resolveDisplayAvatar(player.avatar, player.id)}
                  alt={player.name}
                />
              </div>
              <div className="min-w-0">
                <div className="truncate font-fantasy tracking-[0.08em] tv-text">{player.name}</div>
                <div className="mt-1 text-sm italic tv-text-sub">{player.subtitle || t('picker.playerFallback')}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ModalFrame>
  );
}
