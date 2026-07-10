import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, Palette, Pencil, Trash2, X, Check, CornerUpLeft, SendHorizontal, Dice5 } from 'lucide-react';
import DiceRollerSheet from './DiceRollerSheet';
import TvImage from './TvImage';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';
import { buildChatAvatarLookup, canDeleteChatMessage, canEditChatMessage, resolveChatSenderProfile } from '../lib/chatUtils';
import { diceMessageHasNat20 } from '../lib/uiFeedback';
import { getChatAvatarObjectPosition, resolveDisplayAvatar } from '../lib/placeholders';
import DiceIcon, { DiceMultipleIcon } from '../ui/DiceIcon';
import { useT } from '../i18n/useT';

const CHAT_COLORS = [
  { id: 'indigo',   bg: '#2d285f', border: '#6366f1', text: '#f1f5ff', swatch: '#818cf8' },
  { id: 'violet',   bg: '#3a1f63', border: '#8b5cf6', text: '#f5f3ff', swatch: '#a78bfa' },
  { id: 'sky',      bg: '#114169', border: '#0ea5e9', text: '#f0f9ff', swatch: '#38bdf8' },
  { id: 'emerald',  bg: '#0e4a2b', border: '#10b981', text: '#ecfdf5', swatch: '#34d399' },
  { id: 'lime',     bg: '#2e4a0b', border: '#84cc16', text: '#f7fee7', swatch: '#a3e635' },
  { id: 'amber',    bg: '#5a2e08', border: '#f59e0b', text: '#fff7ed', swatch: '#fbbf24' },
  { id: 'orange',   bg: '#5a220b', border: '#f97316', text: '#fff7ed', swatch: '#fb923c' },
  { id: 'rose',     bg: '#63122d', border: '#f43f5e', text: '#fff1f2', swatch: '#fb7185' },
  { id: 'pink',     bg: '#68163b', border: '#ec4899', text: '#fdf2f8', swatch: '#f472b6' },
  { id: 'fuchsia',  bg: '#5e1366', border: '#d946ef', text: '#fdf4ff', swatch: '#e879f9' },
  { id: 'cyan',     bg: '#0f4a5f', border: '#22d3ee', text: '#ecfeff', swatch: '#67e8f9' },
];

function getColor(colorId) {
  return CHAT_COLORS.find(c => c.id === colorId) || CHAT_COLORS[0];
}

function isKnownChatColor(colorId) {
  return CHAT_COLORS.some((color) => color.id === colorId);
}

function getStoredChatColor(fallback = null) {
  const stored = String(safeLocalStorageGet('tv_chatcolor', '') || '').trim();
  if (isKnownChatColor(stored)) return stored;
  return isKnownChatColor(fallback) ? fallback : null;
}

const CHAT_DICE_ICON_COLORS = {
  4: '#60a5fa',
  6: '#34d399',
  8: '#a78bfa',
  10: '#f59e0b',
  12: '#fb7185',
  20: '#22d3ee',
  100: '#f97316',
};

function ChatDiceIcon({ sides, className = 'w-4 h-4' }) {
  const iconColor = CHAT_DICE_ICON_COLORS[sides] || '#f59e0b';
  return <DiceIcon sides={sides} className={className} style={{ color: iconColor }} />;
}

function parseDiceMessage(text) {
  if (typeof text !== 'string') return null;

  const legacyDiceRollRegex = /^rolt (\d+)d(\d+): \[([\d,\s]+)\] = (\d+)$/i;
  const legacyMatch = text.match(legacyDiceRollRegex);
  if (legacyMatch) {
    const [, count, sides, rollsStr, total] = legacyMatch;
    const rolls = rollsStr
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      total: Number(total),
      lines: [{
        raw: `${count}d${sides}`,
        count: Number(count),
        sides: Number(sides),
        rolls,
      }],
    };
  }

  const groupedDiceRollRegex = /^🎲\s*(\d+)!\n(.+)$/i;
  const groupedMatch = text.match(groupedDiceRollRegex);
  if (!groupedMatch) return null;

  const [, total, breakdown] = groupedMatch;
  const lines = breakdown
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const lineMatch = line.match(/^(\d+)d(\d+)\s*=\s*(.+)$/i);
      if (!lineMatch) return { raw: line, sides: null };

      const rolls = String(lineMatch[3] || '')
        .split('+')
        .map((part) => part.trim())
        .filter(Boolean);

      return {
        raw: `${lineMatch[1]}d${lineMatch[2]}`,
        count: Number(lineMatch[1]),
        sides: Number(lineMatch[2]),
        rolls,
      };
    });

  return {
    total: Number(total),
    lines,
  };
}

