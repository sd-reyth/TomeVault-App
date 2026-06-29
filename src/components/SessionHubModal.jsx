import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import {
  BookOpen,
  Copy,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Save,
  Share2,
  Shield,
  Users,
} from 'lucide-react';
import {
  buildInviteShareText,
  buildSessionInviteUrl,
  buildWhatsAppShareUrl,
  formatCampaignDisplayName,
  toLegacyHashJoinTag,
} from '../lib/sessionUtils';
import { DEFAULT_THEME, getThemeQrColors } from '../lib/appThemes';
import ModalFrame from './ModalFrame';
import SegmentedControl from '../ui/SegmentedControl';

function StyledQRCode({ value, theme, size }) {
  const containerRef = useRef(null);
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

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      qr.append(containerRef.current);
    }
  }, [value, size, colors.dot, colors.corner, colors.bg]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] shadow-lg"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  );
}

const HUB_TABS = [
  { value: 'overview', label: 'Overzicht' },
  { value: 'invite', label: 'Uitnodigen' },
  { value: 'manage', label: 'Beheer' },
  { value: 'help', label: 'Help' },
];

export default function SessionHubModal({
  isOpen,
  onClose,
  role,
  campaignName,
  sessionId,
  sessionNumber,
  activePlayerCount = 0,
  theme,
  initialTab = 'overview',
  onSaveSessionNumber,
  onSaveCampaignName,
  onRollJoinCode,
  joinCodeRolling = false,
}) {
  const resolvedTheme = theme || DEFAULT_THEME;
  const isGM = role === 'gm';
  const displayName = formatCampaignDisplayName(campaignName, 'Campagne');
  const canonicalSessionCode = toLegacyHashJoinTag(sessionId || '');
  const joinUrl = buildSessionInviteUrl(sessionId || '');
  const shareText = buildInviteShareText({
    campaignName: displayName,
    joinTag: sessionId,
    joinUrl,
  });
  const whatsAppUrl = buildWhatsAppShareUrl({
    campaignName: displayName,
    joinTag: sessionId,
    joinUrl,
  });
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [draftSessionNumber, setDraftSessionNumber] = useState(Math.max(1, Number(sessionNumber) || 1));
  const [draftCampaignName, setDraftCampaignName] = useState(displayName);
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState('');

  const visibleTabs = useMemo(
    () => HUB_TABS.filter((tab) => tab.value !== 'manage' || isGM),
    [isGM]
  );

  const qrSize = useMemo(() => {
    if (typeof window === 'undefined') return 160;
    const h = window.innerHeight;
    if (h < 600) return 140;
    if (h < 800) return 160;
    return 176;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setDraftSessionNumber(Math.max(1, Number(sessionNumber) || 1));
    setDraftCampaignName(displayName);
    setCopyFeedback('');
    setManageError('');
  }, [displayName, initialTab, isOpen, sessionNumber]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'manage' && !isGM) {
      setActiveTab('overview');
    }
  }, [activeTab, isGM, isOpen]);

  const handleCopy = async (value, kind) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(kind);
      window.setTimeout(() => setCopyFeedback(''), 2000);
    } catch (_) {
      setCopyFeedback('fout');
      window.setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      await handleCopy(shareText, 'share');
      return;
    }

    try {
      await navigator.share({
        title: `${displayName} · TomeVault`,
        text: shareText,
        url: joinUrl,
      });
    } catch (err) {
      if (err?.name !== 'AbortError') {
        await handleCopy(shareText, 'share');
      }
    }
  };

  const handleSaveManage = async () => {
    setManageError('');
    setManageBusy(true);

    try {
      const trimmedName = draftCampaignName.trim();
      if (!trimmedName) {
        setManageError('Campagnenaam mag niet leeg zijn.');
        return;
      }

      if (trimmedName !== displayName) {
        await onSaveCampaignName?.(trimmedName);
      }

      const safeNumber = Math.max(1, Number(draftSessionNumber) || 1);
      if (safeNumber !== Math.max(1, Number(sessionNumber) || 1)) {
        await onSaveSessionNumber?.(safeNumber);
      }
    } catch (err) {
      setManageError(err?.message || 'Opslaan is mislukt.');
    } finally {
      setManageBusy(false);
    }
  };

  const handleRollCode = async () => {
    if (!window.confirm('Nieuwe join-code genereren? Oude links blijven niet meer werken.')) {
      return;
    }

    setManageError('');
    try {
      await onRollJoinCode?.();
    } catch (err) {
      setManageError(err?.message || 'Join-code vernieuwen is mislukt.');
    }
  };

  const roleLabel = isGM ? 'Game Master' : 'Speler';

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Campaign Hub"
      icon={BookOpen}
      subtitle={displayName}
      maxWidthClassName="max-w-lg"
      bodyClassName="gap-5 !py-4"
    >
      <SegmentedControl
        value={activeTab}
        options={visibleTabs}
        onChange={setActiveTab}
        block
        aria-label="Campaign hub secties"
      />

      {activeTab === 'overview' ? (
        <div className="flex flex-col gap-4">
          <div className="tv-panel-block px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="tv-session-trigger__crest shrink-0">#{Math.max(1, Number(sessionNumber) || 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-fantasy text-lg tracking-[0.04em] tv-text">{displayName}</div>
                <div className="mt-1 text-sm text-[color:var(--tv-text-secondary)]">{roleLabel}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="tv-panel-block px-3.5 py-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
                <Users className="h-3.5 w-3.5" />
                Spelers
              </div>
              <div className="mt-2 text-2xl font-semibold tv-text">{activePlayerCount}</div>
            </div>
            <div className="tv-panel-block px-3.5 py-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
                <Shield className="h-3.5 w-3.5" />
                Status
              </div>
              <div className="mt-2 text-sm font-medium tv-text">Actief · join open</div>
            </div>
          </div>

          <div className="tv-panel-block px-3.5 py-3">
            <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">Join-code (alleen indien nodig)</div>
            <div className="mt-1.5 font-mono text-sm tracking-widest tv-accent">{canonicalSessionCode}</div>
          </div>
        </div>
      ) : null}

      {activeTab === 'invite' ? (
        <div className="flex flex-col gap-4">
          <div className="tv-panel-block flex justify-center overflow-hidden p-3">
            <StyledQRCode value={joinUrl} theme={resolvedTheme} size={qrSize} />
          </div>

          <div className="tv-panel-block px-3.5 py-3">
            <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">Invite-link</div>
            <div className="tv-text mt-1.5 break-all font-mono text-xs leading-relaxed">{joinUrl}</div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleCopy(canonicalSessionCode, 'code')}
              className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyFeedback === 'code' ? 'Gekopieerd' : 'Code'}
            </button>

            <button
              type="button"
              onClick={() => handleCopy(joinUrl, 'link')}
              className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyFeedback === 'link' ? 'Gekopieerd' : 'Link'}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="tv-btn tv-button-primary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985] sm:col-span-2"
            >
              <Share2 className="h-3.5 w-3.5" />
              {copyFeedback === 'share' ? 'Gekopieerd' : (canNativeShare ? 'Deel via systeem' : 'Deeltekst kopiëren')}
            </button>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985] sm:col-span-2"
            >
              <Share2 className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        </div>
      ) : null}

      {activeTab === 'manage' && isGM ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="tv-label mb-2 block">Campagnenaam</label>
            <input
              type="text"
              value={draftCampaignName}
              onChange={(e) => setDraftCampaignName(e.target.value)}
              maxLength={48}
              className="tv-field"
              placeholder="Bijv. Schaduw van de Draken"
            />
            <p className="tv-meta mt-1.5">Wijzigt alleen de weergavenaam — je sessiedata blijft intact.</p>
          </div>

          <div>
            <label className="tv-label mb-2 block">Sessienummer</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftSessionNumber((v) => Math.max(1, Number(v || 1) - 1))}
                className="tv-toolbar-icon-btn tv-button-secondary transition-all duration-200 ease-out active:scale-[0.985]"
                title="Vorige sessie"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={Math.max(1, Number(draftSessionNumber) || 1)}
                onChange={(e) => setDraftSessionNumber(Math.max(1, Number(e.target.value) || 1))}
                className="tv-input-surface tv-chat-compose-input hide-arrows flex-1 px-3 text-center text-sm tracking-[0.12em] transition-colors focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDraftSessionNumber((v) => (Number(v) || 1) + 1)}
                className="tv-toolbar-icon-btn tv-button-secondary transition-all duration-200 ease-out active:scale-[0.985]"
                title="Volgende sessie"
              >
                +
              </button>
            </div>
          </div>

          <div className="tv-panel-block px-3.5 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">Huidige join-code</div>
                <div className="mt-1 truncate font-mono text-sm tracking-widest tv-accent">{canonicalSessionCode}</div>
              </div>
              <button
                type="button"
                onClick={handleRollCode}
                disabled={joinCodeRolling}
                className="tv-btn tv-button-secondary shrink-0 gap-2 text-xs uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {joinCodeRolling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Opnieuw rollen
              </button>
            </div>
          </div>

          {manageError ? (
            <p className="rounded-lg tv-tone-enemy-surface px-4 py-2.5 font-story text-sm">{manageError}</p>
          ) : null}

          <button
            type="button"
            onClick={handleSaveManage}
            disabled={manageBusy}
            className="tv-btn tv-button-primary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {manageBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Opslaan
          </button>
        </div>
      ) : null}

      {activeTab === 'help' ? (
        <div className="flex flex-col gap-4">
          <div className="tv-panel-block px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Game Master
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--tv-text-secondary)]">
              <li>Deel via QR of invite-link in het tabblad Uitnodigen.</li>
              <li>Pas campagnenaam en sessienummer aan onder Beheer.</li>
              <li>Roll de join-code opnieuw als een oude link gelekt is.</li>
            </ul>
          </div>

          <div className="tv-panel-block px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
              <HelpCircle className="h-3.5 w-3.5" />
              Speler
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--tv-text-secondary)]">
              <li>Scan de QR-code of open de invite-link op je telefoon.</li>
              <li>Log in met Google of e-mail — daarna kies je je karakternaam.</li>
              <li>Je komt direct in de campagne zonder PIN via QR-uitnodiging.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </ModalFrame>
  );
}
