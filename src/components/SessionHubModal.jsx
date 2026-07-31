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
  UserPlus,
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
import { useT } from '../i18n/useT';
import { confirmDialog } from '../i18n/dialogs';

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
  const { t } = useT('session');
  const resolvedTheme = theme || DEFAULT_THEME;
  const isGM = role === 'gm';
  const displayName = formatCampaignDisplayName(campaignName, t('common:fallbacks.campaign'));
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

  const hubTabs = useMemo(() => ([
    { value: 'overview', label: t('hub.tabs.overview') },
    { value: 'invite', label: t('hub.tabs.invite') },
    { value: 'manage', label: t('hub.tabs.manage') },
    { value: 'help', label: t('hub.tabs.help') },
  ]), [t]);

  const visibleTabs = useMemo(
    () => hubTabs.filter((tab) => tab.value !== 'manage' || isGM),
    [hubTabs, isGM]
  );

  const gmHelpItems = useMemo(
    () => t('hub.help.gmItems', { returnObjects: true }),
    [t]
  );
  const playerHelpItems = useMemo(
    () => t('hub.help.playerItems', { returnObjects: true }),
    [t]
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
        title: t('hub.shareTitle', { campaignName: displayName }),
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
        setManageError(t('hub.errors.emptyCampaignName'));
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
      setManageError(err?.message || t('hub.errors.saveFailed'));
    } finally {
      setManageBusy(false);
    }
  };

  const handleRollCode = async () => {
    if (!confirmDialog('session:hub.rollJoinCodeConfirm')) {
      return;
    }

    setManageError('');
    try {
      await onRollJoinCode?.();
    } catch (err) {
      setManageError(err?.message || t('hub.errors.rollFailed'));
    }
  };

  const roleLabel = isGM ? t('common:roles.gm') : t('common:roles.player');

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={t('hub.title')}
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
        aria-label={t('hub.tabsAria')}
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
                {t('hub.players')}
              </div>
              <div className="mt-2 text-2xl font-semibold tv-text">{activePlayerCount}</div>
            </div>
            <div className="tv-panel-block px-3.5 py-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
                <Shield className="h-3.5 w-3.5" />
                {t('hub.status')}
              </div>
              <div className="mt-2 text-sm font-medium tv-text">{t('hub.statusActive')}</div>
            </div>
          </div>

          <div className="tv-panel-block px-3.5 py-3">
            <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">{t('hub.joinCodeHint')}</div>
            <div className="mt-1.5 font-mono text-sm tracking-widest tv-accent">{canonicalSessionCode}</div>
          </div>

          {isGM ? (
            <button
              type="button"
              onClick={() => setActiveTab('invite')}
              className="tv-btn tv-button-primary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {activePlayerCount < 2 ? t('hub.invitePlayersCta') : t('hub.inviteMoreCta')}
            </button>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'invite' ? (
        <div className="flex flex-col gap-4">
          <div className="tv-panel-block px-3.5 py-3">
            <p className="text-sm leading-relaxed tv-text-sub">{t('hub.inviteLead')}</p>
            <p className="mt-1.5 text-xs leading-relaxed tv-muted">{t('hub.inviteHint')}</p>
          </div>

          <div className="tv-panel-block flex justify-center overflow-hidden p-3">
            <StyledQRCode value={joinUrl} theme={resolvedTheme} size={qrSize} />
          </div>

          <div className="tv-panel-block px-3.5 py-3">
            <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">{t('hub.inviteLink')}</div>
            <div className="tv-text mt-1.5 break-all font-mono text-xs leading-relaxed">{joinUrl}</div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleCopy(canonicalSessionCode, 'code')}
              className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyFeedback === 'code' ? t('common:copyFeedback.copied') : t('hub.copyCode')}
            </button>

            <button
              type="button"
              onClick={() => handleCopy(joinUrl, 'link')}
              className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyFeedback === 'link' ? t('common:copyFeedback.copied') : t('hub.copyLink')}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="tv-btn tv-button-primary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985] sm:col-span-2"
            >
              <Share2 className="h-3.5 w-3.5" />
              {copyFeedback === 'share'
                ? t('common:copyFeedback.copied')
                : (canNativeShare ? t('hub.shareNative') : t('hub.shareCopy'))}
            </button>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tv-btn tv-button-secondary tv-btn--block w-full gap-2 text-xs uppercase tracking-[0.14em] transition-all duration-200 ease-out active:scale-[0.985] sm:col-span-2"
            >
              <Share2 className="h-3.5 w-3.5" />
              {t('hub.whatsapp')}
            </a>
          </div>
        </div>
      ) : null}

      {activeTab === 'manage' && isGM ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="tv-label mb-2 block">{t('hub.campaignName')}</label>
            <input
              type="text"
              value={draftCampaignName}
              onChange={(e) => setDraftCampaignName(e.target.value)}
              maxLength={48}
              className="tv-field"
              placeholder={t('hub.campaignNamePlaceholder')}
            />
            <p className="tv-meta mt-1.5">{t('hub.campaignNameHint')}</p>
          </div>

          <div>
            <label className="tv-label mb-2 block">{t('hub.sessionNumber')}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftSessionNumber((v) => Math.max(1, Number(v || 1) - 1))}
                className="tv-toolbar-icon-btn tv-button-secondary transition-all duration-200 ease-out active:scale-[0.985]"
                title={t('hub.prevSession')}
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
                title={t('hub.nextSession')}
              >
                +
              </button>
            </div>
          </div>

          <div className="tv-panel-block px-3.5 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-[0.2em] tv-muted">{t('hub.currentJoinCode')}</div>
                <div className="mt-1 truncate font-mono text-sm tracking-widest tv-accent">{canonicalSessionCode}</div>
              </div>
              <button
                type="button"
                onClick={handleRollCode}
                disabled={joinCodeRolling}
                className="tv-btn tv-button-secondary shrink-0 gap-2 text-xs uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {joinCodeRolling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {t('hub.rollJoinCode')}
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
            {t('common:actions.save')}
          </button>
        </div>
      ) : null}

      {activeTab === 'help' ? (
        <div className="flex flex-col gap-4">
          <div className="tv-panel-block px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
              <LayoutDashboard className="h-3.5 w-3.5" />
              {t('hub.help.gmTitle')}
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--tv-text-secondary)]">
              {Array.isArray(gmHelpItems) ? gmHelpItems.map((item) => (
                <li key={item}>{item}</li>
              )) : null}
            </ul>
          </div>

          <div className="tv-panel-block px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">
              <HelpCircle className="h-3.5 w-3.5" />
              {t('hub.help.playerTitle')}
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--tv-text-secondary)]">
              {Array.isArray(playerHelpItems) ? playerHelpItems.map((item) => (
                <li key={item}>{item}</li>
              )) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </ModalFrame>
  );
}