function ChatMessageAvatar({ profile, author, accent, senderKey }) {
  const avatarSrc = resolveDisplayAvatar(profile.avatar, senderKey);

  return (
    <div
      className="tv-chat-avatar tv-image-frame shrink-0"
      style={{ border: `2px solid color-mix(in srgb, ${accent.swatch}, transparent 12%)` }}
      title={author}
    >
      <TvImage
        src={avatarSrc}
        alt={author}
        className="h-full w-full"
        style={{ objectPosition: getChatAvatarObjectPosition(profile.avatarPosition) }}
      />
    </div>
  );
}

function ChatView({ chat, setChat, role, uid, playerName, preferredChatColor, theme, party = [], onSendMessageRemote, onEditMessage, onDeleteMessage, onChangeColor }) {
  const { t } = useT('chat');
  const [msg, setMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatColor, setChatColor] = useState(() => getStoredChatColor(preferredChatColor));
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [showDicePopover, setShowDicePopover] = useState(false);
  const [expandedDiceMessages, setExpandedDiceMessages] = useState({});
  const chatEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [chat]);

  useEffect(() => {
    const syncedColor = getStoredChatColor(preferredChatColor);
    if (!syncedColor || syncedColor === chatColor) return;

    setChatColor(syncedColor);
    safeLocalStorageSet('tv_chatcolor', syncedColor);
    setShowColorPicker(false);
  }, [chatColor, preferredChatColor]);

  // Auto-show color picker on first open if no color chosen
  useEffect(() => {
    if (!chatColor) setShowColorPicker(true);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!activeMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeMenu]);

  // Colors already taken by other users
  const occupiedColors = new Set(
    chat.filter(c => c.uid && c.uid !== uid && c.color).map(c => c.color)
  );
  const selfAuthor = role === 'gm' ? 'GM' : (playerName || t('common:roles.playerShort'));
  const avatarLookup = useMemo(() => buildChatAvatarLookup(party), [party]);

  useEffect(() => {
    if (!editingMsg) return undefined;

    const checkEditable = () => {
      const message = chat.find((entry) => entry.id === editingMsg.id);
      if (!message || !canEditChatMessage(message, chat, uid, selfAuthor)) {
        setEditingMsg(null);
        setMsg('');
      }
    };

    checkEditable();
    const timer = window.setInterval(checkEditable, 15_000);
    return () => window.clearInterval(timer);
  }, [chat, editingMsg, selfAuthor, uid]);

  const buildOptimisticMessage = ({ text, replyTo, color, author }) => {
    const now = new Date();
    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      optimistic: {
        id: `tmp-${Date.now()}`,
        clientMessageId,
        uid,
        author,
        text,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        ms: now.getTime(),
        color,
        replyTo,
      },
      clientMessageId,
    };
  };

  const sendMessage = async ({ text, replyTo }) => {
    if (!text || isSending) return false;
    if (!chatColor) {
      setShowColorPicker(true);
      return false;
    }

    const author = selfAuthor;
    const { optimistic, clientMessageId } = buildOptimisticMessage({
      text,
      replyTo: replyTo || null,
      color: chatColor,
      author,
    });

    setChat(prev => [...prev, optimistic]);
    setReplyingTo(null);

    if (onSendMessageRemote) {
      try {
        setIsSending(true);
        await onSendMessageRemote({ text, color: chatColor, replyTo: replyTo || null, clientMessageId });
      } catch (err) {
        console.error('Chat versturen mislukt:', err);
      } finally {
        setIsSending(false);
      }
    }

    return true;
  };

  const handleRollDice = async (payload) => {
    const lines = Array.isArray(payload?.lines) ? payload.lines : [];
    if (!lines.length) return;

    let rollText = '';
    if (lines.length === 1) {
      const line = lines[0];
      rollText = `rolt ${line.count}d${line.sides}: [${line.rolls.join(', ')}] = ${payload.total}`;
    } else {
      const breakdown = lines.map((line) => `${line.count}d${line.sides} = ${line.rolls.join(' + ')}`).join(' | ');
      rollText = `🎲 ${payload.total}!\n${breakdown}`;
    }

    const didSend = await sendMessage({ text: rollText, replyTo: replyingTo || null });
    if (didSend) {
      setShowDicePopover(false);
    }
  };

  const handleColorSelect = async (colorId) => {
    if (occupiedColors.has(colorId)) return;

    // Immediate UI update for current user's full chat history.
    setChat((prev) => prev.map((msg) => {
      const mineByUid = msg.uid && msg.uid === uid;
      const mineLegacy = !msg.uid && msg.author === selfAuthor;
      return mineByUid || mineLegacy ? { ...msg, color: colorId } : msg;
    }));
    setChatColor(colorId);
    safeLocalStorageSet('tv_chatcolor', colorId);
    setShowColorPicker(false);

    try {
      await onChangeColor?.(colorId);
    } catch (err) {
      console.error('Chat kleur bijwerken mislukt:', err);
    }
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    const text = msg.trim();
    if (!text || isSending) return;

    if (editingMsg) {
      const message = chat.find((entry) => entry.id === editingMsg.id);
      if (!message || !canEditChatMessage(message, chat, uid, selfAuthor)) {
        setEditingMsg(null);
        setMsg('');
        return;
      }

      setChat(prev => prev.map(c => c.id === editingMsg.id ? { ...c, text } : c));
      onEditMessage?.(editingMsg.id, text);
      setEditingMsg(null);
      setMsg('');
      return;
    }
    setMsg('');
    await sendMessage({ text, replyTo: replyingTo || null });
  };

  const handleBubbleClick = (message) => {
    setActiveMenu(prev => prev === message.id ? null : message.id);
  };

  const startEdit = (message) => {
    if (!canEditChatMessage(message, chat, uid, selfAuthor)) return;

    setEditingMsg({ id: message.id, text: message.text });
    setMsg(message.text);
    setActiveMenu(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const startReply = (message) => {
    setReplyingTo({ author: message.author, text: message.text });
    setActiveMenu(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleDelete = (message) => {
    if (!canDeleteChatMessage(message, role, uid, selfAuthor)) return;
    setChat(prev => prev.filter(c => c.id !== message.id));
    onDeleteMessage?.(message.id);
    setActiveMenu(null);
  };

  const cancelEdit = () => { setEditingMsg(null); setMsg(''); };

  const toggleDiceMessageExpansion = (messageId) => {
    setExpandedDiceMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  return (
    <div className="tv-view-shell relative z-10 h-full">
      <div className="tv-view-shell-header flex shrink-0 flex-row items-center justify-between gap-2 p-3 md:p-4">
        <h2 className="flex min-w-0 items-center gap-2 text-xs font-medium font-fantasy uppercase tracking-[0.18em] tv-text md:text-sm">
          <MessageSquare className="tv-view-title-icon" /> {t('view.title')}
        </h2>
        <button
          onClick={() => setShowColorPicker(true)}
          className="tv-toolbar__btn tv-panel-inset tv-text tv-hover-surface hover:tv-text shrink-0 gap-1.5 px-2.5 active:scale-[0.985]"
          title={t('view.pickColor')}
        >
          {chatColor
            ? <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getColor(chatColor).swatch, boxShadow: `0 0 6px ${getColor(chatColor).swatch}88` }} />
            : <Palette className="w-3.5 h-3.5" />
          }
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {chatColor ? t(`colors.${chatColor}`) : t('view.color')}
          </span>
        </button>
      </div>

      {/* Color picker overlay */}
      {showColorPicker && (
        <div className="tv-backdrop absolute inset-0 z-30 flex items-start justify-center overflow-y-auto p-3 backdrop-blur-md sm:p-4">
          <div className="tv-surface my-auto w-full max-w-sm shrink-0 rounded-3xl p-4 sm:p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm uppercase tracking-[0.18em] tv-text">{t('view.chooseColor')}</h3>
              {chatColor && (
                <button onClick={() => setShowColorPicker(false)} className="rounded-full p-1 tv-muted transition-colors hover:tv-panel-inset hover:tv-text">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="mb-4 text-xs italic tv-muted">
              {role === 'gm' ? t('view.gmColorHint') : t('view.occupiedHint')}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CHAT_COLORS.map(c => {
                const occupied = occupiedColors.has(c.id);
                const isActive = chatColor === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => !occupied && handleColorSelect(c.id)}
                    title={t(`colors.${c.id}`) + (occupied ? t('view.occupiedSuffix') : '')}
                    disabled={occupied}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border p-2 transition-all duration-200 ease-out ${
                      isActive
                        ? 'tv-chip-selected shadow-lg'
                        : occupied
                        ? 'cursor-not-allowed tv-border-faint opacity-25'
                        : 'cursor-pointer border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:tv-border-emphasis tv-hover-surface'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: c.swatch, boxShadow: `0 0 10px ${c.swatch}66` }}
                    />
                    <span className="w-full truncate text-center text-[8px] font-medium uppercase leading-none tv-text-sub">{t(`colors.${c.id}`)}</span>
                    {isActive && (
                      <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full tv-surface-raised shadow">
                        <Check className="w-2 h-2" strokeWidth={3} style={{ color: 'var(--tv-bg-canvas)' }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="tv-view-shell-body relative z-10 flex-1 overflow-y-auto px-3 py-4 no-scrollbar md:px-5">
        {chat.length === 0 && (
          <div className="tv-empty-state mx-auto my-8 max-w-md">
            <p className="tv-empty-state-title">{t('view.emptyTitle')}</p>
            <p className="text-sm">{t('view.emptyHint')} <span className="font-mono">roll d20</span>.</p>
          </div>
        )}
        {chat.map((c, i) => {
          const isOwn = (c.uid && c.uid === uid) || (!c.uid && c.author === selfAuthor);
          const cs = getColor(c.color);
          const prevMsg = i > 0 ? chat[i - 1] : null;
          const nextMsg = i < chat.length - 1 ? chat[i + 1] : null;
          const senderKey = c.uid || `author:${c.author || 'unknown'}`;
          const prevKey = prevMsg ? (prevMsg.uid || `author:${prevMsg.author || 'unknown'}`) : null;
          const nextKey = nextMsg ? (nextMsg.uid || `author:${nextMsg.author || 'unknown'}`) : null;
          const timeBreakFromPrev = prevMsg && Math.abs(Number(c.ms || 0) - Number(prevMsg.ms || 0)) > 90 * 1000;
          const timeBreakToNext = nextMsg && Math.abs(Number(nextMsg.ms || 0) - Number(c.ms || 0)) > 90 * 1000;
          const showHeader = !prevMsg || prevKey !== senderKey || timeBreakFromPrev;
          const isLastInGroup = !nextMsg || nextKey !== senderKey || timeBreakToNext;
          const canEdit = isOwn && canEditChatMessage(c, chat, uid, selfAuthor);
          const canDelete = canDeleteChatMessage(c, role, uid, selfAuthor);
          const senderProfile = resolveChatSenderProfile(c, avatarLookup);

          return (
            <div
              key={c.id}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${showHeader ? 'mt-4' : 'mt-0.5'}`}
            >
              {/* Author + time header */}
              {showHeader && (
                <div className={`mb-1 flex items-center gap-2 px-1 ${isOwn ? 'mr-10 flex-row-reverse' : 'ml-10'}`}>
                  <span className="text-[10px] font-medium tracking-[0.14em] md:text-xs" style={{ color: cs.swatch }}>
                    {c.author}
                  </span>
                  <span className="text-[8px] tv-muted md:text-[9px]">{c.date ? `${c.date} • ${c.time}` : c.time}</span>
                </div>
              )}

              {/* Avatar + bubble */}
              <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[82%] md:max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                {isLastInGroup ? (
                  <ChatMessageAvatar
                    profile={senderProfile}
                    author={c.author}
                    accent={cs}
                    senderKey={senderKey}
                  />
                ) : (
                  <div className="tv-chat-avatar-spacer shrink-0" aria-hidden="true" />
                )}

                {/* Bubble + context menu */}
                <div className="relative min-w-0 flex-1">
                <div
                  onClick={() => handleBubbleClick(c)}
                  className={`cursor-pointer select-none px-3 py-1.5 text-sm leading-normal shadow-sm transition-transform duration-150 active:scale-[0.985] md:px-3.5 md:py-2
                    ${isOwn
                      ? isLastInGroup ? 'rounded-t-2xl rounded-bl-2xl rounded-br-md' : 'rounded-2xl'
                      : isLastInGroup ? 'rounded-t-2xl rounded-br-2xl rounded-bl-md' : 'rounded-2xl'
                    }
                  `}
                  style={{
                    backgroundColor: cs.bg,
                    color: cs.text,
                    border: `1px solid ${cs.border}88`,
                  }}
                >
                  {/* Reply quote */}
                  {c.replyTo && (
                    <div
                      className="mb-2 rounded-lg px-2 py-1 text-[11px] italic opacity-90"
                      style={{ borderLeft: `2px solid ${cs.swatch}`, backgroundColor: 'rgba(255,255,255,0.12)' }}
                    >
                      <span className="font-bold not-italic text-[10px] block mb-0.5" style={{ color: cs.swatch }}>{c.replyTo.author}</span>
                      <span className="line-clamp-2">{c.replyTo.text}</span>
                    </div>
                  )}

                  {(() => {
                    const parsedDiceMessage = parseDiceMessage(c.text);
                    if (parsedDiceMessage) {
                      const isExpanded = expandedDiceMessages[c.id] === true;
                      const maxCollapsedLines = 2;
                      const maxCollapsedRollsPerLine = 3;
                      const hasOverflow = parsedDiceMessage.lines.length > maxCollapsedLines
                        || parsedDiceMessage.lines.some((line) => (Array.isArray(line.rolls) ? line.rolls.length : 0) > maxCollapsedRollsPerLine)
                        || parsedDiceMessage.lines.some((line) => String(line.raw || '').length > 20);
                      const visibleLines = isExpanded ? parsedDiceMessage.lines : parsedDiceMessage.lines.slice(0, 2);
                      const isNat20 = diceMessageHasNat20(parsedDiceMessage);

                      return (
                        <div className={`mx-auto w-[262px] max-w-full rounded-2xl border border-[var(--tv-accent)]/20 bg-black/15 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:w-[286px] md:p-3 ${isNat20 ? 'tv-dice-card--nat20' : ''}`}>
                          <div className="grid grid-cols-[86px_minmax(0,1fr)] items-stretch gap-2">
                            <div className="flex min-h-[84px] shrink-0 flex-col justify-center rounded-xl border border-[var(--tv-accent)]/25 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--tv-accent),transparent 75%),color-mix(in_srgb,var(--tv-accent),transparent 80%_58%,rgba(0,0,0,0)_100%)] px-2 py-2 text-center">
                              <div
                                className="mb-1 inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.16em]"
                                style={{ color: cs.text }}
                              >
                                <DiceMultipleIcon className="h-3 w-3" style={{ color: '#fde68a' }} />
                                {isNat20 ? t('dice.critical') : t('dice.total')}
                              </div>
                              <div
                                className={`font-ui text-4xl font-semibold leading-none tracking-[0.02em] tabular-nums md:text-[2.65rem] ${isNat20 ? 'tv-dice-total--nat20' : ''}`}
                                style={{ color: cs.text, textShadow: isNat20 ? undefined : `0 0 12px ${cs.border}55` }}
                              >
                                {parsedDiceMessage.total}
                              </div>
                            </div>

                            <div className="flex min-h-[84px] min-w-0 flex-1 flex-col justify-center rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-1.5 font-mono text-[11px] tv-text md:text-xs">
                              {visibleLines.map((entry, index) => {
                                const rolls = Array.isArray(entry.rolls) ? entry.rolls : [];
                                const shownRolls = isExpanded ? rolls : rolls.slice(0, maxCollapsedRollsPerLine);
                                const hasHiddenRolls = !isExpanded && rolls.length > maxCollapsedRollsPerLine;

                                return (
                                  <div key={`${entry.raw}-${index}`} className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-black/5 px-2 py-1.5">
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold tv-text">
                                      {entry.sides ? <ChatDiceIcon sides={entry.sides} className="h-3.5 w-3.5 shrink-0" /> : null}
                                      <span>{t('dice.rolls', { notation: entry.raw })}</span>
                                    </div>
                                    <div className="mt-0.5 break-words tabular-nums tv-text">
                                      = {shownRolls.join(' + ')}
                                      {hasHiddenRolls ? ' + ...' : ''}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {hasOverflow ? (
                            <div className="mt-2 flex w-full justify-end">
                              <button
                                type="button"
                                onClick={() => toggleDiceMessageExpansion(c.id)}
                                className="text-[10px] font-semibold uppercase tracking-[0.12em] tv-text-sub transition-colors hover:tv-text"
                                aria-label={isExpanded ? t('dice.hideBreakdown') : t('dice.showBreakdown')}
                              >
                                {isExpanded ? t('dice.lessDetails') : t('dice.moreDetails')}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    return c.text;
                  })()}
                </div>

                {/* Context menu */}
                {activeMenu === c.id && (
                  <div
                    ref={menuRef}
                    className={`tv-context-menu absolute bottom-full z-20 py-1 ${isOwn ? 'right-0' : 'left-0'} mb-1.5`}
                  >
                    <button
                      onClick={() => startReply(c)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] tv-text transition-colors hover:tv-panel-inset hover:tv-text"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5 shrink-0 tv-muted" />
                      {t('view.reply')}
                    </button>
                    {(canEdit || canDelete) && (
                      <>
                        <div className="mx-2 my-0.5 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)]" />
                        {canEdit ? (
                          <button
                            onClick={() => startEdit(c)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] tv-text transition-colors hover:tv-panel-inset hover:tv-text"
                          >
                            <Pencil className="h-3.5 w-3.5 shrink-0 tv-muted" />
                            {t('view.edit')}
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            onClick={() => handleDelete(c)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] tv-tone-enemy-text transition-colors tv-hover-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            {t('view.delete')}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="tv-input-footer relative z-10 shrink-0">
        {/* Reply preview */}
        {replyingTo && !editingMsg && (
          <div className="flex items-start gap-2 px-3 pb-1 pt-2.5">
            <div className="flex-1 overflow-hidden rounded-lg border-l-2 border-[var(--tv-accent)] tv-panel-inset px-2.5 py-1.5 text-[11px] italic tv-text-sub">
              <span className="mb-0.5 block text-[10px] font-medium not-italic tv-tone-ally-text">{replyingTo.author}</span>
              <span className="line-clamp-1">{replyingTo.text}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="mt-1 shrink-0 tv-muted transition-colors hover:tv-text-sub">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit mode indicator */}
        {editingMsg && (
          <div className="flex items-start gap-2 px-3 pb-1 pt-2.5">
            <div className="flex-1 overflow-hidden rounded-lg border-l-2 border-[color-mix(in_srgb,var(--tv-accent),transparent_30%)] tv-panel-inset px-2.5 py-1.5 text-[11px] tv-text-sub">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--tv-accent)]">{t('view.editMode')}</span>
              <span className="line-clamp-1 italic opacity-60">{editingMsg.text}</span>
            </div>
            <button onClick={cancelEdit} className="mt-1 shrink-0 tv-muted transition-colors hover:tv-text-sub">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={sendMsg} className="chat-input-form flex flex-nowrap items-center gap-2 p-3 md:gap-3 md:p-4">
          <input
            ref={inputRef}
            type="text"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onClick={() => { if (!chatColor) setShowColorPicker(true); }}
            placeholder={chatColor ? (editingMsg ? t('view.placeholderEdit') : t('view.placeholderCompose')) : t('view.placeholderColor')}
            className="tv-input-surface tv-chat-compose-input min-w-0 flex-1 px-3 text-sm italic transition-colors focus:outline-none md:px-4"
          />
          <div className="tv-chat-compose-controls flex shrink-0 items-center gap-2">
            {!editingMsg && (
              <button
                type="button"
                onClick={() => setShowDicePopover((prev) => !prev)}
                title={t('view.rollDice')}
                aria-label={t('view.rollDiceAria')}
                className={`tv-toolbar-icon-btn tv-chat-dice-btn transition-all duration-200 ease-out disabled:opacity-50 active:scale-[0.985] ${showDicePopover ? 'tv-chat-dice-btn--active' : ''}`}
                disabled={isSending}
              >
                <Dice5 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSending}
              title={editingMsg ? t('view.saveEdit') : t('view.sendMessage')}
              aria-label={editingMsg ? t('view.saveEdit') : t('view.sendMessage')}
              className={`tv-chat-send-btn inline-flex shrink-0 items-center justify-center gap-2 border px-3.5 text-sm font-medium uppercase tracking-[0.16em] transition-all duration-200 ease-out disabled:opacity-50 active:scale-[0.985] md:px-4 ${msg.trim() && !isSending ? 'tv-chat-send-btn--ready' : ''}`}
            >
              {editingMsg ? <Check className="w-4 h-4" /> : <SendHorizontal className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>

      <DiceRollerSheet
        isOpen={showDicePopover}
        title={t('view.rollToChatTitle')}
        subtitle={t('view.rollToChatSubtitle')}
        onClose={() => setShowDicePopover(false)}
        onRoll={handleRollDice}
      />
    </div>
  );
}

export default ChatView;
