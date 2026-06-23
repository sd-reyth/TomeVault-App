import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Copy, QrCode, Share2 } from 'lucide-react';
import { buildSessionInviteUrl, toLegacyHashJoinTag, toSafeJoinTagForLink } from '../lib/sessionUtils';
import ModalFrame from './ModalFrame';

const QR_THEME_COLORS = {
  'dawn-parchment': { dot: '#9c6f2e', corner: '#7c5420', bg: '#f8f1e3' },
  'midnight-tome': { dot: '#9f7dff', corner: '#7c3aed', bg: '#171320' },
  'ember-forge': { dot: '#ff9d42', corner: '#c66514', bg: '#25160f' },
  'forest-scroll': { dot: '#6bc66b', corner: '#2f8f4d', bg: '#162019' },
  'blood-moon': { dot: '#ff6b86', corner: '#c41e3a', bg: '#1d1015' },
};

function StyledQRCode({ value, theme, size }) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);
  const colors = QR_THEME_COLORS[theme] || QR_THEME_COLORS['midnight-tome'];

  useEffect(() => {
    if (!value) return;

    const qr = new QRCodeStyling({
      width: size,
      height: size,
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
        margin: 8,
        imageSize: 0.32,
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
  }, [value, size, colors.dot, colors.corner, colors.bg]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] shadow-lg"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  );
}

export default function ShareModal({ isOpen, onClose, sessionId, theme }) {
  const [copyFeedback, setCopyFeedback] = useState('');

  const resolvedTheme = theme || 'midnight-tome';
  const canonicalSessionCode = toLegacyHashJoinTag(sessionId);
  const scannerSafeCode = toSafeJoinTagForLink(sessionId);
  const joinUrl = buildSessionInviteUrl(sessionId);
  const waText = `Sluit je aan bij mijn epische avontuur op TomeVault! 🐉\n\nSessie Code: *${canonicalSessionCode}*\n\nSpeel direct mee: ${joinUrl}`;
  
  const qrSize = useMemo(() => {
    if (typeof window === 'undefined') return 160;
    const h = window.innerHeight;
    if (h < 600) return 140;
    if (h < 800) return 160;
    return 176;
  }, []);

  const handleCopy = async (value, kind) => {
    await navigator.clipboard.writeText(value);
    setCopyFeedback(kind);
    window.setTimeout(() => setCopyFeedback(''), 2000);
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Deel sessie"
      icon={QrCode}
      subtitle="Scan of kopieer"
      maxWidthClassName="max-w-sm"
      bodyClassName="gap-4"
    >
      <div className="flex flex-col gap-4">
        <div className="tv-panel-block flex justify-center overflow-hidden p-3">
          <StyledQRCode value={joinUrl} theme={resolvedTheme} size={qrSize} />
        </div>

        <div className="tv-panel-block px-3.5 py-3">
          <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">Sessiecode</div>
          <div className="tv-accent mt-1.5 font-mono text-sm tracking-widest">{canonicalSessionCode}</div>
        </div>

        <div className="tv-panel-block px-3.5 py-3">
          <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">Join-link</div>
          <div className="tv-text mt-1.5 break-all font-mono text-xs leading-relaxed">{joinUrl}</div>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          onClick={() => handleCopy(canonicalSessionCode, 'code')}
          className="tv-button-secondary inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copyFeedback === 'code' ? 'Gekopieerd' : 'Code'}
        </button>

        <button
          onClick={() => handleCopy(joinUrl, 'link')}
          className="tv-button-secondary inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copyFeedback === 'link' ? 'Gekopieerd' : 'Link'}
        </button>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tv-button-primary inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-3 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985] sm:col-span-2"
        >
          <Share2 className="h-3.5 w-3.5" />
          WhatsApp Delen
        </a>
      </div>
    </ModalFrame>
  );
}
