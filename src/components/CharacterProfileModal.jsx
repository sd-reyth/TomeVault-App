import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Crown, ImagePlus, Plus, Save, Trash2, UserRound, X } from 'lucide-react';
import {
  DEFAULT_AVATAR_POSITION,
  getAvatarObjectPosition,
  normalizeAvatarPosition,
  resolveDisplayAvatar,
  PROFILE_PROMPT_AVATARS,
} from '../lib/placeholders';
import { STAT_SUGGESTIONS } from '../data/mockData';
import { sendChatMessage } from '../lib/chatUtils';
import { COMBAT_STATUS } from '../lib/battleUtils';
import {
  CONDITIONS,
  CONDITION_BADGE_COLORS,
  getActiveConditions,
} from '../lib/battleConditions';
import { CONDITION_ICON_MAP } from '../features/combat/conditionIconMap';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';
import Button from './Button';

function ProfileFold({ title, badge, open, onToggle, children }) {
  return (
    <div className="tv-profile-fold">
      <button
        type="button"
        onClick={onToggle}
        className="tv-profile-fold__trigger"
        aria-expanded={open}
      >
        <span className="tv-profile-fold__title">{title}</span>
        <span className="inline-flex items-center gap-2">
          {badge ? <span className="tv-profile-fold__badge">{badge}</span> : null}
          {open ? <ChevronUp className="h-4 w-4 tv-muted" /> : <ChevronDown className="h-4 w-4 tv-muted" />}
        </span>
      </button>
      {open ? <div className="tv-profile-fold__body">{children}</div> : null}
    </div>
  );
}

