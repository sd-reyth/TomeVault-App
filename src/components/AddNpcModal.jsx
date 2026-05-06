import React, { useState, useEffect } from 'react';
import { UserPlus, ImagePlus, X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-rose-900/50 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-rose-600/10 blur-[50px] pointer-events-none" />
        
        <div className="p-4 border-b border-stone-800/50 flex justify-between items-center relative z-10">
          <h3 className="font-fantasy font-bold text-stone-200 tracking-wider flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-rose-500" /> NPC Toevoegen
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-rose-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 relative z-10 flex flex-col gap-4">
          
          <div className="flex justify-center mb-1">
            <label className="relative group cursor-pointer w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 border-dashed border-rose-900/50 bg-stone-950/50 hover:bg-stone-900/80 flex items-center justify-center overflow-hidden transition-all shadow-inner">
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
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Naam</label>
            <input 
              autoFocus
              type="text" 
              required
              placeholder="Bijv. Goblin Aanvoerder"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-9 bg-stone-950/80 border border-stone-700 rounded-lg px-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-rose-800 transition-colors font-story"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">HP</label>
              <input 
                type="number" 
                required
                value={hp}
                onChange={e => setHp(e.target.value)}
                className="w-full h-9 bg-stone-950/80 border border-stone-700 rounded-lg px-3 text-sm text-stone-200 focus:outline-none focus:border-rose-800 transition-colors font-sans text-center hide-arrows"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">AC</label>
              <input 
                type="number" 
                required
                value={ac}
                onChange={e => setAc(e.target.value)}
                className="w-full h-9 bg-stone-950/80 border border-stone-700 rounded-lg px-3 text-sm text-stone-200 focus:outline-none focus:border-rose-800 transition-colors font-sans text-center hide-arrows"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5" title="Initiative Modifier">Init Mod</label>
              <input 
                type="number" 
                required
                value={initMod}
                onChange={e => setInitMod(e.target.value)}
                className="w-full h-9 bg-stone-950/80 border border-stone-700 rounded-lg px-3 text-sm text-stone-200 focus:outline-none focus:border-rose-800 transition-colors font-sans text-center hide-arrows"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="h-9 flex-1 inline-flex items-center justify-center bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-colors"
            >
              Annuleren
            </button>
            <button 
              type="submit"
              className="h-9 flex-1 inline-flex items-center justify-center border border-rose-900/60 bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-700 hover:to-rose-600 text-stone-100 rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-colors shadow-sm"
            >
              Toevoegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
