import React from 'react';
import { Scroll, MessageSquare, Backpack, NotebookPen, Settings } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenSettings }) {
  const tabs = [
    { id: 'handouts', icon: Scroll, label: 'Handouts' },
    { id: 'chat', icon: MessageSquare, label: 'Partychat' },
    { id: 'inventory', icon: Backpack, label: 'Schatkamer' },
    { id: 'notes', icon: NotebookPen, label: 'Kronieken' },
  ];

  return (
    <aside className="
      fixed bottom-0 left-0 w-full h-16 bg-stone-900/95 border-t border-stone-800 flex flex-row justify-around items-center px-2 z-30 backdrop-blur-md pb-safe
      md:relative md:w-64 md:h-auto md:bg-stone-900/55 md:border-t-0 md:border-r md:flex-col md:py-4 md:px-0 md:justify-start md:backdrop-blur-sm md:pb-3
    ">
      <nav className="flex flex-row w-full justify-around md:flex-col md:flex-1 md:px-3 md:pt-2 md:gap-2">
        <div className="hidden md:flex items-center px-3 pb-3 mb-2 border-b border-stone-800/70">
          <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500 font-bold">Navigatie</span>
        </div>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:px-3 md:py-3.5 rounded-lg transition-all font-fantasy tracking-wider relative min-h-[54px]
                ${isActive 
                  ? 'text-amber-500 md:bg-gradient-to-r md:from-amber-950/60 md:to-stone-900 md:border md:border-amber-900/40 md:shadow-[inset_0_0_18px_rgba(217,119,6,0.08)]' 
                  : 'text-stone-400 hover:bg-stone-800/80 hover:text-stone-200 border border-transparent'}
              `}
              title={tab.label}
            >
              {isActive && <span className="hidden md:block absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />}
              <span className={`hidden md:flex items-center justify-center w-9 h-9 rounded-md border shrink-0 transition-colors ${isActive ? 'bg-amber-950/40 border-amber-800/50 text-amber-400' : 'bg-stone-950/50 border-stone-800 text-stone-500 group-hover:text-stone-300'}`}>
                <tab.icon className="w-4 h-4" />
              </span>
              <tab.icon className={`w-5 h-5 md:hidden shrink-0 ${isActive ? 'text-amber-500 drop-shadow-md' : 'opacity-70'}`} />
              <span className="text-[10px] md:text-[15px] md:tracking-[0.12em] md:uppercase">{tab.label}</span>
            </button>
          )
        })}
        <button onClick={onOpenSettings} className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-stone-400 hover:bg-stone-800 transition-all font-fantasy tracking-wider md:hidden">
          <Settings className="w-5 h-5 shrink-0 opacity-70" />
          <span className="text-[10px] block">Config</span>
        </button>
      </nav>
      
      <div className="hidden md:block px-3 mt-auto w-full pt-3 pb-1 border-t border-stone-800/70">
        <button onClick={onOpenSettings} className="w-full min-h-[54px] flex items-center gap-3 px-3 py-3.5 rounded-lg text-stone-400 hover:bg-stone-800/80 hover:text-stone-200 transition-all font-fantasy tracking-wider border border-transparent hover:border-stone-700/80">
          <span className="flex items-center justify-center w-9 h-9 rounded-md border border-stone-800 bg-stone-950/50 shrink-0">
            <Settings className="w-4 h-4 opacity-80" />
          </span>
          <span className="text-[15px] uppercase tracking-[0.12em]">Configuratie</span>
        </button>
      </div>
    </aside>
  );
}
