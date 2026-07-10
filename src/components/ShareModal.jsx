import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Copy, QrCode, Share2 } from 'lucide-react';
import { buildSessionInviteUrl, toLegacyHashJoinTag, toSafeJoinTagForLink } from '../lib/sessionUtils';
import { DEFAULT_THEME, getThemeQrColors } from '../lib/appThemes';
import ModalFrame from './ModalFrame';
import { useT } from '../i18n/useT';

function StyledQRCode({ value, theme, size }) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);
  const colors = getThemeQrColors(theme);

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
  const { t } = useT('session');
  const [copyFeedback, setCopyFeedback] = useState('');

  const resolvedTheme = theme || DEFAULT_THEME;
  const canonicalSessionCode = toLegacyHashJoinTag(sessionId);
  const joinUrl = buildSessionInviteUrl(sessionId);
  const waText = t('share.whatsappText', { code: canonicalSessionCode, url: joinUrl });
  
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
      title={t('share.title')}
      icon={QrCode}
      subtitle={t('share.subtitle')}
      maxWidthClassName="max-w-sm"
      bodyClassName="gap-4"
    >
      <div className="flex flex-col gap-4">
        <div className="tv-panel-block flex justify-center overflow-hidden p-3">
          <StyledQRCode value={joinUrl} theme={resolvedTheme} size={qrSize} />
        </div>

        <div className="tv-panel-block px-3.5 py-3">
          <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">{t('share.sessionCode')}</div>
          <div className="tv-accent mt-1.5 font-mono text-sm tracking-widest">{canonicalSessionCode}</div>
        </div>

        <div className="tv-panel-block px-3.5 py-3">
          <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">{t('share.joinLink')}</div>
          <div className="tv-text mt-1.5 break-all font-mono text-xs leading-relaxed">{joinUrl}</div>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          onClick={() => handleCopy(canonicalSessionCode, 'code')}
          className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copyFeedback === 'code' ? t('common:copyFeedback.copied') : t('share.copyCode')}
        </button>

        <button
          onClick={() => handleCopy(joinUrl, 'link')}
          className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copyFeedback === 'link' ? t('common:copyFeedback.copied') : t('share.copyLink')}
        </button>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tv-btn tv-button-primary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985] sm:col-span-2"
        >
          <Share2 className="h-3.5 w-3.5" />
          {t('share.whatsapp')}
        </a>
      </div>
    </ModalFrame>
  );
}
