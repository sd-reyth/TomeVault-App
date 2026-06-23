import { useState, useEffect } from 'react'
import { Moon, Sun, Flame, Leaf, Droplet, Users, Scroll, Sword, Plus } from 'lucide-react'
import CampaignHub from './components/CampaignHub'
import HandoutsPage from './components/HandoutsPage'
import ScreenHeader from './components/ScreenHeader'

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
    { id: 'dawn-parchment' as const, name: 'Dawn Parchment', icon: Sun },
    { id: 'midnight-tome' as const, name: 'Midnight Tome', icon: Moon },
    { id: 'ember-forge' as const, name: 'Ember Forge', icon: Flame },
    { id: 'forest-scroll' as const, name: 'Forest Scroll', icon: Leaf },
    { id: 'blood-moon' as const, name: 'Blood Moon', icon: Droplet, premium: true },
  ]

  return (
    <div className="tv-app min-h-screen bg-[var(--tv-bg-canvas)] text-[var(--tv-text-primary)] overflow-x-hidden">
      <header className="tv-topbar sticky top-0 z-50 border-b border-[var(--tv-border)] bg-[var(--tv-bg-surface)]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[var(--tv-accent)] flex items-center justify-center shadow-sm">
              <span className="text-white text-2xl">📜</span>
            </div>
            <div>
              <h1 className="font-fantasy text-2xl font-bold tracking-[-0.5px]">TomeVault</h1>
              <p className="text-[10px] text-[var(--tv-text-secondary)] -mt-1 tracking-[1px]">FANTASY TTRPG COMPANION</p>
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
                    {t.premium && <span className="text-[9px] px-1.5 py-px rounded-full bg-white/20">PREM</span>}
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
        <div className="w-72 border-r border-[var(--tv-border)] bg-[var(--tv-bg-surface)] min-h-[calc(100vh-4rem)] p-6 hidden lg:block">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[2px] text-[var(--tv-text-secondary)] mb-3">MENU</div>
            <nav className="space-y-1">
              <div 
                onClick={() => setActiveTab('hub')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-3 text-sm cursor-pointer transition-all ${activeTab === 'hub' ? 'bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]' : 'hover:bg-[var(--tv-bg-modal)]'}`}
              >
                <Users className="w-4 h-4" /> Campaign Hub
              </div>
              <div 
                onClick={() => setActiveTab('handouts')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-3 text-sm cursor-pointer transition-all ${activeTab === 'handouts' ? 'bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]' : 'hover:bg-[var(--tv-bg-modal)]'}`}
              >
                <Scroll className="w-4 h-4" /> Handouts
              </div>
              <div 
                onClick={() => setActiveTab('voorbereidingen')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-3 text-sm cursor-pointer transition-all ${activeTab === 'voorbereidingen' ? 'bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]' : 'hover:bg-[var(--tv-bg-modal)]'}`}
              >
                <Sword className="w-4 h-4" /> Voorbereidingen
              </div>
            </nav>
          </div>

          <div className="pt-6 border-t border-[var(--tv-border)]">
            <div className="text-xs uppercase tracking-[2px] text-[var(--tv-text-secondary)] mb-3">HUIDIGE SESSIE</div>
            <div className="bg-[var(--tv-bg-modal)] rounded-3xl p-5">
              <div className="font-medium text-sm">my-dm-test-session#9776</div>
              <div className="text-xs text-[var(--tv-text-secondary)] mt-1">4 spelers • 2 uur geleden</div>
              <div className="mt-3 pt-3 border-t border-[var(--tv-border)] flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--tv-status-active)] animate-pulse"></div>
                <span className="text-[var(--tv-status-active)]">Live verbonden</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 lg:p-8 min-w-0">
          {activeTab === 'hub' && <CampaignHub />}
          {activeTab === 'handouts' && <HandoutsPage />}
          {activeTab === 'voorbereidingen' && (
            <div className="max-w-5xl mx-auto">
              <ScreenHeader
                title="Voorbereidingen"
                subtitle="Karakterprofielen, encounters en magische items die je wilt voorbereiden."
              />
              
              <div className="tv-surface rounded-3xl p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--tv-bg-modal)] flex items-center justify-center mb-4">
                  <Sword className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium mb-2">Voorbereidingen komen binnenkort</h3>
                <p className="text-[var(--tv-text-secondary)] max-w-xs mx-auto">We bouwen dit verder uit in de volgende iteratie.</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l border-[var(--tv-border)] bg-[var(--tv-bg-surface)] p-6 min-h-[calc(100vh-4rem)] hidden xl:block">
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">Ruststand</div>
              <div className="text-xs px-2.5 py-1 rounded-full bg-[var(--tv-accent)]/10 text-[var(--tv-accent)]">ACTIEF</div>
            </div>

            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="tv-surface rounded-2xl p-4 flex gap-4 hover:border-[var(--tv-accent)]/50 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-[var(--tv-bg-modal)] flex-shrink-0 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-[var(--tv-accent)]/20 to-transparent"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">Karakter {i}</div>
                    <div className="text-xs text-[var(--tv-text-secondary)] mt-0.5">HP 78/78 • AC 17</div>
                    <div className="flex gap-1 mt-2">
                      <div className="text-[10px] px-1.5 py-px rounded-lg font-medium badge-status-active">OK</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 w-full py-3.5 bg-[var(--tv-accent)] hover:bg-[var(--tv-accent)]/90 text-white rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.985]">
              <span>Start Gevecht</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App