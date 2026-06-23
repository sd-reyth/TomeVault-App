import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Palette, Pencil, Trash2, X, Check, CornerUpLeft, SendHorizontal, Dice5 } from 'lucide-react';
import DiceRollerSheet, { getDiceThemeChrome } from './DiceRollerSheet';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';
import {
  mdiDiceD4,
  mdiDiceD6,
  mdiDiceD8,
  mdiDiceD10,
  mdiDiceD12,
  mdiDiceD20,
  mdiDiceD10Outline,
  mdiDiceMultiple,
} from '@mdi/js';

const CHAT_COLORS = [
  { id: 'indigo',   bg: '#1e1b4b', border: '#4338ca', text: '#e0e7ff', swatch: '#6366f1', name: 'Indigo'   },
  { id: 'violet',   bg: '#1e0a3c', border: '#7c3aed', text: '#ede9fe', swatch: '#8b5cf6', name: 'Violet'   },
  { id: 'sky',      bg: '#082f49', border: '#0284c7', text: '#e0f2fe', swatch: '#0ea5e9', name: 'Hemel'    },
  { id: 'emerald',  bg: '#052e16', border: '#10b981', text: '#d1fae5', swatch: '#10b981', name: 'Smaragd'  },
  { id: 'lime',     bg: '#1a2e05', border: '#65a30d', text: '#ecfccb', swatch: '#84cc16', name: 'Limoen'   },
  { id: 'amber',    bg: '#451a03', border: '#d97706', text: '#fef3c7', swatch: '#f59e0b', name: 'Amber'    },
  { id: 'orange',   bg: '#431407', border: '#ea580c', text: '#ffedd5', swatch: '#f97316', name: 'Oranje'   },
  { id: 'rose',     bg: '#4c0519', border: '#e11d48', text: '#ffe4e6', swatch: '#f43f5e', name: 'Roos'     },
  { id: 'pink',     bg: '#500724', border: '#db2777', text: '#fce7f3', swatch: '#ec4899', name: 'Roze'     },
  { id: 'fuchsia',  bg: '#4a044e', border: '#c026d3', text: '#fae8ff', swatch: '#d946ef', name: 'Fuchsia'  },
  { id: 'cyan',     bg: '#083344', border: '#06b6d4', text: '#cffafe', swatch: '#22d3ee', name: 'Cyaan'    },
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

const CHAT_DICE_ICON_PATHS = {
  4: mdiDiceD4,
  6: mdiDiceD6,
  8: mdiDiceD8,
  10: mdiDiceD10,
  12: mdiDiceD12,
  20: mdiDiceD20,
  100: mdiDiceD10Outline,
};

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
  const iconPath = CHAT_DICE_ICON_PATHS[sides] || mdiDiceD10Outline;
  const iconColor = CHAT_DICE_ICON_COLORS[sides] || '#f59e0b';

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true" style={{ color: iconColor }}>
      <path d={iconPath} fill="currentColor" />
      {Number(sides) === 100 ? (
        <text x="12" y="14" textAnchor="middle" fontSize="5.8" fill="#0f172a" stroke="none" fontWeight="700">00</text>
      ) : null}
    </svg>
  );
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

