import React, { useEffect, useRef, useState } from 'react';
import { Scroll, MessageSquare, Backpack, NotebookPen, Crown, Settings } from 'lucide-react';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';

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
  const navRef = useRef(null);

  const tabs = [
    { id: 'handouts', icon: Scroll, label: 'Handouts' },
    { id: 'chat', icon: MessageSquare, label: 'Partychat' },
    { id: 'inventory', icon: Backpack, label: 'Schatkamer' },
    ...(role === 'gm' ? [{ id: 'preparations', icon: Crown, label: 'Voorbereidingen' }] : []),
    { id: 'notes', icon: NotebookPen, label: 'Kronieken' },
  ];

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = 0;
    }
  }, [activeTab]);


  const isCollapsed = sidebarWidth <= SIDEBAR_COLLAPSE_WIDTH;
  const isIconRail = sidebarWidth <= 220;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedWidth = Number(safeLocalStorageGet(SIDEBAR_STORAGE_KEY));
    if (storedWidth) {
      setSidebarWidth(clampSidebarWidth(storedWidth));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeLocalStorageSet(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
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
      className="app-shell-mobile-nav fixed bottom-0 left-0 z-30 flex h-16 w-full flex-row items-center justify-around border-t tv-nav-bg px-2 backdrop-blur-md md:relative md:h-full md:shrink-0 md:w-[var(--sidebar-width)] md:min-w-[var(--sidebar-width)] md:max-w-[var(--sidebar-width)] md:flex-col md:justify-start md:border-r md:border-t-0 md:px-0 md:py-5 md:pb-4 md:backdrop-blur-md md:flex md:flex-col md:overflow-hidden"
    >
      <nav ref={navRef} className={`flex w-full flex-row items-center justify-between gap-1 md:flex-col md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-2 md:no-scrollbar md:pt-4 ${isCollapsed ? 'md:px-2' : 'md:px-3.5 md:gap-2'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              className={`
                group relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-xl border border-transparent p-2 text-sm font-medium tracking-normal transition-all duration-200 ease-out active:scale-[0.985] md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[54px] md:px-2 md:py-3' : (isIconRail ? 'md:min-h-[48px] md:justify-center md:px-2.5 md:py-2.5' : 'md:min-h-[50px] md:flex-row md:justify-start md:gap-3 md:px-3.5 md:py-2.5')}
                ${isActive ? 'tv-nav-item-active' : 'tv-nav-item'}
              `}
              title={tab.label}
            >
              {isActive && !isCollapsed ? <span className="hidden md:block absolute left-0 top-2 bottom-2 w-[3px] rounded-r tv-nav-indicator" /> : null}
              <tab.icon className={`h-5 w-5 shrink-0 transition-colors duration-200 md:h-[17px] md:w-[17px] ${isActive ? 'tv-nav-icon-active' : 'tv-nav-icon'}`} />
              <span className={`${isCollapsed || isIconRail ? 'hidden' : 'hidden md:block'} max-w-full truncate text-[14px] font-fantasy font-semibold uppercase tracking-[0.12em]`}>{tab.label}</span>
              {isIconRail && !isCollapsed ? (
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-40 hidden -translate-y-1/2 whitespace-nowrap rounded-md tv-nav-tooltip px-2 py-1 text-[10px] font-fantasy font-semibold uppercase tracking-[0.12em] shadow-lg md:group-hover:block">
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
          className={`group relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-xl border border-transparent p-2 text-sm font-medium tracking-normal transition-all duration-200 ease-out active:scale-[0.985] md:flex md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[54px] md:px-2 md:py-3' : (isIconRail ? 'md:min-h-[48px] md:justify-center md:px-2.5 md:py-2.5' : 'md:min-h-[50px] md:flex-row md:justify-start md:gap-3 md:px-3.5 md:py-2.5')} tv-nav-item`}
        >
          <Settings className="h-5 w-5 shrink-0 tv-nav-icon transition-colors duration-200 md:h-[17px] md:w-[17px]" />
          <span className={`${isCollapsed || isIconRail ? 'hidden' : 'hidden md:block'} max-w-full truncate text-[14px] font-fantasy font-semibold uppercase tracking-[0.12em]`}>Configuratie</span>
          {isIconRail && !isCollapsed ? (
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-40 hidden -translate-y-1/2 whitespace-nowrap rounded-md tv-nav-tooltip px-2 py-1 text-[10px] font-fantasy font-semibold uppercase tracking-[0.12em] shadow-lg md:group-hover:block">
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
        <span className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200 ${isDragging ? 'tv-drag-handle tv-drag-handle--active' : 'tv-drag-handle hover:tv-drag-handle--active'}`} />
      </button>
    </aside>
  );
}
