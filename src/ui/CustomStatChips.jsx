import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { STAT_SUGGESTIONS } from '../data/mockData';

function normalizeStatName(value) {
  return String(value || '').split(' - ')[0].trim().toUpperCase();
}

function filterSuggestions(query, suggestions) {
  const needle = normalizeStatName(query);
  if (!needle) return suggestions.slice(0, 10);
  return suggestions.filter((entry) => (
    entry.abbr.includes(needle) || entry.name.toUpperCase().includes(needle)
  )).slice(0, 10);
}

function StatNameCombobox({ value, onChange, suggestions }) {
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const draftRef = useRef(value || '');
  const onChangeRef = useRef(onChange);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [menuStyle, setMenuStyle] = useState(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  const filtered = useMemo(
    () => filterSuggestions(draft, suggestions),
    [draft, suggestions]
  );

  const repositionMenu = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight || 192;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > menuHeight + 12;
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      width: Math.max(rect.width, 168),
      transform: openUp ? 'translateY(-100%)' : undefined,
      zIndex: 120,
    });
  };

  const commitDraft = () => {
    const next = normalizeStatName(draftRef.current);
    setDraft(next);
    onChangeRef.current(next);
    setOpen(false);
  };

  const openMenu = () => {
    setOpen(true);
    window.requestAnimationFrame(() => repositionMenu());
  };

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => repositionMenu());

    const close = (event) => {
      if (
        anchorRef.current?.contains(event.target)
        || menuRef.current?.contains(event.target)
      ) {
        return;
      }
      commitDraft();
    };

    const handleLayout = () => repositionMenu();
    const listenerTimer = window.setTimeout(() => {
      document.addEventListener('pointerdown', close);
    }, 0);

    window.addEventListener('resize', handleLayout);
    window.addEventListener('scroll', handleLayout, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(listenerTimer);
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', handleLayout);
      window.removeEventListener('scroll', handleLayout, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    repositionMenu();
  }, [open, filtered.length]);

  const menu = open && filtered.length > 0
    ? createPortal(
      <div
        ref={menuRef}
        role="listbox"
        className="tv-stat-suggest-menu"
        style={menuStyle ?? { position: 'fixed', left: -9999, top: -9999, visibility: 'hidden' }}
      >
        {filtered.map((entry) => (
          <button
            key={entry.abbr}
            type="button"
            role="option"
            aria-selected={normalizeStatName(draft) === entry.abbr}
            className="tv-stat-suggest-menu__option"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setDraft(entry.abbr);
              draftRef.current = entry.abbr;
              onChangeRef.current(entry.abbr);
              setOpen(false);
            }}
          >
            <span className="tv-stat-suggest-menu__abbr">{entry.abbr}</span>
            <span className="tv-stat-suggest-menu__name">{entry.name}</span>
          </button>
        ))}
      </div>,
      document.body
    )
    : null;

  return (
    <>
      <input
        ref={anchorRef}
        type="text"
        value={draft}
        onChange={(event) => {
          const next = event.target.value.toUpperCase();
          setDraft(next);
          draftRef.current = next;
          openMenu();
        }}
        onFocus={openMenu}
        onClick={openMenu}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitDraft();
          }
          if (event.key === 'Escape') {
            setDraft(value || '');
            draftRef.current = value || '';
            setOpen(false);
          }
        }}
        className="tv-custom-stat-chip__name"
        placeholder="Naam"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {menu}
    </>
  );
}

export default function CustomStatChips({
  stats = [],
  onAdd,
  onUpdate,
  onRemove,
  suggestions = STAT_SUGGESTIONS,
}) {
  return (
    <div className="tv-custom-stat-chips">
      {stats.map((stat) => (
        <div key={stat.id} className="tv-custom-stat-chip">
          <StatNameCombobox
            value={stat.name}
            onChange={(nextName) => onUpdate(stat.id, 'name', nextName)}
            suggestions={suggestions}
          />
          <input
            type="number"
            value={stat.value}
            onChange={(event) => onUpdate(stat.id, 'value', event.target.value)}
            className="tv-custom-stat-chip__value hide-arrows"
            aria-label={`Waarde voor ${stat.name || 'eigenschap'}`}
          />
          <button
            type="button"
            onClick={() => onRemove(stat.id)}
            className="tv-custom-stat-chip__remove"
            title="Verwijder eigenschap"
            aria-label="Verwijder eigenschap"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="tv-custom-stat-chip tv-custom-stat-chip--add"
        title="Voeg eigenschap toe"
        aria-label="Voeg eigenschap toe"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
