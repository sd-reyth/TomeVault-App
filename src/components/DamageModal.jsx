import React, { useState, useEffect } from 'react';
import { HeartPulse, Minus, Plus, Equal } from 'lucide-react';
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
      title="HP"
      subtitle={target.name}
      icon={HeartPulse}
      bodyClassName="gap-4"
    >
          <div className="text-center mb-2">
            <div className={`text-5xl font-fantasy font-bold mt-1 ${target.hp < 10 ? 'text-rose-500' : 'tv-accent'}`}>
              {target.hp}
            </div>
          </div>

          <div>
            <input 
              autoFocus
              type="number" 
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="tv-field hide-arrows text-center text-xl"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <button 
              onClick={handleDamage}
              aria-label="Schade"
              title="Schade"
              className="tv-icon-btn h-11 w-full tv-icon-btn--danger"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button 
              onClick={handleHeal}
              aria-label="Genezing"
              title="Genezing"
              className="tv-icon-btn h-11 w-full"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <button 
            onClick={handleSet}
            aria-label="Stel exact in"
            title="Stel exact in"
            className="tv-button-secondary mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg"
          >
            <Equal className="h-4 w-4" />
          </button>
    </ModalFrame>
  );
}
