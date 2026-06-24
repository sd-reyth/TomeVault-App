import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { NotebookPen, FilePlus2, Save, Trash2, Search, ScrollText, Feather, Lock, ArrowLeft } from 'lucide-react';

function getNotePreview(content = '', maxLen = 72) {  const trimmed = String(content || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return 'Nog geen tekst — tik om te beginnen…';
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
}

function NotesView({
  role,
  notes,
  setNotes,
  currentPlayerId,
  onCreateNoteRemote,
  onUpdateNoteRemote,
  onDeleteNoteRemote,
}) {
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [mobileShowList, setMobileShowList] = useState(true);
  const saveTimerRef = useRef(null);
  const myNotes = notes.filter(n => n.authorId === (role === 'gm' ? 'gm' : currentPlayerId));
  const activeNote = myNotes.find(n => n.id === activeNoteId) || null;

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return myNotes;
    return myNotes.filter((note) => {
      const haystack = `${note.title || ''} ${note.content || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [myNotes, searchQuery]);

  useEffect(() => {
    if (!activeNoteId && myNotes.length > 0) {
      const isDesktop = typeof window !== 'undefined'
        && window.matchMedia('(min-width: 1024px)').matches;
      if (isDesktop) {
        setActiveNoteId(myNotes[0].id);
      }
    }
  }, [myNotes, activeNoteId]);

  useEffect(() => {
    if (myNotes.length === 0) {
      setMobileShowList(true);
    }
  }, [myNotes.length]);

  useEffect(() => () => {    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const pulseSaveState = useCallback((nextState) => {
    setSaveState(nextState);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (nextState === 'saved') return;
    saveTimerRef.current = setTimeout(() => setSaveState('saved'), 1400);
  }, []);

  const handleCreateNote = async () => {
    try {
      if (onCreateNoteRemote) {
        const createdId = await onCreateNoteRemote({
          role,
          title: 'Nieuwe Notitie',
          content: '',
        });
        setActiveNoteId(createdId);
        setMobileShowList(false);
        setSaveState('saved');
        return;
      }
    } catch (err) {
      console.error('Notitie aanmaken mislukt:', err);
      alert('Notitie aanmaken mislukt.');
      return;
    }

    const newNote = {
      id: 'n' + Date.now(),
      authorId: role === 'gm' ? 'gm' : currentPlayerId,
      title: 'Nieuwe Notitie',
      content: '',
      lastEdited: 'Zojuist'
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setMobileShowList(false);
    setSaveState('saved');
  };

  const handleUpdateNote = async (field, value) => {
    if (!activeNote) return;

    pulseSaveState('writing');

    if (onUpdateNoteRemote) {
      try {
        await onUpdateNoteRemote(activeNote.id, { [field]: value });
        pulseSaveState('saved');
      } catch (err) {
        console.error('Notitie opslaan mislukt:', err);
        pulseSaveState('error');
      }
    } else {
      pulseSaveState('saved');
    }

    const updatedNotes = notes.map(n =>
      n.id === activeNote.id ? { ...n, [field]: value, lastEdited: 'Zojuist' } : n
    );
    setNotes(updatedNotes);
  };

  const handleDeleteNote = async (id) => {
    if (window.confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) {
      if (onDeleteNoteRemote) {
        try {
          await onDeleteNoteRemote(id);
        } catch (err) {
          console.error('Notitie verwijderen mislukt:', err);
          alert('Notitie verwijderen mislukt.');
          return;
        }
      }
      setNotes(notes.filter(n => n.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(null);
        setMobileShowList(true);
      }
    }
  };

  const handleSelectNote = (id) => {
    setActiveNoteId(id);
    setMobileShowList(false);
  };

  const hideListOnMobile = myNotes.length > 0 && !mobileShowList;
  const hideEditorOnMobile = myNotes.length === 0 || mobileShowList;
  const noteCountLabel = myNotes.length === 1 ? '1 blad' : `${myNotes.length} bladen`;

  return (
    <div className="tv-view-shell relative z-10 flex h-full flex-col">
      <div className="tv-view-shell-header flex shrink-0 flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
        <h2 className="flex items-center gap-2 font-fantasy text-xs font-medium uppercase tracking-[0.18em] tv-text md:text-sm">
          <NotebookPen className="tv-view-title-icon" strokeWidth={1.75} aria-hidden />
          Kronieken
        </h2>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {myNotes.length > 0 && (
            <span className="tv-toolbar__btn tv-panel-inset hidden uppercase tracking-[0.14em] tv-text-sub sm:inline-flex">
              {noteCountLabel}
            </span>
          )}
          <button
            onClick={handleCreateNote}
            className="tv-toolbar-icon-btn tv-button-primary ml-auto transition-all duration-200 ease-out active:scale-[0.985] sm:ml-0"
            title="Nieuwe notitie"
            aria-label="Nieuwe notitie"
          >
            <FilePlus2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="tv-view-shell-body tv-notes-body relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className={`tv-notes-sidebar flex min-h-0 flex-col border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] lg:h-auto lg:w-[min(19rem,36%)] lg:shrink-0 lg:border-b-0 lg:border-r ${hideListOnMobile ? 'max-lg:hidden' : 'max-lg:flex max-lg:flex-1'}`}
        >
          {myNotes.length > 0 && (
            <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_48%)] p-2.5 md:p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 tv-muted" aria-hidden />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek in je kroniek…"
                  className="tv-input-surface w-full py-2 pl-9 pr-3 text-xs italic tv-text outline-none transition-colors focus:border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)]"
                />
              </label>
            </div>
          )}

          <div className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto p-2 md:p-2.5">
            {myNotes.length === 0 ? (
              <div className="tv-empty-state m-2">
                <ScrollText className="mx-auto mb-3 h-8 w-8 opacity-45 tv-accent" strokeWidth={1.25} aria-hidden />
                <p className="tv-empty-state-title">Je kroniek wacht</p>
                <p className="text-sm">Leg je eerste gedachten vast — alleen voor jou, tussen de sessies door.</p>
                <button
                  onClick={handleCreateNote}
                  className="tv-btn tv-button-primary mx-auto mt-4 gap-2 px-4 text-xs uppercase tracking-[0.14em]"
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                  Eerste blad
                </button>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="tv-empty-state m-2 py-6">
                <p className="tv-empty-state-title">Geen treffers</p>
                <p className="text-sm">Probeer een andere zoekterm.</p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isActive = activeNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note.id)}
                    className={`tv-notes-scroll-item group flex cursor-pointer items-start gap-2.5 p-3 transition-all duration-200 ease-out ${isActive ? 'tv-notes-scroll-item--active' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--tv-accent),transparent_62%)] tv-panel-inset p-1.5">
                      <ScrollText className={`h-3.5 w-3.5 ${isActive ? 'tv-accent' : 'tv-muted'}`} strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`truncate text-sm tracking-[0.06em] ${isActive ? 'font-medium tv-accent' : 'tv-text'}`}>
                        {note.title || 'Naamloos blad'}
                      </h4>
                      <p className="mt-1 line-clamp-2 font-story text-[11px] leading-relaxed tv-muted">
                        {getNotePreview(note.content)}
                      </p>
                      <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] tv-muted">{note.lastEdited}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                      className="rounded p-1 tv-muted opacity-100 transition-all tv-hover-danger lg:opacity-0 lg:group-hover:opacity-100"
                      title="Verwijder"
                      aria-label="Notitie verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <div
          className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${hideEditorOnMobile ? 'max-lg:hidden' : 'max-lg:flex'} lg:flex`}
        >
          {activeNote ? (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] px-3 py-2.5 md:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileShowList(true)}
                    className="tv-toolbar-icon-btn tv-panel-inset shrink-0 transition-all duration-200 ease-out active:scale-[0.985] lg:hidden"
                    title="Terug naar overzicht"
                    aria-label="Terug naar overzicht"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <p className="truncate text-[10px] uppercase tracking-[0.14em] tv-muted">
                    {activeNote.lastEdited ? `Laatst bewerkt · ${activeNote.lastEdited}` : 'Persoonlijk schrijfblad'}
                  </p>
                </div>
                <span className="tv-tag inline-flex items-center gap-1 border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] tv-text-sub">
                  <Lock className="h-3 w-3 opacity-70" aria-hidden />
                  Privé
                </span>
              </div>

              <div className="tv-notes-parchment relative m-2 flex min-h-0 flex-1 flex-col overflow-hidden md:m-4">
                <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]" aria-hidden />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--tv-accent),transparent_55%),transparent)]" aria-hidden />

                <div className="relative z-10 flex min-h-0 flex-1 flex-col p-4 md:p-6">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => handleUpdateNote('title', e.target.value)}
                    className="mb-3 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_48%)] bg-transparent pb-2 font-fantasy text-xl font-bold tracking-[0.08em] tv-text outline-none transition-colors focus:border-[color-mix(in_srgb,var(--tv-accent),transparent_45%)] md:mb-4 md:text-2xl"
                    placeholder="Titel van je notitie…"
                    aria-label="Notitietitel"
                  />
                  <textarea
                    value={activeNote.content}
                    onChange={(e) => handleUpdateNote('content', e.target.value)}
                    className="no-scrollbar tv-notes-editor font-story flex-1 resize-none bg-transparent text-sm leading-[1.75] tv-text outline-none md:text-base"
                    placeholder="Begin met schrijven — questnotities, NPC-dialoog, geheime plannen…"
                    aria-label="Notitie-inhoud"
                  />
                </div>
              </div>

              <div className="tv-notes-footer flex shrink-0 flex-col gap-1 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] px-4 py-2.5 text-xs tv-muted sm:flex-row sm:items-center sm:justify-between md:px-5">
                <span className="font-story italic opacity-80">Alles wordt automatisch bewaard in je kroniek.</span>
                <span className={`inline-flex items-center gap-1.5 transition-colors ${saveState === 'error' ? 'tv-tone-enemy-text' : saveState === 'writing' ? 'tv-accent' : ''}`}>
                  <Save className={`h-3.5 w-3.5 ${saveState === 'writing' ? 'animate-pulse' : ''}`} aria-hidden />
                  {saveState === 'writing' && 'Bezig met bewaren…'}
                  {saveState === 'saved' && 'Opgeslagen'}
                  {saveState === 'error' && 'Opslaan mislukt'}
                </span>
              </div>
            </>
          ) : myNotes.length > 0 ? (
            <div className="hidden flex-1 flex-col items-center justify-center p-6 text-center tv-muted lg:flex">
              <div className="tv-notes-empty-crest mb-5 flex h-16 w-16 items-center justify-center">
                <Feather className="h-7 w-7 opacity-70 tv-accent" strokeWidth={1.35} aria-hidden />
              </div>
              <p className="font-fantasy text-sm uppercase tracking-[0.16em] tv-text">Kies een blad</p>
              <p className="mt-2 max-w-xs font-story text-sm italic leading-relaxed">
                Selecteer een notitie links of maak een nieuw blad om je verhaal vast te leggen.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default NotesView;
