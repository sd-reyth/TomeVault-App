import React, { useState, useEffect } from 'react';
import { X, ImagePlus, Eye, EyeOff, Hand, Trash2 } from 'lucide-react';
import { getHandoutIcon } from '../lib/handoutUtils';
import { getAllPlaceholderImages, suggestHandoutImages } from '../lib/placeholders';

function HandoutModal({ isOpen, onClose, handout, role, onSave, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '', type: 'clue', content: '', secret: '', isRevealed: false, imageUrl: null, claimable: false, claimedBy: null
  });
  const [pendingFile, setPendingFile] = useState(null);
  const [showAllPlaceholders, setShowAllPlaceholders] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPendingFile(null);
      setShowAllPlaceholders(false);
      if (handout) {
        setFormData({ ...handout });
        setIsEditing(false); 
      } else {
        setFormData({ title: '', type: 'clue', content: '', secret: '', isRevealed: false, imageUrl: null, claimable: false, claimedBy: null });
        setIsEditing(true); 
      }
    }
  }, [isOpen, handout]);

  if (!isOpen) return null;

  const isGM = role === 'gm';
  const Icon = getHandoutIcon(formData.type);
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
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-amber-900/40 rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-amber-600/10 blur-[60px] pointer-events-none" />

        <div className="p-4 border-b border-stone-800/50 flex justify-between items-center relative z-10 shrink-0 bg-stone-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shadow-inner">
              <Icon className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-fantasy font-bold text-stone-200 tracking-wider">
              {handout ? 'Handout Inspecteren' : 'Nieuwe Handout Vervaardigen'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isGM && handout && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-fantasy tracking-wider uppercase transition-colors">
                Bewerken
              </button>
            )}
            <button onClick={onClose} className="text-stone-400 hover:text-rose-400 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 p-5 md:p-8">
          {isEditing && isGM ? (
            <form id="handout-form" onSubmit={handleSave} className="flex flex-col gap-5">
              
              <div className="flex justify-center w-full">
                <label className="relative group cursor-pointer w-full h-28 md:h-36 rounded-xl border-2 border-dashed border-stone-700 bg-stone-950/50 hover:bg-stone-900/80 hover:border-amber-700/50 flex items-center justify-center overflow-hidden transition-all shadow-inner">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Handout preview" className="w-full h-full object-cover opacity-70 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImagePlus className="w-8 h-8 text-stone-200 drop-shadow-md" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-stone-500 group-hover:text-amber-500 transition-colors">
                      <ImagePlus className="w-6 h-6 md:w-8 md:h-8" />
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Eigen afbeelding uploaden</span>
                    </div>
                  )}
                </label>
              </div>

              {(() => {
                const suggestions = suggestHandoutImages(formData.title, formData.content, formData.type, 5);
                const allImages = getAllPlaceholderImages();
                return (
                  <div>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Of kies een suggestie</div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {suggestions.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => handlePickPlaceholder(url)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            formData.imageUrl === url
                              ? 'border-amber-500 shadow-[0_0_8px_rgba(217,119,6,0.5)]'
                              : 'border-stone-700 hover:border-amber-700/60'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover scale-[1.25]" loading="lazy" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowAllPlaceholders((v) => !v)}
                        className={`aspect-square rounded-lg border-2 transition-all text-stone-300 font-fantasy text-lg ${showAllPlaceholders ? 'border-amber-500 bg-amber-950/30' : 'border-stone-700 hover:border-amber-700/60 bg-stone-900/60'}`}
                        title="Toon alle placeholders"
                      >
                        ...
                      </button>
                    </div>

                    {showAllPlaceholders && (
                      <div className="mt-3 max-h-52 overflow-y-auto no-scrollbar rounded-lg border border-stone-800 bg-stone-950/40 p-2">
                        <div className="grid grid-cols-8 gap-1.5">
                          {allImages.map((url) => (
                            <button
                              key={`all-${url}`}
                              type="button"
                              onClick={() => handlePickPlaceholder(url)}
                              className={`aspect-square rounded-md overflow-hidden border transition-all ${formData.imageUrl === url ? 'border-amber-500 shadow-[0_0_6px_rgba(217,119,6,0.4)]' : 'border-stone-700 hover:border-amber-700/60'}`}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover scale-[1.25]" loading="lazy" />
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
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Titel</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Bijv. Geheime Brief van de Koning"
                    className="w-full bg-stone-950/50 border border-stone-800 rounded-lg px-4 py-3 text-lg font-fantasy font-bold text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors"
                  />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Type</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-stone-950/50 border border-stone-800 rounded-lg px-4 py-3 text-sm font-fantasy tracking-wider text-stone-300 focus:outline-none focus:border-amber-600/50 transition-colors appearance-none"
                  >
                    <option value="clue">Clue / Document</option>
                    <option value="loot">Loot / Voorwerp</option>
                    <option value="map">Kaart / Omgeving</option>
                    <option value="npc">NPC / Persoon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 flex justify-between">
                  <span>Publieke Inhoud</span>
                  <span className="text-stone-600 font-normal normal-case">Zichtbaar voor spelers</span>
                </label>
                <textarea 
                  required
                  rows={4}
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="Wat zien of lezen de spelers als ze dit bekijken?"
                  className="w-full bg-stone-950/50 border border-stone-800 rounded-lg px-4 py-3 text-sm font-story text-stone-300 placeholder-stone-600 focus:outline-none focus:border-amber-600/50 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 flex justify-between">
                  <span>GM Inzicht (Geheim)</span>
                  <span className="text-stone-600 font-normal normal-case">Alleen voor de GM</span>
                </label>
                <textarea 
                  rows={3}
                  value={formData.secret || ''} 
                  onChange={e => setFormData({...formData, secret: e.target.value})}
                  placeholder="Zijn er vallen? Bevat het valse informatie? Wat is de ware aard?"
                  className="w-full bg-stone-950/80 border border-amber-900/30 rounded-lg px-4 py-3 text-sm font-story text-amber-500/90 placeholder-stone-700 focus:outline-none focus:border-amber-600/50 transition-colors resize-none leading-relaxed shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="flex items-center gap-3 bg-stone-950/30 border border-stone-800/50 p-3 rounded-lg">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, isRevealed: !formData.isRevealed})}
                    className={`p-2 rounded transition-colors shrink-0 ${formData.isRevealed ? 'bg-amber-900/40 text-amber-500' : 'bg-stone-900 text-stone-500 hover:text-stone-300'}`}
                  >
                    {formData.isRevealed ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-fantasy tracking-wider text-stone-200">Zichtbaarheid</span>
                    <span className="text-[10px] text-stone-500 font-story truncate" title={formData.isRevealed ? 'Spelers kunnen dit nu in hun lijst zien.' : 'Verborgen in de schaduwen. Spelers zien dit (nog) niet.'}>
                      {formData.isRevealed ? 'Spelers zien dit.' : 'Verborgen voor spelers.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-stone-950/30 border border-stone-800/50 p-3 rounded-lg">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, claimable: !formData.claimable})}
                    className={`p-2 rounded transition-colors shrink-0 ${formData.claimable ? 'bg-amber-900/40 text-amber-500' : 'bg-stone-900 text-stone-500 hover:text-stone-300'}`}
                  >
                    <Hand className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-fantasy tracking-wider text-stone-200">Claimbaar</span>
                    <span className="text-[10px] text-stone-500 font-story truncate" title={formData.claimable ? 'Spelers kunnen dit object claimen naar hun schatkamer.' : 'Dit object kan niet geclaimd worden.'}>
                      {formData.claimable ? 'Kan geclaimd worden.' : 'Kan niet geclaimd worden.'}
                    </span>
                  </div>
                </div>
              </div>

            </form>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="text-center pb-6 border-b border-stone-800/50">
                <div className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-950/50 border border-amber-900/30 px-3 py-1 rounded-full mb-4">
                  {formData.type}
                </div>
                <h2 className="text-3xl md:text-4xl font-fantasy font-bold text-stone-100 leading-tight">
                  {formData.title}
                </h2>
                {formData.imageUrl && (
                  <div className="w-full h-48 md:h-64 rounded-xl border border-stone-800 overflow-hidden shadow-lg mt-6 bg-stone-950 relative isolate">
                    <img
                      src={formData.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover scale-[1.65] blur-2xl opacity-70 saturate-125"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-stone-950/10 via-transparent to-stone-950/25" />
                    <img src={formData.imageUrl} alt={formData.title} className="relative z-10 w-full h-full object-cover scale-[1.18]" />
                  </div>
                )}
              </div>
              
              <div className="w-full font-story text-stone-200 text-[15px] md:text-[17px] leading-[1.8] tracking-[0.01em]">
                <div className="space-y-4 md:space-y-5 break-words">
                  {(paragraphs.length ? paragraphs : [normalizeParagraph(formData.content || '')]).map((paragraph, index) => (
                    <p key={`${index}-${paragraph.slice(0, 24)}`}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {isGM && formData.secret && (
                <div className="mt-4 bg-stone-950/80 border border-amber-900/40 rounded-xl p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-600" />
                  <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <EyeOff className="w-3 h-3" /> Exclusief GM Inzicht
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
            </div>
          )}
        </div>

        {isGM && isEditing && (
          <div className="p-4 border-t border-stone-800/50 bg-stone-900/80 backdrop-blur-md flex justify-between items-center shrink-0">
            {handout ? (
              <button 
                onClick={() => onDelete(handout.id)} 
                className="text-stone-500 hover:text-rose-500 p-2 rounded hover:bg-rose-950/30 transition-colors"
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
                className="px-4 py-2.5 rounded-lg font-fantasy tracking-wider text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                Annuleren
              </button>
              <button 
                form="handout-form"
                type="submit"
                className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-100 px-6 py-2.5 rounded-lg font-fantasy tracking-wider text-sm shadow-[0_0_10px_rgba(217,119,6,0.2)] transition-all"
              >
                {handout ? 'Wijzigingen Opslaan' : 'Vervaardig'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HandoutModal;
