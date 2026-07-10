import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NotebookPen, Plus, Save, UserRound } from 'lucide-react';
import { PROFILE_PROMPT_AVATARS, resolveDisplayAvatar } from '../lib/placeholders';
import { useT } from '../i18n/useT';
import ModalFrame from './ModalFrame';
import Button from './Button';
import CustomStatsSection from '../ui/CustomStatsSection';
import {
  CREATE_MODAL_BODY_CLASS,
  CREATE_MODAL_FLAT_SCROLL_CLASS,
  CreateFormField,
  CreateFormIdentityRow,
  CreateFormImageActions,
  CreateFormPlaceholderGrid,
  CreateFormSection,
  CreateFormStack,
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
  const { t } = useT('preparations');
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

  const playerFallback = t('picker.playerFallback');

  const identityMeta = [
    formData.sourceType === 'playerSnapshot' ? t('modal.fromPlayerSnapshot') : null,
    selectedPlayer && !isAssigned ? t('modal.forPlayer', { name: selectedPlayer.name }) : null,
    isAssigned && selectedPlayer ? t('modal.linkedTo', { name: selectedPlayer.name }) : null,
  ].filter(Boolean).join(' · ') || t('modal.defaultMeta');

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('modal.editTitle') : t('modal.newTitle')}
      subtitle={formData.name || t('modal.characterProfile')}
      icon={NotebookPen}
      maxWidthClassName="max-w-xl"
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
              {t('modal.delete')}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" block onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="preparation-form"
            variant="primary"
            block
            icon={isEditing ? Save : Plus}
            disabled={!String(formData.name || '').trim()}
          >
            {isEditing ? t('common:actions.save') : t('modal.saveProfile')}
          </Button>
        </div>
      )}
    >
      <form id="preparation-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

        <div className={CREATE_MODAL_FLAT_SCROLL_CLASS}>
          <CreateFormStack>
            <CreateFormIdentityRow
              flat
              imageUrl={resolveDisplayAvatar(formData.imageUrl, formData.id || 'new-preparation')}
              onImageClick={openFilePicker}
              fallbackIcon={UserRound}
              nameId="prep-name"
              nameValue={formData.name || ''}
              onNameChange={(event) => handleChange('name', event.target.value)}
              namePlaceholder={t('modal.namePlaceholder')}
              meta={identityMeta}
              autoFocus
              required
            />
            <CreateFormImageActions
              onUpload={openFilePicker}
              showPicker={showPlaceholderPicker}
              onTogglePicker={() => setShowPlaceholderPicker((value) => !value)}
              onClear={() => {
                setPendingFile(null);
                handleChange('imageUrl', null);
              }}
              hasImage={Boolean(formData.imageUrl)}
              pickerClosedLabel={t('modal.avatar')}
            />
            {showPlaceholderPicker ? (
              <div className="space-y-2">
                <CreateFormPlaceholderGrid
                  images={placeholderImages}
                  selectedUrl={formData.imageUrl}
                  onPick={handlePickAvatar}
                  maxHeightClass="max-h-36"
                  gridClass="grid-cols-6 sm:grid-cols-8"
                />
                {!showAllPlaceholders && PROFILE_PROMPT_AVATARS.length > placeholderImages.length ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    block
                    onClick={() => setShowAllPlaceholders(true)}
                  >
                    {t('modal.showAllAvatars')}
                  </Button>
                ) : null}
              </div>
            ) : null}
            <input
              id="prep-subtitle"
              type="text"
              value={formData.subtitle || ''}
              onChange={(event) => handleChange('subtitle', event.target.value)}
              placeholder={t('modal.subtitlePlaceholder')}
              className="tv-field"
            />

            <CreateFormSection flat>
              <CreateFormField label={t('modal.coreStats')}>
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

            <CreateFormSection flat>
              <CustomStatsSection
                stats={formData.customStats || []}
                canEdit
                onAdd={addCustomStat}
                onUpdate={updateCustomStat}
                onRemove={removeCustomStat}
                sectionLabel={t('modal.hiddenTraits')}
                emptyHint={t('modal.hiddenTraitsEmpty')}
                resetKey={preparation?.id || 'new'}
              />
            </CreateFormSection>

            {players.length > 0 ? (
              <CreateFormSection flat>
                <CreateFormField
                  label={t('modal.sessionPlayer')}
                  htmlFor="prep-player"
                  aside={t('modal.optional')}
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
                    <option value="">{t('modal.notLinked')}</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>

                  {isAssigned ? (
                    <p className="mt-2 text-[11px] leading-snug tv-muted">
                      {t('modal.alreadyAssignedHint')}
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
                          <span className="block text-sm font-medium tv-text">
                            {t('modal.offerOnSave', { name: selectedPlayer?.name || playerFallback })}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug tv-muted">
                            {formData.offerOnSave
                              ? t('modal.offerOnSaveHintImmediate')
                              : t('modal.offerOnSaveHintLater')}
                          </span>
                        </span>
                      </label>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] leading-snug tv-muted">
                      {t('modal.linkPlayerHint')}
                    </p>
                  )}
                </CreateFormField>
              </CreateFormSection>
            ) : null}

            <CreateFormSection flat>
              <CreateFormField label={t('modal.notesLabel')} htmlFor="prep-bio">
                <textarea
                  id="prep-bio"
                  value={formData.bio || ''}
                  onChange={(event) => handleChange('bio', event.target.value)}
                  placeholder={t('modal.notesPlaceholder')}
                  rows={8}
                  className="tv-field tv-field--textarea font-story leading-relaxed"
                />
              </CreateFormField>
            </CreateFormSection>
          </CreateFormStack>
        </div>
      </form>
    </ModalFrame>
  );
}
