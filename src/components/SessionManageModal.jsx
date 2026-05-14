import React, { useEffect, useState } from 'react';
import { Copy, Share2, Hash, Link, Save } from 'lucide-react';
import { buildSessionInviteUrl, toLegacyHashJoinTag, toSafeJoinTagForLink } from '../lib/sessionUtils';
import ModalFrame from './ModalFrame';

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
  const scannerSafeCode = toSafeJoinTagForLink(sessionId || '');
  const joinUrl = buildSessionInviteUrl(sessionId || '');
  const accent = theme === 'purple' ? 'purple' : (theme === 'green' ? 'emerald' : 'amber');
  const actionClass = theme === 'purple'
    ? 'border-violet-500/35 bg-gradient-to-r from-violet-700 to-violet-600 hover:from-violet-600 hover:to-violet-500 hover:shadow-violet-700/40'
    : (theme === 'green'
      ? 'border-emerald-500/35 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-700/40'
      : 'border-amber-500/35 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 hover:shadow-amber-700/40');
  const codeColor = theme === 'purple' ? 'text-violet-300' : (theme === 'green' ? 'text-emerald-300' : 'text-amber-300');

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
      accent={accent}
      bodyClassName="gap-5"
    >

          {/* Session number stepper */}
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Campagne Sessienummer
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftSession((v) => Math.max(1, Number(v || 1) - 1))}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-stone-300 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985]"
                title="Vorige sessie"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={Math.max(1, Number(draftSession) || 1)}
                onChange={(e) => setDraftSession(Math.max(1, Number(e.target.value) || 1))}
                className="hide-arrows h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-center text-sm tracking-[0.12em] text-stone-100 transition-colors focus:border-amber-500/50 focus:bg-white/7 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDraftSession((v) => (Number(v) || 1) + 1)}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-stone-300 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985]"
                title="Volgende sessie"
              >
                +
              </button>
            </div>
          </div>

          {/* Session code + URL */}
          {sessionId ? (
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Uitnodigingsgegevens
              </label>
              <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
                {/* Code row */}
                <div className="flex flex-col items-start gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[9px] uppercase tracking-[0.2em] text-stone-500">Sessiecode</div>
                      <div className={`truncate text-xs tracking-[0.14em] ${codeColor}`}>{canonicalSessionCode}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(canonicalSessionCode, 'code')}
                    className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[10px] uppercase tracking-[0.12em] text-stone-300 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985] sm:h-8 sm:w-auto"
                  >
                    <Copy className="h-3 w-3" />
                    {copyFeedback === 'code' ? 'Klaar!' : 'Kopieer'}
                  </button>
                </div>

                {/* URL row */}
                <div className="flex flex-col items-start gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <Link className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[9px] uppercase tracking-[0.2em] text-stone-500">Join Link</div>
                      <div className="truncate text-xs text-stone-300">{joinUrl}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(joinUrl, 'url')}
                    className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[10px] uppercase tracking-[0.12em] text-stone-300 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985] sm:h-8 sm:w-auto"
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
              <button
                type="button"
                onClick={() => {
                  onOpenShare?.();
                  onClose();
                }}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm uppercase tracking-[0.14em] text-stone-300 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985]"
              >
                <Share2 className="h-4 w-4" />
                Deel via QR-code
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-all duration-200 ease-out hover:shadow-lg active:scale-[0.985] ${actionClass}`}
            >
              <Save className="h-4 w-4" /> Opslaan
            </button>
          </div>
    </ModalFrame>
  );
}
