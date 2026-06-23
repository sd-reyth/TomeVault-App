import React, { useState, useEffect } from 'react';
import { NotebookPen, FilePlus2, Save, Trash2 } from 'lucide-react';

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
  
  const myNotes = notes.filter(n => n.authorId === (role === 'gm' ? 'gm' : currentPlayerId));
  const activeNote = myNotes.find(n => n.id === activeNoteId) || null;

  useEffect(() => {
    if (!activeNoteId && myNotes.length > 0) {
      setActiveNoteId(myNotes[0].id);
    }
  }, [myNotes, activeNoteId]);

  const handleCreateNote = async () => {
    try {
      if (onCreateNoteRemote) {
        const createdId = await onCreateNoteRemote({
          role,
          title: 'Nieuwe Notitie',
          content: '',
        });
        setActiveNoteId(createdId);
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
  };

  const handleUpdateNote = async (field, value) => {
    if (!activeNote) return;

    if (onUpdateNoteRemote) {
      try {
        await onUpdateNoteRemote(activeNote.id, { [field]: value });
      } catch (err) {
        console.error('Notitie opslaan mislukt:', err);
      }
    }

    const updatedNotes = notes.map(n => 
      n.id === activeNote.id ? { ...n, [field]: value, lastEdited: 'Zojuist' } : n
    );
    setNotes(updatedNotes);
  };

  const handleDeleteNote = async (id) => {
    if (window.confirm("Weet je zeker dat je deze notitie wilt verwijderen?")) {
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
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 md:gap-6 lg:flex-row">
      <div className="tv-panel-shell h-52 w-full shrink-0 overflow-hidden sm:h-60 lg:h-full lg:w-1/3">
        <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-4 py-4 shadow-sm md:px-5">
          <div>
            <h3 className="tv-panel-title">Kronieken</h3>
            <p className="mt-1 text-[11px] tv-muted">Persoonlijke notities zonder losse panelen of extra ruis.</p>
          </div>
          <button 
            onClick={handleCreateNote}
            className="tv-button-primary inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ease-out active:scale-[0.985]"
            title="Nieuwe notitie"
          >
            <FilePlus2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
          {myNotes.length === 0 ? (
            <div className="tv-empty-state m-3">
              <p className="tv-empty-state-title">Kroniek is leeg</p>
              <p className="text-sm">Maak je eerste notitie met de knop rechtsboven.</p>
            </div>
          ) : (
            myNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`group flex cursor-pointer items-start justify-between rounded-xl p-3 transition-all duration-200 ease-out
                  ${activeNoteId === note.id 
                    ? 'border border-[var(--tv-accent)]/25 bg-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] shadow-inner' 
                    : 'border border-transparent tv-hover-surface'}
                `}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h4 className={`truncate text-sm tracking-[0.08em] ${activeNoteId === note.id ? 'tv-accent' : 'tv-text group-hover:tv-text'}`}>
                    {note.title}
                  </h4>
                  <p className="text-[10px] tv-muted mt-1">{note.lastEdited}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                  className="rounded p-1 tv-muted opacity-100 transition-all tv-hover-surface hover:text-rose-300 lg:opacity-0 lg:group-hover:opacity-100"
                  title="Verwijder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="tv-panel-shell relative flex min-h-[360px] flex-1 flex-col overflow-hidden lg:min-h-0">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none z-0" />
        
        {activeNote ? (
          <div className="relative z-10 flex h-full flex-1 flex-col p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pb-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] tv-accent">Fluistertoon</div>
                <div className="mt-1 text-xs tv-muted">Schrijfvlak met dezelfde rustige kopstructuur als partychat.</div>
              </div>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] tv-panel-inset px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] tv-text-sub">Privé</span>
            </div>
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => handleUpdateNote('title', e.target.value)}
              className="mb-4 border-b border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] bg-transparent pb-2 font-fantasy text-2xl font-bold tracking-[0.08em] tv-text outline-none transition-colors focus:border-[var(--tv-accent)]/45 md:text-3xl"
              placeholder="Titel van je notitie..."
            />
            <textarea
              value={activeNote.content}
              onChange={(e) => handleUpdateNote('content', e.target.value)}
              className="no-scrollbar tv-field-plain flex-1 resize-none bg-transparent text-sm leading-relaxed tv-text outline-none md:text-base"
              placeholder="Begin met schrijven..."
            />
            <div className="mt-4 flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--tv-border),transparent_42%)] pt-3 text-xs tv-muted sm:flex-row sm:items-center sm:justify-between">
              <span>Automatisch opgeslagen</span>
              <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Opgeslagen</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6 text-center tv-muted">
            <NotebookPen className="w-12 h-12 mb-4 opacity-50" />
            <p className="italic">Selecteer een notitie of maak een nieuwe aan om te beginnen met schrijven.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesView;
