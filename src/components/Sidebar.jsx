import React, { useEffect, useRef, useState } from 'react';
import { Scroll, MessageSquare, NotebookPen, Crown, Settings, Swords, Shield } from 'lucide-react';
import Icon from '../ui/Icon';
import TreasureIcon from '../ui/TreasureIcon';
import Text from '../ui/Text';
import { COMBAT_STATUS } from '../lib/battleUtils';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/browserStorage';
import { playUiSound } from '../lib/uiFeedback';

const TAB_SOUND_MAP = {
  handouts: 'book',
  notes: 'paper',
  preparations: 'paper',
};

const SIDEBAR_DEFAULT_WIDTH = 252;
const SIDEBAR_MIN_WIDTH = 96;
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_COLLAPSE_WIDTH = 172;
const SIDEBAR_STORAGE_KEY = 'tomevault.sidebarWidth';

function clampSidebarWidth(width) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

export default function Sidebar({ activeTab, setActiveTab, onOpenSettings, role, sessionNumber, combatStatus, hideMobileNav = false }) {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ startX: 0, startWidth: SIDEBAR_DEFAULT_WIDTH });
  const navRef = useRef(null);

  const tabs = [
    { id: 'handouts', icon: Scroll, label: 'Handouts' },
    { id: 'chat', icon: MessageSquare, label: 'Fluisteringen' },
    { id: 'inventory', icon: TreasureIcon, label: 'Schatkamer' },
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
  const isCombatLive = combatStatus === COMBAT_STATUS.ACTIVE;
  const isCombatPaused = combatStatus === COMBAT_STATUS.PAUSED;
  const sessionLabel = `#${Math.max(1, Number(sessionNumber) || 1)}`;
  const roleLabel = role === 'gm' ? 'Game Master' : 'Speler';

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
      className="app-shell-mobile-nav tv-nav-bg fixed bottom-0 left-0 z-30 flex h-[4.25rem] w-full flex-row items-center justify-around border-t px-2 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:relative md:h-full md:shrink-0 md:w-[var(--sidebar-width)] md:min-w-[var(--sidebar-width)] md:max-w-[var(--sidebar-width)] md:flex-col md:justify-start md:border-r md:border-t-0 md:px-0 md:pt-3.5 md:pb-0 md:backdrop-blur-md md:flex md:flex-col md:overflow-hidden"
      aria-hidden={hideMobileNav ? true : undefined}
    >
      <nav ref={navRef} className={`flex w-full flex-row items-center justify-between gap-1 md:flex-col md:flex-1 md:min-h-0 md:justify-start md:overflow-y-auto md:pr-2 md:no-scrollbar ${isCollapsed ? 'md:px-2 md:pt-2' : 'md:px-3.5 md:gap-1.5 md:pt-2'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id !== activeTab && TAB_SOUND_MAP[tab.id]) {
                  playUiSound(TAB_SOUND_MAP[tab.id]);
                }
                setActiveTab(tab.id);
              }}
              aria-label={tab.label}
              className={`
                group relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center rounded-full border border-transparent p-2 transition-all duration-200 ease-out active:scale-[0.97] md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[50px] md:px-2 md:py-2.5' : (isIconRail ? 'md:min-h-[46px] md:justify-center md:px-2.5 md:py-2.5 md:rounded-2xl' : 'md:min-h-[46px] md:flex-row md:justify-start md:gap-2.5 md:rounded-2xl md:px-3 md:py-2.5')}
                ${isActive ? 'tv-nav-item-active' : 'tv-nav-item'}
              `}
              title={tab.label}
            >
              {isActive && !isCollapsed ? <span className="hidden md:block absolute left-0 top-2 bottom-2 w-[3px] rounded-r tv-nav-indicator" /> : null}
              <Icon as={tab.icon} size="lg" className={isActive ? 'tv-nav-icon-active' : 'tv-nav-icon'} />
              <Text variant="label" as="span" className={`${isCollapsed || isIconRail ? 'hidden' : 'hidden md:block'} max-w-full truncate`}>{tab.label}</Text>
              {isIconRail && !isCollapsed ? (
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-40 hidden -translate-y-1/2 whitespace-nowrap rounded-md tv-nav-tooltip px-2 py-1 text-[10px] font-fantasy font-semibold uppercase tracking-[0.12em] shadow-lg md:group-hover:block">
                  {tab.label}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="hidden md:mt-auto md:flex md:w-full md:shrink-0 md:flex-col">
        <div className={isCollapsed ? 'px-2' : 'px-3.5'}>
          <div className="tv-nav-dock-divider" />

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Configuratie"
            title="Configuratie"
            className={`group relative mb-2 flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center rounded-full border border-transparent p-2 transition-all duration-200 ease-out active:scale-[0.97] md:flex md:w-full md:flex-none ${isCollapsed ? 'md:min-h-[50px] md:px-2 md:py-2.5' : (isIconRail ? 'md:min-h-[46px] md:justify-center md:px-2.5 md:py-2.5 md:rounded-2xl' : 'md:min-h-[46px] md:flex-row md:justify-start md:gap-2.5 md:rounded-2xl md:px-3 md:py-2.5')} tv-nav-item`}
          >
            <Icon as={Settings} size="lg" className="tv-nav-icon" />
            <Text variant="label" as="span" className={`${isCollapsed || isIconRail ? 'hidden' : 'hidden md:block'} max-w-full truncate`}>Configuratie</Text>
            {isIconRail && !isCollapsed ? (
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-40 hidden -translate-y-1/2 whitespace-nowrap rounded-md tv-nav-tooltip px-2 py-1 text-[10px] font-fantasy font-semibold uppercase tracking-[0.12em] shadow-lg md:group-hover:block">
                Configuratie
              </span>
            ) : null}
          </button>
        </div>

        {!isCollapsed ? (
          <div className="tv-nav-footer">
          <div className="tv-nav-footer__glow" aria-hidden="true" />
          <img
            src="/references/tomeVaultLogo1.png"
            alt=""
            aria-hidden="true"
            className="tv-nav-footer__mark"
          />

          {isIconRail ? (
            <div className="tv-nav-footer__content tv-nav-footer__content--rail">
              <span className="tv-nav-footer__chip tv-nav-footer__chip--session">{sessionLabel}</span>
              {(isCombatLive || isCombatPaused) ? (
                <span className={`tv-nav-footer__chip ${isCombatLive ? 'tv-nav-footer__chip--live' : 'tv-nav-footer__chip--paused'}`} title={isCombatLive ? 'Gevecht actief' : 'Gevecht gepauzeerd'}>
                  {isCombatLive ? <Swords className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="tv-nav-footer__content px-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="tv-nav-footer__chip tv-nav-footer__chip--role">{role === 'gm' ? 'GM' : 'Speler'}</span>
                <span className="tv-nav-footer__chip tv-nav-footer__chip--session">Sessie {sessionLabel}</span>
              </div>

              {(isCombatLive || isCombatPaused) ? (
                <div className={`tv-nav-footer__status ${isCombatLive ? 'tv-nav-footer__status--live' : 'tv-nav-footer__status--paused'}`}>
                  {isCombatLive ? <Swords className="h-3 w-3 shrink-0" /> : <Shield className="h-3 w-3 shrink-0" />}
                  <span>{isCombatLive ? 'Slagorde actief' : 'Gevecht gepauzeerd'}</span>
                </div>
              ) : (
                <p className="truncate text-[10px] font-medium tracking-[0.04em] tv-muted">{roleLabel} · aan tafel</p>
              )}
            </div>
          )}
        </div>
      ) : null}
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Configuratie"
        title="Configuratie"
        className="group relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center rounded-full border border-transparent p-2 transition-all duration-200 ease-out active:scale-[0.97] md:hidden tv-nav-item"
      >
        <Icon as={Settings} size="lg" className="tv-nav-icon" />
      </button>

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
