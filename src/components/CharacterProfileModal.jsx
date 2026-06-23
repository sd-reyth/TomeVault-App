import React, { useState, useEffect } from 'react';
import { Crown, X, ImagePlus, Fingerprint, Plus, NotebookPen, UserRound } from 'lucide-react';
import {
  resolveDisplayAvatar,
  PROFILE_PROMPT_AVATARS,
} from '../lib/placeholders';
import { STAT_SUGGESTIONS } from '../data/mockData';
import { sendChatMessage } from '../lib/chatUtils';
import ModalFrame from './ModalFrame';

const CHAT_ACCENT_COLORS = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  emerald: '#10b981',
  lime: '#84cc16',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#f43f5e',
  pink: '#ec4899',
  fuchsia: '#d946ef',
  cyan: '#22d3ee',
};

function CharacterProfileModal({ isOpen, onClose, character, role, currentPlayerId, onSave, onTransferGm, chatColor, onOpenInitiativeSwap, initiativeOrder }) {
  const [formData, setFormData] = useState({});
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [showAllPromptAvatars, setShowAllPromptAvatars] = useState(false);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (character) {
      setFormData({ ...character });
      setLevel(Number(character.level) || 1);
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
  const canSwapInitiative = Boolean(
    isGM
    && character?.hasAlertFeat
    && Number.isFinite(Number(character?.init))
    && Array.isArray(initiativeOrder)
    && initiativeOrder.includes(character.id)
  );
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

  const handleLevelChange = (change) => {
    const newLevel = Math.max(1, level + change);
    setLevel(newLevel);
    onSave?.(character.id, newLevel);

    if (character.type === 'player' || character.type === 'pet') {
      const message = `${character.name} ${change > 0 ? 'is een level gestegen' : 'is een level gedaald'} en is nu level ${newLevel}! Controleer de regels van je TTRPG om te zien wat je moet weten en/of voorbereiden.`;
      sendChatMessage(message, 'system');
    }
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Karakterprofiel"
      subtitle={character.isNpc ? 'NPC profiel en gevechtsgegevens' : 'Spelerprofiel, eigenschappen en lore'}
      icon={UserRound}
      maxWidthClassName="max-w-md"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
        <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar px-4 pb-4 pt-4 sm:px-6 sm:pb-6" style={bannerAccent ? { background: `linear-gradient(120deg, ${bannerAccent}22, rgba(12,10,15,0.96) 40%)` } : undefined}>
          <div className="mb-4 rounded-2xl border border-white/10 bg-zinc-950/72 p-4 shadow-inner">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className={`relative group flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-2 md:h-32 md:w-32 ${character.isNpc ? 'border-rose-800/45 bg-rose-950/25' : 'border-white/15 bg-white/5'} transition-all shadow-xl ${canEdit ? 'cursor-pointer hover:border-[var(--tv-accent)]/55' : ''}`}>
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
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/62 opacity-0 transition-opacity group-hover:opacity-100">
                      <ImagePlus className="w-6 h-6 text-stone-200" />
                    </div>
                  )}
                </>
              );
            })()}
          </label>
          
          {canEdit && (
            <button onClick={handleSave} className="mb-0 inline-flex h-9 w-full items-center justify-center rounded-lg px-4 text-xs font-fantasy uppercase tracking-[0.16em] sm:mb-2 sm:w-auto tv-button-primary">
              Opslaan
            </button>
          )}
            </div>
          </div>

          <div className="space-y-5 flex-1 flex flex-col">
            <div>
              {canEdit ? (
                <>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full bg-transparent border-b border-white/10 focus:border-[var(--tv-accent)]/70 text-2xl md:text-3xl font-fantasy font-bold text-stone-100 px-1 py-1 outline-none transition-colors"
                    placeholder="Karakter Naam"
                  />
                  <input 
                    type="text" 
                    value={formData.subtitle || ''} 
                    onChange={e => handleChange('subtitle', e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/20 text-sm font-story italic text-stone-400 px-1 py-1 mt-1 outline-none transition-colors"
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
                          ? 'border-[var(--tv-accent)] shadow-[0_0_6px_color-mix(in_srgb,var(--tv-accent),transparent_50%)]'
                          : 'border-white/10 hover:border-[var(--tv-accent)]/60'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover object-center scale-[1.2]" loading="lazy" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAllPromptAvatars((value) => !value)}
                    className={`shrink-0 w-10 h-10 rounded-lg border-2 text-lg font-fantasy text-stone-300 transition-all ${showAllPromptAvatars ? 'border-[var(--tv-accent)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_70%)]' : 'border-white/10 bg-white/5 hover:border-[var(--tv-accent)]/60 hover:bg-white/7'}`}
                    title="Toon alle prompt avatars"
                  >
                    ...
                  </button>
                </div>

                {showAllPromptAvatars && (
                  <div className="mt-3 max-h-52 overflow-y-auto no-scrollbar rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                      {PROFILE_PROMPT_AVATARS.map((url) => (
                        <button
                          key={`all-${url}`}
                          type="button"
                          onClick={() => handlePickAvatar(url)}
                          className={`aspect-square rounded-md overflow-hidden border transition-all ${formData.avatar === url ? 'border-[var(--tv-accent)] shadow-[0_0_6px_color-mix(in_srgb,var(--tv-accent),transparent_50%)]' : 'border-white/10 hover:border-[var(--tv-accent)]/60'}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover object-center scale-[1.2]" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {canTransferGm && (
              <div className="rounded-lg border border-[var(--tv-accent)]/40 bg-[color-mix(in_srgb,var(--tv-accent),transparent_80%)] p-3">
                {!confirmTransfer ? (
                  <button
                    type="button"
                    onClick={() => setConfirmTransfer(true)}
                    className="w-full flex items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--tv-accent),transparent_70%)] hover:bg-[color-mix(in_srgb,var(--tv-accent),transparent_60%)] border border-[var(--tv-accent)]/50 text-[var(--tv-accent)] py-2 rounded-lg text-xs font-fantasy tracking-wider transition-colors"
                  >
                    <Crown className="w-4 h-4" /> Maak {formData.name || 'speler'} de nieuwe GM
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[var(--tv-accent)]/90 font-story leading-relaxed">
                      Weet je zeker dat je GM-rechten overdraagt? Deze keuze is blijvend voor deze sessie, maar de nieuwe GM kan jou later weer terugzetten.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
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
                        className="flex-1 py-2 rounded-lg border border-[var(--tv-accent)]/60 bg-[color-mix(in_srgb,var(--tv-accent),transparent_70%)] text-[var(--tv-accent)] hover:bg-[color-mix(in_srgb,var(--tv-accent),transparent_60%)] text-xs font-fantasy tracking-wider"
                      >
                        Bevestig overdracht
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 bg-white/5 p-3 rounded-xl border border-white/10 shadow-inner">
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">HP</span>
                <div className="flex items-baseline gap-1">
                  {canEdit ? (
                    <input type="number" value={formData.hp || 0} onChange={e => handleChange('hp', e.target.value)} className="w-8 bg-transparent text-center font-bold text-lg text-[var(--tv-accent)] outline-none hide-arrows border-b border-white/10 focus:border-[var(--tv-accent)]/70" />
                  ) : (
                    <span className="font-bold text-lg text-[var(--tv-accent)]">{formData.hp}</span>
                  )}
                  <span className="text-stone-600 text-xs">/</span>
                  {canEdit ? (
                    <input type="number" value={formData.maxHp || 0} onChange={e => handleChange('maxHp', e.target.value)} className="w-8 bg-transparent text-center font-bold text-xs text-stone-500 outline-none hide-arrows border-b border-white/10 focus:border-[var(--tv-accent)]/70" />
                  ) : (
                    <span className="font-bold text-xs text-stone-500">{formData.maxHp}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-2 border-l border-r border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">AC</span>
                {canEdit ? (
                  <input type="number" value={formData.ac || 0} onChange={e => handleChange('ac', e.target.value)} className="w-10 bg-transparent text-center font-bold text-lg text-stone-200 outline-none hide-arrows border-b border-white/10 focus:border-[var(--tv-accent)]/70" />
                ) : (
                  <span className="font-bold text-lg text-stone-200">{formData.ac}</span>
                )}
              </div>
              <div className="flex flex-col items-center justify-center p-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1" title="Initiative Modifier">Init Mod</span>
                {canEdit ? (
                  <input type="number" value={formData.initMod || 0} onChange={e => handleChange('initMod', e.target.value)} className="w-10 bg-transparent text-center font-bold text-lg text-stone-200 outline-none hide-arrows border-b border-white/10 focus:border-[var(--tv-accent)]/70" />
                ) : (
                  <span className="font-bold text-lg text-stone-200">{formData.initMod >= 0 ? `+${formData.initMod}` : formData.initMod}</span>
                )}
              </div>
            </div>

            {isGM ? (
              <div className="rounded-lg border border-[var(--tv-accent)]/40 bg-[color-mix(in_srgb,var(--tv-accent),transparent_80%)] p-3 space-y-2">
                <h4 className="text-[10px] font-bold text-[var(--tv-accent)]/80 uppercase tracking-widest">Alert Feat (2024)</h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasAlertFeat || false}
                    onChange={(event) => handleChange('hasAlertFeat', event.target.checked)}
                    className="h-4 w-4 rounded border-stone-700 bg-stone-950"
                  />
                  <span className="text-[11px] font-bold text-stone-200">Heeft Alert Feat</span>
                </label>

                {formData.hasAlertFeat ? (
                  <div className="space-y-2 pl-7">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-400">Proficiency Bonus:</span>
                      <input
                        type="number"
                        value={formData.proficiencyBonus || 2}
                        onChange={(event) => handleChange('proficiencyBonus', parseInt(event.target.value, 10) || 2)}
                        className="hide-arrows w-12 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-[11px] font-bold text-[var(--tv-accent)] outline-none focus:border-[var(--tv-accent)]"
                      />
                      <span className="text-[10px] text-stone-500">op initiative</span>
                    </div>

                    {canSwapInitiative ? (
                      <button
                        type="button"
                        onClick={() => onOpenInitiativeSwap?.(character)}
                        className="rounded-lg border border-[var(--tv-accent)]/60 bg-[color-mix(in_srgb,var(--tv-accent),transparent_70%)] px-3 py-1.5 text-[11px] font-fantasy tracking-[0.12em] text-[var(--tv-accent)] transition-colors hover:border-[var(--tv-accent)]/70 hover:bg-[color-mix(in_srgb,var(--tv-accent),transparent_60%)]"
                      >
                        Initiative Swap
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {canEdit && (
              <div className="flex flex-col">
                <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-2" title="Alleen zichtbaar voor jou en de Game Master">
                  <Fingerprint className="w-3 h-3" /> Verborgen Eigenschappen
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(formData.customStats || []).map(stat => (
                    <div key={stat.id} className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden shadow-inner focus-within:border-[var(--tv-accent)]/50 transition-colors">
                      <input 
                        list="stat-options" 
                        value={stat.name}
                        onChange={e => {
                          const cleanAbbr = e.target.value.split(' - ')[0].trim().toUpperCase();
                          updateCustomStat(stat.id, 'name', cleanAbbr);
                        }}
                        className="w-16 bg-transparent text-[10px] font-bold text-[var(--tv-accent)]/80 uppercase tracking-widest p-1.5 outline-none border-r border-white/10 text-center placeholder-stone-600"
                        placeholder="NAAM"
                      />
                      <input 
                        type="number" 
                        value={stat.value} 
                        onChange={e => updateCustomStat(stat.id, 'value', e.target.value)}
                        className="w-10 bg-transparent text-center text-sm font-bold text-stone-200 outline-none hide-arrows p-1"
                      />
                      <button onClick={() => removeCustomStat(stat.id)} className="p-1.5 text-stone-500 hover:text-rose-400 transition-colors bg-rose-950/30 hover:bg-rose-900/40" title="Verwijder eigenschap">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addCustomStat} className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-white/10 text-stone-500 hover:text-[var(--tv-accent)] hover:border-[var(--tv-accent)]/50 transition-colors bg-white/5" title="Voeg eigenschap toe">
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
                  className="w-full flex-1 bg-stone-950/40 border border-stone-800 rounded-lg p-3 text-sm text-stone-300 font-story leading-relaxed focus:outline-none focus:border-[var(--tv-accent)]/50 transition-colors resize-none"
                />
              ) : (
                <div className="w-full flex-1 bg-stone-950/40 border border-stone-800 rounded-lg p-3 text-sm text-stone-300 font-story leading-relaxed overflow-y-auto">
                  {formData.bio || <span className="italic text-stone-600">Geen lore vastgelegd...</span>}
                </div>
              )}
            </div>
          </div>
        </div>
    </ModalFrame>
  );
}

export default CharacterProfileModal;
