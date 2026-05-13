import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Copy, QrCode, Share2, X } from 'lucide-react';
import { buildSessionInviteUrl, toLegacyHashJoinTag, toSafeJoinTagForLink } from '../lib/sessionUtils';

const THEME_COLORS = {
  purple: { dot: '#a78bfa', corner: '#7c3aed', bg: '#0c0a0f' },
  amber:  { dot: '#f59e0b', corner: '#b45309', bg: '#0c0a09' },
  green:  { dot: '#4ade80', corner: '#15803d', bg: '#091209' },
};

function StyledQRCode({ value, theme }) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);
  const colors = THEME_COLORS[theme] || THEME_COLORS.amber;

  useEffect(() => {
    if (!value) return;

    const qr = new QRCodeStyling({
      width: 220,
      height: 220,
      type: 'svg',
      data: value,
      image: '/references/tomeVaultIcon-32.png',
      dotsOptions: {
        color: colors.dot,
        type: 'rounded',
      },
      cornersSquareOptions: {
        color: colors.corner,
        type: 'extra-rounded',
      },
      cornersDotOptions: {
        color: colors.dot,
        type: 'dot',
      },
      backgroundOptions: {
        color: colors.bg,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 6,
        imageSize: 0.28,
      },
      qrOptions: {
        errorCorrectionLevel: 'H',
      },
    });

    qrRef.current = qr;

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      qr.append(containerRef.current);
    }
  }, [value, theme, colors.dot, colors.corner, colors.bg]);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ width: 220, height: 220 }}
    />
  );
}

export default function ShareModal({ isOpen, onClose, sessionId, theme }) {
  const [copyFeedback, setCopyFeedback] = useState('');

  if (!isOpen) return null;

  const resolvedTheme = theme || 'amber';
  const canonicalSessionCode = toLegacyHashJoinTag(sessionId);
  const scannerSafeCode = toSafeJoinTagForLink(sessionId);
  const joinUrl = buildSessionInviteUrl(sessionId);
  const waText = `Sluit je aan bij mijn epische avontuur op TomeVault! 🐉\n\nSessie Code: *${canonicalSessionCode}*\n\nSpeel direct mee: ${joinUrl}`;

  const handleCopy = async (value, kind) => {
    await navigator.clipboard.writeText(value);
    setCopyFeedback(kind);
    window.setTimeout(() => setCopyFeedback(''), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/80 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-amber-900/40 bg-stone-900 shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-amber-500/10 blur-[50px] pointer-events-none" />
        
        <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-stone-800/50 p-4">
          <h3 className="font-fantasy font-bold text-stone-200 tracking-wider flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-400" /> Nodig Spelers Uit
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-rose-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto p-4 sm:p-6">
          <p className="text-stone-400 text-sm font-story text-center mb-6">
            Laat je spelers deze QR-code scannen of deel direct de veilige join-link voor deze sessie.
          </p>

          <div className="w-full rounded-xl border border-stone-800 bg-stone-950/80 px-4 py-3 mb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Sessiecode</div>
            <div className="mt-1 font-fantasy text-base tracking-[0.16em] text-amber-300">{canonicalSessionCode}</div>
            <div className="mt-2 text-xs leading-5 text-stone-500">QR-veilige variant: {scannerSafeCode}</div>
          </div>
          
          <div className="mb-6 flex w-full justify-center overflow-hidden">
            <StyledQRCode value={joinUrl} theme={resolvedTheme} />
          </div>

          <div className="w-full rounded-xl border border-stone-800 bg-stone-950/80 px-4 py-3 mb-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Join-link</div>
            <div className="mt-1 break-all text-xs leading-5 text-stone-300">{joinUrl}</div>
          </div>

          <div className="w-full space-y-3">
            <button 
              onClick={() => handleCopy(canonicalSessionCode, 'code')}
              className="h-9 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-200 transition-colors hover:bg-stone-800"
            >
              <Copy className="w-4 h-4" />
              {copyFeedback === 'code' ? 'Code gekopieerd' : 'Kopieer code'}
            </button>

            <button 
              onClick={() => handleCopy(joinUrl, 'link')}
              className="h-9 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-950 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-200 transition-colors hover:bg-stone-800"
            >
              <Copy className="w-4 h-4" />
              {copyFeedback === 'link' ? 'Link gekopieerd' : 'Kopieer link'}
            </button>

            <a 
              href={`https://wa.me/?text=${encodeURIComponent(waText)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="h-9 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-600 bg-amber-700 px-4 font-fantasy text-sm uppercase tracking-[0.16em] text-white transition-colors hover:bg-amber-600"
            >
              <Share2 className="w-4 h-4" />
              Delen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
