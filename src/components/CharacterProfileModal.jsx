import React, { useState, useEffect } from 'react';
import { Crown, X, ImagePlus, Fingerprint, Plus, NotebookPen, UserRound, Save } from 'lucide-react';
import {
  resolveDisplayAvatar,
  PROFILE_PROMPT_AVATARS,
} from '../lib/placeholders';
import { STAT_SUGGESTIONS } from '../data/mockData';
import { sendChatMessage } from '../lib/chatUtils';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';

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
      title={character.isNpc ? 'NPC' : 'Profiel'}
      subtitle={formData.name || character.name}
      icon={UserRound}
      maxWidthClassName="max-w-md"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
        <div
          className="tv-profile-banner flex flex-1 flex-col overflow-y-auto no-scrollbar px-4 pb-4 pt-4 sm:px-6 sm:pb-6"
          style={bannerAccent ? { background: `linear-gradient(120deg, ${bannerAccent}22, color-mix(in srgb, var(--tv-bg-canvas), transparent 4%) 40%)` } : undefined}
        >
          <div className="tv-panel-inset mb-4 rounded-2xl p-4 shadow-inner">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className={`relative group flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-2 md:h-32 md:w-32 ${character.isNpc ? 'tv-tone-enemy-surface' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] tv-panel-inset'} transition-all shadow-xl ${canEdit ? 'cursor-pointer hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)]' : ''}`}>
            {canEdit && <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />}
            {(() => {
              const displayAvatar = resolveDisplayAvatar(formData.avatar, character.id);
              return (
                <>
                  <TvImage
                    src={displayAvatar}
                    alt="Portret"
                  />
                  {canEdit && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_38%)] opacity-0 transition-opacity group-hover:opacity-100">
                      <ImagePlus className="h-6 w-6 tv-text" />
                    </div>
                  )}
                </>
              );
            })()}
          </label>
          
          {canEdit && (
            <button
              onClick={handleSave}
              aria-label="Opslaan"
              title="Opslaan"
              className="tv-button-primary mb-0 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg px-4 sm:mb-2 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              <span className="hidden text-xs font-fantasy uppercase tracking-[0.16em] sm:inline">Opslaan</span>
            </button>
          )}
            </div>
          </div>

          <div className="flex flex-1 flex-col space-y-5">
            <div>
              {canEdit ? (
                <>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => handleChange('name', e.target.value)}
                    className="tv-text w-full border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-transparent px-1 py-1 font-fantasy text-2xl font-bold outline-none transition-colors focus:border-[color-mix(in_srgb,var(--tv-accent),transparent_48%)] md:text-3xl"
                    placeholder="Naam"
                  />
                  <input 
                    type="text" 
                    value={formData.subtitle || ''} 
                    onChange={e => handleChange('subtitle', e.target.value)}
                    className="tv-text-sub mt-1 w-full border-b border-transparent bg-transparent px-1 py-1 font-story text-sm italic outline-none transition-colors hover:border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] focus:border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]"
                    placeholder="Ras / klasse"
                  />
                </>
              ) : (
                <>
                  <h2 className="tv-text px-1 font-fantasy text-2xl font-bold md:text-3xl">{formData.name}</h2>
                  <p className="tv-text-sub mt-1 px-1 font-story text-sm italic">{formData.subtitle}</p>
                </>
              )}
            </div>

            {canEdit && (
              <div>
                <div className="tv-label mb-2">Avatar</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {PROFILE_PROMPT_AVATARS.slice(0, 18).map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handlePickAvatar(url)}
                      className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        formData.avatar === url
                          ? 'border-[color-mix(in_srgb,var(--tv-accent),transparent_40%)] shadow-[0_0_6px_color-mix(in_srgb,var(--tv-accent),transparent_50%)]'
                          : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]'
                      }`}
                    >
                      <TvImage src={url} alt="" loading="lazy" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAllPromptAvatars((value) => !value)}
                    aria-label="Meer avatars"
                    className={`h-10 w-10 shrink-0 rounded-lg border-2 font-fantasy text-lg tv-text transition-all ${showAllPromptAvatars ? 'tv-button-accent-muted' : 'tv-chip-surface'}`}
                  >
                    …
                  </button>
                </div>

                {showAllPromptAvatars && (
                  <div className="tv-panel-inset mt-3 max-h-52 overflow-y-auto rounded-lg p-2 no-scrollbar">
                    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                      {PROFILE_PROMPT_AVATARS.map((url) => (
                        <button
                          key={`all-${url}`}
                          type="button"
                          onClick={() => handlePickAvatar(url)}
                          className={`aspect-square overflow-hidden rounded-md border transition-all ${formData.avatar === url ? 'border-[color-mix(in_srgb,var(--tv-accent),transparent_40%)]' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]'}`}
                        >
                          <TvImage src={url} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {canTransferGm && (
              <div className="rounded-lg border border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] p-3">
                {!confirmTransfer ? (
                  <button
                    type="button"
                    onClick={() => setConfirmTransfer(true)}
                    className="tv-button-accent-muted flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-fantasy tracking-wider"
                  >
                    <Crown className="h-4 w-4" />
                    <span className="truncate">GM → {formData.name || 'speler'}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="tv-meta text-[11px] leading-relaxed">
                      GM-rechten overdraagt voor deze sessie?
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setConfirmTransfer(false)}
                        className="tv-button-secondary flex-1 rounded-lg py-2 text-xs font-fantasy tracking-wider"
                      >
                        Nee
                      </button>
                      <button
                        type="button"
                        onClick={() => onTransferGm?.(formData)}
                        className="tv-button-primary flex-1 rounded-lg py-2 text-xs font-fantasy tracking-wider"
                      >
                        Ja
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="tv-stat-grid">
              <div className="tv-stat-cell">
                <span className="tv-label mb-1">HP</span>
                <div className="flex items-baseline gap-1">
                  {canEdit ? (
                    <input type="number" value={formData.hp || 0} onChange={e => handleChange('hp', e.target.value)} className="tv-stat-input hide-arrows text-lg" />
                  ) : (
                    <span className="text-lg font-bold tv-accent">{formData.hp}</span>
                  )}
                  <span className="tv-muted text-xs">/</span>
                  {canEdit ? (
                    <input type="number" value={formData.maxHp || 0} onChange={e => handleChange('maxHp', e.target.value)} className="tv-stat-input hide-arrows text-xs tv-muted" />
                  ) : (
                    <span className="text-xs font-bold tv-muted">{formData.maxHp}</span>
                  )}
                </div>
              </div>
              <div className="tv-stat-cell tv-stat-cell--divider">
                <span className="tv-label mb-1">AC</span>
                {canEdit ? (
                  <input type="number" value={formData.ac || 0} onChange={e => handleChange('ac', e.target.value)} className="tv-stat-input hide-arrows text-lg tv-text" />
                ) : (
                  <span className="text-lg font-bold tv-text">{formData.ac}</span>
                )}
              </div>
              <div className="tv-stat-cell">
                <span className="tv-label mb-1" title="Initiative Modifier">Init</span>
                {canEdit ? (
                  <input type="number" value={formData.initMod || 0} onChange={e => handleChange('initMod', e.target.value)} className="tv-stat-input hide-arrows text-lg tv-text" />
                ) : (
                  <span className="text-lg font-bold tv-text">{formData.initMod >= 0 ? `+${formData.initMod}` : formData.initMod}</span>
                )}
              </div>
            </div>

            {isGM ? (
              <div className="rounded-lg border border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] space-y-2 p-3">
                <h4 className="tv-label tv-accent">Alert</h4>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.hasAlertFeat || false}
                    onChange={(event) => handleChange('hasAlertFeat', event.target.checked)}
                    className="h-4 w-4 rounded border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-input-surface"
                  />
                  <span className="text-[11px] font-bold tv-text">Alert Feat</span>
                </label>

                {formData.hasAlertFeat ? (
                  <div className="space-y-2 pl-7">
                    <div className="flex items-center gap-2">
                      <span className="tv-label">PB</span>
                      <input
                        type="number"
                        value={formData.proficiencyBonus || 2}
                        onChange={(event) => handleChange('proficiencyBonus', parseInt(event.target.value, 10) || 2)}
                        className="tv-hp-input hide-arrows"
                      />
                    </div>

                    {canSwapInitiative ? (
                      <button
                        type="button"
                        onClick={() => onOpenInitiativeSwap?.(character)}
                        className="tv-button-accent-muted rounded-lg px-3 py-1.5 text-[11px] font-fantasy tracking-[0.12em]"
                      >
                        Swap initiative
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {canEdit && (
              <div className="flex flex-col">
                <h4 className="tv-label mb-2 flex items-center gap-2" title="Alleen zichtbaar voor jou en de GM">
                  <Fingerprint className="h-3 w-3" /> Stats
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(formData.customStats || []).map(stat => (
                    <div key={stat.id} className="tv-chip-surface flex items-center overflow-hidden rounded-lg shadow-inner transition-colors focus-within:border-[color-mix(in_srgb,var(--tv-accent),transparent_52%)]">
                      <input 
                        list="stat-options" 
                        value={stat.name}
                        onChange={e => {
                          const cleanAbbr = e.target.value.split(' - ')[0].trim().toUpperCase();
                          updateCustomStat(stat.id, 'name', cleanAbbr);
                        }}
                        className="tv-accent w-16 border-r border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-transparent p-1.5 text-center text-[10px] font-bold uppercase tracking-widest outline-none placeholder:tv-muted"
                        placeholder="—"
                      />
                      <input 
                        type="number" 
                        value={stat.value} 
                        onChange={e => updateCustomStat(stat.id, 'value', e.target.value)}
                        className="tv-text w-10 hide-arrows bg-transparent p-1 text-center text-sm font-bold outline-none"
                      />
                      <button onClick={() => removeCustomStat(stat.id)} className="p-1.5 tv-muted transition-colors tv-hover-danger" title="Verwijder" aria-label="Verwijder eigenschap">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addCustomStat} className="tv-chip-surface flex h-8 w-8 items-center justify-center rounded-lg border border-dashed tv-muted transition-colors hover:tv-accent hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_52%)]" title="Voeg eigenschap toe" aria-label="Voeg eigenschap toe">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <datalist id="stat-options">
                  {STAT_SUGGESTIONS.map(s => (
                    <option key={s.abbr} value={`${s.abbr} - ${s.name}`} />
                  ))}
                </datalist>
              </div>
            )}

            <div className="mt-4 flex min-h-[120px] flex-1 flex-col">
              <h4 className="tv-label mb-2 flex items-center gap-2">
                <NotebookPen className="h-3 w-3" /> Lore
              </h4>
              {canEdit ? (
                <textarea 
                  value={formData.bio || ''} 
                  onChange={e => handleChange('bio', e.target.value)}
                  placeholder="Achtergrond, spreuken, effecten…"
                  className="tv-field min-h-[120px] flex-1 resize-none font-story leading-relaxed"
                />
              ) : (
                <div className="tv-panel-inset min-h-[120px] flex-1 overflow-y-auto p-3 font-story text-sm leading-relaxed tv-text">
                  {formData.bio || <span className="italic tv-muted">—</span>}
                </div>
              )}
            </div>
          </div>
        </div>
    </ModalFrame>
  );
}

export default CharacterProfileModal;
