import React, { useEffect, useRef, useState } from 'react';
import { Package, Plus, Save, UserPlus } from 'lucide-react';
import { ITEM_PLACEHOLDER_IMAGES } from '../lib/placeholders';
import ModalFrame from './ModalFrame';
import Button from './Button';
import TreasureIcon from '../ui/TreasureIcon';
import TvImage from './TvImage';
import { CreateFormPlaceholderGrid } from '../ui/CreateFormPrimitives';
import { DEFAULT_ITEM_CATEGORY, ITEM_CATEGORIES } from '../lib/itemCategories';
import { useT } from '../i18n/useT';

const EMPTY_FORM = {
  name: '',
  desc: '',
  amount: 1,
  ownerId: 'party',
  category: DEFAULT_ITEM_CATEGORY,
  section: '',
  imageUrl: null,
};

function AddItemModal({
  isOpen,
  onClose,
  onSave,
  role,
  party,
  currentPlayerId,
  preferredOwnerId,
  itemToEdit,
}) {
  const { t } = useT('inventory');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pendingFile, setPendingFile] = useState(null);
  const [showPlaceholderPicker, setShowPlaceholderPicker] = useState(false);
  const fileInputRef = useRef(null);

  const isGM = role === 'gm';
  const playerOptions = party.filter((p) => !p.isNpc);
  const defaultOwnerId = preferredOwnerId || currentPlayerId;

  useEffect(() => {
    if (!isOpen) return;

    if (itemToEdit) {
      setFormData({ ...itemToEdit, section: '' });
      setPendingFile(null);
    } else {
      setFormData({
        ...EMPTY_FORM,
        ownerId: isGM ? (preferredOwnerId || 'party') : defaultOwnerId,
      });
      setPendingFile(null);
    }
    setShowPlaceholderPicker(false);
  }, [defaultOwnerId, isGM, isOpen, itemToEdit, preferredOwnerId]);

  if (!isOpen) return null;

  const trimmedName = formData.name.trim();
  const amount = Math.max(1, Number(formData.amount) || 1);

  const patchForm = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleSave = (event) => {
    event.preventDefault();
    if (!trimmedName) return;
    onSave({ ...formData, section: '' }, pendingFile);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    patchForm({ imageUrl: URL.createObjectURL(file) });
    setShowPlaceholderPicker(false);
    event.target.value = '';
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handlePickPlaceholder = (url) => {
    setPendingFile(null);
    patchForm({ imageUrl: url });
    setShowPlaceholderPicker(false);
  };

  const clearImage = () => {
    setPendingFile(null);
    patchForm({ imageUrl: null });
    setShowPlaceholderPicker(false);
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? t('modal.editTitle') : t('modal.newTitle')}
      icon={TreasureIcon}
      iconClassName="tv-accent h-6 w-6 shrink-0"
      maxWidthClassName="max-w-xl"
      footer={(
        <div className="grid w-full grid-cols-[1fr_1.15fr] gap-2">
          <Button variant="ghost" block onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            block
            type="submit"
            form="add-item-form"
            icon={itemToEdit ? Save : Plus}
            disabled={!trimmedName}
          >
            {itemToEdit ? t('common:actions.save') : t('common:actions.add')}
          </Button>
        </div>
      )}
    >
      <form id="add-item-form" onSubmit={handleSave} className="tv-handout-form">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        <div className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6">
          <button
            type="button"
            onClick={openFilePicker}
            className="tv-handout-form-cover group"
            title={t('modal.pickImage')}
          >
            {formData.imageUrl ? (
              <>
                <TvImage src={formData.imageUrl} alt="" className="absolute inset-0 opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_8%)] via-transparent to-transparent" />
              </>
            ) : (
              <div className="tv-handout-form-cover__empty">
                <Package className="h-6 w-6 opacity-60" aria-hidden />
                <span className="tv-handout-form-cover__empty-label">{t('modal.addImage')}</span>
              </div>
            )}
            <div className="tv-handout-form-cover__tools">
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="tv-hover-danger"
                  onClick={(event) => { event.stopPropagation(); clearImage(); }}
                >
                  {t('modal.clear')}
                </Button>
              ) : null}
            </div>
          </button>
        </div>

        {showPlaceholderPicker ? (
          <div className="tv-handout-form-picker space-y-2">
            <CreateFormPlaceholderGrid
              images={ITEM_PLACEHOLDER_IMAGES}
              selectedUrl={formData.imageUrl}
              onPick={handlePickPlaceholder}
              maxHeightClass="max-h-44"
              gridClass="grid-cols-6 sm:grid-cols-8"
            />
          </div>
        ) : null}

        <div className="tv-handout-form-identity">
          <input
            id="item-name"
            autoFocus
            required
            type="text"
            value={formData.name}
            onChange={(e) => patchForm({ name: e.target.value })}
            placeholder={t('modal.namePlaceholder')}
            className="tv-handout-form-title"
          />

          <div className="tv-handout-form-category-grid" role="group" aria-label={t('modal.categoryAria')}>
            {ITEM_CATEGORIES.map(({ value }) => (
              <button
                key={value}
                type="button"
                onClick={() => patchForm({ category: value })}
                className={`tv-segmented__option ${formData.category === value ? 'tv-segmented__option--active' : ''}`}
              >
                {t(`categories.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <section className="tv-handout-form-section">
          <div className="tv-handout-form-section__head">
            <label htmlFor="item-desc" className="tv-label">{t('modal.descriptionLabel')}</label>
            <span className="tv-handout-form-section__hint">{t('modal.optional')}</span>
          </div>
          <textarea
            id="item-desc"
            rows={4}
            value={formData.desc}
            onChange={(e) => patchForm({ desc: e.target.value })}
            placeholder={t('modal.descriptionPlaceholder')}
            className="tv-field w-full resize-y font-story leading-relaxed"
          />
        </section>

        <section className="tv-handout-form-section tv-handout-form-options">
          <p className="tv-label">{t('modal.optionsLabel')}</p>

          {isGM && !itemToEdit ? (
            <div className="tv-handout-form-assign">
              <UserPlus className="tv-handout-form-assign__icon h-3.5 w-3.5" aria-hidden />
              <select
                value={formData.ownerId}
                onChange={(event) => patchForm({ ownerId: event.target.value })}
                className="tv-select tv-handout-form-assign__select"
                aria-label={t('modal.ownerLabel')}
              >
                <option value="party">{t('modal.partyLoot')}</option>
                {playerOptions.map((player) => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="tv-handout-form-amount">
            <span className="tv-label" id="item-amount-label">{t('modal.amountLabel')}</span>
            <div className="tv-segmented tv-handout-form-amount__stepper" role="group" aria-labelledby="item-amount-label">
              <button
                type="button"
                onClick={() => patchForm({ amount: Math.max(1, amount - 1) })}
                className="tv-segmented__option"
                aria-label={t('modal.lessAria')}
              >
                −
              </button>
              <input
                id="item-amount"
                required
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => patchForm({ amount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className="hide-arrows w-11 border-x border-[color-mix(in_srgb,var(--tv-border),transparent_32%)] bg-transparent text-center text-sm font-semibold tabular-nums tv-text outline-none"
              />
              <button
                type="button"
                onClick={() => patchForm({ amount: amount + 1 })}
                className="tv-segmented__option"
                aria-label={t('modal.moreAria')}
              >
                +
              </button>
            </div>
          </div>
        </section>
      </form>
    </ModalFrame>
  );
}

export default AddItemModal;
