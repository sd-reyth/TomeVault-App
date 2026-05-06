import React, { useEffect, useRef, useState } from 'react';
import { Scroll, MessageSquare, Backpack, NotebookPen, Crown, Settings } from 'lucide-react';

const SIDEBAR_DEFAULT_WIDTH = 252;
const SIDEBAR_MIN_WIDTH = 96;
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_COLLAPSE_WIDTH = 172;
const SIDEBAR_STORAGE_KEY = 'tomevault.sidebarWidth';

function clampSidebarWidth(width) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

export default function Sidebar({ activeTab, setActiveTab, onOpenSettings, role }) {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ startX: 0, startWidth: SIDEBAR_DEFAULT_WIDTH });

  const tabs = [
    { id: 'handouts', icon: Scroll, label: 'Handouts' },
    { id: 'chat', icon: MessageSquare, label: 'Partychat' },
    { id: 'inventory', icon: Backpack, label: 'Schatkamer' },
    ...(role === 'gm' ? [{ id: 'preparations', icon: Crown, label: 'Voorbereidingen' }] : []),
    { id: 'notes', icon: NotebookPen, label: 'Kronieken' },
  ];

  const isCollapsed = sidebarWidth <= SIDEBAR_COLLAPSE_WIDTH;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedWidth = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
    if (storedWidth) {
      setSidebarWidth(clampSidebarWidth(storedWidth));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (event) => {
      const delta = event.clientX - dragStateRef.current.startX;
      setSidebarWidth(clampSidebarWidth(dragStateRef.current.startWidth + delta));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleResizeStart = (event) => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return;
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
    setIsDragging(true);
  };

  return (
    <aside
      style={{ '--sidebar-width': `${sidebarWidth}px` }}
      className="fixed bottom-0 left-0 z-30 flex h-16 w-full flex-row items-center justify-around border-t border-stone-800 bg-stone-900/95 px-2 backdrop-blur-md pb-safe md:relative md:h-auto md:shrink-0 md:w-[var(--sidebar-width)] md:min-w-[var(--sidebar-width)] md:max-w-[var(--sidebar-width)] md:flex-col md:justify-start md:border-r md:border-t-0 md:bg-stone-900/55 md:px-0 md:py-4 md:pb-3 md:backdrop-blur-sm"
    >
      <nav className={`flex w-full flex-row items-center justify-between gap-1 md:flex-col md:flex-1 md:pt-4 ${isCollapsed ? 'md:px-2' : 'md:px-3 md:gap-2'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-lg p-2 transition-all font-fantasy tracking-wider md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[52px] md:px-2 md:py-2.5' : 'md:min-h-[48px] md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5'}
                ${isActive 
                  ? 'text-amber-500 md:bg-gradient-to-r md:from-amber-950/60 md:to-stone-900 md:border md:border-amber-900/40 md:shadow-[inset_0_0_18px_rgba(217,119,6,0.08)]' 
                  : 'text-stone-400 hover:bg-stone-800/80 hover:text-stone-200 border border-transparent'}
              `}
              title={tab.label}
            >
              {isActive && !isCollapsed ? <span className="hidden md:block absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" /> : null}
              <span className={`hidden shrink-0 items-center justify-center rounded-lg border transition-colors md:flex ${isCollapsed ? 'h-10 w-10' : 'h-9 w-9'} ${isActive ? 'border-amber-800/50 bg-amber-950/40 text-amber-400' : 'border-stone-800 bg-stone-950/50 text-stone-500'}`}>
                <tab.icon className="w-4 h-4" />
              </span>
              <tab.icon className={`w-5 h-5 md:hidden shrink-0 ${isActive ? 'text-amber-500 drop-shadow-md' : 'opacity-70'}`} />
              <span className={`${isCollapsed ? 'hidden' : 'hidden md:block'} text-[15px] uppercase md:tracking-[0.12em]`}>{tab.label}</span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={onOpenSettings}
          title="Configuratie"
          className={`relative hidden min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-lg p-2 transition-all font-fantasy tracking-wider md:flex md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[52px] md:px-2 md:py-2.5' : 'md:min-h-[48px] md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5'} text-stone-400 hover:bg-stone-800/80 hover:text-stone-200 border border-transparent`}
        >
          <span className={`hidden shrink-0 items-center justify-center rounded-lg border transition-colors md:flex ${isCollapsed ? 'h-10 w-10' : 'h-9 w-9'} border-stone-800 bg-stone-950/50 text-stone-500`}>
            <Settings className="w-4 h-4" />
          </span>
          <span className={`${isCollapsed ? 'hidden' : 'hidden md:block'} text-[15px] uppercase md:tracking-[0.12em]`}>Configuratie</span>
        </button>
      </nav>

      <button
        type="button"
        aria-label="Sleep om navigatiebreedte aan te passen"
        onMouseDown={handleResizeStart}
        onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
        className="absolute right-0 top-0 hidden h-full w-3 -translate-x-1/2 cursor-col-resize md:block"
      >
        <span className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isDragging ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]' : 'bg-stone-800 hover:bg-stone-700'}`} />
      </button>
    </aside>
  );
}