function CharacterProfileModal({
  isOpen,
  onClose,
  character,
  role,
  currentPlayerId,
  combatStatus,
  onSave,
  onTransferGm,
  onRemoveFromCombat,
  onUpdateStat,
  chatColor,
  onOpenInitiativeSwap,
  initiativeOrder,
}) {
  const [formData, setFormData] = useState({});
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [level, setLevel] = useState(1);
  const [conditionsDraftIds, setConditionsDraftIds] = useState([]);
  const [showAppearancePanel, setShowAppearancePanel] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showConditionsPanel, setShowConditionsPanel] = useState(false);

  useEffect(() => {
    if (character) {
      setFormData({ ...character });
      setLevel(Number(character.level) || 1);
      setPendingAvatarFile(null);
      setConfirmTransfer(false);
      setConditionsDraftIds(getActiveConditions(character).map((condition) => condition.id));
      setShowAppearancePanel(false);
      setShowConditionsPanel(false);
      setShowStatsPanel(false);
    }
  }, [character]);

  if (!isOpen || !character) return null;

  const isGM = role === 'gm';
  const isHiddenNpcForPlayer = !isGM && character.isNpc && character.isRevealed === false;
  if (isHiddenNpcForPlayer) return null;
  const isMine = character.id === currentPlayerId;
  const canEdit = isGM || isMine;
  const canRepositionAvatar = (character.isNpc && isGM) || (!character.isNpc && isMine);
  const canTransferGm = isGM && !isMine && !character.isNpc;
  const canSwapInitiative = Boolean(
    isGM
    && character?.hasAlertFeat
    && Number.isFinite(Number(character?.init))
    && Array.isArray(initiativeOrder)
    && initiativeOrder.includes(character.id)
  );
  const canRemoveFromSlagorde = Boolean(
    isGM
    && combatStatus !== COMBAT_STATUS.ACTIVE
    && onRemoveFromCombat
  );
  const activeConditions = getActiveConditions(formData);
  const avatarPosition = normalizeAvatarPosition(formData.avatarPosition);
  const displayAvatar = resolveDisplayAvatar(formData.avatar, character.id);
  const portraitObjectPosition = getAvatarObjectPosition(avatarPosition);
  const portraitFrameClass = character.isNpc ? 'tv-tone-enemy-surface' : '';

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

  const handleAvatarPositionChange = (axis, value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    const current = normalizeAvatarPosition(formData.avatarPosition);
    const next = axis === 'x'
      ? { ...current, x: numericValue }
      : { ...current, y: numericValue };
    handleChange('avatarPosition', next);
  };

  const handleResetAvatarPosition = () => {
    handleChange('avatarPosition', { ...DEFAULT_AVATAR_POSITION });
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

  const toggleConditionDraft = (conditionId) => {
    setConditionsDraftIds((current) => {
      const next = current.includes(conditionId)
        ? current.filter((id) => id !== conditionId)
        : [...current, conditionId];
      const nextConditions = next.map((id) => ({ id, active: true }));
      onUpdateStat?.(character.id, 'conditions', nextConditions);
      handleChange('conditions', nextConditions);
      return next;
    });
  };

  const handleRemoveFromSlagorde = async () => {
    const targetName = formData.name || character.name;
    const warningMessage = character.isNpc
      ? `Weet je zeker dat je ${targetName} uit de slagorde wilt verwijderen?`
      : `${targetName} verdwijnt uit de initiativelijst en kan later opnieuw meedoen. Doorgaan?`;
    const confirmed = typeof window !== 'undefined' ? window.confirm(warningMessage) : true;
    if (!confirmed) return;

    await onRemoveFromCombat?.(character);
    onClose?.();
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
      subtitle={formData.subtitle || (character.isNpc ? 'Vijand' : 'Speler')}
      icon={UserRound}
      maxWidthClassName="max-w-md"
      bodyClassName="!p-0"
      backdropClassName={showAppearancePanel ? 'tv-backdrop--peek' : ''}
      footer={canEdit || canRemoveFromSlagorde ? (
        <div className="flex w-full flex-col gap-2">
          {canEdit ? (
            <Button variant="primary" block onClick={handleSave}>
              <Save className="h-4 w-4" /> Opslaan
            </Button>
          ) : null}
          {canRemoveFromSlagorde ? (
            <Button variant="danger" block onClick={handleRemoveFromSlagorde}>
              <Trash2 className="h-4 w-4" />
              {character.isNpc ? 'Verwijder uit slagorde' : 'Haal uit gevecht'}
            </Button>
          ) : null}
        </div>
      ) : null}
      footerClassName="tv-modal-footer--settings"
    >
      <div className="tv-profile-sheet">
        <section className="tv-profile-identity">
          <label className={`tv-image-frame tv-profile-portrait-frame relative group ${portraitFrameClass} ${canEdit ? 'cursor-pointer' : ''}`}>
            {canEdit && <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />}
            <TvImage
              src={displayAvatar}
              alt="Portret"
              style={{ objectPosition: portraitObjectPosition }}
            />
            {canEdit && (
              <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_38%)] opacity-0 transition-opacity group-hover:opacity-100">
                <ImagePlus className="h-5 w-5 tv-text" />
              </div>
            )}
          </label>

          <div className="tv-profile-identity__fields">
            {canEdit ? (
              <>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="tv-profile-name-input"
                  placeholder="Naam"
                />
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  className="tv-profile-subtitle-input"
                  placeholder="Ras / klasse"
                />
              </>
            ) : (
              <>
                <h2 className="tv-profile-name-display">{formData.name}</h2>
                {formData.subtitle ? <p className="tv-profile-subtitle-display">{formData.subtitle}</p> : null}
              </>
            )}
          </div>
        </section>

        <section>
          <p className="tv-profile-section-label">Gevecht</p>
          <div className="tv-profile-stats">
            <div className="tv-profile-stat">
              <span className="tv-label">HP</span>
              <div className="tv-profile-stat__value">
                {canEdit ? (
                  <>
                    <input type="number" value={formData.hp || 0} onChange={(e) => handleChange('hp', e.target.value)} className="tv-stat-input hide-arrows" />
                    <span className="tv-muted text-xs">/</span>
                    <input type="number" value={formData.maxHp || 0} onChange={(e) => handleChange('maxHp', e.target.value)} className="tv-stat-input hide-arrows text-xs tv-muted" />
                  </>
                ) : (
                  <span className="text-lg font-bold tv-accent">{formData.hp}<span className="tv-muted text-sm font-medium"> / {formData.maxHp}</span></span>
                )}
              </div>
            </div>
            <div className="tv-profile-stat">
              <span className="tv-label">AC</span>
              <div className="tv-profile-stat__value">
                {canEdit ? (
                  <input type="number" value={formData.ac || 0} onChange={(e) => handleChange('ac', e.target.value)} className="tv-stat-input hide-arrows text-lg tv-text" />
                ) : (
                  <span className="text-lg font-bold tv-text">{formData.ac}</span>
                )}
              </div>
            </div>
            <div className="tv-profile-stat">
              <span className="tv-label" title="Initiative Modifier">Init</span>
              <div className="tv-profile-stat__value">
                {canEdit ? (
                  <input type="number" value={formData.initMod || 0} onChange={(e) => handleChange('initMod', e.target.value)} className="tv-stat-input hide-arrows text-lg tv-text" />
                ) : (
                  <span className="text-lg font-bold tv-text">{formData.initMod >= 0 ? `+${formData.initMod}` : formData.initMod}</span>
                )}
              </div>
            </div>
          </div>

          {isGM ? (
            <label className="tv-profile-inline-option mt-3">
              <input
                type="checkbox"
                checked={formData.hasAlertFeat || false}
                onChange={(event) => handleChange('hasAlertFeat', event.target.checked)}
                className="h-4 w-4 rounded border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-input-surface"
                style={{ accentColor: 'var(--tv-accent)' }}
              />
              <span className="text-sm tv-text">Alert Feat</span>
            </label>
          ) : null}

          {isGM && formData.hasAlertFeat ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 pl-7">
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
                  className="tv-button-ghost rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]"
                >
                  Swap initiative
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {canEdit ? (
          <ProfileFold
            title="Uiterlijk"
            badge={canRepositionAvatar ? `${avatarPosition.x}% · ${avatarPosition.y}%` : null}
            open={showAppearancePanel}
            onToggle={() => setShowAppearancePanel((current) => !current)}
          >
            {canRepositionAvatar ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs tv-muted">Portretpositie in slagorde</p>
                  <div className="flex items-center gap-2">
                    <div className={`tv-image-frame tv-profile-slagorde-preview ${portraitFrameClass}`}>
                      <TvImage src={displayAvatar} alt="" style={{ objectPosition: portraitObjectPosition }} />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetAvatarPosition}
                      className="tv-button-ghost rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <label className="block">
                  <span className="tv-meta text-[10px]">Horizontaal</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={avatarPosition.x}
                    onChange={(event) => handleAvatarPositionChange('x', event.target.value)}
                    className="brightness-slider mt-1 w-full"
                  />
                </label>
                <label className="block">
                  <span className="tv-meta text-[10px]">Verticaal</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={avatarPosition.y}
                    onChange={(event) => handleAvatarPositionChange('y', event.target.value)}
                    className="brightness-slider mt-1 w-full"
                  />
                </label>
              </div>
            ) : null}

            <div>
              <p className="tv-profile-section-label mb-2">Avatar</p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {PROFILE_PROMPT_AVATARS.slice(0, 24).map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => handlePickAvatar(url)}
                    className={`aspect-square overflow-hidden rounded-lg border transition-all ${formData.avatar === url ? 'border-[color-mix(in_srgb,var(--tv-accent),transparent_35%)] ring-1 ring-[color-mix(in_srgb,var(--tv-accent),transparent_55%)]' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)]'}`}
                  >
                    <TvImage src={url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </ProfileFold>
        ) : null}

        {canEdit ? (
          <ProfileFold
            title="Extra stats"
            badge={(formData.customStats || []).length ? String((formData.customStats || []).length) : null}
            open={showStatsPanel}
            onToggle={() => setShowStatsPanel((current) => !current)}
          >
            <div className="flex flex-wrap gap-2">
              {(formData.customStats || []).map((stat) => (
                <div key={stat.id} className="tv-chip-surface flex items-center overflow-hidden rounded-lg">
                  <input
                    list="stat-options"
                    value={stat.name}
                    onChange={(e) => {
                      const cleanAbbr = e.target.value.split(' - ')[0].trim().toUpperCase();
                      updateCustomStat(stat.id, 'name', cleanAbbr);
                    }}
                    className="tv-accent w-16 border-r border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-transparent p-1.5 text-center text-[10px] font-bold uppercase tracking-widest outline-none placeholder:tv-muted"
                    placeholder="—"
                  />
                  <input
                    type="number"
                    value={stat.value}
                    onChange={(e) => updateCustomStat(stat.id, 'value', e.target.value)}
                    className="tv-text w-10 hide-arrows bg-transparent p-1 text-center text-sm font-bold outline-none"
                  />
                  <button onClick={() => removeCustomStat(stat.id)} className="p-1.5 tv-muted transition-colors tv-hover-danger" title="Verwijder" aria-label="Verwijder eigenschap">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={addCustomStat} className="tv-icon-btn tv-icon-btn--sm border border-dashed tv-chip-surface tv-muted transition-colors hover:tv-accent hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_52%)]" title="Voeg eigenschap toe" aria-label="Voeg eigenschap toe">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <datalist id="stat-options">
              {STAT_SUGGESTIONS.map((s) => (
                <option key={s.abbr} value={`${s.abbr} - ${s.name}`} />
              ))}
            </datalist>
          </ProfileFold>
        ) : null}

        {isGM ? (
          <ProfileFold
            title="Status & condities"
            badge={activeConditions.length ? String(activeConditions.length) : null}
            open={showConditionsPanel}
            onToggle={() => setShowConditionsPanel((current) => !current)}
          >
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((condition) => {
                const isActive = conditionsDraftIds.includes(condition.id);
                const ConditionListIcon = CONDITION_ICON_MAP[condition.icon] || AlertCircle;
                return (
                  <button
                    key={condition.id}
                    type="button"
                    onClick={() => toggleConditionDraft(condition.id)}
                    className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                      isActive
                        ? `${CONDITION_BADGE_COLORS[condition.color]} border-current`
                        : 'border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-muted hover:border-[color-mix(in_srgb,var(--tv-border),transparent_20%)]'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <ConditionListIcon className="h-4 w-4" />
                      {isActive ? <Check className="h-3 w-3" /> : null}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.12em]">{condition.label}</div>
                  </button>
                );
              })}
            </div>
          </ProfileFold>
        ) : null}

        {canTransferGm ? (
          <div className="tv-profile-fold">
            {!confirmTransfer ? (
              <button
                type="button"
                onClick={() => setConfirmTransfer(true)}
                className="tv-profile-fold__trigger"
              >
                <span className="tv-profile-fold__title inline-flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5" />
                  GM overdragen
                </span>
                <ChevronDown className="h-4 w-4 tv-muted" />
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm tv-text-sub">GM-rechten overdraagt aan {formData.name || 'speler'}?</p>
                <div className="flex gap-2">
                  <Button variant="secondary" block onClick={() => setConfirmTransfer(false)}>Nee</Button>
                  <Button variant="primary" block onClick={() => onTransferGm?.(formData)}>Ja</Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <section>
          <p className="tv-profile-section-label mb-2">Lore</p>
          {canEdit ? (
            <textarea
              value={formData.bio || ''}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Achtergrond, spreuken, effecten…"
              className="tv-field min-h-[100px] w-full resize-none font-story leading-relaxed"
            />
          ) : (
            <div className="min-h-[100px] font-story text-sm leading-relaxed tv-text">
              {formData.bio || <span className="italic tv-muted">—</span>}
            </div>
          )}
        </section>
      </div>
    </ModalFrame>
  );
}

export default CharacterProfileModal;