function ChatView({ chat, setChat, role, uid, playerName, preferredChatColor, theme, onSendMessageRemote, onEditMessage, onDeleteMessage, onChangeColor }) {
  const diceThemeChrome = getDiceThemeChrome();
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
  const selfAuthor = role === 'gm' ? 'GM' : (playerName || 'Speler');

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
    <div className="relative h-full flex flex-col rounded-2xl border border-white/10 bg-zinc-950/72 shadow-[0_22px_60px_rgba(0,0,0,0.34)] backdrop-blur-md">
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.10),transparent_36%),url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex shrink-0 flex-col gap-2 border-b border-white/10 bg-white/5 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-4">
        <h2 className="flex items-center gap-2 text-xs font-medium font-fantasy uppercase tracking-[0.18em] text-stone-100 md:text-sm">
          <MessageSquare className="h-4 w-4 text-[var(--tv-accent)]" /> Fluisteringen
        </h2>
        <button
          onClick={() => setShowColorPicker(true)}
          className="inline-flex w-full items-center justify-between gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-stone-300 transition-all duration-200 ease-out hover:bg-white/7 hover:text-stone-100 active:scale-[0.985] sm:w-auto sm:justify-start"
          title="Kies je chatkleur"
        >
          {chatColor
            ? <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getColor(chatColor).swatch, boxShadow: `0 0 6px ${getColor(chatColor).swatch}88` }} />
            : <Palette className="w-3.5 h-3.5" />
          }
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {chatColor ? getColor(chatColor).name : 'Kleur'}
          </span>
        </button>
      </div>

      {/* Color picker overlay */}
      {showColorPicker && (
        <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-zinc-950/86 p-3 backdrop-blur-md sm:p-4">
          <div className="my-auto w-full max-w-sm shrink-0 rounded-3xl border border-white/10 bg-zinc-950 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm uppercase tracking-[0.18em] text-stone-100">Kies jouw kleur</h3>
              {chatColor && (
                <button onClick={() => setShowColorPicker(false)} className="rounded-full p-1 text-stone-500 transition-colors hover:bg-white/5 hover:text-stone-100">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="mb-4 text-xs italic text-stone-500">
              {role === 'gm'
                ? 'Als Game Master kies je als eerste - jouw kleur is gereserveerd voor jou.'
                : 'Grijze kleuren zijn bezet door andere spelers.'}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CHAT_COLORS.map(c => {
                const occupied = occupiedColors.has(c.id);
                const isActive = chatColor === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => !occupied && handleColorSelect(c.id)}
                    title={c.name + (occupied ? ' (bezet)' : '')}
                    disabled={occupied}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border p-2 transition-all duration-200 ease-out ${
                      isActive
                        ? 'border-white/20 bg-white/7 scale-105 shadow-lg'
                        : occupied
                        ? 'cursor-not-allowed border-white/5 opacity-25'
                        : 'cursor-pointer border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: c.swatch, boxShadow: `0 0 10px ${c.swatch}66` }}
                    />
                    <span className="w-full truncate text-center text-[8px] font-medium uppercase leading-none text-stone-400">{c.name}</span>
                    {isActive && (
                      <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow">
                        <Check className="w-2 h-2 text-stone-900" strokeWidth={3} />
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
      <div ref={messagesContainerRef} className="relative z-10 flex-1 overflow-y-auto px-3 py-4 no-scrollbar md:px-5">
        {chat.length === 0 && (
          <div className="flex h-full min-h-[120px] items-center justify-center px-6 text-center text-sm italic text-stone-600">
            De stilte hangt zwaar in de lucht...<br />Spreek als eerste.
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

          return (
            <div
              key={c.id}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${showHeader ? 'mt-4' : 'mt-0.5'}`}
            >
              {/* Author + time header */}
              {showHeader && (
                <div className={`flex items-center gap-2 mb-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] font-medium tracking-[0.14em] md:text-xs" style={{ color: cs.swatch }}>
                    {c.author}
                  </span>
                  <span className="text-[8px] text-stone-500 md:text-[9px]">{c.date ? `${c.date} • ${c.time}` : c.time}</span>
                </div>
              )}

              {/* Bubble + context menu */}
              <div className="relative max-w-[88%] sm:max-w-[82%] md:max-w-[70%]">
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
                    border: `1px solid ${cs.border}55`,
                  }}
                >
                  {/* Reply quote */}
                  {c.replyTo && (
                    <div
                      className="mb-2 rounded-lg px-2 py-1 text-[11px] italic opacity-80"
                      style={{ borderLeft: `2px solid ${cs.swatch}`, backgroundColor: 'rgba(0,0,0,0.25)' }}
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

                      return (
                        <div className="mx-auto w-[262px] max-w-full rounded-2xl border border-[var(--tv-accent)]/20 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:w-[286px] md:p-3">
                          <div className="grid grid-cols-[86px_minmax(0,1fr)] items-stretch gap-2">
                            <div className="flex min-h-[84px] shrink-0 flex-col justify-center rounded-xl border border-[var(--tv-accent)]/25 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--tv-accent),transparent 75%),color-mix(in_srgb,var(--tv-accent),transparent 80%_58%,rgba(0,0,0,0)_100%)] px-2 py-2 text-center">
                              <div className="mb-1 inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--tv-accent)]/90">
                                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden="true" style={{ color: '#fde68a' }}>
                                  <path d={mdiDiceMultiple} fill="currentColor" />
                                </svg>
                                Totaal
                              </div>
                              <div className="font-fantasy text-4xl leading-none tracking-[0.08em] text-[var(--tv-accent)] drop-shadow-[0_0_10px_var(--tv-accent-shadow)] md:text-[2.65rem]">
                                {parsedDiceMessage.total}
                              </div>
                            </div>

                            <div className="flex min-h-[84px] min-w-0 flex-1 flex-col justify-center rounded-xl border border-white/10 bg-white/5 p-1.5 font-mono text-[11px] text-stone-200 md:text-xs">
                              {visibleLines.map((entry, index) => {
                                const rolls = Array.isArray(entry.rolls) ? entry.rolls : [];
                                const shownRolls = isExpanded ? rolls : rolls.slice(0, maxCollapsedRollsPerLine);
                                const hasHiddenRolls = !isExpanded && rolls.length > maxCollapsedRollsPerLine;

                                return (
                                  <div key={`${entry.raw}-${index}`} className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5">
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-100">
                                      {entry.sides ? <ChatDiceIcon sides={entry.sides} className="h-3.5 w-3.5 shrink-0" /> : null}
                                      <span>Werpt {entry.raw}</span>
                                    </div>
                                    <div className="mt-0.5 break-words tabular-nums text-stone-300">
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
                                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 transition-colors hover:text-stone-100"
                                aria-label={isExpanded ? 'Verberg berekening' : 'Toon volledige berekening'}
                              >
                                {isExpanded ? 'Minder details' : 'Meer details'}
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
                    className={`absolute bottom-full z-20 min-w-[140px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 py-1 shadow-[0_18px_50px_rgba(0,0,0,0.34)] ${isOwn ? 'right-0' : 'left-0'} mb-1.5`}
                  >
                    <button
                      onClick={() => startReply(c)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] text-stone-300 transition-colors hover:bg-white/5 hover:text-stone-100"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                      Beantwoord
                    </button>
                    {isOwn && (
                      <>
                        <div className="mx-2 my-0.5 border-t border-white/10" />
                        <button
                          onClick={() => startEdit(c)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] text-stone-300 transition-colors hover:bg-white/5 hover:text-stone-100"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                          Bewerk
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          Verwijder
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="relative z-10 shrink-0 border-t border-white/10 bg-zinc-950/92">
        {/* Reply preview */}
        {replyingTo && !editingMsg && (
          <div className="flex items-start gap-2 px-3 pb-1 pt-2.5">
            <div className="flex-1 overflow-hidden rounded-lg border-l-2 border-[var(--tv-accent)] bg-white/5 px-2.5 py-1.5 text-[11px] italic text-stone-400">
              <span className="mb-0.5 block text-[10px] font-medium not-italic text-indigo-300">{replyingTo.author}</span>
              <span className="line-clamp-1">{replyingTo.text}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="mt-1 shrink-0 text-stone-600 transition-colors hover:text-stone-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit mode indicator */}
        {editingMsg && (
          <div className="flex items-start gap-2 px-3 pb-1 pt-2.5">
            <div className="flex-1 overflow-hidden rounded-lg border-l-2 border-amber-500 bg-white/5 px-2.5 py-1.5 text-[11px] text-stone-400">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--tv-accent)]">Bewerk modus</span>
              <span className="line-clamp-1 italic opacity-60">{editingMsg.text}</span>
            </div>
            <button onClick={cancelEdit} className="mt-1 shrink-0 text-stone-600 transition-colors hover:text-stone-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={sendMsg} className="chat-input-form flex flex-wrap gap-2 p-3 sm:flex-nowrap md:gap-3 md:p-4">
          <input
            ref={inputRef}
            type="text"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onClick={() => { if (!chatColor) setShowColorPicker(true); }}
            placeholder={chatColor ? (editingMsg ? 'Pas je bericht aan...' : 'Spreek in de schaduwen...') : 'Kies eerst een kleur...'}
            className="h-10 min-w-0 w-full flex-[1_1_100%] rounded-xl border border-white/10 bg-white/5 px-3 text-sm italic text-stone-100 transition-colors placeholder-stone-500 focus:border-[var(--tv-accent)]/50 focus:bg-white/7 focus:outline-none md:px-4 sm:flex-[1_1_auto]"
          />
          <div className={`flex items-center gap-2 ${editingMsg ? 'w-full sm:w-auto' : 'ml-auto sm:ml-0'}`}>
            {!editingMsg && (
              <button
                type="button"
                onClick={() => setShowDicePopover((prev) => !prev)}
                title="Dobbelstenen rollen"
                aria-label="Dobbelstenen rollen"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ease-out disabled:opacity-50 active:scale-[0.985] ${showDicePopover ? diceThemeChrome.triggerActive : diceThemeChrome.triggerIdle}`}
                disabled={isSending}
              >
                <Dice5 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSending}
              title={editingMsg ? 'Bewerking opslaan' : 'Bericht versturen'}
              aria-label={editingMsg ? 'Bewerking opslaan' : 'Bericht versturen'}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/7 px-3.5 text-sm font-medium uppercase tracking-[0.16em] text-stone-100 transition-all duration-200 ease-out hover:bg-white/10 hover:text-white disabled:opacity-50 active:scale-[0.985] md:px-4 ${editingMsg ? 'flex-1 sm:flex-none' : 'shrink-0'}`}
            >
              {editingMsg ? <Check className="w-4 h-4" /> : <SendHorizontal className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>

      <DiceRollerSheet
        isOpen={showDicePopover}
        theme={theme}
        title="Rol naar de chat"
        subtitle="Werp je stenen vanuit dezelfde roller en stuur het resultaat direct als chatbericht."
        onClose={() => setShowDicePopover(false)}
        onRoll={handleRollDice}
      />
    </div>
  );
}

export default ChatView;
