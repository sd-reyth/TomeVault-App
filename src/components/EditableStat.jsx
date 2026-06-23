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
        className={`tv-hp-input hide-arrows w-8 md:w-10 ${className}`} 
        value={val} 
        onChange={e => setVal(e.target.value)} 
        onBlur={() => { onChange(val === '' ? null : parseInt(val, 10)); setIsEditing(false); }}
        onKeyDown={e => { if(e.key === 'Enter') e.target.blur(); }}
      />
    );
  }
  return (
    <span 
      className={`cursor-pointer rounded px-1 -mx-1 transition-all duration-200 hover:tv-accent hover:bg-[color-mix(in_srgb,var(--tv-accent),transparent_92%)] ${className}`} 
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      title={title || "Klik om te bewerken"}
    >
      {value !== null && value !== undefined ? value : '-'}
    </span>
  );
}

export default EditableStat;
