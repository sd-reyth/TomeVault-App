import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Crown, Eye, EyeOff, Heart, LayoutGrid, Minus, Plus, Save, Skull, Trash2, UserRound, Zap } from 'lucide-react';
import {
  DEFAULT_AVATAR_POSITION,
  normalizeAvatarPosition,
  resolveDisplayAvatar,
  PROFILE_PROMPT_AVATARS,
} from '../lib/placeholders';
import { sendChatMessage } from '../lib/chatUtils';
import { COMBAT_STATUS } from '../lib/battleUtils';
import CustomStatsSection from '../ui/CustomStatsSection';
import {
  CONDITIONS,
  CONDITION_BADGE_COLORS,
  getActiveConditions,
} from '../lib/battleConditions';
import { CONDITION_ICON_MAP } from '../features/combat/conditionIconMap';
import { profileSnapshotMatchesPlayer } from '../lib/preparationLifecycle';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';
import Button from './Button';
import ImagePositionFrame from '../ui/ImagePositionFrame';

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
  profileArchives = [],
  onActivateProfileArchive,
  profileArchiveBusy = false,
}) {
  const [formData, setFormData] = useState({});
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [level, setLevel] = useState(1);
  const [conditionsDraftIds, setConditionsDraftIds] = useState([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showConditionsPanel, setShowConditionsPanel] = useState(false);
  const [showArchivePanel, setShowArchivePanel] = useState(false);

  useEffect(() => {
    if (character) {
      setFormData({ ...character });
      setLevel(Number(character.level) || 1);
      setPendingAvatarFile(null);
      setConfirmTransfer(false);
      setConditionsDraftIds(getActiveConditions(character).map((condition) => condition.id));
      setShowAvatarPicker(false);
      setShowConditionsPanel(false);
      setShowArchivePanel(false);
    }
  }, [character]);

  if (!isOpen || !character) return null;

  const isGM = role === 'gm';
  const isHiddenNpcForPlayer = !isGM && character.isNpc && character.isRevealed === false;
  if (isHiddenNpcForPlayer) return null;
  const isMine = character.id === currentPlayerId;
  const canEdit = isGM || isMine;
  const canEditHp = isGM || isMine;
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
      isRevealed: formData.isRevealed !== false,
      customStats: formData.customStats || []
    }, pendingAvatarFile);
  };

  const handleUploadFile = (file) => {
    if (!file) return;
    setPendingAvatarFile(file);
    handleChange('avatar', URL.createObjectURL(file));
  };

  const handlePickAvatar = (url) => {
    setPendingAvatarFile(null);
    handleChange('avatar', url);
    setShowAvatarPicker(false);
  };

  const handleAvatarPositionChange = (nextPosition) => {
    handleChange('avatarPosition', normalizeAvatarPosition(nextPosition));
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
      : `${targetName} wordt verborgen uit de slagorde en kan later opnieuw meedoen. Doorgaan?`;
    const confirmed = typeof window !== 'undefined' ? window.confirm(warningMessage) : true;
    if (!confirmed) return;

    await onRemoveFromCombat?.(character);
    onClose?.();
  };

  const handleNpcVisibilityToggle = () => {
    if (!isGM || !character.isNpc) return;
    const next = formData.isRevealed === false;
    handleChange('isRevealed', next);
    onUpdateStat?.(character.id, 'isRevealed', next);
  };

  const numericHp = Number(formData.hp) || 0;
  const numericMaxHp = Number(formData.maxHp) || 0;
  const hpRatio = numericMaxHp > 0 ? numericHp / numericMaxHp : (numericHp > 0 ? 1 : 0);
  const hpPct = Math.max(0, Math.min(100, Math.round(hpRatio * 100)));
  const hpTone = numericHp <= 0 ? 'critical' : hpRatio <= 0.25 ? 'critical' : hpRatio <= 0.5 ? 'wounded' : 'healthy';
  const atZeroHp = numericHp <= 0;
  const isDead = formData.isDead === true;
  const showDeathCard = isGM && (isDead || atZeroHp);

  const commitHp = (nextHp) => {
    const ceiling = numericMaxHp > 0 ? numericMaxHp : Number.POSITIVE_INFINITY;
    const clamped = Math.max(0, Math.min(Math.round(nextHp), ceiling));
    handleChange('hp', clamped);
    if (clamped > 0 && formData.isDead) {
      handleChange('isDead', false);
      onUpdateStat?.(character.id, 'isDead', false);
    }
    onUpdateStat?.(character.id, 'hp', clamped);
  };

  const adjustHp = (delta) => {
    if (!canEditHp) return;
    commitHp(numericHp + delta);
  };

  const handleToggleDeath = () => {
    if (!isGM) return;
    const next = !formData.isDead;
    handleChange('isDead', next);
    onUpdateStat?.(character.id, 'isDead', next);
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
              {character.isNpc ? 'Verwijder uit slagorde' : 'Verberg uit slagorde'}
            </Button>
          ) : null}
        </div>
      ) : null}
      footerClassName="tv-modal-footer--settings"
    >
      <div className="tv-profile-sheet">
        <section className="tv-profile-identity">
          <ImagePositionFrame
            src={displayAvatar}
            alt="Portret"
            value={avatarPosition}
            onChange={handleAvatarPositionChange}
            canReposition={canRepositionAvatar}
            canUpload={canEdit}
            onUpload={handleUploadFile}
            onReset={handleResetAvatarPosition}
            frameClassName={`tv-profile-portrait-frame ${portraitFrameClass}`}
            imageZoom={1.42}
            extraActions={canEdit ? (
              <button
                type="button"
                className={`tv-image-pos-frame__action tv-toolbar-icon-btn ${showAvatarPicker ? 'tv-button-primary' : 'tv-button-secondary'}`}
                onClick={() => setShowAvatarPicker((current) => !current)}
                title="Avatar kiezen"
                aria-label="Avatar kiezen"
                aria-pressed={showAvatarPicker}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          />

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

        {canEdit && showAvatarPicker ? (
          <section className="tv-avatar-picker-panel">
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {PROFILE_PROMPT_AVATARS.slice(0, 24).map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => handlePickAvatar(url)}
                  className={`tv-avatar-pick-tile ${formData.avatar === url ? 'is-selected' : ''}`}
                >
                  <TvImage src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {(formData.customStats || []).length > 0 || canEdit ? (
          <CustomStatsSection
            stats={formData.customStats || []}
            canEdit={canEdit}
            onAdd={addCustomStat}
            onUpdate={updateCustomStat}
            onRemove={removeCustomStat}
            resetKey={character.id}
          />
        ) : null}

        <section>
          <p className="tv-profile-section-label">Gevecht</p>

          <div className="tv-hp-control" data-tone={hpTone}>
            {canEditHp ? (
              <button
                type="button"
                className="tv-hp-control__step"
                onClick={() => adjustHp(-1)}
                aria-label="HP verlagen"
              >
                <Minus className="h-4 w-4" />
              </button>
            ) : null}
            <div className="tv-hp-control__gauge">
              <div className="tv-hp-control__fill" style={{ width: `${hpPct}%` }} aria-hidden />
              <div className="tv-hp-control__readout">
                <Heart className="tv-hp-control__icon" aria-hidden />
                {canEditHp ? (
                  <span className="tv-hp-control__values">
                    <input
                      type="number"
                      value={formData.hp ?? 0}
                      onChange={(e) => handleChange('hp', e.target.value)}
                      onBlur={(e) => commitHp(Number(e.target.value) || 0)}
                      className="tv-hp-control__input hide-arrows"
                      aria-label="Huidige HP"
                    />
                    <span className="tv-hp-control__sep">/</span>
                    <input
                      type="number"
                      value={formData.maxHp ?? 0}
                      onChange={(e) => handleChange('maxHp', e.target.value)}
                      className="tv-hp-control__input tv-hp-control__input--max hide-arrows"
                      aria-label="Maximale HP"
                    />
                  </span>
                ) : (
                  <span className="tv-hp-control__values">
                    <span className="tv-hp-control__static">{formData.hp ?? 0}</span>
                    <span className="tv-hp-control__sep">/</span>
                    <span className="tv-hp-control__static tv-hp-control__static--max">{formData.maxHp ?? 0}</span>
                  </span>
                )}
              </div>
            </div>
            {canEditHp ? (
              <button
                type="button"
                className="tv-hp-control__step"
                onClick={() => adjustHp(1)}
                aria-label="HP verhogen"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="tv-profile-stats tv-profile-stats--pair">
            <div className="tv-profile-stat tv-stat-tile">
              <span className="tv-label">AC</span>
              <div className="tv-profile-stat__value">
                {canEdit ? (
                  <input type="number" value={formData.ac || 0} onChange={(e) => handleChange('ac', e.target.value)} className="tv-stat-input hide-arrows text-lg tv-text" />
                ) : (
                  <span className="text-lg font-bold tv-text">{formData.ac}</span>
                )}
              </div>
            </div>
            <div className="tv-profile-stat tv-stat-tile">
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

          {showDeathCard ? (
            <div className={`tv-profile-control-card ${isDead ? 'tv-death-panel' : 'tv-panel-inset'}`}>
              <div className="tv-profile-control-card__row">
                <div className="min-w-0">
                  <p className="tv-label inline-flex items-center gap-1.5">
                    <Skull className="h-3.5 w-3.5" aria-hidden /> Levensstatus
                  </p>
                  <p className="mt-1 text-xs leading-5 tv-muted">
                    {isDead
                      ? 'Gemarkeerd als overleden. Toont een doodshoofd in de slagorde.'
                      : 'Op 0 HP. Markeer als overleden of laat herstellen.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={isDead ? 'secondary' : 'danger'}
                  size="sm"
                  icon={isDead ? Heart : Skull}
                  onClick={handleToggleDeath}
                >
                  {isDead ? 'Herleven' : 'Overleden'}
                </Button>
              </div>
            </div>
          ) : null}

          {isGM ? (
            <div className={`tv-profile-control-card ${formData.hasAlertFeat ? 'tv-toggle-active' : 'tv-panel-inset'}`}>
              <div className="tv-profile-control-card__row">
                <div className="min-w-0">
                  <p className="tv-label inline-flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" aria-hidden /> Alert Feat
                  </p>
                  <p className="mt-1 text-xs leading-5 tv-muted">
                    Kan het initiatief omwisselen aan het begin van het gevecht.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.hasAlertFeat ? 'accent' : 'secondary'}
                  size="sm"
                  icon={formData.hasAlertFeat ? Check : Plus}
                  onClick={() => handleChange('hasAlertFeat', !formData.hasAlertFeat)}
                >
                  {formData.hasAlertFeat ? 'Actief' : 'Inschakelen'}
                </Button>
              </div>

              {formData.hasAlertFeat ? (
                <div className="tv-profile-control-card__extra">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenInitiativeSwap?.(character)}
                    >
                      Wissel initiatief
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {isGM && character.isNpc ? (
            <div className="tv-profile-control-card tv-panel-inset">
              <div className="tv-profile-control-card__row">
                <div className="min-w-0">
                  <p className="tv-label">Spelerszichtbaarheid</p>
                  <p className="mt-1 text-xs leading-5 tv-muted">
                    {formData.isRevealed === false
                      ? 'Verborgen NPC’s staan niet in de spelers-slagorde.'
                      : 'Deze NPC is zichtbaar voor spelers in de slagorde.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.isRevealed === false ? 'primary' : 'secondary'}
                  size="sm"
                  icon={formData.isRevealed === false ? Eye : EyeOff}
                  onClick={handleNpcVisibilityToggle}
                >
                  {formData.isRevealed === false ? 'Onthul' : 'Verberg'}
                </Button>
              </div>
            </div>
          ) : null}
        </section>

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

        {isMine && !isGM ? (
          <ProfileFold
            title="Profielarchief"
            badge={profileArchives.length ? String(profileArchives.length) : null}
            open={showArchivePanel}
            onToggle={() => setShowArchivePanel((current) => !current)}
          >
            {profileArchives.length === 0 ? (
              <p className="text-sm leading-7 tv-text-sub">
                Opgeslagen profielen verschijnen hier na een rolacceptatie of profielwissel.
              </p>
            ) : (
              <div className="space-y-2">
                {profileArchives.map((entry) => {
                  const snapshot = entry.snapshot || {};
                  const isActive = profileSnapshotMatchesPlayer(snapshot, character);
                  return (
                    <div key={entry.id} className="tv-panel-inset rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold tv-text">{snapshot.name || 'Naamloos profiel'}</p>
                          {snapshot.subtitle ? (
                            <p className="mt-0.5 truncate text-xs italic tv-muted">{snapshot.subtitle}</p>
                          ) : null}
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] tv-muted">
                            {entry.templateName ? `via ${entry.templateName}` : 'Eigen profiel'}
                          </p>
                        </div>
                        {isActive ? (
                          <span className="tv-tag shrink-0 px-2 py-1 text-[10px]">Actief</span>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={profileArchiveBusy}
                            loading={profileArchiveBusy}
                            onClick={() => onActivateProfileArchive?.(entry)}
                          >
                            Activeer
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ProfileFold>
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
