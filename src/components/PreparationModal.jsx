import React, { useEffect, useState } from 'react';
import { X, ImagePlus, Trash2, Fingerprint, Plus, NotebookPen } from 'lucide-react';
import { PROFILE_PROMPT_AVATARS, resolveDisplayAvatar } from '../lib/placeholders';
import { STAT_SUGGESTIONS } from '../data/mockData';
import ModalFrame from './ModalFrame';

function getInitialPreparationState(preparation) {
  return {
    id: preparation?.id || null,
    name: preparation?.name || '',
    subtitle: preparation?.subtitle || '',
    hp: Number(preparation?.hp ?? 0),
    maxHp: Number(preparation?.maxHp ?? preparation?.hp ?? 0),
    ac: Number(preparation?.ac ?? 10),
    initMod: Number(preparation?.initMod ?? 0),
    bio: preparation?.bio || '',
    imageUrl: preparation?.imageUrl || null,
    customStats: Array.isArray(preparation?.customStats) ? preparation.customStats : [],
    sourceUid: preparation?.sourceUid || null,
    sourceType: preparation?.sourceType || 'manual',
  };
}

export default function PreparationModal({ isOpen, preparation, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState(getInitialPreparationState(preparation));
  const [pendingFile, setPendingFile] = useState(null);
  const [showAllPromptAvatars, setShowAllPromptAvatars] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialPreparationState(preparation));
    setPendingFile(null);
    setShowAllPromptAvatars(false);
  }, [isOpen, preparation]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    handleChange('imageUrl', URL.createObjectURL(file));
  };

  const handlePickAvatar = (url) => {
    setPendingFile(null);
    handleChange('imageUrl', url);
  };

  const addCustomStat = () => {
    const nextStats = [...(formData.customStats || []), { id: Date.now(), name: '', value: 10 }];
    handleChange('customStats', nextStats);
  };

  const updateCustomStat = (id, field, value) => {
    const nextStats = (formData.customStats || []).map((stat) => (
      stat.id === id ? { ...stat, [field]: value } : stat
    ));
    handleChange('customStats', nextStats);
  };

  const removeCustomStat = (id) => {
    handleChange('customStats', (formData.customStats || []).filter((stat) => stat.id !== id));
  };

  const handleSave = () => {
    onSave?.({
      ...formData,
      hp: Number(formData.hp) || 0,
      maxHp: Number(formData.maxHp) || 0,
      ac: Number(formData.ac) || 10,
      initMod: Number(formData.initMod) || 0,
      customStats: formData.customStats || [],
    }, pendingFile);
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={preparation ? 'Voorbereiding Bewerken' : 'Nieuwe Voorbereiding'}
      subtitle="Werk een voorbereid profiel uit met stats, verborgen eigenschappen en lore."
      icon={NotebookPen}
      accent="amber"
      maxWidthClassName="max-w-md"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
        <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          <div className="mb-4 rounded-2xl border border-stone-800/70 bg-stone-950/55 p-4 shadow-inner">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-4 border-stone-900 bg-stone-800 shadow-xl transition-all hover:border-amber-700/50 md:h-32 md:w-32">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <img
              src={resolveDisplayAvatar(formData.imageUrl, formData.id || 'new-preparation')}
              alt="Voorbereidingsportret"
              className="h-full w-full object-cover object-center scale-[1.18]"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-stone-950/60 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-6 w-6 text-stone-200" />
            </div>
          </label>

          <div className="mb-0 flex w-full flex-col gap-2 sm:mb-2 sm:w-auto sm:flex-row sm:items-center">
            {preparation ? (
              <button
                type="button"
                onClick={() => onDelete?.(preparation.id)}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-900/40 bg-rose-950/20 p-2 text-rose-300 transition-colors hover:bg-rose-900/30 sm:h-auto sm:w-auto"
                title="Verwijder voorbereiding"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-[11px] font-fantasy uppercase tracking-[0.14em] sm:hidden">Verwijderen</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 px-4 font-fantasy text-xs uppercase tracking-[0.16em] text-stone-100 shadow-sm transition-all hover:from-amber-600 hover:to-amber-500 sm:w-auto"
            >
              {preparation ? 'Opslaan' : 'Nieuw'}
            </button>
          </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col space-y-5">
            <div>
              <input
                autoFocus
                type="text"
                value={formData.name || ''}
                onChange={(event) => handleChange('name', event.target.value)}
                className="w-full border-b border-stone-700 bg-transparent px-1 py-1 text-2xl font-fantasy font-bold text-stone-100 outline-none transition-colors focus:border-amber-500 md:text-3xl"
                placeholder="Karakter Naam"
              />
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(event) => handleChange('subtitle', event.target.value)}
                className="mt-1 w-full border-b border-transparent bg-transparent px-1 py-1 text-sm italic text-stone-400 outline-none transition-colors hover:border-stone-700 focus:border-stone-500"
                placeholder="Rol / klasse / archetype"
              />
            </div>

            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">Of kies een avatar</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {PROFILE_PROMPT_AVATARS.slice(0, 18).map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => handlePickAvatar(url)}
                    className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      formData.imageUrl === url
                        ? 'border-amber-500 shadow-[0_0_6px_rgba(217,119,6,0.5)]'
                        : 'border-stone-700 hover:border-amber-700/60'
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover object-center scale-[1.2]" loading="lazy" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAllPromptAvatars((value) => !value)}
                  className={`h-10 w-10 shrink-0 rounded-lg border-2 bg-stone-900/60 font-fantasy text-lg text-stone-300 transition-all ${
                    showAllPromptAvatars ? 'border-amber-500 bg-amber-950/30' : 'border-stone-700 hover:border-amber-700/60'
                  }`}
                  title="Toon alle prompt avatars"
                >
                  ...
                </button>
              </div>

              {showAllPromptAvatars && (
                <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950/40 p-2 no-scrollbar">
                  <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                    {PROFILE_PROMPT_AVATARS.map((url) => (
                      <button
                        key={`all-${url}`}
                        type="button"
                        onClick={() => handlePickAvatar(url)}
                        className={`aspect-square overflow-hidden rounded-md border transition-all ${
                          formData.imageUrl === url
                            ? 'border-amber-500 shadow-[0_0_6px_rgba(217,119,6,0.5)]'
                            : 'border-stone-700 hover:border-amber-700/60'
                        }`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover object-center scale-[1.2]" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-stone-800/50 bg-stone-950/50 p-3 shadow-inner">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">Snelle profielwaarden</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center justify-center p-2">
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">HP</span>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      value={formData.hp || 0}
                      onChange={(event) => handleChange('hp', event.target.value)}
                      className="hide-arrows w-8 border-b border-stone-700 bg-transparent text-center text-lg font-bold text-amber-400 outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-stone-600">/</span>
                    <input
                      type="number"
                      value={formData.maxHp || 0}
                      onChange={(event) => handleChange('maxHp', event.target.value)}
                      className="hide-arrows w-8 border-b border-stone-700 bg-transparent text-center text-xs font-bold text-stone-500 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-x border-stone-800/50 p-2">
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">AC</span>
                  <input
                    type="number"
                    value={formData.ac || 10}
                    onChange={(event) => handleChange('ac', event.target.value)}
                    className="hide-arrows w-10 border-b border-stone-700 bg-transparent text-center text-lg font-bold text-stone-200 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex flex-col items-center justify-center p-2">
                  <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">Init Mod</span>
                  <input
                    type="number"
                    value={formData.initMod || 0}
                    onChange={(event) => handleChange('initMod', event.target.value)}
                    className="hide-arrows w-10 border-b border-stone-700 bg-transparent text-center text-lg font-bold text-stone-200 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <Fingerprint className="h-3 w-3" /> Verborgen eigenschappen
              </h4>
              <div className="flex flex-wrap gap-2">
                {(formData.customStats || []).map((stat) => (
                  <div key={stat.id} className="flex items-center overflow-hidden rounded-lg border border-stone-800/50 bg-stone-950/50 shadow-inner transition-colors focus-within:border-amber-700/50">
                    <input
                      list="preparation-stat-options"
                      value={stat.name}
                      onChange={(event) => {
                        const cleanAbbr = event.target.value.split(' - ')[0].trim().toUpperCase();
                        updateCustomStat(stat.id, 'name', cleanAbbr);
                      }}
                      className="w-16 border-r border-stone-800/50 bg-transparent p-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-amber-600 outline-none placeholder-stone-700"
                      placeholder="NAAM"
                    />
                    <input
                      type="number"
                      value={stat.value}
                      onChange={(event) => updateCustomStat(stat.id, 'value', event.target.value)}
                      className="hide-arrows w-10 bg-transparent p-1 text-center text-sm font-bold text-stone-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomStat(stat.id)}
                      className="bg-stone-900/50 p-1.5 text-stone-600 transition-colors hover:bg-stone-800 hover:text-rose-500"
                      title="Verwijder eigenschap"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCustomStat}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-stone-700 bg-stone-950/30 text-stone-500 transition-colors hover:border-amber-700/50 hover:text-amber-500"
                  title="Voeg eigenschap toe"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <datalist id="preparation-stat-options">
                {STAT_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion.abbr} value={`${suggestion.abbr} - ${suggestion.name}`} />
                ))}
              </datalist>
            </div>

            <div className="mt-4 flex min-h-[160px] flex-1 flex-col">
              <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <NotebookPen className="h-3 w-3" /> Notities & Lore
              </h4>
              <textarea
                value={formData.bio || ''}
                onChange={(event) => handleChange('bio', event.target.value)}
                placeholder="Achtergrondverhaal, spreuken, wapens of tijdelijke effecten..."
                className="w-full flex-1 resize-none rounded-lg border border-stone-800 bg-stone-950/40 p-3 text-sm leading-relaxed text-stone-300 transition-colors focus:border-amber-700/50 focus:outline-none"
              />
            </div>
          </div>
        </div>
    </ModalFrame>
  );
}