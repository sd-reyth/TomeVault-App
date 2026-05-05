import React, { useState, useEffect } from 'react';
import { Crown, X, ImagePlus, Fingerprint, Plus, NotebookPen } from 'lucide-react';
import {
  resolveDisplayAvatar,
  PROFILE_PROMPT_AVATARS,
} from '../lib/placeholders';
import { STAT_SUGGESTIONS } from '../data/mockData';

const CHAT_ACCENT_COLORS = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  teal: '#14b8a6',
  emerald: '#10b981',
  lime: '#84cc16',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#f43f5e',
  pink: '#ec4899',
  fuchsia: '#d946ef',
  cyan: '#22d3ee',
};

function CharacterProfileModal({ isOpen, onClose, character, role, currentPlayerId, onSave, onTransferGm, onSaveAsPreparation, chatColor }) {
  const [formData, setFormData] = useState({});
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [showAllPromptAvatars, setShowAllPromptAvatars] = useState(false);

  useEffect(() => {
    if (character) {
      setFormData({ ...character });
      setPendingAvatarFile(null);
      setConfirmTransfer(false);
      setShowAllPromptAvatars(false);
    }
  }, [character]);

  if (!isOpen || !character) return null;

  const isGM = role === 'gm';
  const isMine = character.id === currentPlayerId;
  const canEdit = isGM || isMine;
  const canTransferGm = isGM && !isMine && !character.isNpc;
  const canSaveAsPreparation = isGM && !character.isNpc;
  const bannerAccent = CHAT_ACCENT_COLORS[chatColor] || null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...formData,
      hp: Number(formData.hp) || 0,
      maxHp: Number(formData.maxHp) || 0,
      ac: Number(formData.ac) || 0,
      initMod: Number(formData.initMod) || 0,
      customStats: formData.customStats || []
    }, pendingAvatarFile);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPendingAvatarFile(file);
      handleChange('avatar', URL.createObjectURL(file));
    }
  };

  const handlePickAvatar = (url) => {
    setPendingAvatarFile(null);
    handleChange('avatar', url);
  };

  const addCustomStat = () => {
    const newStats = [...(formData.customStats || []), { id: Date.now(), name: '', value: 10 }];
    handleChange('customStats', newStats);
  };

  const updateCustomStat = (id, field, val) => {
    const newStats = (formData.customStats || []).map(s => s.id === id ? { ...s, [field]: val } : s);
    handleChange('customStats', newStats);
  };

  const removeCustomStat = (id) => {
    const newStats = (formData.customStats || []).filter(s => s.id !== id);
    handleChange('customStats', newStats);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700/50 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Banner */}
        <div
          className={`h-24 md:h-32 w-full relative shrink-0 z-0 ${character.isNpc ? 'bg-gradient-to-r from-rose-950 to-rose-900' : 'bg-gradient-to-r from-amber-950 to-stone-800'}`}
          style={bannerAccent ? { background: `linear-gradient(120deg, ${bannerAccent}55, #0b0b16 70%)` } : undefined}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-20 pointer-events-none" />
          <button onClick={onClose} className="absolute top-4 right-4 text-stone-300 hover:text-white bg-stone-950/50 rounded-md p-1 backdrop-blur-sm transition-colors z-10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Section */}
        <div className="px-6 flex justify-between items-end -mt-12 md:-mt-16 mb-2 relative z-20 shrink-0">
          <label className={`relative group w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 ${character.isNpc ? 'border-rose-950 bg-rose-900/50' : 'border-stone-900 bg-stone-800'} flex items-center justify-center overflow-hidden transition-all shadow-xl ${canEdit ? 'cursor-pointer hover:border-amber-700/50' : ''}`}>
            {canEdit && <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />}
            {(() => {
              const displayAvatar = resolveDisplayAvatar(formData.avatar, character.id);
              return (
                <>
                  <img
                    src={displayAvatar}
                    alt="Portret"
                    className="w-full h-full object-cover object-center scale-[1.18]"
                  />
                  {canEdit && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImagePlus className="w-6 h-6 text-stone-200" />
                    </div>
                  )}
                </>
              );
            })()}
          </label>
          
          {canEdit && (
            <button onClick={handleSave} className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-100 px-4 py-2 rounded-lg font-fantasy tracking-widest text-xs shadow-lg transition-all mb-2">
              Opslaan
            </button>
          )}
        </div>

        {/* Scrollbare Inhoud */}
        <div className="px-6 pb-6 pt-2 flex-1 overflow-y-auto no-scrollbar relative flex flex-col z-10">
          <div className="space-y-5 flex-1 flex flex-col">
            <div>
              {canEdit ? (
                <>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full bg-transparent border-b border-stone-700 focus:border-amber-500 text-2xl md:text-3xl font-fantasy font-bold text-stone-100 px-1 py-1 outline-none transition-colors"
                    placeholder="Karakter Naam"
                  />
                  <input 
                    type="text" 
                    value={formData.subtitle || ''} 
                    onChange={e => handleChange('subtitle', e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-stone-700 focus:border-stone-500 text-sm font-story italic text-stone-400 px-1 py-1 mt-1 outline-none transition-colors"
                    placeholder="Ras / Klasse (bijv. Elf Ranger)"
                  />
                </>
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-fantasy font-bold text-stone-100 px-1">{formData.name}</h2>
                  <p className="text-sm font-story italic text-stone-400 px-1 mt-1">{formData.subtitle}</p>
                </>
              )}
            </div>

            {canEdit && (
              <div>
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Of kies een avatar</div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {PROFILE_PROMPT_AVATARS.slice(0, 18).map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handlePickAvatar(url)}
                      className={`shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                        formData.avatar === url
                          ? 'border-amber-500 shadow-[0_0_6px_rgba(217,119,6,0.5)]'
                          : 'border-stone-700 hover:border-amber-700/60'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover object-center scale-[1.2]" loading="lazy" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAllPromptAvatars((value) => !value)}
                    className={`shrink-0 w-10 h-10 rounded-lg border-2 transition-all text-stone-300 font-fantasy text-lg ${showAllPromptAvatars ? 'border-amber-500 bg-amber-950/30' : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/60'}`}
                    title="Toon alle prompt avatars"
                  >
                    ...
                  </button>
                </div>

                {showAllPromptAvatars && (
                  <div className="mt-3 max-h-52 overflow-y-auto no-scrollbar rounded-lg border border-stone-800 bg-stone-950/40 p-2">
                    <div className="grid grid-cols-6 gap-1.5">
                      {PROFILE_PROMPT_AVATARS.map((url) => (
                        <button
                          key={`all-${url}`}
                          type="button"
                          onClick={() => handlePickAvatar(url)}
                          className={`aspect-square rounded-md overflow-hidden border transition-all ${formData.avatar === url ? 'border-amber-500 shadow-[0_0_6px_rgba(217,119,6,0.5)]' : 'border-stone-700 hover:border-amber-700/60'}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover object-center scale-[1.2]" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {canSaveAsPreparation && (
              <div className="rounded-lg border border-stone-800/70 bg-stone-950/50 p-3">
                <button
                  type="button"
                  onClick={() => onSaveAsPreparation?.(character)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2 text-xs font-fantasy tracking-wider text-stone-200 transition-colors hover:border-amber-700/50 hover:text-amber-300"
                >
                  Bewaar huidig profiel als voorbereiding
                </button>
                <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                  Slaat naam, rol of titel, avatar, profielwaarden, verborgen eigenschappen en bio op in de GM-bibliotheek.
                </p>
              </div>
            )}

            {canTransferGm && (
              <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
                {!confirmTransfer ? (
                  <button
                    type="button"
                    onClick={() => setConfirmTransfer(true)}
                    className="w-full flex items-center justify-center gap-2 bg-amber-800/30 hover:bg-amber-700/40 border border-amber-700/50 text-amber-300 py-2 rounded-lg text-xs font-fantasy tracking-wider transition-colors"
                  >
                    <Crown className="w-4 h-4" /> Maak {formData.name || 'speler'} de nieuwe GM
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-amber-200/90 font-story leading-relaxed">
                      Weet je zeker dat je GM-rechten overdraagt? Deze keuze is blijvend voor deze sessie, maar de nieuwe GM kan jou later weer terugzetten.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmTransfer(false)}
                        className="flex-1 py-2 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 text-xs font-fantasy tracking-wider"
                      >
                        Annuleer
                      </button>
                      <button
                        type="button"
                        onClick={() => onTransferGm?.(formData)}
                        className="flex-1 py-2 rounded-lg border border-amber-700/60 bg-amber-700/30 text-amber-200 hover:bg-amber-600/40 text-xs font-fantasy tracking-wider"
                      >
                        Bevestig overdracht
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-stone-950/50 p-3 rounded-xl border border-stone-800/50 shadow-inner">
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">HP</span>
                <div className="flex items-baseline gap-1">
                  {canEdit ? (
                    <input type="number" value={formData.hp || 0} onChange={e => handleChange('hp', e.target.value)} className="w-8 bg-transparent text-center font-bold text-lg text-emerald-400 outline-none hide-arrows border-b border-stone-700 focus:border-amber-500" />
                  ) : (
                    <span className="font-bold text-lg text-emerald-400">{formData.hp}</span>
                  )}
                  <span className="text-stone-600 text-xs">/</span>
                  {canEdit ? (
                    <input type="number" value={formData.maxHp || 0} onChange={e => handleChange('maxHp', e.target.value)} className="w-8 bg-transparent text-center font-bold text-xs text-stone-500 outline-none hide-arrows border-b border-stone-700 focus:border-amber-500" />
                  ) : (
                    <span className="font-bold text-xs text-stone-500">{formData.maxHp}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-2 border-l border-r border-stone-800/50">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">AC</span>
                {canEdit ? (
                  <input type="number" value={formData.ac || 0} onChange={e => handleChange('ac', e.target.value)} className="w-10 bg-transparent text-center font-bold text-lg text-stone-200 outline-none hide-arrows border-b border-stone-700 focus:border-amber-500" />
                ) : (
                  <span className="font-bold text-lg text-stone-200">{formData.ac}</span>
                )}
              </div>
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1" title="Initiative Modifier">Init Mod</span>
                {canEdit ? (
                  <input type="number" value={formData.initMod || 0} onChange={e => handleChange('initMod', e.target.value)} className="w-10 bg-transparent text-center font-bold text-lg text-stone-200 outline-none hide-arrows border-b border-stone-700 focus:border-amber-500" />
                ) : (
                  <span className="font-bold text-lg text-stone-200">{formData.initMod >= 0 ? `+${formData.initMod}` : formData.initMod}</span>
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-col">
                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2" title="Alleen zichtbaar voor jou en de Game Master">
                  <Fingerprint className="w-3 h-3" /> Verborgen Eigenschappen
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(formData.customStats || []).map(stat => (
                    <div key={stat.id} className="flex items-center bg-stone-950/50 border border-stone-800/50 rounded-lg overflow-hidden shadow-inner focus-within:border-amber-700/50 transition-colors">
                      <input 
                        list="stat-options" 
                        value={stat.name}
                        onChange={e => {
                          const cleanAbbr = e.target.value.split(' - ')[0].trim().toUpperCase();
                          updateCustomStat(stat.id, 'name', cleanAbbr);
                        }}
                        className="w-16 bg-transparent text-[10px] font-bold text-amber-600 uppercase tracking-widest p-1.5 outline-none border-r border-stone-800/50 text-center placeholder-stone-700"
                        placeholder="NAAM"
                      />
                      <input 
                        type="number" 
                        value={stat.value} 
                        onChange={e => updateCustomStat(stat.id, 'value', e.target.value)}
                        className="w-10 bg-transparent text-center text-sm font-bold text-stone-200 outline-none hide-arrows p-1"
                      />
                      <button onClick={() => removeCustomStat(stat.id)} className="p-1.5 text-stone-600 hover:text-rose-500 transition-colors bg-stone-900/50 hover:bg-stone-800" title="Verwijder eigenschap">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addCustomStat} className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-stone-700 text-stone-500 hover:text-amber-500 hover:border-amber-700/50 transition-colors bg-stone-950/30" title="Voeg eigenschap toe">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <datalist id="stat-options">
                  {STAT_SUGGESTIONS.map(s => (
                    <option key={s.abbr} value={`${s.abbr} - ${s.name}`} />
                  ))}
                </datalist>
              </div>
            )}

            {/* Lore / Bio Sectie */}
            <div className="flex-1 flex flex-col min-h-[120px] mt-4">
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <NotebookPen className="w-3 h-3" /> Notities & Lore
              </h4>
              {canEdit ? (
                <textarea 
                  value={formData.bio || ''} 
                  onChange={e => handleChange('bio', e.target.value)}
                  placeholder="Achtergrondverhaal, spreuken, wapens of tijdelijke effecten..."
                  className="w-full flex-1 bg-stone-950/40 border border-stone-800 rounded-lg p-3 text-sm text-stone-300 font-story leading-relaxed focus:outline-none focus:border-amber-700/50 transition-colors resize-none"
                />
              ) : (
                <div className="w-full flex-1 bg-stone-950/40 border border-stone-800 rounded-lg p-3 text-sm text-stone-300 font-story leading-relaxed overflow-y-auto">
                  {formData.bio || <span className="italic text-stone-600">Geen lore vastgelegd...</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterProfileModal;
