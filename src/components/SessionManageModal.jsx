import React, { useEffect, useState } from 'react';
import { Copy, Share2, Hash, Link, Save } from 'lucide-react';
import { buildSessionInviteUrl, toLegacyHashJoinTag } from '../lib/sessionUtils';
import ModalFrame from './ModalFrame';
import Button from './Button';

export default function SessionManageModal({
  isOpen,
  onClose,
  sessionId,
  sessionNumber,
  theme,
  onSaveSessionNumber,
  onOpenShare,
}) {
  const [draftSession, setDraftSession] = useState(Math.max(1, Number(sessionNumber) || 1));
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDraftSession(Math.max(1, Number(sessionNumber) || 1));
    setCopyFeedback('');
  }, [isOpen, sessionNumber]);

  const canonicalSessionCode = toLegacyHashJoinTag(sessionId || '');
  const joinUrl = buildSessionInviteUrl(sessionId || '');

  const handleCopy = async (value, type) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(type);
      window.setTimeout(() => setCopyFeedback(''), 1800);
    } catch (_) {
      setCopyFeedback('fout');
      window.setTimeout(() => setCopyFeedback(''), 1800);
    }
  };

  const handleSave = async () => {
    await onSaveSessionNumber?.(draftSession);
    onClose();
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Sessiebeheer"
      icon={Hash}
      subtitle="Sessienummer en deelopties"
      maxWidthClassName="max-w-md"
      bodyClassName="gap-5"
    >

          {/* Session number stepper */}
          <div>
            <label className="tv-label mb-2 block">Sessienummer</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftSession((v) => Math.max(1, Number(v || 1) - 1))}
                className="tv-button-secondary h-10 w-10 rounded-xl transition-all duration-200 ease-out active:scale-[0.985]"
                title="Vorige sessie"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={Math.max(1, Number(draftSession) || 1)}
                onChange={(e) => setDraftSession(Math.max(1, Number(e.target.value) || 1))}
                className="tv-input-surface hide-arrows h-10 flex-1 rounded-xl px-3 text-center text-sm tracking-[0.12em] transition-colors focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDraftSession((v) => (Number(v) || 1) + 1)}
                className="tv-button-secondary h-10 w-10 rounded-xl transition-all duration-200 ease-out active:scale-[0.985]"
                title="Volgende sessie"
              >
                +
              </button>
            </div>
          </div>

          {/* Session code + URL */}
          {sessionId ? (
            <div>
              <label className="tv-label mb-2 block">Uitnodiging</label>
              <div className="tv-panel-block divide-y divide-[color-mix(in_srgb,var(--tv-border),transparent_42%)]">
                {/* Code row */}
                <div className="flex flex-col items-start gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 shrink-0 tv-muted" />
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[9px] uppercase tracking-[0.2em] tv-muted">Sessiecode</div>
                      <div className="truncate text-xs tracking-[0.14em] tv-accent">{canonicalSessionCode}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(canonicalSessionCode, 'code')}
                    className="tv-button-secondary inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[10px] uppercase tracking-[0.12em] transition-all duration-200 ease-out active:scale-[0.985] sm:h-8 sm:w-auto"
                  >
                    <Copy className="h-3 w-3" />
                    {copyFeedback === 'code' ? 'Klaar!' : 'Kopieer'}
                  </button>
                </div>

                {/* URL row */}
                <div className="flex flex-col items-start gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <Link className="h-3.5 w-3.5 shrink-0 tv-muted" />
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[9px] uppercase tracking-[0.2em] tv-muted">Join-link</div>
                      <div className="truncate text-xs tv-text">{joinUrl}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(joinUrl, 'url')}
                    className="tv-button-secondary inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[10px] uppercase tracking-[0.12em] transition-all duration-200 ease-out active:scale-[0.985] sm:h-8 sm:w-auto"
                  >
                    <Copy className="h-3 w-3" />
                    {copyFeedback === 'url' ? 'Klaar!' : 'Kopieer'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Save */}
          <div className="-mt-1 grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            {sessionId ? (
              <Button
                variant="secondary"
                block
                onClick={() => {
                  onOpenShare?.();
                  onClose();
                }}
              >
                <Share2 className="h-4 w-4" />
                Deel sessie
              </Button>
            ) : null}
            <Button variant="primary" block onClick={handleSave}>
              <Save className="h-4 w-4" /> Opslaan
            </Button>
          </div>
    </ModalFrame>
  );
}
