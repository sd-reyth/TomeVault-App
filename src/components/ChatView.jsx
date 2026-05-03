import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

function ChatView({ chat, setChat, role, playerName, onSendMessageRemote }) {
  const [msg, setMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = React.useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const sendMsg = async (e) => {
    e.preventDefault();
    const text = msg.trim();
    if (!text || isSending) return;

    const optimistic = {
      id: `tmp-${Date.now()}`,
      author: role === 'gm' ? 'GM' : playerName,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChat([...chat, optimistic]);
    setMsg('');

    if (onSendMessageRemote) {
      try {
        setIsSending(true);
        await onSendMessageRemote(text);
      } catch (err) {
        console.error('Chat versturen mislukt:', err);
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-900/60 backdrop-blur-sm border border-stone-800 rounded-xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none" />
      
      <div className="p-3 md:p-4 border-b border-stone-800 bg-stone-900/90 flex justify-between items-center z-10 shadow-sm shrink-0">
        <h2 className="font-bold text-stone-200 flex items-center gap-2 font-fantasy tracking-widest uppercase text-xs md:text-sm">
          <MessageSquare className="w-4 h-4 text-indigo-500" /> Fluisteringen
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 z-10 no-scrollbar">
        {chat.map(c => {
          const isGM = c.author === 'GM';
          return (
            <div key={c.id} className={`flex flex-col ${isGM ? 'items-start' : 'items-end'}`}>
              <div className="flex items-baseline gap-2 mb-1 px-1">
                <span className={`text-[10px] md:text-xs font-fantasy tracking-wider ${isGM ? 'text-amber-500' : 'text-indigo-400'}`}>
                  {c.author}
                </span>
                <span className="text-[8px] md:text-[9px] text-stone-600 font-sans">{c.time}</span>
              </div>
              <div className={`px-4 md:px-5 py-2.5 md:py-3 max-w-[90%] md:max-w-[85%] font-story text-sm md:text-[15px] leading-relaxed shadow-md ${
                isGM 
                  ? 'bg-amber-950/20 text-amber-100 rounded-b-xl rounded-tr-xl border border-amber-900/30' 
                  : 'bg-indigo-950/30 text-indigo-100 rounded-b-xl rounded-tl-xl border border-indigo-900/30'
              }`}>
                {c.text}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={sendMsg} className="p-3 md:p-4 bg-stone-950 border-t border-stone-800 flex gap-2 md:gap-3 z-10 shrink-0 pb-safe">
        <input 
          type="text" 
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Spreek in de schaduwen..." 
          className="flex-1 w-full bg-stone-900/80 border border-stone-800 rounded-lg px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-stone-200 placeholder-stone-600 focus:outline-none focus:border-indigo-800 transition-colors font-story italic"
        />
        <button type="submit" disabled={isSending} className="bg-stone-800 hover:bg-indigo-900/40 disabled:opacity-60 text-stone-300 hover:text-indigo-300 px-4 md:px-6 py-2 rounded-lg font-fantasy tracking-wider uppercase text-[10px] md:text-xs transition-colors border border-stone-700 hover:border-indigo-700 shrink-0">
          Zend
        </button>
      </form>
    </div>
  );
}

export default ChatView;
