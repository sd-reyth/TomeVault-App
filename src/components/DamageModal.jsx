import React, { useState, useEffect, useRef } from 'react';
import { HeartPulse, Minus, Plus, Equal } from 'lucide-react';
import ModalFrame from './ModalFrame';
import { playFeedback } from '../lib/uiFeedback';

export default function DamageModal({ isOpen, onClose, target, onSave }) {
  const [amount, setAmount] = useState('');
  const hpDisplayRef = useRef(null);

  useEffect(() => {
    if (isOpen) setAmount('');
  }, [isOpen]);

  if (!isOpen || !target) return null;

  const handleDamage = () => {
    if (!amount) return;
    onSave(target.id, Math.max(0, target.hp - Number(amount)));
    playFeedback({
      sound: 'warning',
      element: hpDisplayRef.current,
      variant: 'danger',
      pulseClassName: 'tv-hp-flash--damage',
    });
  };

  const handleHeal = () => {
    if (!amount) return;
    onSave(target.id, target.hp + Number(amount));
    playFeedback({
      sound: 'success',
      element: hpDisplayRef.current,
      variant: 'heal',
      pulseClassName: 'tv-hp-flash--heal',
    });
  };
  
  const handleSet = () => {
    if (!amount && amount !== 0) return;
    onSave(target.id, Number(amount));
    playFeedback({ sound: 'tap', element: hpDisplayRef.current });
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
            <div
              ref={hpDisplayRef}
              data-tv-feedback-root
              className={`text-5xl font-fantasy font-bold mt-1 ${target.hp < 10 ? 'tv-hp-low' : 'tv-accent'}`}
            >
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
            className="tv-btn tv-button-secondary tv-btn--block mt-2 gap-2"
          >
            <Equal className="h-4 w-4" />
          </button>
    </ModalFrame>
  );
}
