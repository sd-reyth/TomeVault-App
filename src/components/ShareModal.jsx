import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Copy, QrCode, Share2 } from 'lucide-react';
import { buildSessionInviteUrl, toLegacyHashJoinTag, toSafeJoinTagForLink } from '../lib/sessionUtils';
import ModalFrame from './ModalFrame';

const THEME_COLORS = {
  purple: { dot: '#a78bfa', corner: '#7c3aed', bg: '#0c0a0f' },
  amber:  { dot: '#f59e0b', corner: '#b45309', bg: '#0c0a09' },
  green:  { dot: '#4ade80', corner: '#15803d', bg: '#091209' },
};

const THEME_UI = {
  purple: {
    accent: 'purple',
    code: 'text-violet-300',
    card: 'border-violet-400/20 bg-violet-500/5',
    subtle: 'text-violet-200/80',
    primaryAction: 'border-violet-400/25 bg-gradient-to-r from-violet-700 to-violet-600 hover:from-violet-600 hover:to-violet-500 hover:shadow-violet-700/30',
  },
  amber: {
    accent: 'amber',
    code: 'text-amber-300',
    card: 'border-amber-400/20 bg-amber-500/5',
    subtle: 'text-amber-200/80',
    primaryAction: 'border-amber-500/25 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 hover:shadow-amber-700/30',
  },
  green: {
    accent: 'emerald',
    code: 'text-emerald-300',
    card: 'border-emerald-400/20 bg-emerald-500/5',
    subtle: 'text-emerald-200/80',
    primaryAction: 'border-emerald-500/25 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-700/30',
  },
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
      className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.34)]"
      style={{ width: 220, height: 220 }}
    />
  );
}

export default function ShareModal({ isOpen, onClose, sessionId, theme }) {
  const [copyFeedback, setCopyFeedback] = useState('');

  const resolvedTheme = theme || 'amber';
  const ui = THEME_UI[resolvedTheme] || THEME_UI.amber;
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
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Nodig spelers uit"
      icon={QrCode}
      subtitle="Laat je spelers deze QR-code scannen of deel direct de veilige join-link voor deze sessie."
      accent={ui.accent}
      bodyClassName="items-center gap-4"
    >
          <div className={`w-full rounded-2xl border px-4 py-3 ${ui.card}`}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Sessiecode</div>
            <div className={`mt-1 text-base tracking-[0.16em] ${ui.code}`}>{canonicalSessionCode}</div>
            <div className="mt-2 text-xs leading-5 text-stone-500">QR-veilige variant: <span className={ui.subtle}>{scannerSafeCode}</span></div>
          </div>
          
          <div className="flex w-full justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-3">
            <StyledQRCode value={joinUrl} theme={resolvedTheme} />
          </div>

          <div className={`w-full rounded-2xl border px-4 py-3 ${ui.card}`}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Join-link</div>
            <div className="mt-1 break-all text-xs leading-5 text-stone-300">{joinUrl}</div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <button 
              onClick={() => handleCopy(canonicalSessionCode, 'code')}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm uppercase tracking-[0.16em] text-stone-200 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985]"
            >
              <Copy className="h-4 w-4" />
              {copyFeedback === 'code' ? 'Code gekopieerd' : 'Kopieer code'}
            </button>

            <button 
              onClick={() => handleCopy(joinUrl, 'link')}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm uppercase tracking-[0.16em] text-stone-200 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985]"
            >
              <Copy className="h-4 w-4" />
              {copyFeedback === 'link' ? 'Link gekopieerd' : 'Kopieer link'}
            </button>

            <a 
              href={`https://wa.me/?text=${encodeURIComponent(waText)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm uppercase tracking-[0.16em] text-white transition-all duration-200 ease-out hover:shadow-lg active:scale-[0.985] sm:col-span-2 ${ui.primaryAction}`}
            >
              <Share2 className="h-4 w-4" />
              Delen
            </a>
          </div>
    </ModalFrame>
  );
}
