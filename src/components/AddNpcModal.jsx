import React, { useState, useEffect } from 'react';
import { UserPlus, ImagePlus } from 'lucide-react';
import ModalFrame from './ModalFrame';

export default function AddNpcModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState(15);
  const [ac, setAc] = useState(12);
  const [initMod, setInitMod] = useState(2);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setHp(15);
      setAc(12);
      setInitMod(2);
      setAvatarUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, subtitle: 'Vijand', hp: Number(hp), maxHp: Number(hp), ac: Number(ac), initMod: Number(initMod), avatar: avatarUrl });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="NPC Toevoegen"
      icon={UserPlus}
      bodyClassName="px-5 py-5 sm:px-6 sm:py-6"
    >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          <div className="flex justify-center mb-1">
            <label className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-rose-700/40 bg-white/5 shadow-inner transition-all hover:bg-white/7 md:h-24 md:w-24 group">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {avatarUrl ? (
                <>
                  <img src={avatarUrl} alt="NPC Portret preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImagePlus className="w-6 h-6 text-stone-200 drop-shadow-md" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-stone-500 group-hover:text-rose-400 transition-colors">
                  <ImagePlus className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest">Portret</span>
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400">Naam</label>
            <input 
              autoFocus
              type="text" 
              required
              placeholder="Bijv. Goblin Aanvoerder"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-stone-200 placeholder-stone-500 transition-all duration-200 focus:outline-none focus:border-rose-400/70 focus:bg-white/7"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/5 p-3 shadow-inner">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400">HP</label>
              <input 
                type="number" 
                required
                value={hp}
                onChange={e => setHp(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950/55 px-3 text-center text-sm font-sans text-stone-200 transition-all duration-200 focus:outline-none focus:border-rose-400/70 hide-arrows"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400">AC</label>
              <input 
                type="number" 
                required
                value={ac}
                onChange={e => setAc(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950/55 px-3 text-center text-sm font-sans text-stone-200 transition-all duration-200 focus:outline-none focus:border-rose-400/70 hide-arrows"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400" title="Initiative Modifier">Init Mod</label>
              <input 
                type="number" 
                required
                value={initMod}
                onChange={e => setInitMod(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950/55 px-3 text-center text-sm font-sans text-stone-200 transition-all duration-200 focus:outline-none focus:border-rose-400/70 hide-arrows"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="h-9 flex-1 inline-flex items-center justify-center bg-white/5 hover:bg-white/7 border border-white/10 text-stone-300 rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-all duration-200 active:scale-95"
            >
              Annuleren
            </button>
            <button 
              type="submit"
              className="h-9 flex-1 inline-flex items-center justify-center border border-rose-800/50 bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-700 hover:to-rose-600 text-stone-100 rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-all duration-200 shadow-sm active:scale-95"
            >
              Toevoegen
            </button>
          </div>
        </form>
    </ModalFrame>
  );
}
