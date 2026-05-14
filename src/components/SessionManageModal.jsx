import React, { useEffect, useState } from 'react';
import { Copy, Share2, Hash, Link, Save } from 'lucide-react';
import { buildSessionInviteUrl, toLegacyHashJoinTag, toSafeJoinTagForLink } from '../lib/sessionUtils';
import ModalFrame from './ModalFrame';

export default function SessionManageModal({
  isOpen,
  onClose,
  sessionId,
  sessionNumber,
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
  const scannerSafeCode = toSafeJoinTagForLink(sessionId || '');
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
      subtitle="Werk het campagnenummer bij en houd uitnodigingsgegevens direct bij de hand."
      accent="amber"
      bodyClassName="gap-5"
    >

          {/* Session number stepper */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">
              Campagne Sessienummer
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftSession((v) => Math.max(1, Number(v || 1) - 1))}
                className="h-9 w-9 rounded-lg border border-stone-700 bg-stone-950/70 text-stone-300 hover:text-amber-400 hover:border-amber-700/50 transition-colors"
                title="Vorige sessie"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={Math.max(1, Number(draftSession) || 1)}
                onChange={(e) => setDraftSession(Math.max(1, Number(e.target.value) || 1))}
                className="flex-1 h-9 bg-stone-950/80 border border-stone-700 rounded-lg px-3 text-sm text-stone-200 text-center focus:outline-none focus:border-amber-600/50 transition-colors font-fantasy tracking-wider hide-arrows"
              />
              <button
                type="button"
                onClick={() => setDraftSession((v) => (Number(v) || 1) + 1)}
                className="h-9 w-9 rounded-lg border border-stone-700 bg-stone-950/70 text-stone-300 hover:text-amber-400 hover:border-amber-700/50 transition-colors"
                title="Volgende sessie"
              >
                +
              </button>
            </div>
          </div>

          {/* Session code + URL */}
          {sessionId ? (
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">
                Uitnodigingsgegevens
              </label>
              <div className="rounded-lg border border-stone-800 bg-stone-950/70 divide-y divide-stone-800/60">
                {/* Code row */}
                <div className="flex flex-col items-start gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-stone-500 mb-0.5">Sessiecode</div>
                      <div className="font-fantasy text-xs tracking-[0.14em] text-amber-300 truncate">{canonicalSessionCode}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(canonicalSessionCode, 'code')}
                    className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-md border border-stone-700 bg-stone-900 px-2.5 text-[10px] font-fantasy uppercase tracking-[0.12em] text-stone-400 transition-colors hover:bg-stone-800 hover:text-amber-300 sm:h-7 sm:w-auto"
                  >
                    <Copy className="h-3 w-3" />
                    {copyFeedback === 'code' ? 'Klaar!' : 'Kopieer'}
                  </button>
                </div>

                {/* URL row */}
                <div className="flex flex-col items-start gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-stone-500 mb-0.5">Join Link</div>
                      <div className="text-xs text-stone-400 truncate">{joinUrl}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(joinUrl, 'url')}
                    className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-md border border-stone-700 bg-stone-900 px-2.5 text-[10px] font-fantasy uppercase tracking-[0.12em] text-stone-400 transition-colors hover:bg-stone-800 hover:text-amber-300 sm:h-7 sm:w-auto"
                  >
                    <Copy className="h-3 w-3" />
                    {copyFeedback === 'url' ? 'Klaar!' : 'Kopieer'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Share via QR */}
          {sessionId ? (
            <button
              type="button"
              onClick={() => {
                onOpenShare?.();
                onClose();
              }}
              className="h-9 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-800/60 font-fantasy text-sm uppercase tracking-[0.14em] text-stone-300 transition-colors hover:bg-stone-700/60 hover:text-amber-300"
            >
              <Share2 className="h-4 w-4" />
              Deel via QR-code
            </button>
          ) : null}

          {/* Save */}
          <div className="-mt-1 flex justify-stretch pt-1 sm:justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-colors hover:from-amber-600 hover:to-amber-500 sm:w-auto"
            >
              <Save className="h-4 w-4" /> Opslaan
            </button>
          </div>
    </ModalFrame>
  );
}
