import React, { useState, useEffect } from 'react';

function EditableStat({ value, onChange, disabled, className, title }) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  useEffect(() => setVal(value || ''), [value]);

  if (disabled) return <span className={className} title={title}>{value !== null && value !== undefined ? value : '-'}</span>;

  if (isEditing) {
    return (
      <input 
        autoFocus 
        type="number" 
        onClick={(e) => e.stopPropagation()}
        className={`w-8 md:w-10 bg-stone-900 border border-[var(--tv-accent)] rounded px-1 text-center outline-none text-stone-200 hide-arrows transition-all duration-200 focus:border-[var(--tv-accent)]/70 focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--tv-accent),transparent_72%)] ${className}`} 
        value={val} 
        onChange={e => setVal(e.target.value)} 
        onBlur={() => { onChange(val === '' ? null : parseInt(val, 10)); setIsEditing(false); }}
        onKeyDown={e => { if(e.key === 'Enter') e.target.blur(); }}
      />
    );
  }
  return (
    <span 
      className={`cursor-pointer hover:text-[var(--tv-accent)] hover:bg-[color-mix(in_srgb,var(--tv-accent),transparent_92%)] rounded px-1 -mx-1 transition-all duration-200 ${className}`} 
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      title={title || "Klik om te bewerken"}
    >
      {value !== null && value !== undefined ? value : '-'}
    </span>
  );
}

export default EditableStat;
