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
  const isIconRail = sidebarWidth <= 220;

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
      <nav className={`flex w-full flex-row items-center justify-between gap-1 md:flex-col md:flex-1 md:pt-4 ${isCollapsed ? 'md:px-2' : 'md:px-3 md:gap-1.5'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              className={`
                group relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-lg p-2 transition-all duration-150 font-fantasy tracking-wider md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[52px] md:px-2 md:py-2.5' : (isIconRail ? 'md:min-h-[46px] md:justify-center md:px-2 md:py-2' : 'md:min-h-[46px] md:flex-row md:justify-start md:gap-2.5 md:px-3 md:py-2')}
                ${isActive 
                  ? 'text-amber-400 md:bg-gradient-to-r md:from-amber-950/35 md:to-stone-900/70 md:border md:border-amber-900/40 md:shadow-[inset_0_0_12px_rgba(217,119,6,0.08)]' 
                  : 'text-stone-400 md:border md:border-transparent md:hover:border-stone-700/60 md:hover:bg-stone-900/55 hover:text-stone-200'}
              `}
              title={tab.label}
            >
              {isActive && !isCollapsed ? <span className="hidden md:block absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-amber-500/90 shadow-[0_0_8px_rgba(245,158,11,0.35)] animate-pulse" /> : null}
              <tab.icon className={`w-5 h-5 md:w-[17px] md:h-[17px] shrink-0 transition-colors ${isActive ? 'text-amber-400' : 'text-stone-500 md:group-hover:text-stone-300'}`} />
              <span className={`${isCollapsed || isIconRail ? 'hidden' : 'hidden md:block'} max-w-full truncate text-[14px] font-bold uppercase md:tracking-[0.12em]`}>{tab.label}</span>
              {isIconRail && !isCollapsed ? (
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-40 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-stone-700 bg-stone-950/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-200 shadow-md md:group-hover:block">
                  {tab.label}
                </span>
              ) : null}
            </button>
          )
        })}

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Configuratie"
          title="Configuratie"
          className={`group relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-lg p-2 transition-all duration-150 font-fantasy tracking-wider md:flex md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[52px] md:px-2 md:py-2.5' : (isIconRail ? 'md:min-h-[46px] md:justify-center md:px-2 md:py-2' : 'md:min-h-[46px] md:flex-row md:justify-start md:gap-2.5 md:px-3 md:py-2')} text-stone-400 md:border md:border-transparent md:hover:border-stone-700/60 md:hover:bg-stone-900/55 hover:text-stone-200`}
        >
          <Settings className="w-5 h-5 md:w-[17px] md:h-[17px] shrink-0 text-stone-500" />
          <span className={`${isCollapsed || isIconRail ? 'hidden' : 'hidden md:block'} max-w-full truncate text-[14px] font-bold uppercase md:tracking-[0.12em]`}>Configuratie</span>
          {isIconRail && !isCollapsed ? (
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-40 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-stone-700 bg-stone-950/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-200 shadow-md md:group-hover:block">
              Configuratie
            </span>
          ) : null}
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
