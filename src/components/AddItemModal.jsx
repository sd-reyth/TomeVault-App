import React, { useState, useEffect } from 'react';
import { Package, X } from 'lucide-react';

function AddItemModal({ isOpen, onClose, onSave, role, party, currentPlayerId, itemToEdit }) {
  const [formData, setFormData] = useState({
    name: '', desc: '', amount: 1, ownerId: currentPlayerId
  });

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setFormData({ ...itemToEdit });
      } else {
        setFormData({ name: '', desc: '', amount: 1, ownerId: currentPlayerId });
      }
    }
  }, [isOpen, currentPlayerId, itemToEdit]);

  if (!isOpen) return null;

  const isGM = role === 'gm';
  const playerOptions = party.filter(p => !p.isNpc);

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/50 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-amber-600/10 blur-[50px] pointer-events-none" />
        
        <div className="p-4 border-b border-stone-800/50 flex justify-between items-center relative z-10">
          <h3 className="font-fantasy font-bold text-stone-200 tracking-wider flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" /> {itemToEdit ? 'Item Bewerken' : 'Item Toevoegen'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-rose-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 relative z-10 flex flex-col gap-4">
          
          {isGM && !itemToEdit && (
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Aan de tas van</label>
              <select 
                value={formData.ownerId} 
                onChange={e => setFormData({...formData, ownerId: e.target.value})}
                className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2.5 text-sm font-fantasy tracking-wider text-stone-200 focus:outline-none focus:border-amber-600/50 transition-colors appearance-none"
              >
                {playerOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Voorwerp Naam</label>
            <input 
              autoFocus
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Bijv. Magisch Touw"
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors font-story"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Aantal</label>
            <input 
              required
              type="number" 
              min="1"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: parseInt(e.target.value) || 1})}
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-600/50 transition-colors font-sans hide-arrows"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Beschrijving</label>
            <textarea 
              rows={3}
              value={formData.desc}
              onChange={e => setFormData({...formData, desc: e.target.value})}
              placeholder="Wat doet het of hoe ziet het eruit?"
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors font-story resize-none"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 py-2.5 rounded-lg font-fantasy tracking-wider text-sm transition-colors"
            >
              Annuleren
            </button>
            <button 
              type="submit"
              className="flex-1 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 border border-amber-900 text-stone-100 py-2.5 rounded-lg font-fantasy tracking-wider text-sm transition-colors shadow-[0_0_10px_rgba(217,119,6,0.2)]"
            >
              {itemToEdit ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddItemModal;
