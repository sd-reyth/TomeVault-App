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
  const diceThemeChrome = getDiceThemeChrome(theme);
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
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="h-full flex flex-col bg-stone-900/60 backdrop-blur-sm border border-stone-800 rounded-xl overflow-hidden shadow-lg relative">
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

      {/* Header */}
      <div className="z-10 flex shrink-0 flex-col gap-2 border-b border-stone-800 bg-stone-900/90 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-4">
        <h2 className="font-bold text-stone-200 flex items-center gap-2 font-fantasy tracking-widest uppercase text-xs md:text-sm">
          <MessageSquare className="w-4 h-4 text-amber-500" /> Fluisteringen
        </h2>
        <button
          onClick={() => setShowColorPicker(true)}
          className="inline-flex w-full items-center justify-between gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-stone-400 transition-colors hover:border-stone-700 hover:bg-stone-800 hover:text-stone-200 sm:w-auto sm:justify-start"
          title="Kies je chatkleur"
        >
          {chatColor
            ? <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getColor(chatColor).swatch, boxShadow: `0 0 6px ${getColor(chatColor).swatch}88` }} />
            : <Palette className="w-3.5 h-3.5" />
          }
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {chatColor ? getColor(chatColor).name : 'Kleur'}
          </span>
        </button>
      </div>

      {/* Color picker overlay */}
      {showColorPicker && (
        <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-stone-950/85 p-3 backdrop-blur-sm sm:p-4">
          <div className="my-auto w-full max-w-sm shrink-0 rounded-2xl border border-stone-700/60 bg-stone-900 p-4 shadow-2xl sm:p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-fantasy text-stone-100 text-sm tracking-wider uppercase">Kies jouw kleur</h3>
              {chatColor && (
                <button onClick={() => setShowColorPicker(false)} className="text-stone-500 hover:text-stone-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-stone-500 font-story text-xs italic mb-4">
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
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      isActive
                        ? 'border-white/30 bg-stone-800 scale-105 shadow-lg'
                        : occupied
                        ? 'border-stone-800/50 opacity-25 cursor-not-allowed'
                        : 'border-stone-800 hover:border-stone-500 hover:bg-stone-800/50 cursor-pointer'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: c.swatch, boxShadow: `0 0 10px ${c.swatch}66` }}
                    />
                    <span className="text-[8px] text-stone-400 font-bold uppercase truncate w-full text-center leading-none">{c.name}</span>
                    {isActive && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow">
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
      <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 z-10 no-scrollbar">
        {chat.length === 0 && (
          <div className="h-full min-h-[120px] flex items-center justify-center text-stone-700 font-story italic text-sm text-center px-6">
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
                  <span className="text-[10px] md:text-xs font-fantasy tracking-wider font-bold" style={{ color: cs.swatch }}>
                    {c.author}
                  </span>
                  <span className="text-[8px] md:text-[9px] text-stone-500 font-sans">{c.date ? `${c.date} • ${c.time}` : c.time}</span>
                </div>
              )}

              {/* Bubble + context menu */}
              <div className="relative max-w-[88%] sm:max-w-[82%] md:max-w-[70%]">
                <div
                  onClick={() => handleBubbleClick(c)}
                  className={`px-3 md:px-3.5 py-1.5 md:py-2 font-story text-sm leading-normal shadow-sm transition-transform duration-100 active:scale-[0.985] cursor-pointer select-none
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
                      className="mb-2 px-2 py-1 rounded-lg text-[11px] font-story italic opacity-80"
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
                        <div className="w-[240px] md:w-[252px] max-w-full mx-auto flex flex-col items-center">
                          <div className="h-[60px] flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-9 md:h-9 mr-2" fill="none" aria-hidden="true" style={{ color: '#f8fafc' }}>
                              <path d={mdiDiceMultiple} fill="currentColor" />
                            </svg>
                            <span className="text-3xl md:text-4xl font-extrabold text-amber-100">{parsedDiceMessage.total}!</span>
                          </div>

                          <div className={`${isExpanded ? 'min-h-[72px]' : 'h-[72px]'} w-full text-xs md:text-sm font-mono text-stone-200 overflow-hidden flex flex-col items-center justify-start pt-0.5`}> 
                            {visibleLines.map((entry, index) => {
                              const rolls = Array.isArray(entry.rolls) ? entry.rolls : [];
                              const shownRolls = isExpanded ? rolls : rolls.slice(0, maxCollapsedRollsPerLine);
                              const hasHiddenRolls = !isExpanded && rolls.length > maxCollapsedRollsPerLine;

                              return (
                                <div key={`${entry.raw}-${index}`} className="w-full flex items-start justify-center gap-2 leading-tight mb-1">
                                  {entry.sides ? <ChatDiceIcon sides={entry.sides} className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-[1px]" /> : null}
                                  <div className="w-[184px] text-left">
                                    <div className="font-semibold">{entry.raw}</div>
                                    {shownRolls.map((roll, rollIndex) => (
                                      <div key={`${entry.raw}-roll-${rollIndex}`} className="tabular-nums">
                                        {rollIndex === 0 ? '= ' : '+ '}{roll}
                                      </div>
                                    ))}
                                    {hasHiddenRolls ? <div className="tabular-nums">...</div> : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="h-[18px] flex items-center justify-center mt-1 w-full">
                            {hasOverflow ? (
                              <button
                                type="button"
                                onClick={() => toggleDiceMessageExpansion(c.id)}
                                className="text-[11px] font-bold tracking-wide text-stone-300 hover:text-stone-100"
                                aria-label={isExpanded ? 'Verberg berekening' : 'Toon volledige berekening'}
                              >
                                {isExpanded ? 'Minder' : '...'}
                              </button>
                            ) : null}
                          </div>
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
                    className={`absolute bottom-full mb-1.5 z-20 bg-stone-900 border border-stone-700/60 rounded-xl shadow-2xl overflow-hidden min-w-[140px] py-1 ${isOwn ? 'right-0' : 'left-0'}`}
                  >
                    <button
                      onClick={() => startReply(c)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      Beantwoord
                    </button>
                    {isOwn && (
                      <>
                        <div className="mx-2 border-t border-stone-800 my-0.5" />
                        <button
                          onClick={() => startEdit(c)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          Bewerk
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
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
      <div className="shrink-0 bg-stone-950 border-t border-stone-800 z-10">
        {/* Reply preview */}
        {replyingTo && !editingMsg && (
          <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
            <div className="flex-1 px-2.5 py-1.5 bg-stone-900 rounded-lg border-l-2 border-indigo-500 text-[11px] text-stone-400 font-story italic overflow-hidden">
              <span className="font-bold not-italic text-indigo-400 text-[10px] block mb-0.5">{replyingTo.author}</span>
              <span className="line-clamp-1">{replyingTo.text}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-stone-600 hover:text-stone-400 mt-1 shrink-0 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit mode indicator */}
        {editingMsg && (
          <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
            <div className="flex-1 px-2.5 py-1.5 bg-stone-900 rounded-lg border-l-2 border-amber-500 text-[11px] text-stone-400 font-story overflow-hidden">
              <span className="font-bold text-amber-400 text-[10px] block mb-0.5 font-sans uppercase tracking-wider">Bewerk modus</span>
              <span className="line-clamp-1 italic opacity-60">{editingMsg.text}</span>
            </div>
            <button onClick={cancelEdit} className="text-stone-600 hover:text-stone-400 mt-1 shrink-0 transition-colors">
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
            className="h-9 min-w-0 w-full flex-[1_1_100%] rounded-lg border border-stone-800 bg-stone-900/80 px-3 text-sm italic text-stone-200 transition-colors placeholder-stone-500 focus:border-amber-600/60 focus:outline-none font-story md:px-4 sm:flex-[1_1_auto]"
          />
          <div className={`flex items-center gap-2 ${editingMsg ? 'w-full sm:w-auto' : 'ml-auto sm:ml-0'}`}>
            {!editingMsg && (
              <button
                type="button"
                onClick={() => setShowDicePopover((prev) => !prev)}
                title="Dobbelstenen rollen"
                aria-label="Dobbelstenen rollen"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${showDicePopover ? diceThemeChrome.triggerActive : diceThemeChrome.triggerIdle}`}
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
              className={`h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-800 px-3.5 md:px-4 font-fantasy text-sm font-bold uppercase tracking-[0.16em] text-stone-200 transition-colors hover:bg-stone-700 hover:text-stone-100 disabled:opacity-50 ${editingMsg ? 'flex-1 sm:flex-none' : 'shrink-0'}`}
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
