import React, { useEffect, useState } from 'react';
import { X, ImagePlus, Trash2, Fingerprint, Plus, NotebookPen } from 'lucide-react';
import { PROFILE_PROMPT_AVATARS, resolveDisplayAvatar } from '../lib/placeholders';
import { STAT_SUGGESTIONS } from '../data/mockData';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';
import Button from './Button';

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

export default function PreparationModal({ isOpen, preparation, onClose, onSave, onDelete, theme }) {
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
      title={preparation ? 'Voorbereiding' : 'Nieuw'}
      subtitle={formData.name || 'Profiel'}
      icon={NotebookPen}
      maxWidthClassName="max-w-md"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
        <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          <div className="tv-panel-inset mb-4 rounded-2xl p-4 shadow-inner">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] tv-panel-inset shadow-xl transition-all hover:border-[var(--tv-accent)]/60 md:h-32 md:w-32">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <TvImage
              src={resolveDisplayAvatar(formData.imageUrl, formData.id || 'new-preparation')}
              alt="Voorbereidingsportret"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_38%)] opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-6 w-6 tv-text" />
            </div>
          </label>

          <div className="mb-0 flex w-full flex-col gap-2 sm:mb-2 sm:w-auto sm:flex-row sm:items-center">
            {preparation ? (
              <Button
                variant="danger"
                onClick={() => onDelete?.(preparation.id)}
                className="w-full sm:w-auto"
                title="Verwijder voorbereiding"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sm:hidden">Verwijderen</span>
              </Button>
            ) : null}
            <Button
              variant="primary"
              onClick={handleSave}
              className="w-full sm:w-auto"
            >
              {preparation ? 'Opslaan' : 'Nieuw'}
            </Button>
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
                className="w-full border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-transparent px-1 py-1 text-2xl font-fantasy font-bold tv-text outline-none transition-colors focus:border-[var(--tv-accent)]/70 md:text-3xl"
                placeholder="Karakter Naam"
              />
              <input
                type="text"
                value={formData.subtitle || ''}
                onChange={(event) => handleChange('subtitle', event.target.value)}
                className="mt-1 w-full border-b border-transparent bg-transparent px-1 py-1 text-sm italic tv-text-sub outline-none transition-colors hover:border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] focus:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]"
                placeholder="Rol / klasse / archetype"
              />
            </div>

            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest tv-text-sub">Of kies een avatar</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {PROFILE_PROMPT_AVATARS.slice(0, 18).map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => handlePickAvatar(url)}
                    className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      formData.imageUrl === url
                        ? 'border-[var(--tv-accent)] shadow-[0_0_6px_color-mix(in_srgb,var(--tv-accent),transparent_50%)]'
                        : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[var(--tv-accent)]/60'
                    }`}
                  >
                    <TvImage src={url} alt="" loading="lazy" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAllPromptAvatars((value) => !value)}
                  className={`h-10 w-10 shrink-0 rounded-lg border-2 tv-panel-inset font-fantasy text-lg tv-text transition-all ${
                    showAllPromptAvatars ? 'border-[var(--tv-accent)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_70%)]' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]'
                  }`}
                  title="Toon alle prompt avatars"
                >
                  ...
                </button>
              </div>

              {showAllPromptAvatars && (
                <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-2 no-scrollbar">
                  <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                    {PROFILE_PROMPT_AVATARS.map((url) => (
                      <button
                        key={`all-${url}`}
                        type="button"
                        onClick={() => handlePickAvatar(url)}
                        className={`aspect-square overflow-hidden rounded-md border transition-all ${
                          formData.imageUrl === url
                            ? 'border-[var(--tv-accent)] shadow-[0_0_6px_color-mix(in_srgb,var(--tv-accent),transparent_50%)]'
                            : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[var(--tv-accent)]/60'
                        }`}
                      >
                        <TvImage src={url} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="tv-stat-grid">
              <div className="tv-stat-cell">
                <span className="tv-label mb-1">HP</span>
                <div className="flex items-baseline gap-1">
                  <input type="number" value={formData.hp || 0} onChange={(event) => handleChange('hp', event.target.value)} className="tv-stat-input hide-arrows text-lg" />
                  <span className="tv-muted text-xs">/</span>
                  <input type="number" value={formData.maxHp || 0} onChange={(event) => handleChange('maxHp', event.target.value)} className="tv-stat-input hide-arrows text-xs tv-muted" />
                </div>
              </div>
              <div className="tv-stat-cell tv-stat-cell--divider">
                <span className="tv-label mb-1">AC</span>
                <input type="number" value={formData.ac || 10} onChange={(event) => handleChange('ac', event.target.value)} className="tv-stat-input hide-arrows text-lg tv-text" />
              </div>
              <div className="tv-stat-cell">
                <span className="tv-label mb-1">Init</span>
                <input type="number" value={formData.initMod || 0} onChange={(event) => handleChange('initMod', event.target.value)} className="tv-stat-input hide-arrows text-lg tv-text" />
              </div>
            </div>

            <div className="flex flex-col">
              <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest tv-text-sub">
                <Fingerprint className="h-3 w-3" /> Verborgen eigenschappen
              </h4>
              <div className="flex flex-wrap gap-2">
                {(formData.customStats || []).map((stat) => (
                  <div key={stat.id} className="flex items-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset shadow-inner transition-colors focus-within:border-[var(--tv-accent)]/60">
                    <input
                      list="preparation-stat-options"
                      value={stat.name}
                      onChange={(event) => {
                        const cleanAbbr = event.target.value.split(' - ')[0].trim().toUpperCase();
                        updateCustomStat(stat.id, 'name', cleanAbbr);
                      }}
                      className="w-16 border-r border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-transparent p-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--tv-accent)] outline-none placeholder:tv-muted"
                      placeholder="NAAM"
                    />
                    <input
                      type="number"
                      value={stat.value}
                      onChange={(event) => updateCustomStat(stat.id, 'value', event.target.value)}
                      className="hide-arrows w-10 bg-transparent p-1 text-center text-sm font-bold tv-text outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomStat(stat.id)}
                      className="tv-panel-inset p-1.5 tv-muted transition-colors tv-hover-danger"
                      title="Verwijder eigenschap"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCustomStat}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] tv-panel-inset tv-muted transition-colors hover:border-[var(--tv-accent)]/60 hover:text-[var(--tv-accent)]"
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
              <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest tv-text-sub">
                <NotebookPen className="h-3 w-3" /> Notities & Lore
              </h4>
              <textarea
                value={formData.bio || ''}
                onChange={(event) => handleChange('bio', event.target.value)}
                placeholder="Achtergrondverhaal, spreuken, wapens of tijdelijke effecten..."
                className="w-full flex-1 resize-none rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-3 text-sm leading-relaxed tv-text transition-colors focus:border-[var(--tv-accent)]/60 focus:outline-none"
              />
            </div>
          </div>
        </div>
    </ModalFrame>
  );
}