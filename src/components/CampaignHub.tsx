import { useState } from 'react'
import { Plus, Users, Eye, EyeOff, Share2 } from 'lucide-react'
import ScreenHeader from './ScreenHeader'
import ModalFooter from './ModalFooter'
import TextReveal from './TextReveal'

interface Campaign {
  id: string
  name: string
  description: string
  players: number
  isActive: boolean
  lastRevealed?: string
}

export default function CampaignHub() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'The Whispering Vault',
      description: 'Een eeuwenoude bibliotheek vol verboden kennis...',
      players: 4,
      isActive: true,
      lastRevealed: 'De Verboden Pagina'
    },
    {
      id: '2',
      name: 'Shadows of the Ember Crown',
      description: 'Een vergeten koninkrijk en een vloek die niet mag ontwaken.',
      players: 3,
      isActive: false
    }
  ])

  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(campaigns[0])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [reveals, setReveals] = useState<string[]>([])

  const createCampaign = () => {
    if (!newCampaignName.trim()) return

    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaignName,
      description: 'Een nieuw avontuur wacht...',
      players: 0,
      isActive: true
    }

    setCampaigns([newCampaign, ...campaigns])
    setActiveCampaign(newCampaign)
    setNewCampaignName('')
    setShowCreateModal(false)
  }

  const toggleReveal = (reveal: string) => {
    if (reveals.includes(reveal)) {
      setReveals(reveals.filter(r => r !== reveal))
    } else {
      setReveals([...reveals, reveal])
      // Simuleer real-time update
      setTimeout(() => {
        alert(`Real-time reveal verstuurd naar alle spelers: "${reveal}"`)
      }, 800)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <ScreenHeader
        title="Campaign Hub"
        subtitle="Beheer je avonturen en deel reveals in real-time"
        primaryAction={{
          label: 'Nieuwe Campaign',
          icon: Plus,
          onClick: () => setShowCreateModal(true),
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Campaign List */}
        <div className="lg:col-span-5">
          <div className="tv-surface rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium text-lg">Jouw Campaigns</div>
              <div className="text-xs px-3 py-1 rounded-full bg-[var(--tv-bg-modal)]">{campaigns.length} actief</div>
            </div>

            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div 
                  key={campaign.id}
                  onClick={() => setActiveCampaign(campaign)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${activeCampaign?.id === campaign.id 
                    ? 'border-[var(--tv-accent)] bg-[var(--tv-accent)]/5' 
                    : 'border-[var(--tv-border)] hover:border-[var(--tv-accent)]/50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-[var(--tv-text-secondary)] line-clamp-2 mt-1">{campaign.description}</div>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-lg font-medium ${campaign.isActive ? 'badge-status-active' : 'badge-status-archived'}`}>
                      {campaign.isActive ? 'Live' : 'Gearchiveerd'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-[var(--tv-text-secondary)]">
                    <Users className="w-3.5 h-3.5" /> {campaign.players} spelers
                    {campaign.lastRevealed && <span className="ml-auto">Laatst: {campaign.lastRevealed}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Campaign View */}
        <div className="lg:col-span-7">
          {activeCampaign ? (
            <div className="tv-surface rounded-3xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-sm text-[var(--tv-text-secondary)]">ACTIEVE CAMPAGNE</div>
                  <h3 className="text-3xl font-fantasy tracking-tight mt-1">{activeCampaign.name}</h3>
                </div>
                <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-[var(--tv-border)] hover:bg-[var(--tv-bg-modal)]">
                  <Share2 className="w-4 h-4" /> Deel QR + Pin
                </button>
              </div>

              <div className="mb-8">
                <div className="text-sm font-medium mb-3 text-[var(--tv-text-secondary)]">REVEALS</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['De Verboden Pagina', 'De Bloedmaan Rijst', 'Het Vergeten Verbond', 'Karakter: De Schaduwmeester'].map((reveal, index) => (
                    <button
                      key={index}
                      onClick={() => toggleReveal(reveal)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${reveals.includes(reveal) 
                        ? 'border-[var(--tv-accent)] bg-[var(--tv-accent)]/10' 
                        : 'border-[var(--tv-border)] hover:border-[var(--tv-accent)]/50'}`}
                    >
                      <div className="mt-0.5">
                        {reveals.includes(reveal) ? <EyeOff className="w-4 h-4 text-[var(--tv-accent)]" /> : <Eye className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{reveal}</div>
                        <div className="text-xs text-[var(--tv-text-secondary)] mt-0.5">
                          {reveals.includes(reveal) ? 'Zichtbaar voor spelers' : 'Klik om te revealen'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-3 text-[var(--tv-text-secondary)]">PARTY JOURNAL</div>
                <div className="bg-[var(--tv-bg-modal)] rounded-2xl p-4 min-h-[120px] text-sm text-[var(--tv-text-secondary)]">
                  {reveals.length > 0 ? (
                    <div className="space-y-2">
                      {reveals.map((r, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="text-[var(--tv-accent)] mt-1">•</div>
                          <div>{r} — zojuist geopenbaard</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <TextReveal
                      summary="Nog geen reveals gedeeld."
                      details="Deel je eerste reveal om het journal te vullen en je spelers op de hoogte te houden van nieuwe ontdekkingen."
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="tv-surface rounded-3xl p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[var(--tv-bg-modal)] flex items-center justify-center mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="font-medium text-xl mb-2">Geen actieve campaign</h4>
              <p className="text-[var(--tv-text-secondary)] max-w-xs mx-auto">Selecteer een campaign of maak een nieuwe aan om te beginnen.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[color:var(--tv-modal-overlay)] flex items-center justify-center z-[100] p-6">
          <div className="tv-surface w-full max-w-md rounded-3xl p-8">
            <h3 className="text-2xl font-fantasy mb-6">Nieuwe Campaign</h3>
            
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              placeholder="Naam van je avontuur..."
              className="w-full bg-[var(--tv-bg-modal)] border border-[var(--tv-border)] rounded-2xl px-5 py-3.5 text-lg focus:outline-none focus:border-[var(--tv-accent)]"
              autoFocus
            />

            <ModalFooter
              cancelLabel="Annuleren"
              confirmLabel="Maak Campaign"
              onCancel={() => setShowCreateModal(false)}
              onConfirm={createCampaign}
              confirmDisabled={!newCampaignName.trim()}
            />
          </div>
        </div>
      )}
    </div>
  )
}