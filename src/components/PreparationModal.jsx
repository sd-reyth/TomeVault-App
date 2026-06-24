import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NotebookPen, Plus, Save, UserRound, X } from 'lucide-react';
import { PROFILE_PROMPT_AVATARS, resolveDisplayAvatar } from '../lib/placeholders';
import { STAT_SUGGESTIONS } from '../data/mockData';
import ModalFrame from './ModalFrame';
import Button from './Button';
import {
  CREATE_MODAL_BODY_CLASS,
  CREATE_MODAL_SCROLL_CLASS,
  CreateFormField,
  CreateFormIdentityRow,
  CreateFormImageActions,
  CreateFormPanel,
  CreateFormPlaceholderGrid,
  CreateFormSection,
} from '../ui/CreateFormPrimitives';

function getInitialPreparationState(preparation) {
  const assignmentStatus = preparation?.assignmentStatus || 'unassigned';
  const isLinked = assignmentStatus !== 'unassigned';
  const targetPlayerUid = isLinked
    ? (preparation?.assignedToUid || null)
    : (preparation?.preparedForUid || null);

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
    assignmentStatus,
    targetPlayerUid,
    offerOnSave: false,
  };
}

export default function PreparationModal({
  isOpen,
  preparation,
  players = [],
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState(getInitialPreparationState(preparation));
  const [pendingFile, setPendingFile] = useState(null);
  const [showPlaceholderPicker, setShowPlaceholderPicker] = useState(false);
  const [showAllPlaceholders, setShowAllPlaceholders] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialPreparationState(preparation));
    setPendingFile(null);
    setShowPlaceholderPicker(false);
    setShowAllPlaceholders(false);
  }, [isOpen, preparation]);

  const isEditing = Boolean(preparation?.id);
  const isAssigned = formData.assignmentStatus !== 'unassigned';
  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === formData.targetPlayerUid) || null,
    [players, formData.targetPlayerUid]
  );

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openFilePicker = () => fileInputRef.current?.click();

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

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.({
      ...formData,
      hp: Number(formData.hp) || 0,
      maxHp: Number(formData.maxHp) || 0,
      ac: Number(formData.ac) || 10,
      initMod: Number(formData.initMod) || 0,
      customStats: formData.customStats || [],
      preparedForUid: isAssigned ? null : (formData.targetPlayerUid || null),
    }, pendingFile);
  };

  const placeholderImages = showAllPlaceholders
    ? PROFILE_PROMPT_AVATARS
    : PROFILE_PROMPT_AVATARS.slice(0, 24);

  const identityMeta = [
    formData.sourceType === 'playerSnapshot' ? 'Gebaseerd op spelersprofiel' : null,
    selectedPlayer && !isAssigned ? `Voor ${selectedPlayer.name}` : null,
    isAssigned && selectedPlayer ? `Gekoppeld aan ${selectedPlayer.name}` : null,
  ].filter(Boolean).join(' · ') || 'Volledig karakterprofiel voor later toewijzen';

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Voorbereiding' : 'Nieuw profiel'}
      subtitle={formData.name || 'Karakterprofiel'}
      icon={NotebookPen}
      maxWidthClassName="max-w-lg"
      bodyClassName={CREATE_MODAL_BODY_CLASS}
      footer={(
        <div className={`grid w-full gap-2 ${isEditing ? 'sm:grid-cols-[auto_1fr_1fr]' : 'sm:grid-cols-2'}`}>
          {isEditing ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => onDelete?.(preparation.id)}
              className="sm:col-span-1"
            >
              Verwijder
            </Button>
          ) : null}
          <Button type="button" variant="ghost" block onClick={onClose}>
            Annuleren
          </Button>
          <Button
            type="submit"
            form="preparation-form"
            variant="primary"
            block
            icon={isEditing ? Save : Plus}
            disabled={!String(formData.name || '').trim()}
          >
            {isEditing ? 'Opslaan' : 'Profiel opslaan'}
          </Button>
        </div>
      )}
    >
      <form id="preparation-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

        <div className={CREATE_MODAL_SCROLL_CLASS}>
          <CreateFormPanel>
            <CreateFormIdentityRow
              imageUrl={resolveDisplayAvatar(formData.imageUrl, formData.id || 'new-preparation')}
              onImageClick={openFilePicker}
              fallbackIcon={UserRound}
              nameId="prep-name"
              nameValue={formData.name || ''}
              onNameChange={(event) => handleChange('name', event.target.value)}
              namePlaceholder="Karakternaam"
              meta={identityMeta}
              autoFocus
              required
            />

            <CreateFormSection>
              <CreateFormField label="Rol / klasse / archetype" htmlFor="prep-subtitle">
                <input
                  id="prep-subtitle"
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(event) => handleChange('subtitle', event.target.value)}
                  placeholder="Bijv. Elf Ranger"
                  className="tv-field"
                />
              </CreateFormField>
            </CreateFormSection>

            <CreateFormSection>
              <CreateFormField label="Portret">
                <CreateFormImageActions
                  onUpload={openFilePicker}
                  showPicker={showPlaceholderPicker}
                  onTogglePicker={() => setShowPlaceholderPicker((value) => !value)}
                  onClear={() => {
                    setPendingFile(null);
                    handleChange('imageUrl', null);
                  }}
                  hasImage={Boolean(formData.imageUrl)}
                  pickerClosedLabel="Avatar"
                />
                {showPlaceholderPicker ? (
                  <div className="mt-2.5 space-y-2">
                    <CreateFormPlaceholderGrid
                      images={placeholderImages}
                      selectedUrl={formData.imageUrl}
                      onPick={handlePickAvatar}
                      maxHeightClass="max-h-40"
                    />
                    {!showAllPlaceholders && PROFILE_PROMPT_AVATARS.length > placeholderImages.length ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        block
                        onClick={() => setShowAllPlaceholders(true)}
                      >
                        Toon alle avatars
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CreateFormField>
            </CreateFormSection>

            <CreateFormSection>
              <CreateFormField label="Kerncijfers">
                <div className="tv-stat-grid">
                  <div className="tv-stat-cell">
                    <span className="tv-label mb-1">HP</span>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        value={formData.hp || 0}
                        onChange={(event) => handleChange('hp', event.target.value)}
                        className="tv-stat-input hide-arrows text-lg"
                      />
                      <span className="tv-muted text-xs">/</span>
                      <input
                        type="number"
                        value={formData.maxHp || 0}
                        onChange={(event) => handleChange('maxHp', event.target.value)}
                        className="tv-stat-input hide-arrows text-xs tv-muted"
                      />
                    </div>
                  </div>
                  <div className="tv-stat-cell tv-stat-cell--divider">
                    <span className="tv-label mb-1">AC</span>
                    <input
                      type="number"
                      value={formData.ac || 10}
                      onChange={(event) => handleChange('ac', event.target.value)}
                      className="tv-stat-input hide-arrows text-lg tv-text"
                    />
                  </div>
                  <div className="tv-stat-cell">
                    <span className="tv-label mb-1">Init</span>
                    <input
                      type="number"
                      value={formData.initMod || 0}
                      onChange={(event) => handleChange('initMod', event.target.value)}
                      className="tv-stat-input hide-arrows text-lg tv-text"
                    />
                  </div>
                </div>
              </CreateFormField>
            </CreateFormSection>

            <CreateFormSection>
              <CreateFormField label="Verborgen eigenschappen" aside="Optioneel">
                <div className="flex flex-wrap gap-2">
                  {(formData.customStats || []).map((stat) => (
                    <div
                      key={stat.id}
                      className="flex items-center overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset shadow-inner transition-colors focus-within:border-[var(--tv-accent)]/60"
                    >
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
                    className="tv-icon-btn tv-icon-btn--sm border border-dashed border-[color-mix(in_srgb,var(--tv-border),transparent_35%)] tv-panel-inset tv-muted transition-colors hover:border-[var(--tv-accent)]/60 hover:text-[var(--tv-accent)]"
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
              </CreateFormField>
            </CreateFormSection>

            {players.length > 0 ? (
              <CreateFormSection>
                <CreateFormField
                  label="Speler in deze sessie"
                  htmlFor="prep-player"
                  aside="Optioneel"
                >
                  <select
                    id="prep-player"
                    value={formData.targetPlayerUid || ''}
                    disabled={isAssigned}
                    onChange={(event) => {
                      const nextUid = event.target.value || null;
                      handleChange('targetPlayerUid', nextUid);
                      if (!nextUid) handleChange('offerOnSave', false);
                    }}
                    className="tv-select"
                  >
                    <option value="">Nog niet gekoppeld</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>

                  {isAssigned ? (
                    <p className="mt-2 text-[11px] leading-snug tv-muted">
                      Dit profiel is al aangeboden of in gebruik. Wijzig de toewijzing via de bibliotheek.
                    </p>
                  ) : formData.targetPlayerUid ? (
                    <div className="mt-3 space-y-2 rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_32%)] bg-[color-mix(in_srgb,var(--tv-bg-surface),transparent_18%)] p-3">
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.offerOnSave)}
                          onChange={(event) => handleChange('offerOnSave', event.target.checked)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium tv-text">Direct aanbieden aan {selectedPlayer?.name || 'speler'}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug tv-muted">
                            {formData.offerOnSave
                              ? 'Na opslaan krijgt de speler meteen een acceptatie-verzoek.'
                              : 'Profiel blijft klaarstaan, gemarkeerd voor deze speler.'}
                          </span>
                        </span>
                      </label>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] leading-snug tv-muted">
                      Koppel een profiel aan een deelnemer om het later sneller te vinden of direct aan te bieden.
                    </p>
                  )}
                </CreateFormField>
              </CreateFormSection>
            ) : null}

            <CreateFormSection>
              <CreateFormField label="Notities & lore" htmlFor="prep-bio">
                <textarea
                  id="prep-bio"
                  value={formData.bio || ''}
                  onChange={(event) => handleChange('bio', event.target.value)}
                  placeholder="Achtergrondverhaal, spreuken, wapens of tijdelijke effecten..."
                  rows={4}
                  className="tv-field resize-none font-story leading-relaxed"
                />
              </CreateFormField>
            </CreateFormSection>
          </CreateFormPanel>
        </div>
      </form>
    </ModalFrame>
  );
}
