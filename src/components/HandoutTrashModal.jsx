import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Scroll, Trash2 } from 'lucide-react';
import ModalFrame from './ModalFrame';
import Button from './Button';
import {
  formatHandoutTrashRemaining,
  getHandoutIcon,
  getHandoutTypeLabel,
} from '../lib/handoutUtils';

export default function HandoutTrashModal({
  isOpen,
  onClose,
  handouts = [],
  onRestore,
  onPermanentDelete,
}) {
  const [pendingPermanentId, setPendingPermanentId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setPendingPermanentId(null);
      setBusyId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || handouts.length === 0) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, [isOpen, handouts.length]);

  const sortedHandouts = useMemo(
    () => [...handouts].sort((a, b) => Number(b.deletedAtMs || 0) - Number(a.deletedAtMs || 0)),
    [handouts]
  );

  const runAction = async (id, action) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await action?.(id);
      setPendingPermanentId(null);
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Prullenbak"
      subtitle="Verwijderde handouts · 24 uur bewaard"
      icon={Trash2}
      iconClassName="h-5 w-5 shrink-0 tv-muted"
      maxWidthClassName="max-w-lg"
      bodyClassName="!py-4"
    >
      {sortedHandouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Trash2 className="h-8 w-8 tv-muted opacity-50" aria-hidden />
          <p className="text-sm tv-text-sub">De prullenbak is leeg.</p>
          <p className="max-w-xs text-xs tv-muted">
            Verwijderde handouts verschijnen hier en blijven 24 uur bewaard.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedHandouts.map((handout) => {
            const Icon = getHandoutIcon(handout.type);
            const isBusy = busyId === handout.id;
            const confirmPermanent = pendingPermanentId === handout.id;
            const remaining = formatHandoutTrashRemaining(handout);

            return (
              <li
                key={handout.id}
                className="tv-handout-trash-row rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_30%)] tv-panel-inset p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--tv-border),transparent_55%)]">
                    <Icon className="h-4 w-4 tv-muted" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tv-text">{handout.title || 'Naamloze handout'}</p>
                    <p className="mt-0.5 text-[11px] tv-muted">
                      {getHandoutTypeLabel(handout.type)}
                      {remaining ? ` · nog ${remaining}` : ''}
                    </p>
                  </div>
                </div>

                {confirmPermanent ? (
                  <div className="mt-3 space-y-2 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_40%)] pt-3">
                    <p className="text-xs leading-relaxed tv-text-sub">
                      Definitief verwijderen? Dit kan niet ongedaan worden gemaakt.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        block
                        disabled={isBusy}
                        onClick={() => setPendingPermanentId(null)}
                      >
                        Annuleren
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        block
                        icon={Trash2}
                        disabled={isBusy}
                        onClick={() => runAction(handout.id, onPermanentDelete)}
                      >
                        {isBusy ? 'Bezig…' : 'Definitief'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      block
                      icon={RotateCcw}
                      disabled={isBusy}
                      onClick={() => runAction(handout.id, onRestore)}
                    >
                      {isBusy ? 'Bezig…' : 'Terugzetten'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      block
                      icon={Trash2}
                      disabled={isBusy}
                      className="tv-hover-danger"
                      onClick={() => setPendingPermanentId(handout.id)}
                    >
                      Definitief
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sortedHandouts.length > 0 ? (
        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed tv-muted">
          <Scroll className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          Handouts die langer dan 24 uur in de prullenbak staan, worden automatisch definitief verwijderd.
        </p>
      ) : null}
    </ModalFrame>
  );
}
