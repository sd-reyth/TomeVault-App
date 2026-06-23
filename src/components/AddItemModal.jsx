import React, { useState, useEffect } from 'react';
import { ImagePlus, Package } from 'lucide-react';
import { ITEM_PLACEHOLDER_IMAGES } from '../lib/placeholders';
import ModalFrame from './ModalFrame';

function AddItemModal({ isOpen, onClose, onSave, role, party, currentPlayerId, itemToEdit }) {
  const [formData, setFormData] = useState({
    name: '', desc: '', amount: 1, ownerId: currentPlayerId, category: 'overig', section: '', imageUrl: null
  });
  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setFormData({ ...itemToEdit, section: '' });
        setPendingFile(null);
      } else {
        setFormData({ name: '', desc: '', amount: 1, ownerId: currentPlayerId, category: 'overig', section: '', imageUrl: null });
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
    onSave({ ...formData, section: '' }, pendingFile);
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
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Item Bewerken' : 'Item Toevoegen'}
      icon={Package}
      bodyClassName="min-h-0 flex-1 gap-0 px-0 py-0 sm:px-0 sm:py-0"
    >
        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4 py-4 sm:px-6 sm:py-6">
            {isGM && !itemToEdit && (
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest tv-text-sub">Aan de tas van</label>
                <select 
                  value={formData.ownerId} 
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  className="h-10 w-full appearance-none rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 text-sm tv-text transition-all duration-200 focus:outline-none focus:border-[var(--tv-accent)]/55 focus:bg-white/7"
                >
                  {playerOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest tv-text-sub">Voorwerp Naam</label>
              <input 
                autoFocus
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Bijv. Magisch Touw"
                className="tv-field"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest tv-text-sub">Aantal</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: parseInt(e.target.value) || 1})}
                  className="h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 text-sm tv-text transition-all duration-200 focus:outline-none focus:border-[var(--tv-accent)]/55 focus:bg-white/7 hide-arrows"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest tv-text-sub">Soort</label>
                <select
                  value={formData.category || 'overig'}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="h-10 w-full appearance-none rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 text-sm tv-text transition-all duration-200 focus:outline-none focus:border-[var(--tv-accent)]/55 focus:bg-white/7"
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
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest tv-text-sub">Afbeelding</label>
              <label className="relative flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 tv-panel-inset shadow-inner transition-all hover:border-[var(--tv-accent)]/50 hover:bg-white/7 group">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {formData.imageUrl ? (
                  <>
                    <img src={formData.imageUrl} alt="item" className="w-full h-full object-cover scale-[1.25] opacity-80 group-hover:opacity-45 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImagePlus className="w-6 h-6 tv-text" />
                    </div>
                  </>
                ) : (
                    <div className="flex flex-col items-center gap-1 tv-muted group-hover:text-[var(--tv-accent)] transition-colors">
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Upload</span>
                  </div>
                )}
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest tv-text-sub">Of kies uit placeholders</label>
              <div className="max-h-36 overflow-y-auto no-scrollbar rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-2.5">
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                  {ITEM_PLACEHOLDER_IMAGES.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handlePickPlaceholder(url)}
                      className={`aspect-square rounded-md overflow-hidden border transition-all duration-200 hover:scale-110 active:scale-95 ${formData.imageUrl === url ? 'border-[var(--tv-accent)] shadow-[0_0_6px_var(--tv-accent-shadow-sm)]' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[var(--tv-accent)]/50'}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover scale-[1.25]" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest tv-text-sub">Beschrijving</label>
              <textarea 
                rows={3}
                value={formData.desc}
                onChange={e => setFormData({...formData, desc: e.target.value})}
                placeholder="Wat doet het of hoe ziet het eruit?"
                className="tv-field resize-none font-story"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-4 pt-4 backdrop-blur-sm shrink-0 sm:flex-row sm:p-6">
            <button 
              type="button"
              onClick={onClose}
              className="h-10 flex-1 inline-flex items-center justify-center tv-panel-inset hover:bg-white/7 border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-text rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm transition-all duration-200 active:scale-95"
            >
              Annuleren
            </button>
            <button 
              type="submit"
              className="h-10 flex-1 inline-flex items-center justify-center rounded-lg font-fantasy uppercase tracking-[0.16em] text-sm active:scale-95 tv-button-primary"
            >
              {itemToEdit ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        </form>
    </ModalFrame>
  );
}

export default AddItemModal;
