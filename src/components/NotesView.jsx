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
    <div className="h-full flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 flex flex-col bg-stone-900/40 border border-stone-800/60 rounded-xl overflow-hidden backdrop-blur-sm shadow-md h-48 md:h-full shrink-0">
        <div className="p-4 border-b border-stone-800/50 flex items-center justify-between bg-stone-900/80">
          <h3 className="font-fantasy font-bold text-stone-200 tracking-wider">Kronieken</h3>
          <button 
            onClick={handleCreateNote}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 text-stone-100 shadow-sm transition-colors hover:from-amber-600 hover:to-amber-500"
            title="Nieuwe notitie"
          >
            <FilePlus2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
          {myNotes.length === 0 ? (
            <div className="text-center p-4 text-stone-500 font-story italic text-sm">
              Je kroniek is nog leeg...
            </div>
          ) : (
            myNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all flex justify-between items-start group
                  ${activeNoteId === note.id 
                    ? 'bg-amber-950/30 border border-amber-900/50 shadow-inner' 
                    : 'hover:bg-stone-800/50 border border-transparent'}
                `}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h4 className={`font-fantasy tracking-wide text-sm truncate ${activeNoteId === note.id ? 'text-amber-500' : 'text-stone-300 group-hover:text-stone-200'}`}>
                    {note.title}
                  </h4>
                  <p className="text-[10px] text-stone-500 mt-1">{note.lastEdited}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                  className="p-1 text-stone-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-stone-800"
                  title="Verwijder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-stone-900/40 border border-stone-800/60 rounded-xl overflow-hidden backdrop-blur-sm shadow-md relative">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none z-0" />
        
        {activeNote ? (
          <div className="flex-1 flex flex-col p-4 md:p-6 relative z-10 h-full">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => handleUpdateNote('title', e.target.value)}
              className="bg-transparent border-b border-stone-800 focus:border-amber-700/50 text-2xl md:text-3xl font-fantasy font-bold text-stone-100 pb-2 mb-4 outline-none transition-colors"
              placeholder="Titel van je notitie..."
            />
            <textarea
              value={activeNote.content}
              onChange={(e) => handleUpdateNote('content', e.target.value)}
              className="flex-1 bg-transparent text-stone-300 font-story leading-relaxed text-sm md:text-base outline-none resize-none no-scrollbar placeholder-stone-600"
              placeholder="Begin met schrijven..."
            />
            <div className="mt-4 pt-3 border-t border-stone-800/50 flex justify-between items-center text-xs text-stone-500 font-sans">
              <span>Automatisch opgeslagen</span>
              <span className="flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Opgeslagen</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-600 relative z-10 p-6 text-center">
            <NotebookPen className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-story italic">Selecteer een notitie of maak een nieuwe aan om te beginnen met schrijven.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesView;
