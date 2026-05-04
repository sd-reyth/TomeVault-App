import React, { useState, useEffect } from 'react';
import { ImagePlus, Package, X } from 'lucide-react';
import { ITEM_PLACEHOLDER_IMAGES } from '../lib/placeholders';

function AddItemModal({ isOpen, onClose, onSave, role, party, currentPlayerId, itemToEdit }) {
  const [formData, setFormData] = useState({
    name: '', desc: '', amount: 1, ownerId: currentPlayerId, category: 'overig', section: 'Uitrusting & Items', imageUrl: null
  });
  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setFormData({ ...itemToEdit });
        setPendingFile(null);
      } else {
        setFormData({ name: '', desc: '', amount: 1, ownerId: currentPlayerId, category: 'overig', section: 'Uitrusting & Items', imageUrl: null });
        setPendingFile(null);
      }
    }
  }, [isOpen, currentPlayerId, itemToEdit]);

  if (!isOpen) return null;

  const isGM = role === 'gm';
  const playerOptions = party.filter(p => !p.isNpc);

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData, pendingFile);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setFormData((prev) => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
  };

  const handlePickPlaceholder = (url) => {
    setPendingFile(null);
    setFormData((prev) => ({ ...prev, imageUrl: url }));
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
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Soort</label>
            <select
              value={formData.category || 'overig'}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-600/50 transition-colors font-story"
            >
              <option value="overig">Overig</option>
              <option value="wapen">Wapen</option>
              <option value="pantser">Pantser</option>
              <option value="verbruikbaar">Verbruikbaar</option>
              <option value="magisch">Magisch</option>
              <option value="grondstof">Grondstof</option>
              <option value="quest">Quest</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Sectie</label>
            <input
              type="text"
              value={formData.section || 'Uitrusting & Items'}
              onChange={e => setFormData({ ...formData, section: e.target.value || 'Uitrusting & Items' })}
              className="w-full bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-600/50 transition-colors font-story"
              placeholder="Bijv. Sneltoegang"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Afbeelding</label>
            <label className="relative group cursor-pointer w-full h-24 rounded-lg border border-dashed border-stone-700 bg-stone-950/60 hover:border-amber-700/60 flex items-center justify-center overflow-hidden transition-all shadow-inner">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} alt="item" className="w-full h-full object-cover scale-[1.25] opacity-80 group-hover:opacity-45 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImagePlus className="w-6 h-6 text-stone-200" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-stone-500 group-hover:text-amber-500 transition-colors">
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Upload</span>
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Of kies uit placeholders</label>
            <div className="max-h-32 overflow-y-auto no-scrollbar rounded-lg border border-stone-800 bg-stone-950/40 p-2">
              <div className="grid grid-cols-8 gap-1.5">
                {ITEM_PLACEHOLDER_IMAGES.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => handlePickPlaceholder(url)}
                    className={`aspect-square rounded-md overflow-hidden border transition-all ${formData.imageUrl === url ? 'border-amber-500 shadow-[0_0_6px_rgba(217,119,6,0.4)]' : 'border-stone-700 hover:border-amber-700/60'}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover scale-[1.25]" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
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
