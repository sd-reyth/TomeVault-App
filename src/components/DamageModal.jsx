import React, { useState, useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import ModalFrame from './ModalFrame';

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
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="HP Beheer"
      subtitle={target.name}
      icon={HeartPulse}
      accent="amber"
      bodyClassName="gap-4 px-5 py-5 sm:px-6 sm:py-6"
    >
          <div className="text-center mb-2">
            <span className="text-stone-400 text-sm uppercase tracking-widest font-bold">Huidige HP:</span>
            <div className={`text-5xl font-fantasy font-bold mt-2 ${target.hp < 10 ? 'text-rose-500' : 'text-amber-500'}`}>
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
              className="h-9 inline-flex w-full items-center justify-center bg-amber-950/40 hover:bg-amber-900/80 border border-amber-900/50 text-amber-400 rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-colors shadow-sm"
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
    </ModalFrame>
  );
}
