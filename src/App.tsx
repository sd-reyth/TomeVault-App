import { useState, useEffect } from 'react'
import { Moon, Sun, Flame, Leaf, Droplet, Users, Scroll, Sword } from 'lucide-react'
import CampaignHub from './components/CampaignHub'

function App() {
  const [theme, setTheme] = useState<'dawn-parchment' | 'midnight-tome' | 'ember-forge' | 'forest-scroll' | 'blood-moon'>('midnight-tome')
  const [brightness, setBrightness] = useState(1)
  const [activeTab, setActiveTab] = useState<'hub' | 'handouts' | 'voorbereidingen'>('hub')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tomevault-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--tv-brightness', brightness.toString())
  }, [brightness])

  const themes = [
    { id: 'dawn-parchment' as const, name: 'Dawn Parchment', icon: Sun, color: '#f8f1e3' },
    { id: 'midnight-tome' as const, name: 'Midnight Tome', icon: Moon, color: '#9f7dff' },
    { id: 'ember-forge' as const, name: 'Ember Forge', icon: Flame, color: '#ff9d42' },
    { id: 'forest-scroll' as const, name: 'Forest Scroll', icon: Leaf, color: '#6bc66b' },
    { id: 'blood-moon' as const, name: 'Blood Moon', icon: Droplet, color: '#c41e3a', premium: true },
  ]

  return (
    <div className="tv-app min-h-screen bg-[var(--tv-bg-canvas)] text-[var(--tv-text-primary)]">
      <header className="tv-topbar sticky top-0 z-50 border-b border-[var(--tv-border)] bg-[var(--tv-bg-surface)]/95 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--tv-accent)] flex items-center justify-center">
              <span className="text-white text-xl">📜</span>
            </div>
            <div>
              <h1 className="font-fantasy text-2xl font-bold tracking-tight">TomeVault</h1>
              <p className="text-xs text-[var(--tv-text-secondary)] -mt-1">Fantasy TTRPG Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[var(--tv-bg-modal)] rounded-full p-1 border border-[var(--tv-border)]">
              {themes.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm transition-all ${theme === t.id 
                      ? 'bg-[var(--tv-accent)] text-white shadow-sm' 
                      : 'hover:bg-[var(--tv-bg-surface)] text-[var(--tv-text-secondary)]'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.name}</span>
                    {t.premium && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">PREM</span>}
                  </button>
                )
              })}
            </div>

            {theme !== 'dawn-parchment' && (
              <div className="flex items-center gap-3 bg-[var(--tv-bg-modal)] rounded-full px-4 py-1.5 border border-[var(--tv-border)]">
                <span className="text-xs text-[var(--tv-text-secondary)]">Helderheid</span>
                <input 
                  type="range" 
                  min="0.7" 
                  max="1.3" 
                  step="0.05"
                  value={brightness}
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  className="w-24 accent-[var(--tv-accent)]"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        <div className="w-72 border-r border-[var(--tv-border)] bg-[var(--tv-bg-surface)] min-h-[calc(100vh-4rem)] p-6">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[2px] text-[var(--tv-text-secondary)] mb-3">MENU</div>
            <nav className="space-y-1">
              <div 
                onClick={() => setActiveTab('hub')}
                className={`px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm cursor-pointer transition-all ${activeTab === 'hub' ? 'bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]' : 'hover:bg-[var(--tv-bg-modal)]'}`}
              >
                <Users className="w-4 h-4" /> Campaign Hub
              </div>
              <div 
                onClick={() => setActiveTab('handouts')}
                className={`px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm cursor-pointer transition-all ${activeTab === 'handouts' ? 'bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]' : 'hover:bg-[var(--tv-bg-modal)]'}`}
              >
                <Scroll className="w-4 h-4" /> Handouts
              </div>
              <div 
                onClick={() => setActiveTab('voorbereidingen')}
                className={`px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm cursor-pointer transition-all ${activeTab === 'voorbereidingen' ? 'bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]' : 'hover:bg-[var(--tv-bg-modal)]'}`}
              >
                <Sword className="w-4 h-4" /> Voorbereidingen
              </div>
            </nav>
          </div>

          <div className="pt-6 border-t border-[var(--tv-border)]">
            <div className="text-xs uppercase tracking-[2px] text-[var(--tv-text-secondary)] mb-3">HUIDIGE SESSIE</div>
            <div className="bg-[var(--tv-bg-modal)] rounded-2xl p-4">
              <div className="font-medium">my-dm-test-session#9776</div>
              <div className="text-xs text-[var(--tv-text-secondary)] mt-1">4 spelers • 2 uur geleden</div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8">
          {activeTab === 'hub' && <CampaignHub />}
          {activeTab === 'handouts' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-fantasy tracking-tight mb-4">Oude Geschriften</h2>
              <p className="text-[var(--tv-text-secondary)] mb-8">Documenten, kaarten en magische voorwerpen ontdekt tijdens de reis.</p>
              
              <div className="tv-surface rounded-3xl p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--tv-bg-modal)] flex items-center justify-center mb-4">
                  <span className="text-3xl">📜</span>
                </div>
                <h3 className="text-xl font-medium mb-2">Handouts komen binnenkort</h3>
                <p className="text-[var(--tv-text-secondary)] max-w-xs mx-auto">We bouwen dit verder uit in de volgende iteratie.</p>
              </div>
            </div>
          )}
          {activeTab === 'voorbereidingen' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-fantasy tracking-tight mb-4">Voorbereidingen</h2>
              <div className="tv-surface rounded-3xl p-8 text-center">
                <p className="text-[var(--tv-text-secondary)]">Deze sectie wordt verder uitgewerkt.</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l border-[var(--tv-border)] bg-[var(--tv-bg-surface)] p-6 min-h-[calc(100vh-4rem)]">
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">Ruststand</div>
              <div className="text-xs px-2.5 py-1 rounded-full bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]">ACTIEF</div>
            </div>

            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="tv-surface rounded-2xl p-4 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--tv-bg-modal)] flex-shrink-0"></div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">Karakter {i}</div>
                    <div className="text-xs text-[var(--tv-text-secondary)] mt-1">HP 78/78 • AC 17</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 w-full py-3 bg-[var(--tv-accent)] hover:bg-[var(--tv-accent)]/90 text-white rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
              <span>Start Gevecht</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App