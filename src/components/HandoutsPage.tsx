import { useState } from 'react'
import { Search, Filter, Plus, Clock, Users } from 'lucide-react'

export default function HandoutsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'secret' | 'map' | 'lore'>('all')

  const handouts = [
    { id: 1, title: 'De Verboden Pagina', type: 'secret', date: '2 dagen geleden', players: 4, preview: 'Een eeuwenoude tekst die spreekt over een bibliotheek die niet mag bestaan...' },
    { id: 2, title: 'Kaart van de Oude Stad', type: 'map', date: '5 dagen geleden', players: 3, preview: 'Gedetailleerde plattegrond van de ruïnes onder de hoofdstad...' },
    { id: 3, title: 'Het Vergeten Verbond', type: 'lore', date: '1 week geleden', players: 4, preview: 'Het pact tussen de vijf huizen dat de oorlog beëindigde...' },
    { id: 4, title: 'Karakter: De Schaduwmeester', type: 'secret', date: '3 dagen geleden', players: 2, preview: 'Een mysterieuze figuur die vanuit de schaduwen regeert...' },
  ]

  const filteredHandouts = handouts.filter(h => {
    const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase()) || h.preview.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || h.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-fantasy tracking-tight">Oude Geschriften</h2>
          <p className="text-[var(--tv-text-secondary)] mt-1">Documenten, kaarten en magische voorwerpen ontdekt tijdens de reis.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-[var(--tv-accent)] hover:bg-[var(--tv-accent)]/90 text-white rounded-2xl font-medium transition-all active:scale-[0.985] self-start lg:self-auto">
          <Plus className="w-4 h-4" /> Nieuw Handout
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tv-text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op titel, inhoud, type of secret..."
            className="w-full bg-[var(--tv-bg-modal)] border border-[var(--tv-border)] rounded-2xl pl-11 py-3 text-sm focus:outline-none focus:border-[var(--tv-accent)]"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'secret', 'map', 'lore'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as any)}
              className={`px-4 py-3 rounded-2xl text-sm border transition-all ${selectedType === type 
                ? 'border-[var(--tv-accent)] bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]' 
                : 'border-[var(--tv-border)] hover:bg-[var(--tv-bg-modal)]'}`}
            >
              {type === 'all' ? 'Alle types' : type === 'secret' ? 'Geheimen' : type === 'map' ? 'Kaarten' : 'Lore'}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-[var(--tv-text-secondary)] mb-4">{filteredHandouts.length} van {handouts.length} handouts zichtbaar</div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredHandouts.map((handout) => (
          <div key={handout.id} className="tv-surface rounded-3xl p-6 hover:border-[var(--tv-accent)]/50 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-lg group-hover:text-[var(--tv-accent)] transition-colors">{handout.title}</div>
                <div className="text-sm text-[var(--tv-text-secondary)] mt-1 line-clamp-2">{handout.preview}</div>
              </div>
              <div className={`text-xs px-3 py-1 rounded-full flex-shrink-0 ml-4 ${handout.type === 'secret' ? 'bg-red-500/10 text-red-400' : handout.type === 'map' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {handout.type.toUpperCase()}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--tv-border)] text-xs text-[var(--tv-text-secondary)]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {handout.date}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {handout.players} spelers
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredHandouts.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--tv-bg-modal)] flex items-center justify-center mb-4">
            <Search className="w-8 h-8" />
          </div>
          <p className="text-[var(--tv-text-secondary)]">Geen handouts gevonden die aan je zoekopdracht voldoen.</p>
        </div>
      )}
    </div>
  )
}