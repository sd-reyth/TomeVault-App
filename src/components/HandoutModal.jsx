import React, { useState, useEffect } from 'react';
import { ImagePlus, Eye, EyeOff, Hand, Trash2, UserPlus } from 'lucide-react';
import { getHandoutIcon } from '../lib/handoutUtils';
import { getAllPlaceholderImages, suggestHandoutImages } from '../lib/placeholders';
import ModalFrame from './ModalFrame';
import TvImage from './TvImage';

function HandoutModal({ isOpen, onClose, handout, role, players = [], currentPlayerId, onSave, onDelete, onAddToInitiative, canAddToInitiative }) {
  const [isEditing, setIsEditing] = useState(false);
  const EMPTY_FORM = {
    title: '',
    type: 'clue',
    content: '',
    secret: '',
    isRevealed: false,
    imageUrl: null,
    claimable: false,
    claimedBy: null,
    assignedToUid: null,
    assignedToNick: null,
    secretRevealed: false,
    npcSubtitle: 'Vijand',
    npcHp: 15,
    npcAc: 12,
    npcInitMod: 2,
  };
  const [formData, setFormData] = useState({
    ...EMPTY_FORM,
  });
  const [pendingFile, setPendingFile] = useState(null);
  const [showAllPlaceholders, setShowAllPlaceholders] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPendingFile(null);
      setShowAllPlaceholders(false);
      if (handout) {
        setFormData({
          ...EMPTY_FORM,
          ...handout,
          secretRevealed: handout.secretRevealed === true,
        });
        setIsEditing(false); 
      } else {
        setFormData({ ...EMPTY_FORM });
        setIsEditing(true); 
      }
    }
  }, [isOpen, handout]);

  if (!isOpen) return null;

  const isGM = role === 'gm';
  const Icon = getHandoutIcon(formData.type);
  const assignedPlayer = players.find((player) => player.id === formData.assignedToUid) || null;
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPendingFile(file);
      setFormData(prev => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
    }
  };

  const handlePickPlaceholder = (url) => {
    setPendingFile(null);
    setFormData(prev => ({ ...prev, imageUrl: url }));
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={handout ? 'Handout' : 'Nieuw'}
      subtitle={formData.title || (formData.type === 'npc' ? 'NPC' : 'Document')}
      icon={Icon}
      maxWidthClassName="max-w-2xl"
      bodyClassName="px-0 py-0 overflow-y-hidden sm:px-0 sm:py-0"
    >
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 md:p-8">
          {isEditing && isGM ? (
            <form id="handout-form" onSubmit={handleSave} className="flex flex-col gap-5">
              
              <div className="flex justify-center w-full">
                <label className="relative group cursor-pointer w-full h-32 md:h-40 rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--tv-accent),transparent_58%)] tv-panel-inset hover:color-mix(in srgb, var(--tv-bg-surface), transparent 6%) hover:border-[var(--tv-accent)]/50 flex items-center justify-center overflow-hidden transition-all shadow-inner">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {formData.imageUrl ? (
                    <>
                      <TvImage src={formData.imageUrl} alt="Handout preview" contain className="p-2 tv-input-surface" />
                      <div className="absolute left-2 top-2 rounded border border-cyan-700/60 bg-cyan-950/65 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                        Volledige upload
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity tv-panel-inset">
                        <ImagePlus className="w-8 h-8 tv-text drop-shadow-md" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 tv-muted group-hover:text-[var(--tv-accent)] transition-colors">
                      <ImagePlus className="w-6 h-6 md:w-8 md:h-8" />
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Eigen afbeelding uploaden</span>
                    </div>
                  )}
                </label>
              </div>

              {formData.imageUrl ? (
                <p className="-mt-2 text-[11px] leading-5 tv-muted">
                  De volledige afbeelding wordt geupload. In het overzicht kan een uitsnede worden gebruikt om de kaart netjes te tonen.
                </p>
              ) : null}

              {(() => {
                const suggestions = suggestHandoutImages(formData.title, formData.content, formData.type, 5);
                const allImages = getAllPlaceholderImages();
                return (
                  <div>
                    <div className="text-[10px] font-bold tv-muted uppercase tracking-widest mb-2">Of kies een suggestie</div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {suggestions.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => handlePickPlaceholder(url)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            formData.imageUrl === url
                              ? 'border-[var(--tv-accent)] shadow-[0_0_8px_var(--tv-accent-shadow)]'
                              : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[var(--tv-accent)]/50'
                          }`}
                        >
                          <TvImage src={url} alt="" loading="lazy" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowAllPlaceholders((v) => !v)}
                        className={`aspect-square rounded-lg border-2 transition-all tv-text font-fantasy text-lg ${showAllPlaceholders ? 'border-[var(--tv-accent)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_85%)]' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[var(--tv-accent)]/50 tv-panel-inset'}`}
                        title="Toon alle placeholders"
                      >
                        ...
                      </button>
                    </div>

                    {showAllPlaceholders && (
                      <div className="mt-3 max-h-52 overflow-y-auto no-scrollbar rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset p-2">
                        <div className="grid grid-cols-8 gap-1.5">
                          {allImages.map((url) => (
                            <button
                              key={`all-${url}`}
                              type="button"
                              onClick={() => handlePickPlaceholder(url)}
                              className={`aspect-square rounded-md overflow-hidden border transition-all ${formData.imageUrl === url ? 'border-[var(--tv-accent)] shadow-[0_0_6px_var(--tv-accent-shadow-sm)]' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] hover:border-[var(--tv-accent)]/50'}`}
                            >
                              <TvImage src={url} alt="" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold tv-muted uppercase tracking-widest mb-1.5">Titel</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Bijv. Geheime Brief van de Koning"
                    className="w-full tv-panel-inset border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] rounded-lg px-4 py-3 text-lg font-fantasy font-bold tv-text placeholder:tv-muted focus:outline-none focus:border-[var(--tv-accent)]/70 focus:color-mix(in srgb, var(--tv-bg-surface), transparent 6%) transition-all duration-200"
                  />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-[10px] font-bold tv-muted uppercase tracking-widest mb-1.5">Type</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData((prev) => ({
                      ...prev,
                      type: e.target.value,
                      claimable: e.target.value === 'loot' ? prev.claimable : false,
                      assignedToUid: e.target.value === 'npc' ? null : prev.assignedToUid,
                      assignedToNick: e.target.value === 'npc' ? null : prev.assignedToNick,
                    }))}
                    className="w-full appearance-none rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-3 text-sm font-fantasy tracking-wider tv-text transition-colors focus:outline-none focus:border-[var(--tv-accent)]/60 focus:color-mix(in srgb, var(--tv-bg-surface), transparent 6%)"
                  >
                    <option value="clue">Clue / Document</option>
                    <option value="loot">Loot / Voorwerp</option>
                    <option value="map">Kaart / Omgeving</option>
                    <option value="npc">NPC / Persoon</option>
                  </select>
                </div>
              </div>

              {formData.type === 'npc' && (
                <div className="rounded-xl border border-rose-900/30 bg-rose-950/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500">NPC Gevechtsprofiel</div>
                      <p className="mt-1 text-xs leading-5 tv-muted">Deze gegevens worden gebruikt wanneer je deze handout als NPC aan de initiative order toevoegt.</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold tv-muted uppercase tracking-widest mb-1.5">Label</label>
                    <input
                      type="text"
                      value={formData.npcSubtitle || ''}
                      onChange={e => setFormData({ ...formData, npcSubtitle: e.target.value })}
                      placeholder="Bijv. Aartsvijand"
                      className="w-full rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-2.5 text-sm font-story tv-text placeholder:tv-muted transition-colors focus:outline-none focus:border-rose-500/60"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold tv-muted uppercase tracking-widest mb-1.5">HP</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.npcHp ?? 15}
                        onChange={e => setFormData({ ...formData, npcHp: e.target.value })}
                        className="hide-arrows w-full rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5 text-center text-sm tv-text transition-colors focus:outline-none focus:border-rose-500/60"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tv-muted uppercase tracking-widest mb-1.5">AC</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.npcAc ?? 12}
                        onChange={e => setFormData({ ...formData, npcAc: e.target.value })}
                        className="hide-arrows w-full rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5 text-center text-sm tv-text transition-colors focus:outline-none focus:border-rose-500/60"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tv-muted uppercase tracking-widest mb-1.5">Init Mod</label>
                      <input
                        type="number"
                        value={formData.npcInitMod ?? 2}
                        onChange={e => setFormData({ ...formData, npcInitMod: e.target.value })}
                        className="hide-arrows w-full rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-2.5 text-center text-sm tv-text transition-colors focus:outline-none focus:border-rose-500/60"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold tv-muted uppercase tracking-widest mb-1.5 flex justify-between">
                  <span>Publieke Inhoud</span>
                  <span className="tv-muted font-normal normal-case">Zichtbaar voor spelers</span>
                </label>
                <textarea 
                  required
                  rows={4}
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="Wat zien of lezen de spelers als ze dit bekijken?"
                  className="w-full resize-none rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-3 text-sm font-story leading-relaxed tv-text placeholder:tv-muted transition-colors focus:outline-none focus:border-[var(--tv-accent)]/60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 flex justify-between">
                  <span>Secret</span>
                  <span className="tv-muted font-normal normal-case">Alleen voor de GM</span>
                </label>
                <textarea 
                  rows={3}
                  value={formData.secret || ''} 
                  onChange={e => setFormData({...formData, secret: e.target.value})}
                  placeholder="Zijn er vallen? Bevat het valse informatie? Wat is de ware aard?"
                  className="w-full resize-none rounded-lg border border-amber-900/35 bg-amber-950/18 px-4 py-3 text-sm font-story leading-relaxed text-amber-200/90 placeholder:tv-muted transition-colors focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {String(formData.type || '').toLowerCase() !== 'npc' ? (
                <div className="rounded-xl border border-cyan-900/30 bg-cyan-950/10 p-4">
                  <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5">Toewijzen aan speler</label>
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
                    className="w-full tv-panel-inset border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] rounded-lg px-4 py-2.5 text-sm font-story tv-text focus:outline-none focus:border-cyan-700/50 transition-colors"
                  >
                    <option value="">Iedereen in de party</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] leading-5 tv-muted">
                    {formData.assignedToUid ? `Alleen ${assignedPlayer?.name || 'de geselecteerde speler'} ziet deze handout in de lijst.` : 'Iedere speler met zichtbaarheid aan kan deze handout zien.'}
                  </p>
                </div>
              ) : null}

              {String(formData.secret || '').trim() ? (
                <div className="rounded-xl border border-amber-900/30 tv-chip-surface p-4">
                  <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Secret zichtbaar voor spelers</label>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, secretRevealed: !prev.secretRevealed }))}
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-fantasy tracking-[0.12em] transition-colors ${formData.secretRevealed ? 'border-cyan-700/70 bg-cyan-950/35 text-cyan-200 hover:border-cyan-500' : 'border-[color-mix(in_srgb,var(--tv-border),transparent_20%)] tv-chip-surface tv-text hover:border-cyan-700/70 hover:text-cyan-200'}`}
                  >
                    {formData.secretRevealed ? 'Nu zichtbaar voor alle spelers' : 'Nu verborgen voor spelers'}
                  </button>
                  <p className="mt-2 text-[11px] leading-5 tv-muted">
                    Dit geldt voor iedereen: of alle spelers zien de Secret, of niemand.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="flex items-center gap-3 tv-panel-inset border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/50 p-3 rounded-lg">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, isRevealed: !formData.isRevealed})}
                    className={`p-2 rounded transition-colors shrink-0 ${formData.isRevealed ? 'bg-amber-900/40 text-amber-500' : 'tv-chip-surface tv-muted hover:tv-text'}`}
                  >
                    {formData.isRevealed ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-fantasy tracking-wider tv-text">Zichtbaarheid</span>
                    <span className="text-[10px] tv-muted font-story truncate" title={formData.isRevealed ? 'Spelers kunnen dit nu in hun lijst zien.' : 'Verborgen in de schaduwen. Spelers zien dit (nog) niet.'}>
                      {formData.isRevealed ? 'Spelers zien dit.' : 'Verborgen voor spelers.'}
                    </span>
                  </div>
                </div>

                {formData.type === 'loot' ? (
                  <div className="flex items-center gap-3 tv-panel-inset border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/50 p-3 rounded-lg">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, claimable: !formData.claimable})}
                      className={`p-2 rounded transition-colors shrink-0 ${formData.claimable ? 'bg-amber-900/40 text-amber-500' : 'tv-chip-surface tv-muted hover:tv-text'}`}
                    >
                      <Hand className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-fantasy tracking-wider tv-text">Claimbaar</span>
                      <span className="text-[10px] tv-muted font-story truncate" title={formData.claimable ? 'Spelers kunnen dit object claimen naar hun schatkamer.' : 'Dit object kan niet geclaimd worden.'}>
                        {formData.claimable ? 'Kan geclaimd worden.' : 'Kan niet geclaimd worden.'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 tv-panel-inset border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/50 p-3 rounded-lg opacity-80">
                    <div className="p-2 rounded shrink-0 tv-chip-surface tv-muted">
                      <Hand className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-fantasy tracking-wider tv-text">Claimbaar</span>
                      <span className="text-[10px] tv-muted font-story truncate">
                        {formData.type === 'npc' ? 'NPC-handouts zijn altijd niet-claimable.' : 'Alleen loot-handouts kunnen geclaimd worden.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="relative border-b border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/50 pb-6 text-center">
                {isGM && handout ? (
                  <div className="absolute right-0 top-0">
                    <button onClick={() => setIsEditing(true)} className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-3 py-1.5 text-xs font-fantasy uppercase tracking-wider tv-text transition-colors hover:color-mix(in srgb, var(--tv-bg-surface), transparent 6%) hover:tv-text">
                      Bewerken
                    </button>
                  </div>
                ) : null}
                <div className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-950/50 border border-amber-900/30 px-3 py-1 rounded-full mb-4">
                  {formData.type}
                </div>
                <h2 className="text-3xl md:text-4xl font-fantasy font-bold tv-text leading-tight">
                  {formData.title}
                </h2>
                {formData.imageUrl && (
                  <div className="tv-image-frame relative isolate w-full h-48 md:h-64 rounded-xl border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] overflow-hidden shadow-lg mt-6 tv-input-surface">
                    <TvImage
                      src={formData.imageUrl}
                      alt=""
                      aria-hidden="true"
                      zoom={1.65}
                      className="absolute inset-0 blur-2xl opacity-70 saturate-125"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b color-mix(in srgb, var(--tv-bg-canvas), transparent 90%) via-transparent color-mix(in srgb, var(--tv-bg-canvas), transparent 75%)" />
                    <TvImage src={formData.imageUrl} alt={formData.title} className="relative z-10" />
                  </div>
                )}
              </div>
              
              <div className="w-full max-w-[70ch] mx-auto text-left font-story tv-text/95 text-[15px] md:text-[17px] leading-[1.9] tracking-[0.01em]">
                <div className="space-y-4 md:space-y-5 break-words border-t border-[color-mix(in_srgb,var(--tv-border),transparent_28%)]/70 pt-6 md:pt-7">
                  {(paragraphs.length ? paragraphs : [normalizeParagraph(formData.content || '')]).map((paragraph, index) => (
                    <p key={`${index}-${paragraph.slice(0, 24)}`} className="tv-text/95">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {formData.assignedToUid ? (
                <div className="mx-auto w-full max-w-[70ch] rounded-xl border border-cyan-900/30 bg-cyan-950/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">Toegewezen</div>
                  <p className="mt-2 text-sm leading-6 tv-text">
                    Deze handout is gericht aan <span className="font-fantasy tracking-[0.08em] tv-text">{formData.assignedToNick || 'een speler'}</span>.
                  </p>
                </div>
              ) : null}

              {isGM && formData.type === 'npc' && (
                <div className="mx-auto w-full max-w-[70ch] rounded-xl border border-rose-900/30 bg-rose-950/10 p-4">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500">NPC Gevechtsprofiel</div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-[0.18em] tv-muted">HP</div>
                      <div className="mt-1 font-fantasy text-lg tracking-[0.14em] tv-text">{Number(formData.npcHp ?? 15) || 15}</div>
                    </div>
                    <div className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-[0.18em] tv-muted">AC</div>
                      <div className="mt-1 font-fantasy text-lg tracking-[0.14em] tv-text">{Number(formData.npcAc ?? 12) || 12}</div>
                    </div>
                    <div className="rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-chip-surface px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-[0.18em] tv-muted">Init Mod</div>
                      <div className="mt-1 font-fantasy text-lg tracking-[0.14em] tv-text">{(Number(formData.npcInitMod ?? 2) || 0) >= 0 ? `+${Number(formData.npcInitMod ?? 2) || 0}` : Number(formData.npcInitMod ?? 2) || 0}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToInitiative?.(formData)}
                    disabled={!canAddToInitiative}
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-fantasy tracking-[0.14em] transition-colors ${canAddToInitiative ? 'border-rose-900/50 bg-gradient-to-r from-rose-800 to-rose-700 tv-text hover:from-rose-700 hover:to-rose-600' : 'cursor-not-allowed border-[color-mix(in_srgb,var(--tv-border),transparent_28%)] tv-panel-inset tv-muted'}`}
                  >
                    <UserPlus className="w-4 h-4" /> {canAddToInitiative ? 'Voeg toe aan slagorde' : 'Pauzeer gevecht om toe te voegen'}
                  </button>
                </div>
              )}

              {isGM && formData.secret && (
                <div className="mt-4 tv-input-surface border border-amber-900/40 rounded-xl p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-600" />
                  <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <EyeOff className="w-3 h-3" /> Secret (alleen GM)
                  </h4>
                  <p className="font-story italic text-amber-500/90 text-sm leading-relaxed whitespace-pre-line">
                    {String(formData.secret || '')
                      .replace(/\r/g, '')
                      .split(/\n{2,}/)
                      .map((paragraph) => normalizeParagraph(paragraph))
                      .filter(Boolean)
                      .join('\n\n')}
                  </p>
                </div>
              )}

              {!isGM && formData.secret && playerCanSeeSecret ? (
                <div className="mt-4 tv-input-surface border border-cyan-900/40 rounded-xl p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                  <h4 className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Secret
                  </h4>
                  <p className="font-story text-cyan-100/90 text-sm leading-relaxed whitespace-pre-line">
                    {String(formData.secret || '')
                      .replace(/\r/g, '')
                      .split(/\n{2,}/)
                      .map((paragraph) => normalizeParagraph(paragraph))
                      .filter(Boolean)
                      .join('\n\n')}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {isGM && isEditing && (
          <div className="tv-modal-footer p-4 backdrop-blur-md flex justify-between items-center shrink-0 sm:px-5">
            {handout ? (
              <button 
                onClick={() => onDelete(handout.id)} 
                className="tv-muted hover:text-rose-500 p-2 rounded hover:bg-rose-950/30 transition-colors"
                title="Verwijder handout"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (!handout) onClose(); 
                  else setIsEditing(false); 
                }} 
                className="h-9 inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--tv-border),transparent_20%)] tv-chip-surface px-4 font-fantasy text-sm uppercase tracking-[0.16em] tv-text transition-colors hover:opacity-90 hover:tv-text"
              >
                Annuleren
              </button>
              <button 
                form="handout-form"
                type="submit"
                className="h-9 inline-flex items-center justify-center gap-2 rounded-lg px-4 font-fantasy text-sm uppercase tracking-[0.16em] tv-button-primary"
              >
                {handout ? 'Opslaan' : 'Nieuw'}
              </button>
            </div>
          </div>
        )}
    </ModalFrame>
  );
}

export default HandoutModal;
