import React, { useState } from 'react';
import { Copy, QrCode, Share2, X } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, sessionId, theme }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const joinUrl = `https://tomevault.app/join?code=${encodeURIComponent(sessionId)}`;
  const waText = `Sluit je aan bij mijn epische avontuur op TomeVault! 🐉\n\nSessie Code: *${sessionId}*\n\nSpeel direct mee: ${joinUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeColorMap = {
    purple: '8b5cf6',
    amber: 'f59e0b',
    green: '22c55e',
  };
  const resolvedTheme = theme || document.querySelector('[data-theme]')?.getAttribute('data-theme') || 'amber';
  const qrColor = themeColorMap[resolvedTheme] || 'f59e0b';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}&color=${qrColor}&bgcolor=0f172a`;

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-emerald-900/40 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/10 blur-[50px] pointer-events-none" />
        
        <div className="p-4 border-b border-stone-800/50 flex justify-between items-center relative z-10">
          <h3 className="font-fantasy font-bold text-stone-200 tracking-wider flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" /> Nodig Spelers Uit
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-rose-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center relative z-10">
          <p className="text-stone-400 text-sm font-story text-center mb-6">
            Laat je spelers deze QR-code scannen of deel de link direct in jullie groep.
          </p>
          
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 shadow-inner mb-6">
            <img src={qrCodeUrl} alt="QR Code voor Sessie" className="w-48 h-48 rounded-lg" />
          </div>

          <div className="w-full space-y-3">
            <button 
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-200 py-3 rounded-lg font-fantasy tracking-wider text-sm transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Gekopieerd' : 'Kopiëren'}
            </button>

            <a 
              href={`https://wa.me/?text=${encodeURIComponent(waText)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white py-3 rounded-lg font-fantasy tracking-wider text-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Delen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
