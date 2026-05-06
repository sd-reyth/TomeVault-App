import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Palette, Pencil, Trash2, X, Check, CornerUpLeft } from 'lucide-react';

const CHAT_COLORS = [
  { id: 'indigo',   bg: '#1e1b4b', border: '#4338ca', text: '#e0e7ff', swatch: '#6366f1', name: 'Indigo'   },
  { id: 'violet',   bg: '#1e0a3c', border: '#7c3aed', text: '#ede9fe', swatch: '#8b5cf6', name: 'Violet'   },
  { id: 'sky',      bg: '#082f49', border: '#0284c7', text: '#e0f2fe', swatch: '#0ea5e9', name: 'Hemel'    },
  { id: 'teal',     bg: '#042f2e', border: '#0d9488', text: '#ccfbf1', swatch: '#14b8a6', name: 'Teal'     },
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

function ChatView({ chat, setChat, role, uid, playerName, onSendMessageRemote, onEditMessage, onDeleteMessage, onChangeColor }) {
  const [msg, setMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatColor, setChatColor] = useState(() => localStorage.getItem('tv_chatcolor') || null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

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

  const handleColorSelect = async (colorId) => {
    if (occupiedColors.has(colorId)) return;

    // Immediate UI update for current user's full chat history.
    setChat((prev) => prev.map((msg) => {
      const mineByUid = msg.uid && msg.uid === uid;
      const mineLegacy = !msg.uid && msg.author === selfAuthor;
      return mineByUid || mineLegacy ? { ...msg, color: colorId } : msg;
    }));
    setChatColor(colorId);
    localStorage.setItem('tv_chatcolor', colorId);
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

    if (!chatColor) { setShowColorPicker(true); return; }

    const author = selfAuthor;
    const now = new Date();
    const clientMessageId = `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = {
      id: `tmp-${Date.now()}`,
      clientMessageId,
      uid,
      author,
      text,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      ms: now.getTime(),
      color: chatColor,
      replyTo: replyingTo || null,
    };

    setChat(prev => [...prev, optimistic]);
    setMsg('');
    setReplyingTo(null);

    if (onSendMessageRemote) {
      try {
        setIsSending(true);
        await onSendMessageRemote({ text, color: chatColor, replyTo: replyingTo || null, clientMessageId });
      } catch (err) {
        console.error('Chat versturen mislukt:', err);
      } finally {
        setIsSending(false);
      }
    }
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

  return (
    <div className="h-full flex flex-col bg-stone-900/60 backdrop-blur-sm border border-stone-800 rounded-xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />

      {/* Header */}
      <div className="p-3 md:p-4 border-b border-stone-800 bg-stone-900/90 flex justify-between items-center z-10 shadow-sm shrink-0">
        <h2 className="font-bold text-stone-200 flex items-center gap-2 font-fantasy tracking-widest uppercase text-xs md:text-sm">
          <MessageSquare className="w-4 h-4 text-indigo-500" /> Fluisteringen
        </h2>
        <button
          onClick={() => setShowColorPicker(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-700"
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
        <div className="absolute inset-0 bg-stone-950/85 z-30 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700/60 rounded-2xl p-4 md:p-6 max-w-xs w-full shadow-2xl my-auto shrink-0">
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
                ? 'Als DM kies je als eerste — jouw kleur is gereserveerd voor jou.'
                : 'Grijze kleuren zijn bezet door andere spelers.'}
            </p>
            <div className="grid grid-cols-4 gap-2">
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
                  <span className="text-[8px] md:text-[9px] text-stone-600 font-sans">{c.date ? `${c.date} • ${c.time}` : c.time}</span>
                </div>
              )}

              {/* Bubble + context menu */}
              <div className="relative max-w-[82%] md:max-w-[70%]">
                <div
                  onClick={() => handleBubbleClick(c)}
                  className={`px-3 md:px-4 py-2 md:py-2.5 font-story text-sm leading-relaxed shadow-md transition-transform duration-100 active:scale-[0.97] cursor-pointer select-none
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
                  {c.text}
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

        <form onSubmit={sendMsg} className="p-3 md:p-4 flex gap-2 md:gap-3 pb-safe">
          <input
            ref={inputRef}
            type="text"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onClick={() => { if (!chatColor) setShowColorPicker(true); }}
            placeholder={chatColor ? (editingMsg ? 'Pas je bericht aan...' : 'Spreek in de schaduwen...') : 'Kies eerst een kleur...'}
            className="h-9 flex-1 w-full bg-stone-900/80 border border-stone-800 rounded-lg px-3 md:px-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors font-story italic"
          />
          <button
            type="submit"
            disabled={isSending}
            className="h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-800 px-4 md:px-5 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-300 transition-colors hover:bg-stone-700 hover:text-stone-200 disabled:opacity-50 shrink-0"
          >
            {editingMsg ? <Check className="w-4 h-4" /> : 'Zend'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatView;
