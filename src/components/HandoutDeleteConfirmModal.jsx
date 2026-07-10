import React, { useEffect, useState } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import ModalFrame from './ModalFrame';
import Button from './Button';
import { useT } from '../i18n/useT';

export default function HandoutDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  handoutTitle = '',
  isLoading = false,
}) {
  const { t } = useT('handouts');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) setBusy(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy && !isLoading) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, busy, isLoading]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (busy || isLoading) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  const loading = busy || isLoading;
  const title = handoutTitle || t('modal.unnamed');

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={t('deleteConfirm.title')}
      subtitle={title}
      icon={Trash2}
      iconClassName="h-5 w-5 shrink-0 text-[var(--tv-tone-enemy)]"
      maxWidthClassName="max-w-md"
      footer={(
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="ghost" block onClick={onClose} disabled={loading}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="danger"
            block
            icon={Trash2}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? t('common:status.busy') : t('deleteConfirm.toTrash')}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <p className="font-story text-sm leading-relaxed tv-text-sub">
          <span className="font-medium tv-text">{title}</span>
          {' '}
          {t('deleteConfirm.body')}
        </p>

        <div className="tv-handout-trash-notice flex gap-3 rounded-xl border border-[color-mix(in_srgb,var(--tv-accent),transparent_72%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_94%)] p-3.5">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tv-accent)]" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium tv-text">{t('deleteConfirm.retentionTitle')}</p>
            <p className="text-xs leading-relaxed tv-text-sub">
              {t('deleteConfirm.retentionBody')}
            </p>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
