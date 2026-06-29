import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, UserPlus, ImagePlus } from 'lucide-react';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';
import Button from './Button';

export default function AddNpcModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState(15);
  const [ac, setAc] = useState(12);
  const [initMod, setInitMod] = useState(2);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setHp(15);
      setAc(12);
      setInitMod(2);
      setAvatarUrl(null);
      setAvatarFile(null);
      setIsRevealed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name,
      subtitle: 'Vijand',
      hp: Number(hp),
      maxHp: Number(hp),
      ac: Number(ac),
      initMod: Number(initMod),
      avatar: avatarUrl,
      isRevealed,
    }, avatarFile);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      setAvatarFile(file);
    }
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="NPC"
      icon={UserPlus}
    >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          <div className="flex justify-center mb-1">
            <label className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--tv-tone-enemy),transparent_55%)] tv-panel-inset shadow-inner transition-all hover:opacity-90 md:h-24 md:w-24 group">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {avatarUrl ? (
                <>
                  <TvImage src={avatarUrl} alt="NPC Portret preview" className="opacity-80 group-hover:opacity-50 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImagePlus className="w-6 h-6 tv-text drop-shadow-md" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 tv-muted group-hover:tv-tone-enemy-text transition-colors">
                  <ImagePlus className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="tv-label mb-1.5 block">Naam</label>
            <input 
              autoFocus
              type="text" 
              required
              placeholder="Bijv. Goblin Aanvoerder"
              value={name}
              onChange={e => setName(e.target.value)}
              className="tv-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 tv-panel-inset p-3 sm:grid-cols-3">
            <div>
              <label className="tv-label mb-1.5 block">HP</label>
              <input 
                type="number" 
                required
                value={hp}
                onChange={e => setHp(e.target.value)}
                className="tv-field hide-arrows text-center"
              />
            </div>
            <div>
              <label className="tv-label mb-1.5 block">AC</label>
              <input 
                type="number" 
                required
                value={ac}
                onChange={e => setAc(e.target.value)}
                className="tv-field hide-arrows text-center"
              />
            </div>
            <div>
              <label className="tv-label mb-1.5 block" title="Initiative Modifier">Init</label>
              <input 
                type="number" 
                required
                value={initMod}
                onChange={e => setInitMod(e.target.value)}
                className="tv-field hide-arrows text-center col-span-2 sm:col-span-1"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRevealed((current) => !current)}
            className="tv-profile-inline-option justify-between text-left"
          >
            <span className="flex min-w-0 items-center gap-2">
              {isRevealed ? <Eye className="h-4 w-4 tv-accent" /> : <EyeOff className="h-4 w-4 tv-muted" />}
              <span>
                <span className="block text-sm tv-text">
                  {isRevealed ? 'Zichtbaar voor spelers' : 'Verborgen voor spelers'}
                </span>
                <span className="mt-0.5 block text-xs leading-5 tv-muted">
                  Verborgen NPC’s staan niet in de spelers-slagorde.
                </span>
              </span>
            </span>
          </button>

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" block onClick={onClose}>
              Annuleren
            </Button>
            <Button variant="primary" block type="submit">
              Toevoegen
            </Button>
          </div>
        </form>
    </ModalFrame>
  );
}
