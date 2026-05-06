import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function DamageModal({ isOpen, onClose, target, onSave }) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isOpen) setAmount('');
  }, [isOpen]);

  if (!isOpen || !target) return null;

  const handleDamage = () => {
    if (!amount) return;
    onSave(target.id, Math.max(0, target.hp - Number(amount)));
  };

  const handleHeal = () => {
    if (!amount) return;
    onSave(target.id, target.hp + Number(amount));
  };
  
  const handleSet = () => {
    if (!amount && amount !== 0) return;
    onSave(target.id, Number(amount));
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-amber-900/50 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-amber-600/10 blur-[50px] pointer-events-none" />
        
        <div className="p-4 border-b border-stone-800/50 flex justify-between items-center relative z-10">
          <h3 className="font-fantasy font-bold text-stone-200 tracking-wider flex items-center gap-2">
            HP Beheer: <span className="text-amber-500">{target.name}</span>
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-rose-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 relative z-10 flex flex-col gap-4">
          <div className="text-center mb-2">
            <span className="text-stone-400 text-sm uppercase tracking-widest font-bold">Huidige HP:</span>
            <div className={`text-5xl font-fantasy font-bold mt-2 ${target.hp < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {target.hp}
            </div>
          </div>

          <div>
            <input 
              autoFocus
              type="number" 
              placeholder="Voer hoeveelheid in..."
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full h-9 bg-stone-950/80 border border-stone-700 rounded-lg px-4 text-center text-xl text-stone-200 focus:outline-none focus:border-amber-500 transition-colors font-sans hide-arrows"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button 
              onClick={handleDamage}
              className="h-9 inline-flex w-full items-center justify-center bg-rose-950/40 hover:bg-rose-900/80 border border-rose-900/50 text-rose-400 rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-colors shadow-sm"
            >
              - Schade
            </button>
            <button 
              onClick={handleHeal}
              className="h-9 inline-flex w-full items-center justify-center bg-emerald-950/40 hover:bg-emerald-900/80 border border-emerald-900/50 text-emerald-400 rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-colors shadow-sm"
            >
              + Genezing
            </button>
          </div>
          <button 
            onClick={handleSet}
            className="h-9 w-full inline-flex items-center justify-center mt-2 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 rounded-lg font-fantasy uppercase tracking-[0.16em] text-xs transition-colors"
          >
            Stel exact in
          </button>
        </div>
      </div>
    </div>
  );
}
