import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, EyeOff, KeyRound, Pencil, Plus, RotateCcw, Save, Scroll, Trash2, UserPlus } from 'lucide-react';
import { getHandoutIcon, getHandoutTypeOptions } from '../lib/handoutUtils';
import { DEFAULT_AVATAR_POSITION, getAllPlaceholderImages, normalizeAvatarPosition, suggestHandoutImages } from '../lib/placeholders';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';
import Button from './Button';
import { CreateFormPlaceholderGrid } from '../ui/CreateFormPrimitives';
import useImagePositionDrag from '../ui/useImagePositionDrag';
import { useT } from '../i18n/useT';

function HandoutModal({
  isOpen,
  onClose,
  handout,
  role,
  players = [],
  currentPlayerId,
  claimNote = '',
  onSaveClaimNote,
  onSave,
  onDelete,
  onAddToInitiative,
  canAddToInitiative,
}) {
  const { t } = useT('handouts');
  const [isEditing, setIsEditing] = useState(false);
  const EMPTY_FORM = {
    title: '',
    type: 'clue',
    content: '',
    secret: '',
    isRevealed: false,
    imageUrl: null,
    imagePosition: { ...DEFAULT_AVATAR_POSITION },
    claimable: false,
    claimedBy: null,
    assignedToUid: null,
    assignedToNick: null,
    secretRevealed: false,
    npcSubtitle: t('common:fallbacks.enemy'),
    npcHp: 15,
    npcAc: 12,
    npcInitMod: 2,
  };
  const [formData, setFormData] = useState({
    ...EMPTY_FORM,
  });
  const [pendingFile, setPendingFile] = useState(null);
  const [showPlaceholderPicker, setShowPlaceholderPicker] = useState(false);
  const [showAllPlaceholders, setShowAllPlaceholders] = useState(false);
  const [claimNoteDraft, setClaimNoteDraft] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPendingFile(null);
      setShowPlaceholderPicker(false);
      setShowAllPlaceholders(false);
      if (handout) {
        setFormData({
          ...EMPTY_FORM,
          ...handout,
          imagePosition: normalizeAvatarPosition(handout.imagePosition),
          secretRevealed: handout.secretRevealed === true,
        });
        setIsEditing(false);
      } else {
        setFormData({ ...EMPTY_FORM, imagePosition: { ...DEFAULT_AVATAR_POSITION } });
        setIsEditing(true);
      }
    }
  }, [isOpen, handout]);

  useEffect(() => {
    if (!isOpen) return;
    setClaimNoteDraft(claimNote || '');
  }, [isOpen, handout?.id, claimNote]);

  useEffect(() => {
    if (!isOpen || !handout || isEditing) return;
    setFormData((prev) => ({
      ...prev,
      ...handout,
      imagePosition: normalizeAvatarPosition(handout.imagePosition),
      secretRevealed: handout.secretRevealed === true,
    }));
  }, [handout, handout?.id, handout?.updatedAtMs, handout?.secretRevealed, handout?.isRevealed, isEditing, isOpen]);

  const placeholderImages = useMemo(() => {
    if (showAllPlaceholders) return getAllPlaceholderImages();
    return suggestHandoutImages(formData.title, formData.content, formData.type, 12);
  }, [showAllPlaceholders, formData.title, formData.content, formData.type]);

  const imagePosition = normalizeAvatarPosition(formData.imagePosition);

  const handleImagePositionChange = (nextPosition) => {
    setFormData((prev) => ({ ...prev, imagePosition: normalizeAvatarPosition(nextPosition) }));
  };

  const coverDrag = useImagePositionDrag({
    value: imagePosition,
    onChange: handleImagePositionChange,
    canReposition: Boolean(formData.imageUrl),
    src: formData.imageUrl,
  });

  if (!isOpen) return null;

  const isGM = role === 'gm';
  const isClaimOwner = !isGM && Boolean(handout) && formData.claimedBy === currentPlayerId;
  const Icon = getHandoutIcon(formData.type);
  const playerCanSeeSecret = !isGM && formData.secretRevealed === true;
  const normalizeParagraph = (text) => String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  const paragraphs = String(formData.content || '')
    .split(/\n{2,}/)
    .map((paragraph) => normalizeParagraph(paragraph))
    .filter(Boolean);

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;
    onSave(formData, pendingFile);
  };

  const handleClaimNoteBlur = () => {
    if (!isClaimOwner || !handout?.id || !onSaveClaimNote) return;
    if (claimNoteDraft === (claimNote || '')) return;
    onSaveClaimNote(handout.id, claimNoteDraft);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setFormData((prev) => ({
      ...prev,
      imageUrl: URL.createObjectURL(file),
      imagePosition: { ...DEFAULT_AVATAR_POSITION },
    }));
    setShowPlaceholderPicker(false);
    e.target.value = '';
  };

  const resetImagePosition = () => {
    setFormData((prev) => ({ ...prev, imagePosition: { ...DEFAULT_AVATAR_POSITION } }));
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handlePickPlaceholder = (url) => {
    setPendingFile(null);
    setFormData((prev) => ({
      ...prev,
      imageUrl: url,
      imagePosition: { ...DEFAULT_AVATAR_POSITION },
    }));
    setShowPlaceholderPicker(false);
  };

  const clearImage = () => {
    setPendingFile(null);
    setFormData((prev) => ({
      ...prev,
      imageUrl: null,
      imagePosition: { ...DEFAULT_AVATAR_POSITION },
    }));
    setShowPlaceholderPicker(false);
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      claimable: type === 'loot' ? prev.claimable : false,
      assignedToUid: type === 'npc' ? null : prev.assignedToUid,
      assignedToNick: type === 'npc' ? null : prev.assignedToNick,
    }));
  };

  const trimmedTitle = formData.title.trim();
  const typeLabel = t(`types.${formData.type}`);
  const modalTitle = handout
    ? (isEditing ? t('modal.editTitle') : t('modal.viewTitle'))
    : t('modal.newTitle');
  const modalSubtitle = isEditing
    ? undefined
    : `${formData.title || t('modal.unnamed')} · ${typeLabel}${formData.isRevealed ? '' : t('modal.hiddenSuffix')}`;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={Icon}
      maxWidthClassName="max-w-xl"
      footer={isGM && handout && !isEditing ? (
        <Button variant="primary" block icon={Pencil} onClick={() => setIsEditing(true)}>
          {t('modal.edit')}
        </Button>
      ) : isGM && isEditing ? (
        <div className="flex w-full items-center gap-2">
          {handout ? (
            <button
              type="button"
              onClick={() => onDelete?.(handout)}
              className="tv-toolbar-icon-btn tv-panel-inset tv-hover-danger shrink-0"
              title={t('modal.deleteTitle')}
              aria-label={t('modal.deleteAria')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_1.15fr] gap-2">
            <Button
              variant="ghost"
              block
              onClick={() => {
                if (!handout) onClose();
                else setIsEditing(false);
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              form="handout-form"
              type="submit"
              variant="primary"
              block
              icon={handout ? Save : Plus}
              disabled={!trimmedTitle || !String(formData.content || '').trim()}
            >
              {handout ? t('common:actions.save') : t('common:actions.add')}
            </Button>
          </div>
        </div>
      ) : null}
    >
      {isEditing && isGM ? (
        <form id="handout-form" onSubmit={handleSave} className="tv-handout-form">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

          <div className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6">
            <div
              {...(formData.imageUrl ? coverDrag.dragProps : {})}
              className={[
                'tv-handout-form-cover group',
                formData.imageUrl ? 'tv-handout-form-cover--draggable' : '',
                coverDrag.isDragging ? 'is-dragging' : '',
                coverDrag.showHint && formData.imageUrl ? 'is-hint-visible' : '',
              ].filter(Boolean).join(' ')}
            >
              {!formData.imageUrl ? (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="tv-handout-form-cover__hit"
                  title={t('modal.pickImage')}
                  aria-label={t('modal.pickImageAria')}
                />
              ) : null}
              {formData.imageUrl ? (
                <>
                  <TvImage
                    src={formData.imageUrl}
                    alt=""
                    className="absolute inset-0 opacity-90"
                    style={{ objectPosition: coverDrag.objectPosition }}
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_8%)] via-transparent to-transparent pointer-events-none" />
                  <span className="tv-image-pos-frame__hint tv-handout-form-cover__hint" aria-hidden="true">
                    {t('modal.dragToPosition')}
                  </span>
                </>
              ) : (
                <div className="tv-handout-form-cover__empty">
                  <Scroll className="h-6 w-6 opacity-60" aria-hidden />
                  <span className="tv-handout-form-cover__empty-label">{t('modal.addImage')}</span>
                </div>
              )}
              <div className="tv-handout-form-cover__tools" data-no-drag>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(event) => { event.stopPropagation(); openFilePicker(); }}
                >
                  {t('modal.upload')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={showPlaceholderPicker ? 'accent' : 'secondary'}
                  onClick={(event) => { event.stopPropagation(); setShowPlaceholderPicker((current) => !current); }}
                >
                  {t('modal.icon')}
                </Button>
                {formData.imageUrl ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={RotateCcw}
                      onClick={(event) => { event.stopPropagation(); resetImagePosition(); }}
                    >
                      {t('modal.reset')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="tv-hover-danger"
                      onClick={(event) => { event.stopPropagation(); clearImage(); }}
                    >
                      {t('modal.clear')}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {showPlaceholderPicker ? (
            <div className="tv-handout-form-picker space-y-2">
              <CreateFormPlaceholderGrid
                images={placeholderImages}
                selectedUrl={formData.imageUrl}
                onPick={handlePickPlaceholder}
                maxHeightClass="max-h-44"
                gridClass="grid-cols-6 sm:grid-cols-8"
              />
              {!showAllPlaceholders ? (
                <Button type="button" variant="ghost" size="sm" block onClick={() => setShowAllPlaceholders(true)}>
                  {t('modal.showAllIcons')}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="tv-handout-form-identity">
            <input
              id="handout-title"
              autoFocus
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('modal.titlePlaceholder')}
              className="tv-handout-form-title"
            />

            <div className="tv-segmented tv-segmented--block" role="group" aria-label={t('modal.typeGroupAria')}>
              {getHandoutTypeOptions().map(({ value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTypeChange(value)}
                  className={`tv-segmented__option ${formData.type === value ? 'tv-segmented__option--active' : ''}`}
                >
                  {t(`types.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <section className="tv-handout-form-section">
            <div className="tv-handout-form-section__head">
              <label htmlFor="handout-content" className="tv-label">{t('modal.contentLabel')}</label>
              <span className="tv-handout-form-section__hint">{t('modal.contentHint')}</span>
            </div>
            <textarea
              id="handout-content"
              required
              rows={5}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={t('modal.contentPlaceholder')}
              className="tv-field w-full resize-y font-story leading-relaxed"
            />
          </section>

          <section className="tv-handout-gm-panel">
            <div className="tv-handout-gm-panel__head">
              <div className="tv-handout-gm-panel__title">
                <KeyRound className="h-3.5 w-3.5 tv-tone-secret-text" aria-hidden />
                <label htmlFor="handout-secret" className="tv-label">{t('modal.secretLabel')}</label>
              </div>
              {String(formData.secret || '').trim() ? (
                <div className="tv-segmented tv-handout-gm-panel__toggle tv-handout-gm-panel__toggle--icons" role="group" aria-label={t('modal.secretVisibilityAria')}>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, secretRevealed: false }))}
                    className={`tv-segmented__option ${!formData.secretRevealed ? 'tv-segmented__option--active' : ''}`}
                    title={t('modal.gmOnlyTitle')}
                    aria-label={t('modal.gmOnlyAria')}
                    aria-pressed={!formData.secretRevealed}
                  >
                    <EyeOff className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, secretRevealed: true }))}
                    className={`tv-segmented__option ${formData.secretRevealed ? 'tv-segmented__option--active' : ''}`}
                    title={t('modal.partySeesTitle')}
                    aria-label={t('modal.partySeesAria')}
                    aria-pressed={Boolean(formData.secretRevealed)}
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <span className="tv-handout-form-section__hint">{t('modal.secretHint')}</span>
              )}
            </div>
            <textarea
              id="handout-secret"
              rows={3}
              value={formData.secret || ''}
              onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
              placeholder={t('modal.secretPlaceholder')}
              className="tv-field w-full resize-y font-story leading-relaxed"
            />
          </section>

          {formData.type === 'npc' ? (
            <section className="tv-handout-form-section gap-3 rounded-[var(--tv-radius)] tv-tone-enemy-surface border border-[color-mix(in_srgb,var(--tv-tone-enemy),transparent_55%)] p-4">
              <label htmlFor="handout-npc-label" className="tv-label block">{t('modal.npcProfile')}</label>
              <input
                id="handout-npc-label"
                type="text"
                value={formData.npcSubtitle || ''}
                onChange={(e) => setFormData({ ...formData, npcSubtitle: e.target.value })}
                placeholder={t('modal.npcSubtitlePlaceholder')}
                className="tv-field w-full"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="handout-npc-hp" className="tv-label mb-1.5 block">HP</label>
                  <input id="handout-npc-hp" type="number" min="0" value={formData.npcHp ?? 15} onChange={(e) => setFormData({ ...formData, npcHp: e.target.value })} className="tv-field hide-arrows w-full text-center" />
                </div>
                <div>
                  <label htmlFor="handout-npc-ac" className="tv-label mb-1.5 block">AC</label>
                  <input id="handout-npc-ac" type="number" min="0" value={formData.npcAc ?? 12} onChange={(e) => setFormData({ ...formData, npcAc: e.target.value })} className="tv-field hide-arrows w-full text-center" />
                </div>
                <div>
                  <label htmlFor="handout-npc-init" className="tv-label mb-1.5 block">Init</label>
                  <input id="handout-npc-init" type="number" value={formData.npcInitMod ?? 2} onChange={(e) => setFormData({ ...formData, npcInitMod: e.target.value })} className="tv-field hide-arrows w-full text-center" />
                </div>
              </div>
            </section>
          ) : null}

          <section className="tv-handout-form-section tv-handout-form-options">
            <p className="tv-label">{t('modal.assignment')}</p>

            {formData.type !== 'npc' ? (
              <div className="tv-handout-form-assign">
                <UserPlus className="tv-handout-form-assign__icon h-3.5 w-3.5" aria-hidden />
                <select
                  value={formData.assignedToUid || ''}
                  onChange={(event) => {
                    const nextUid = event.target.value || null;
                    const nextPlayer = players.find((player) => player.id === nextUid) || null;
                    setFormData((prev) => ({
                      ...prev,
                      assignedToUid: nextUid,
                      assignedToNick: nextPlayer?.name || null,
                    }));
                  }}
                  className="tv-select tv-handout-form-assign__select"
                  aria-label={t('modal.assignAria')}
                >
                  <option value="">{t('modal.everyoneInParty')}</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="tv-handout-form-option-rows">
              <div className="tv-handout-form-option-row">
                <span className="tv-handout-form-option-label">{t('modal.handoutLabel')}</span>
                <div className="tv-segmented tv-segmented--block" role="group" aria-label={t('modal.visibilityAria')}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isRevealed: true })}
                    className={`tv-segmented__option ${formData.isRevealed ? 'tv-segmented__option--active' : ''}`}
                  >
                    {t('visibility.visible')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isRevealed: false })}
                    className={`tv-segmented__option ${!formData.isRevealed ? 'tv-segmented__option--active' : ''}`}
                  >
                    {t('visibility.hidden')}
                  </button>
                </div>
              </div>

              {formData.type === 'loot' ? (
                <div className="tv-handout-form-option-row">
                  <span className="tv-handout-form-option-label">{t('modal.lootLabel')}</span>
                  <div className="tv-segmented tv-segmented--block" role="group" aria-label={t('modal.claimableAria')}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, claimable: true })}
                      className={`tv-segmented__option ${formData.claimable ? 'tv-segmented__option--active' : ''}`}
                    >
                      {t('modal.claimable')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, claimable: false })}
                      className={`tv-segmented__option ${!formData.claimable ? 'tv-segmented__option--active' : ''}`}
                    >
                      {t('modal.notClaimable')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </form>
      ) : (
        <div className="tv-handout-form tv-handout-view">
          <div className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6">
            {formData.imageUrl ? (
              <div className="tv-handout-view-cover">
                <TvImage
                  src={formData.imageUrl}
                  alt={formData.title}
                  className="absolute inset-0"
                  style={{ objectPosition: coverDrag.objectPosition }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_4%)] via-transparent to-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_18%)] pointer-events-none" />
              </div>
            ) : (
              <div className="tv-handout-view-cover tv-handout-view-cover--empty">
                <Scroll className="h-7 w-7 opacity-45" aria-hidden />
              </div>
            )}
          </div>

          <div className="tv-handout-view-head">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tv-tag">{typeLabel}</span>
              {isGM && formData.secret && formData.secretRevealed ? (
                <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--secret">{t('modal.secretOpenTag')}</span>
              ) : null}
              {isGM && !formData.isRevealed ? (
                <span className="tv-tag tv-handout-meta-tag tv-handout-meta-tag--muted">{t('visibility.hidden')}</span>
              ) : null}
              {formData.assignedToUid && isGM ? (
                <span className="tv-tag tv-tone-ally-text">{t('tags.assigned')}</span>
              ) : null}
            </div>
            <h2 className="tv-handout-view-title">{formData.title}</h2>
          </div>

          <section className="tv-handout-form-section">
            <div className="tv-handout-form-section__head">
              <span className="tv-label">{t('modal.contentLabel')}</span>
              {!isGM || formData.isRevealed ? (
                <span className="tv-handout-form-section__hint">{t('modal.contentHint')}</span>
              ) : (
                <span className="tv-handout-form-section__hint">{t('modal.notYetRevealed')}</span>
              )}
            </div>
            <div className="tv-panel-inset px-4 py-3">
              <div className="tv-handout-view-body font-story">
                {(paragraphs.length ? paragraphs : [normalizeParagraph(formData.content || '')]).map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>

          {isClaimOwner ? (
            <section className="tv-handout-form-section">
              <div className="tv-handout-form-section__head">
                <span className="tv-label">{t('modal.yourNote')}</span>
                <span className="tv-handout-form-section__hint">{t('modal.yourNoteHint')}</span>
              </div>
              <textarea
                value={claimNoteDraft}
                onChange={(event) => setClaimNoteDraft(event.target.value)}
                onBlur={handleClaimNoteBlur}
                placeholder={t('modal.yourNotePlaceholder')}
                className="tv-field min-h-[88px] w-full resize-y font-story leading-relaxed"
              />
            </section>
          ) : null}

          {formData.assignedToUid ? (
            <section className="tv-handout-form-section rounded-[var(--tv-radius)] tv-tone-ally-surface border border-[color-mix(in_srgb,var(--tv-tone-ally),transparent_55%)] p-4">
              <span className="tv-label tv-tone-ally-text">{t('modal.assignedTo')}</span>
              <p className="mt-2 text-sm leading-6 tv-text">
                {formData.assignedToNick || t('modal.aPlayer')}
              </p>
            </section>
          ) : null}

          {isGM && formData.type === 'npc' ? (
            <section className="tv-handout-form-section gap-3 rounded-[var(--tv-radius)] tv-tone-enemy-surface border border-[color-mix(in_srgb,var(--tv-tone-enemy),transparent_55%)] p-4">
              <span className="tv-label tv-tone-enemy-text">{t('modal.npcCombatProfile')}</span>
              <p className="text-sm tv-muted">{formData.npcSubtitle || t('common:fallbacks.enemy')}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-3 py-2.5 text-center">
                  <div className="text-[10px] uppercase tracking-[0.14em] tv-muted">HP</div>
                  <div className="mt-1 font-fantasy text-lg tracking-[0.1em] tv-text">{Number(formData.npcHp ?? 15) || 15}</div>
                </div>
                <div className="rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-3 py-2.5 text-center">
                  <div className="text-[10px] uppercase tracking-[0.14em] tv-muted">AC</div>
                  <div className="mt-1 font-fantasy text-lg tracking-[0.1em] tv-text">{Number(formData.npcAc ?? 12) || 12}</div>
                </div>
                <div className="rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-3 py-2.5 text-center">
                  <div className="text-[10px] uppercase tracking-[0.14em] tv-muted">Init</div>
                  <div className="mt-1 font-fantasy text-lg tracking-[0.1em] tv-text">{(Number(formData.npcInitMod ?? 2) || 0) >= 0 ? `+${Number(formData.npcInitMod ?? 2) || 0}` : Number(formData.npcInitMod ?? 2) || 0}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddToInitiative?.(formData)}
                disabled={!canAddToInitiative}
                className={`tv-btn tv-btn--block mt-1 ${canAddToInitiative ? 'tv-tone-enemy-button' : 'cursor-not-allowed tv-button-secondary opacity-60'}`}
              >
                <UserPlus className="h-4 w-4" /> {canAddToInitiative ? t('modal.addToInitiative') : t('modal.pauseCombatToAdd')}
              </button>
            </section>
          ) : null}

          {isGM && formData.secret ? (
            <section className="tv-handout-form-section">
              <div className="tv-handout-form-section__head">
                <span className="tv-label">{t('modal.secretLabel')}</span>
                <span className="tv-handout-form-section__hint">
                  {formData.secretRevealed ? t('modal.secretRevealedHint') : t('modal.secretHiddenHint')}
                </span>
              </div>
              <div className="tv-panel-inset px-4 py-3">
                <p className="font-story text-sm italic leading-relaxed whitespace-pre-line tv-text-sub">
                  {String(formData.secret || '')
                    .replace(/\r/g, '')
                    .split(/\n{2,}/)
                    .map((paragraph) => normalizeParagraph(paragraph))
                    .filter(Boolean)
                    .join('\n\n')}
                </p>
              </div>
            </section>
          ) : null}

          {!isGM && formData.secret && playerCanSeeSecret ? (
            <section className="tv-handout-form-section">
              <div className="tv-handout-form-section__head">
                <span className="tv-label tv-tone-ally-text">{t('modal.playerSecretLabel')}</span>
                <span className="tv-handout-form-section__hint">{t('modal.playerSecretHint')}</span>
              </div>
              <div className="tv-handout-card__secret tv-handout-card__secret--revealed">
                <KeyRound className="h-3.5 w-3.5 shrink-0 tv-tone-ally-text" aria-hidden />
                <p className="font-story text-sm leading-relaxed whitespace-pre-line tv-text">
                  {String(formData.secret || '')
                    .replace(/\r/g, '')
                    .split(/\n{2,}/)
                    .map((paragraph) => normalizeParagraph(paragraph))
                    .filter(Boolean)
                    .join('\n\n')}
                </p>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </ModalFrame>
  );
}

export default HandoutModal;
