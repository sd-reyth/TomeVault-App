import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import {
  MOCK_HANDOUTS,
  MOCK_PARTY,
  MOCK_CHAT,
  MOCK_INVENTORY,
  MOCK_WALLETS,
  MOCK_NOTES,
} from './data/mockData';
import {
  slugifySessionName,
  getJoinTagLookupVariants,
  toSafeJoinTagForLink,
  toLegacyHashJoinTag,
  sha256,
  formatLastEditedLabel,
} from './lib/sessionUtils';
import { safeLocalStorageGet, safeLocalStorageSet } from './lib/browserStorage';
import { bindGlobalUiSounds, isUiSoundsEnabled, primeUiAudio, setUiSoundsEnabled } from './lib/uiFeedback';
import { getLocalDevBootstrapConfig, getRuntimeBadgeState } from './lib/runtimeContext';
import {
  COMBAT_JOIN_REQUEST_STATUS,
  COMBAT_PARTICIPATION_STATUS,
  COMBAT_STATUS,
  normalizeCombatJoinRequestStatus,
  normalizeCombatParticipation,
} from './lib/battleUtils';
import { buildCombatSessionPatch, DEFAULT_COMBAT_STATE } from './lib/combatSessionState';
import useCombat from './app/useCombat';
import {
  buildAmbienceSessionPatch,
  clampAmbienceVolume,
  DEFAULT_AMBIENCE_STATE,
  getAmbienceTrackById,
  getArchivedAmbienceTracks,
  getVerifiedAmbienceTracks,
  normalizeAmbienceState,
} from './lib/ambienceLibrary';
import { DEFAULT_AVATAR_POSITION, normalizeAvatarPosition, normalizeAvatarUrl } from './lib/placeholders';
import { normalizeItemCategory } from './lib/itemCategories';
import { handoutHasSecret, resolveHandoutSecret } from './lib/handoutUtils';
import { downloadPlayerArchivePdf } from './lib/playerArchivePdf';
import { sendChatMessage } from './lib/chatUtils';
import LandingScreen from './components/LandingScreen';
import QRJoinScreen from './components/QRJoinScreen';
import TopBar from './components/TopBar';
import DamageModal from './components/DamageModal';
import ShareModal from './components/ShareModal';
import AddNpcModal from './components/AddNpcModal';
import Sidebar from './components/Sidebar';
import PlaceholderView from './components/PlaceholderView';
import ChatView from './components/ChatView';
import HandoutsView from './components/HandoutsView';
import PreparationsView from './components/PreparationsView';
import WalletSection from './components/WalletSection';
import InventoryView from './components/InventoryView';
import NotesView from './components/NotesView';
import EditableStat from './components/EditableStat';
import SettingsModal from './components/SettingsModal';
import SessionManageModal from './components/SessionManageModal';
import SourcelistModal from './components/SourcelistModal';
import AddItemModal from './components/AddItemModal';
import HandoutModal from './components/HandoutModal';
import CharacterProfileModal from './components/CharacterProfileModal';
import PreparationModal from './components/PreparationModal';
import PlayerPickerModal from './components/PlayerPickerModal';
import PreparationOfferModal from './components/PreparationOfferModal';
import RightSidebar from './components/RightSidebar';
import InitiativeSwapModal from './components/InitiativeSwapModal';
import OwnerAdminPanel from './components/OwnerAdminPanel';
import { resolveActivePlan } from './lib/accessPlans';
import { DEFAULT_THEME, LANDING_DEFAULT_THEME } from './lib/appThemes';

async function uploadImageToStorage(file, path) {
  const ref = storageRef(storage, path);
  const snapshot = await uploadBytes(ref, file);
  return getDownloadURL(snapshot.ref);
}

// Prototype source for the React shell migration.


async function generateUniqueJoinTag(sessionName) {
  const base = slugifySessionName(sessionName);
  const sessionsRef = collection(db, 'sessions');

  for (let i = 0; i < 30; i += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${base}#${code}`;
    const safeCandidate = toSafeJoinTagForLink(candidate);
    const [hashSnap, safeSnap] = await Promise.all([
      getDocs(query(sessionsRef, where('joinTag', '==', candidate))),
      getDocs(query(sessionsRef, where('joinTag', '==', safeCandidate))),
    ]);
    if (hashSnap.empty && safeSnap.empty) return candidate;
  }

  return `${base}#${String(Date.now()).slice(-4)}`;
}

async function writeMembership({ uid, sessionId, role, sessionName, joinTag, status = 'active', preferredChatColor }) {
  if (!uid || !sessionId) return;
  const ref = doc(db, 'users', uid, 'memberships', sessionId);
  const payload = {
    sessionId,
    updatedAt: serverTimestamp(),
  };

  if (typeof role === 'string') {
    payload.role = role;
  }

  if (typeof sessionName !== 'undefined') {
    payload.sessionName = sessionName || '';
  }

  if (typeof joinTag !== 'undefined') {
    payload.joinTag = joinTag || '';
  }

  if (typeof status !== 'undefined') {
    payload.status = status || 'active';
  }

  if (typeof preferredChatColor === 'string' && preferredChatColor.trim()) {
    payload.preferredChatColor = preferredChatColor.trim();
  }

  await setDoc(ref, payload, { merge: true });
}

function loadStoredListenerAmbienceVolume() {
  if (typeof window === 'undefined') return 82;

  try {
    const raw = window.localStorage.getItem('tomevault:ambience:listener-volume');
    return clampAmbienceVolume(raw, 82);
  } catch (_) {
    return 82;
  }
}

const CHAT_ACCENT_COLORS = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  emerald: '#10b981',
  lime: '#84cc16',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#f43f5e',
  pink: '#ec4899',
  fuchsia: '#d946ef',
  cyan: '#22d3ee',
};

function isLikelyAssetVersionMismatch(rawMessage) {
  const message = String(rawMessage || '').toLowerCase();
  if (!message) return false;

  return (
    message.includes('failed to fetch dynamically imported module')
    || message.includes('loading chunk')
    || message.includes('chunkloaderror')
    || message.includes('importing a module script failed')
  );
}

function toFriendlyAuthError(error, fallbackMessage) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('popup-closed-by-user')) {
    return 'Google-venster gesloten voordat inloggen was afgerond.';
  }

  if (code.includes('popup-blocked')) {
    return 'Je browser blokkeert de Google-popup. Sta pop-ups toe en probeer opnieuw.';
  }

  if (code.includes('unauthorized-domain')) {
    return 'Dit domein is nog niet geautoriseerd voor Google-login in Firebase.';
  }

  if (code.includes('invalid-credential') || message.includes('redirect_uri_mismatch')) {
    return 'Google-login is nu niet correct geconfigureerd (redirect URI mismatch). Gebruik tijdelijk e-mail om in te loggen.';
  }

  return fallbackMessage;
}

function normalizeInventorySectionName(sectionName) {
  return String(sectionName || '').trim();
}

function hasNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeCustomStats(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry, index) => ({
      id: entry?.id || `stat-${index}`,
      name: String(entry?.name || '').trim().toUpperCase(),
      value: Number(entry?.value ?? 0) || 0,
    }))
    .filter((entry) => entry.name.length > 0);
}

function normalizePreparationDoc(docSnap) {
  const data = docSnap.data() || {};
  const updatedAt = data.updatedAt || data.createdAt || null;
  const offeredAt = data.offeredAt || null;
  const respondedAt = data.respondedAt || null;

  return {
    id: docSnap.id,
    name: String(data.name || '').trim() || 'Naamloos personage',
    subtitle: String(data.subtitle || '').trim(),
    bio: String(data.bio || '').trim(),
    imageUrl: normalizeAvatarUrl(data.imageUrl || data.avatarUrl),
    hp: Number(data.hp ?? data.hitPoints ?? 0),
    maxHp: Number(data.maxHp ?? data.maxHitPoints ?? data.hp ?? data.hitPoints ?? 0),
    ac: Number(data.ac ?? data.armorClass ?? 10),
    initMod: Number(data.initMod ?? data.dexterityMod ?? 0),
    customStats: sanitizeCustomStats(data.customStats),
    sourceUid: String(data.sourceUid || '').trim() || null,
    sourceType: String(data.sourceType || '').trim() || 'manual',
    createdByUid: String(data.createdByUid || '').trim() || null,
    assignedToUid: String(data.assignedToUid || '').trim() || null,
    preparedForUid: String(data.preparedForUid || '').trim() || null,
    assignmentStatus: String(data.assignmentStatus || 'unassigned').trim() || 'unassigned',
    createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0,
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
    offeredAtMs: offeredAt?.toMillis ? offeredAt.toMillis() : 0,
    respondedAtMs: respondedAt?.toMillis ? respondedAt.toMillis() : 0,
  };
}

function normalizePreparationBackupDoc(docSnap) {
  const data = docSnap.data() || {};
  const snapshot = data.snapshot || {};

  return {
    id: docSnap.id,
    playerUid: String(data.playerUid || '').trim() || null,
    playerName: String(data.playerName || '').trim() || '',
    templateId: String(data.templateId || '').trim() || null,
    templateName: String(data.templateName || '').trim() || '',
    createdAtMs: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0,
    restoredAtMs: data.restoredAt?.toMillis ? data.restoredAt.toMillis() : 0,
    snapshot: {
      name: String(snapshot.name || '').trim(),
      subtitle: String(snapshot.subtitle || '').trim(),
      bio: String(snapshot.bio || '').trim(),
      avatarUrl: normalizeAvatarUrl(snapshot.avatarUrl),
      hp: Number(snapshot.hp ?? 0),
      maxHp: Number(snapshot.maxHp ?? snapshot.hp ?? 0),
      ac: Number(snapshot.ac ?? 10),
      initMod: Number(snapshot.initMod ?? 0),
      customStats: sanitizeCustomStats(snapshot.customStats),
    },
  };
}

function snapshotPreparationFromCharacter(character = {}) {
  return {
    name: String(character.name || '').trim(),
    subtitle: String(character.subtitle || '').trim(),
    bio: String(character.bio || '').trim(),
    imageUrl: normalizeAvatarUrl(character.avatar),
    hp: Number(character.hp ?? 0),
    maxHp: Number(character.maxHp ?? character.hp ?? 0),
    ac: Number(character.ac ?? 10),
    initMod: Number(character.initMod ?? 0),
    customStats: sanitizeCustomStats(character.customStats),
    sourceUid: String(character.id || '').trim() || null,
    sourceType: 'playerSnapshot',
  };
}

function buildPreparationBackupSnapshot(player = {}, fallbacks = {}) {
  return {
    name: String(player.name || fallbacks.name || '').trim(),
    subtitle: String(player.subtitle || fallbacks.subtitle || '').trim(),
    bio: String(player.bio || fallbacks.bio || '').trim(),
    avatarUrl: normalizeAvatarUrl(player.avatar || fallbacks.avatarUrl),
    hp: Number(player.hp ?? fallbacks.hp ?? 0),
    maxHp: Number(player.maxHp ?? fallbacks.maxHp ?? player.hp ?? fallbacks.hp ?? 0),
    ac: Number(player.ac ?? fallbacks.ac ?? 10),
    initMod: Number(player.initMod ?? fallbacks.initMod ?? 0),
    customStats: sanitizeCustomStats(player.customStats || fallbacks.customStats),
  };
}

const ACTIVE_SESSION_STORAGE_KEY = 'tomevault:active-session:v1';
const APP_BACK_GUARD_KEY = '__tvInAppGuard';

function readPersistedActiveSession() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.view !== 'dashboard') return null;
    if (!['gm', 'player'].includes(parsed.role)) return null;
    if (!String(parsed.sessionDocId || '').trim()) return null;

    return {
      view: 'dashboard',
      role: parsed.role,
      sessionId: String(parsed.sessionId || '').trim(),
      sessionDocId: String(parsed.sessionDocId || '').trim(),
      activeTab: String(parsed.activeTab || 'handouts').trim() || 'handouts',
      playerName: String(parsed.playerName || '').trim(),
    };
  } catch (_) {
    return null;
  }
}

function clearPersistedActiveSession() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch (_) {
    // no-op
  }
}

function writePersistedActiveSession(payload) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {
    // no-op
  }
}

// --- COMPONENTEN ---

export default function TomeVaultApp() {
  const persistedActiveSession = useMemo(() => readPersistedActiveSession(), []);
  const [view, setView] = useState(() => persistedActiveSession?.view || 'landing');
  const [role, setRole] = useState(() => persistedActiveSession?.role || null);
  const [sessionId, setSessionId] = useState(() => persistedActiveSession?.sessionId || '');
  const [sessionDocId, setSessionDocId] = useState(() => persistedActiveSession?.sessionDocId || '');
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState(() => persistedActiveSession?.activeTab || 'handouts');
  const [playerName, setPlayerName] = useState(() => persistedActiveSession?.playerName || '');

  // Detect QR invite code from URL on mount (once, never changes)
  const [qrInviteCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return String(params.get('code') || '').trim();
  });
  const [qrJoinDone, setQrJoinDone] = useState(false);
  const showQRJoin = Boolean(qrInviteCode && view === 'landing' && !qrJoinDone);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    return window.localStorage.getItem('tomevault-theme') || DEFAULT_THEME;
  });

  const applyTheme = (newTheme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tomevault-theme', newTheme);
    }
    setTheme(newTheme);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const effectiveTheme = view === 'landing' ? LANDING_DEFAULT_THEME : theme;
      document.documentElement.setAttribute('data-theme', effectiveTheme);
    }
  }, [theme, view]);

  const [brightness, setBrightness] = useState(() => {
    const saved = safeLocalStorageGet('tv_brightness');
    return Number(saved) || 2; // Default to 2 (Normaal)
  });
  const [uiSounds, setUiSounds] = useState(() => isUiSoundsEnabled());

  useEffect(() => {
    primeUiAudio();
    return bindGlobalUiSounds(document);
  }, []);

  // Map brightness steps (0-4) to actual CSS filter values
  const brightnessFilterValues = [0.62, 0.80, 1.0, 1.18, 1.36];

  const handleBrightnessChange = (b) => {
    setBrightness(b);
    safeLocalStorageSet('tv_brightness', String(b));
    document.documentElement.style.setProperty('--tv-brightness', String(brightnessFilterValues[b] ?? 1));
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--tv-brightness', String(brightnessFilterValues[brightness] ?? 1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brightness]);

  // Ambience overlay kept for atmospheric tint only (fixed subtle opacity)
  const brightnessOverlayOpacities = [0, 0.15, 0.35, 0.55, 0.75];
  const brightnessOverlayOpacity = brightnessOverlayOpacities[brightness] ?? 0.35;
  
  const [handouts, setHandouts] = useState(MOCK_HANDOUTS);
  const handoutsRef = useRef(handouts);
  const subscribedSessionRef = useRef(null);
  const [party, setParty] = useState(MOCK_PARTY);
  const [chat, setChat] = useState(MOCK_CHAT);
  const [preferredChatColor, setPreferredChatColor] = useState(() => {
    const stored = String(safeLocalStorageGet('tv_chatcolor', '') || '').trim();
    return CHAT_ACCENT_COLORS[stored] ? stored : null;
  });
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [wallets, setWallets] = useState(MOCK_WALLETS);
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [preparations, setPreparations] = useState([]);
  const [preparationBackups, setPreparationBackups] = useState([]);
  const [sessionAmbience, setSessionAmbience] = useState(() => ({ ...DEFAULT_AMBIENCE_STATE }));
  const [isAmbiencePanelOpen, setIsAmbiencePanelOpen] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [ambienceError, setAmbienceError] = useState('');
  const [listenerAmbienceVolume, setListenerAmbienceVolume] = useState(loadStoredListenerAmbienceVolume);
  const ambienceAudioRef = useRef(null);
  const sessionAmbienceRef = useRef({ ...DEFAULT_AMBIENCE_STATE });
  const isClearingInventorySectionsRef = useRef(false);
  const lastInventorySectionCleanupSignatureRef = useRef('');
  const isBackfillingInventoryDescriptionsRef = useRef(false);
  const lastInventoryDescriptionBackfillSignatureRef = useRef('');
  const localDevBootstrapRef = useRef({ key: '', lastAuthAttemptAt: 0, lastJoinAttemptAt: 0 });
  const localDevBootstrapFallbackWarnedRef = useRef(false);

  // Firebase auth state
  const [uid, setUid] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [currentEntitlement, setCurrentEntitlement] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const {
    combatStatus,
    currentTurnId,
    turnRound,
    initiativeOrder,
    resetCombatState,
    reconcileCombatFromSnapshot,
    handleBatchUpdateInitiatives,
    handleInitiativeSwap,
    handleStartCombat,
    handlePauseCombat,
    handleResumeCombat,
    handleEndCombat,
    handleAdvanceTurn,
    handleDeleteNpc,
    handleKickPlayerFromCombat,
    handleRequestCombatJoin,
  } = useCombat({ sessionDocId, party, setParty, role, uid, setSessionInfo });
  const [appUpdateNotice, setAppUpdateNotice] = useState('');
  const [sessionBusy, setSessionBusy] = useState(false);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentSessionsLoaded, setRecentSessionsLoaded] = useState(false);
  const autoResumeAttemptRef = useRef('');
  const latestActiveRecentSession = recentSessions.find((session) => session?.status !== 'hidden') || null;
  const showLandingSessionHub = Boolean(
    uid &&
    view === 'landing' &&
    !sessionDocId &&
    !sessionBusy &&
    autoResumeAttemptRef.current === uid
  );
  
  const leaveSessionRef = useRef(() => {});
  const appBackStackRef = useRef([]);
  const appBackTrackerRef = useRef({
    initialized: false,
    activeTab: 'handouts',
    isPartyOpen: false,
    isAmbiencePanelOpen: false,
    showShareModal: false,
    isSettingsOpen: false,
    isSessionPanelOpen: false,
    isSourcelistOpen: false,
    isNpcModalOpen: false,
    isAddItemModalOpen: false,
    hasDamageModal: false,
    hasProfileModal: false,
    hasHandoutModal: false,
    hasPreparationModal: false,
    hasAssignPreparationModal: false,
    hasPreparationOfferModal: false,
  });
  const isHandlingInAppBackRef = useRef(false);
  const hasBackGuardRef = useRef(false);

  // State voor mobiele lay-out en modals
  const SLAGORDE_OPEN_KEY = 'tomevault.slagordeOpen';
  const [isPartyOpen, setIsPartyOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = safeLocalStorageGet(SLAGORDE_OPEN_KEY);
    if (stored === 'true' || stored === 'false') return stored === 'true';
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ));
  const [isNpcModalOpen, setIsNpcModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [addItemPreferredOwner, setAddItemPreferredOwner] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOwnerPanelOpen, setIsOwnerPanelOpen] = useState(false);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(false);
  const [isSourcelistOpen, setIsSourcelistOpen] = useState(false);
  const [isArchiveExporting, setIsArchiveExporting] = useState(false);
  const [initiativeSwapTarget, setInitiativeSwapTarget] = useState(null);
  const [damageTarget, setDamageTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [selectedHandout, setSelectedHandout] = useState(null);

  useEffect(() => {
    handoutsRef.current = handouts;
  }, [handouts]);

  useEffect(() => {
    setSelectedHandout((current) => {
      if (!current || current === 'new') return current;
      const fresh = handouts.find((entry) => String(entry.id) === String(current.id));
      return fresh ? fresh : current;
    });
  }, [handouts]);
  const [selectedPreparation, setSelectedPreparation] = useState(null);
  const [assigningPreparation, setAssigningPreparation] = useState(null);
  const [importingPreparationPlayer, setImportingPreparationPlayer] = useState(false);
  const [pendingPreparationOffer, setPendingPreparationOffer] = useState(null);
  const [campaignSessionNumber, setCampaignSessionNumber] = useState(1);
  const localDevBootstrap = useMemo(() => getLocalDevBootstrapConfig(), []);
  const accessRole = role === 'gm' ? 'gm' : (role === 'player' ? 'player' : 'player');
  const currentAccessPlan = useMemo(
    () => resolveActivePlan({ role: accessRole, entitlement: currentEntitlement }),
    [accessRole, currentEntitlement]
  );
  const runtimeBadge = useMemo(
    () => getRuntimeBadgeState({ role, localDevBootstrap }),
    [localDevBootstrap, role]
  );
  const verifiedAmbienceTracks = getVerifiedAmbienceTracks();
  const archivedAmbienceTracks = getArchivedAmbienceTracks();
  const currentAmbienceTrack = getAmbienceTrackById(sessionAmbience.trackId);
  const effectiveAmbienceVolume = useMemo(() => {
    const sessionVolume = clampAmbienceVolume(sessionAmbience.masterVolume, DEFAULT_AMBIENCE_STATE.masterVolume) / 100;
    const listenerVolume = clampAmbienceVolume(listenerAmbienceVolume, 82) / 100;
    return Math.max(0, Math.min(1, sessionVolume * listenerVolume));
  }, [listenerAmbienceVolume, sessionAmbience.masterVolume]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncMobileViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncMobileViewport();
    mediaQuery.addEventListener('change', syncMobileViewport);
    return () => mediaQuery.removeEventListener('change', syncMobileViewport);
  }, []);

  const isMobilePartyOverlay = isMobileViewport && isPartyOpen && !isSidebarPinned;

  useEffect(() => {
    const stored = String(safeLocalStorageGet('tv_chatcolor', '') || '').trim();
    const localColor = CHAT_ACCENT_COLORS[stored] ? stored : null;

    if (!uid || !sessionDocId) {
      setPreferredChatColor(localColor);
      return undefined;
    }

    let cancelled = false;
    setPreferredChatColor(localColor);

    const loadMembershipChatColor = async () => {
      try {
        const membershipSnap = await getDoc(doc(db, 'users', uid, 'memberships', sessionDocId));
        const membershipColor = String(membershipSnap.data()?.preferredChatColor || '').trim();

        if (cancelled || !CHAT_ACCENT_COLORS[membershipColor]) {
          return;
        }

        safeLocalStorageSet('tv_chatcolor', membershipColor);
        setPreferredChatColor(membershipColor);
      } catch (err) {
        console.error('Chatkleur voorkeur laden mislukt:', err);
      }
    };

    loadMembershipChatColor();

    return () => {
      cancelled = true;
    };
  }, [sessionDocId, uid]);

  useEffect(() => {
    if (!uid) {
      setIsOwner(false);
      setCurrentEntitlement(null);
      setIsOwnerPanelOpen(false);
      return undefined;
    }

    let cancelled = false;

    const syncUserProfileAndOwnerState = async () => {
      try {
        const currentUser = auth.currentUser;
        const normalizedEmail = String(currentUser?.email || '').trim().toLowerCase();
        const inferredName = currentUser?.displayName || currentUser?.email?.split('@')[0] || displayName || 'Avonturier';

        await setDoc(doc(db, 'users', uid), {
          displayName: inferredName,
          email: currentUser?.email || null,
          normalizedEmail: normalizedEmail || null,
          photoURL: currentUser?.photoURL || null,
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        const adminSnap = await getDoc(doc(db, 'admins', uid));
        if (!cancelled) {
          setIsOwner(adminSnap.exists());
        }
      } catch (err) {
        console.error('Gebruikersprofiel synchroniseren mislukt:', err);
        if (!cancelled) {
          setIsOwner(false);
        }
      }
    };

    void syncUserProfileAndOwnerState();

    return () => {
      cancelled = true;
    };
  }, [displayName, uid]);

  useEffect(() => {
    if (!uid || !role) {
      setCurrentEntitlement(null);
      return undefined;
    }

    let cancelled = false;

    const loadEntitlement = async () => {
      try {
        const entitlementSnap = await getDoc(doc(db, 'users', uid, 'entitlements', role));
        if (!cancelled) {
          setCurrentEntitlement(entitlementSnap.exists() ? entitlementSnap.data() : null);
        }
      } catch (err) {
        console.error('Entitlement laden mislukt:', err);
        if (!cancelled) {
          setCurrentEntitlement(null);
        }
      }
    };

    void loadEntitlement();

    return () => {
      cancelled = true;
    };
  }, [role, uid]);

  useEffect(() => {
    if (!uid || !role) return undefined;

    void setDoc(doc(db, 'users', uid), {
      lastKnownRole: role,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch((err) => {
      console.error('Laatste gebruikersrol opslaan mislukt:', err);
    });

    return undefined;
  }, [role, uid]);

  const resetAmbienceState = () => {
    const nextDefault = { ...DEFAULT_AMBIENCE_STATE };
    sessionAmbienceRef.current = nextDefault;
    setSessionAmbience(nextDefault);
    setIsAmbiencePanelOpen(false);
    setNeedsAudioUnlock(false);
    setAmbienceError('');

    const audio = ambienceAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  useEffect(() => {
    if (!localDevBootstrap || localDevBootstrap.roleSource !== 'host-default' || localDevBootstrapFallbackWarnedRef.current) return;

    console.warn(
      '[TomeVault] Local dev bootstrap defaulted role from host. Add devRole=gm or devRole=player to make local test URLs explicit.'
    );
    localDevBootstrapFallbackWarnedRef.current = true;
  }, [localDevBootstrap]);

  useEffect(() => {
    if (role !== 'gm' && activeTab === 'preparations') {
      setActiveTab('handouts');
    }
  }, [activeTab, role]);

  useEffect(() => {
    if (role !== 'player' || view !== 'dashboard' || !uid) return;
    const currentPlayer = party.find((member) => member.id === uid && member.isNpc !== true);
    if (!currentPlayer?.name) return;
    if (currentPlayer.name !== playerName) {
      setPlayerName(currentPlayer.name);
    }
  }, [party, playerName, role, uid, view]);

  const CURRENT_PLAYER_ID = uid || 'p1';

  const handleJoin = async (selectedRole, code, options = {}) => {
    setSessionError('');
    setSessionInfo('');
    if (!uid) {
      setAuthError('Log eerst in voordat je een sessie start of joint.');
      return;
    }

    try {
      setSessionBusy(true);

      if (selectedRole === 'gm') {
        const sessionName = String(options.forceSessionName || code || 'Session').replace(/^#/, '').replace(/-/g, ' ').trim() || 'Session';
        const pinPlain = String(options.defaultPin || '0000').trim();
        if (!/^\d{4,8}$/.test(pinPlain)) {
          setSessionError('PIN moet uit 4 tot 8 cijfers bestaan.');
          return;
        }

        const pinHash = await sha256(pinPlain);
        const fixedJoinTagRaw = String(options.fixedJoinTag || '').trim();
        let joinTag = '';

        if (fixedJoinTagRaw) {
          joinTag = toLegacyHashJoinTag(fixedJoinTagRaw);
          const variants = getJoinTagLookupVariants(joinTag);
          let existing = null;
          let shouldCreateFreshLocalDevSession = false;

          for (const candidate of variants) {
            const byTag = await getDocs(query(collection(db, 'sessions'), where('joinTag', '==', candidate)));
            if (!byTag.empty) {
              existing = byTag.docs[0];
              break;
            }
          }

          if (existing) {
            const existingData = existing.data() || {};
            const allowLocalDevTakeover = options.allowLocalDevTakeover === true;

            if (existingData.gmUid !== uid && !allowLocalDevTakeover) {
              setSessionError('Deze testsessie is al in gebruik door een andere GM.');
              return;
            }

            if (existingData.gmUid !== uid && allowLocalDevTakeover) {
              // Firestore rules do not permit arbitrary GM takeover of another
              // anonymous dev session, so create an isolated fresh dev session instead.
              joinTag = await generateUniqueJoinTag(sessionName);
              shouldCreateFreshLocalDevSession = true;
              setSessionInfo('Bestaande lokale testsessie was bezet. Er wordt een nieuwe testsessie voor je aangemaakt.');
            }

            if (!shouldCreateFreshLocalDevSession) {
              await writeMembership({
                uid,
                sessionId: existing.id,
                role: 'dm',
                sessionName: existingData.name || sessionName,
                joinTag: toLegacyHashJoinTag(existingData.joinTag || joinTag),
              });

              setRole('gm');
              setSessionDocId(existing.id);
              setSessionId(toLegacyHashJoinTag(existingData.joinTag || joinTag));
              setCampaignSessionNumber(Number(existingData.campaignSessionNumber || 1));
              setView('dashboard');
              return;
            }
          }
        } else {
          joinTag = await generateUniqueJoinTag(sessionName);
        }

        const sessionData = {
          name: sessionName,
          joinTag,
          pinHash,
          gmUid: uid,
          campaignSessionNumber: 1,
          ...buildCombatSessionPatch(DEFAULT_COMBAT_STATE),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ambience: buildAmbienceSessionPatch(DEFAULT_AMBIENCE_STATE, { includeStartedAt: true }),
          isOneShot: false,
        };

        const created = await addDoc(collection(db, 'sessions'), sessionData);

        await writeMembership({
          uid,
          sessionId: created.id,
          role: 'dm',
          sessionName: sessionData?.name || '',
          joinTag: toLegacyHashJoinTag(sessionData?.joinTag || joinTag),
        });

        setRole('gm');
        setSessionDocId(created.id);
        setSessionId(joinTag);
        setCampaignSessionNumber(1);
        setView('dashboard');
        return;
      }

      const joinTagRaw = String(code || '').trim();
      const nick = String(options.playerName || playerName || displayName || 'Avonturier').trim();
      const pinPlain = String(options.pin || '').trim();
      const skipPinCheck = options.skipPin === true;
      if (!joinTagRaw) {
        setSessionError('Sessiecode ontbreekt.');
        return;
      }
      if (!nick) {
        setSessionError('Karakternaam ontbreekt.');
        return;
      }
      if (!skipPinCheck && !/^\d{4,8}$/.test(pinPlain)) {
        setSessionError('PIN moet uit 4 tot 8 cijfers bestaan.');
        return;
      }

      const variants = getJoinTagLookupVariants(joinTagRaw);
      let sessionDoc = null;

      for (const candidate of variants) {
        const byTag = await getDocs(query(collection(db, 'sessions'), where('joinTag', '==', candidate)));
        if (!byTag.empty) {
          sessionDoc = byTag.docs[0];
          break;
        }
      }

      if (!sessionDoc) {
        for (const candidate of variants) {
          const byId = await getDoc(doc(db, 'sessions', candidate));
          if (byId.exists()) {
            sessionDoc = byId;
            break;
          }
        }
      }

      if (!sessionDoc) {
        setSessionError('Sessie niet gevonden. Controleer de code.');
        return;
      }

      const sessionData = sessionDoc.data();
      if (!skipPinCheck) {
        const pinHash = await sha256(pinPlain);
        if (sessionData?.pinHash && sessionData.pinHash !== pinHash) {
          setSessionError('Onjuiste PIN.');
          return;
        }
      }

      const existingPlayerRef = doc(db, 'sessions', sessionDoc.id, 'players', uid);
      const existingPlayerSnap = await getDoc(existingPlayerRef);
      const resolvedNick = String(existingPlayerSnap.data()?.nickname || nick).trim() || 'Avonturier';

      const playerPayload = {
        nickname: resolvedNick,
        joinedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        isNpc: false,
        isRevealed: true,
        initiative: null,
      };

      if (!existingPlayerSnap.exists()) {
        playerPayload.combatParticipation = COMBAT_PARTICIPATION_STATUS.ACTIVE;
        playerPayload.combatJoinRequestStatus = COMBAT_JOIN_REQUEST_STATUS.NONE;
      }

      await setDoc(existingPlayerRef, playerPayload, { merge: true });

      await writeMembership({
        uid,
        sessionId: sessionDoc.id,
        role: 'player',
        sessionName: sessionData?.name || '',
        joinTag: toLegacyHashJoinTag(sessionData?.joinTag || joinTagRaw),
      });

      setPlayerName(resolvedNick);
      setRole('player');
      setSessionDocId(sessionDoc.id);
      setSessionId(toLegacyHashJoinTag(sessionData?.joinTag || joinTagRaw));
      setCampaignSessionNumber(Number(sessionData?.campaignSessionNumber || 1));
      setView('dashboard');
    } catch (err) {
      console.error('Join/Create sessie fout:', err);
      setSessionError('Sessie openen is mislukt. Controleer Firebase rules en internetverbinding.');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleResumeRecentSession = async (membership, preferredRole) => {
    if (!uid || !membership?.sessionId) return;

    setSessionError('');
    setSessionInfo('');
    setSessionBusy(true);

    try {
      const sessionRef = doc(db, 'sessions', membership.sessionId);
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) {
        setSessionError('Deze sessie bestaat niet meer.');
        return;
      }

      const data = snap.data() || {};
      const resolvedRole = preferredRole || (membership.role === 'dm' ? 'gm' : 'player');
      const resolvedJoinTag = toLegacyHashJoinTag(data.joinTag || membership.joinTag || membership.sessionId);

      if (resolvedRole === 'gm') {
        if (data.gmUid !== uid && membership.role !== 'dm') {
          setSessionError('Je bent geen GM van deze sessie.');
          return;
        }

        await writeMembership({
          uid,
          sessionId: snap.id,
          role: 'dm',
          sessionName: data.name || membership.sessionName || '',
          joinTag: resolvedJoinTag,
        });

        setRole('gm');
        setSessionDocId(snap.id);
        setSessionId(resolvedJoinTag);
        setCampaignSessionNumber(Number(data?.campaignSessionNumber || 1));
        setView('dashboard');
        return;
      }

      const nick = String(playerName || displayName || 'Avonturier').trim();
      const existingPlayerRef = doc(db, 'sessions', snap.id, 'players', uid);
      const existingPlayerSnap = await getDoc(existingPlayerRef);
      const resolvedNick = String(existingPlayerSnap.data()?.nickname || nick).trim() || 'Avonturier';

      const playerPayload = {
        nickname: resolvedNick,
        joinedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        isNpc: false,
        isRevealed: true,
        initiative: null,
      };

      if (!existingPlayerSnap.exists()) {
        playerPayload.combatParticipation = COMBAT_PARTICIPATION_STATUS.ACTIVE;
        playerPayload.combatJoinRequestStatus = COMBAT_JOIN_REQUEST_STATUS.NONE;
      }

      await setDoc(existingPlayerRef, playerPayload, { merge: true });

      await writeMembership({
        uid,
        sessionId: snap.id,
        role: 'player',
        sessionName: data.name || membership.sessionName || '',
        joinTag: resolvedJoinTag,
      });

      setPlayerName(resolvedNick);
      setRole('player');
      setSessionDocId(snap.id);
      setSessionId(resolvedJoinTag);
      setCampaignSessionNumber(Number(data?.campaignSessionNumber || 1));
      setView('dashboard');
    } catch (err) {
      console.error('Recente sessie hervatten fout:', err);
      setSessionError('Recente sessie openen is mislukt.');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleSetRecentSessionStatus = async (sessionId, status) => {
    if (!uid || !sessionId) return;
    if (!['active', 'hidden'].includes(status)) return;

    const previous = recentSessions;
    setRecentSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? { ...s, status } : s)));

    try {
      await setDoc(
        doc(db, 'users', uid, 'memberships', sessionId),
        {
          status,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Recente sessie status updaten fout:', err);
      setRecentSessions(previous);
    }
  };

  const handleHideRecentSession = async (sessionId) => {
    await handleSetRecentSessionStatus(sessionId, 'hidden');
  };

  const handleRestoreRecentSession = async (sessionId) => {
    await handleSetRecentSessionStatus(sessionId, 'active');
  };

  const deleteDocsInSubcollection = async (sessionId, subcollectionName, queryRef = null) => {
    const snap = queryRef ? await getDocs(queryRef) : await getDocs(collection(db, 'sessions', sessionId, subcollectionName));
    if (snap.empty) return;

    for (let index = 0; index < snap.docs.length; index += 450) {
      const batch = writeBatch(db);
      snap.docs.slice(index, index + 450).forEach((entry) => batch.delete(entry.ref));
      await batch.commit();
    }
  };

  const handleDeleteRecentSession = async (membership) => {
    if (!uid || !membership?.sessionId) return;

    setSessionError('');
    setSessionInfo('');
    setSessionBusy(true);

    const sessionName = membership.sessionName || 'Naamloze Sessie';
    const membershipRef = doc(db, 'users', uid, 'memberships', membership.sessionId);

    try {
      if (membership.role === 'dm') {
        const sessionRef = doc(db, 'sessions', membership.sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          await deleteDoc(membershipRef);
          setRecentSessions((prev) => prev.filter((session) => session.sessionId !== membership.sessionId));
          setSessionInfo(`De verwijzing naar ${sessionName} is verwijderd uit je recente sessies.`);
          return;
        }

        const sessionData = sessionSnap.data() || {};
        if (sessionData.gmUid !== uid) {
          throw new Error('Alleen de actieve GM kan deze campagne definitief verwijderen.');
        }

        await deleteDocsInSubcollection(membership.sessionId, 'wallets');
        await deleteDocsInSubcollection(membership.sessionId, 'handouts');
        await deleteDocsInSubcollection(membership.sessionId, 'players');
        await deleteDocsInSubcollection(membership.sessionId, 'inventory');
        await deleteDocsInSubcollection(membership.sessionId, 'inventorySections');
        await deleteDocsInSubcollection(membership.sessionId, 'notifications');
        await deleteDocsInSubcollection(membership.sessionId, 'chatMessages');
        await deleteDocsInSubcollection(membership.sessionId, 'characterTemplates');
        await deleteDocsInSubcollection(membership.sessionId, 'preparationBackups');
        await deleteDocsInSubcollection(membership.sessionId, 'pendingTransfer');
        await deleteDocsInSubcollection(
          membership.sessionId,
          'noteFiles',
          query(collection(db, 'sessions', membership.sessionId, 'noteFiles'), where('ownerUid', '==', uid))
        );

        await deleteDoc(sessionRef);
        await deleteDoc(membershipRef);

        setRecentSessions((prev) => prev.filter((session) => session.sessionId !== membership.sessionId));
        setSessionInfo(`Campagne ${sessionName} is definitief verwijderd.`);

        if (sessionDocId === membership.sessionId) {
          autoResumeAttemptRef.current = uid || autoResumeAttemptRef.current;
          setRole(null);
          setSessionId('');
          setCampaignSessionNumber(1);
          setSessionDocId('');
          setView('landing');
          resetAmbienceState();
          setIsPartyOpen(false);
          resetCombatState();
        }

        return;
      }

      await deleteDoc(doc(db, 'sessions', membership.sessionId, 'players', uid)).catch(() => {});
      await deleteDoc(membershipRef);
      setRecentSessions((prev) => prev.filter((session) => session.sessionId !== membership.sessionId));
      setSessionInfo(`Je hebt ${sessionName} permanent verlaten en uit je recente sessies verwijderd.`);
    } catch (err) {
      console.error('Recente sessie verwijderen fout:', err);
      setSessionError(err?.message || 'Het permanent verwijderen van deze sessie is mislukt.');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout fout:', err);
    }
    autoResumeAttemptRef.current = '';
    setRole(null);
    setSessionId('');
    setCampaignSessionNumber(1);
    setSessionDocId('');
    setView('landing');
    resetAmbienceState();
    setIsPartyOpen(false);
    resetCombatState();
    appBackStackRef.current = [];
    appBackTrackerRef.current.initialized = false;
    hasBackGuardRef.current = false;
  };

  const handleLeaveSession = () => {
    autoResumeAttemptRef.current = uid || autoResumeAttemptRef.current;
    setSessionError('');
    setSessionInfo('');
    setRole(null);
    setSessionId('');
    setCampaignSessionNumber(1);
    setSessionDocId('');
    setView('landing');
    resetAmbienceState();
    setIsPartyOpen(false);
    resetCombatState();
    clearPersistedActiveSession();
    appBackStackRef.current = [];
    appBackTrackerRef.current.initialized = false;
    hasBackGuardRef.current = false;
  };

  leaveSessionRef.current = handleLeaveSession;

  const handleBackfillMemberships = async () => {
    if (!uid) return;

    setSessionError('');
    setSessionInfo('');
    setSessionBusy(true);

    try {
      const sessionsSnap = await getDocs(collection(db, 'sessions'));
      let scanned = 0;
      let restored = 0;

      for (const sessionDoc of sessionsSnap.docs) {
        scanned += 1;
        const sessionData = sessionDoc.data() || {};

        let role = null;
        if (sessionData.gmUid === uid) {
          role = 'dm';
        } else {
          const playerRef = doc(db, 'sessions', sessionDoc.id, 'players', uid);
          const playerSnap = await getDoc(playerRef);
          if (playerSnap.exists()) {
            role = 'player';
          }
        }

        if (!role) continue;

        await writeMembership({
          uid,
          sessionId: sessionDoc.id,
          role,
          sessionName: sessionData.name || '',
          joinTag: toLegacyHashJoinTag(sessionData.joinTag || sessionDoc.id),
        });

        restored += 1;
      }

      setSessionInfo(`Herstel voltooid: ${restored} sessie(s) toegevoegd/geüpdatet na scan van ${scanned} sessies.`);
    } catch (err) {
      console.error('Membership herstel fout:', err);
      setSessionError('Herstel van oude sessies is mislukt. Controleer Firestore-toegang en probeer opnieuw.');
    } finally {
      setSessionBusy(false);
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';

    const handleAudioError = () => {
      setAmbienceError('De gekozen track kon niet geladen worden. Controleer de asset of bronvermelding.');
    };

    audio.addEventListener('error', handleAudioError);
    ambienceAudioRef.current = audio;

    return () => {
      audio.removeEventListener('error', handleAudioError);
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      ambienceAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateMessage = 'Er staat een nieuwe versie klaar. Vernieuw de pagina om verder te gaan.';

    const handleWindowError = (event) => {
      const message = event?.message || event?.error?.message || '';
      if (isLikelyAssetVersionMismatch(message)) {
        setAppUpdateNotice(updateMessage);
      }
    };

    const handleUnhandledRejection = (event) => {
      const reason = event?.reason;
      const message = typeof reason === 'string'
        ? reason
        : (reason?.message || String(reason || ''));

      if (isLikelyAssetVersionMismatch(message)) {
        setAppUpdateNotice(updateMessage);
      }
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    sessionAmbienceRef.current = sessionAmbience;
  }, [sessionAmbience]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem('tomevault:ambience:listener-volume', String(listenerAmbienceVolume));
    } catch (_) {
      // no-op
    }
  }, [listenerAmbienceVolume]);

  useEffect(() => {
    const audio = ambienceAudioRef.current;
    if (!audio) return undefined;

    const selectedTrack = getAmbienceTrackById(sessionAmbience.trackId);
    const targetSrc = typeof window === 'undefined'
      ? selectedTrack.filePath
      : new URL(selectedTrack.filePath, window.location.origin).href;
    const trackChanged = audio.src !== targetSrc;

    const syncPlaybackPosition = () => {
      if (!sessionAmbience.startedAtMs || !Number.isFinite(audio.duration) || audio.duration <= 0) return;

      const elapsedSeconds = Math.max(0, (Date.now() - sessionAmbience.startedAtMs) / 1000);
      const nextPosition = elapsedSeconds % audio.duration;

      if (Number.isFinite(nextPosition) && Math.abs(audio.currentTime - nextPosition) > 1.2) {
        audio.currentTime = nextPosition;
      }
    };

    const attemptPlayback = () => {
      audio.volume = effectiveAmbienceVolume;

      if (!sessionAmbience.isPlaying) {
        audio.pause();
        return;
      }

      syncPlaybackPosition();
      audio.play().then(() => {
        setNeedsAudioUnlock(false);
        setAmbienceError('');
      }).catch((err) => {
        console.warn('Ambience kon niet starten:', err);
        setNeedsAudioUnlock(true);
        setAmbienceError('Klik op Audio inschakelen om browserblokkades voor de sessiesfeer op te heffen.');
      });
    };

    if (trackChanged) {
      audio.pause();
      audio.src = selectedTrack.filePath;
      audio.load();
    }

    audio.volume = effectiveAmbienceVolume;

    if (trackChanged && audio.readyState < 1) {
      const handleLoadedMetadata = () => {
        attemptPlayback();
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      if (!sessionAmbience.isPlaying) {
        audio.pause();
      }

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }

    attemptPlayback();
    return undefined;
  }, [effectiveAmbienceVolume, sessionAmbience]);

  useEffect(() => {
    let didResolveAuth = false;
    const authLoadFallbackTimer = window.setTimeout(() => {
      if (didResolveAuth) return;
      setAuthError('Authenticatie duurde te lang. Probeer opnieuw met Google of e-mail.');
      setAuthLoading(false);
    }, 7000);

    const finishAuthLoad = () => {
      if (!didResolveAuth) {
        didResolveAuth = true;
      }
      window.clearTimeout(authLoadFallbackTimer);
      setAuthLoading(false);
    };

    let unsub = () => {};

    try {
      unsub = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            autoResumeAttemptRef.current = '';
            const inferredName = user.displayName || user.email?.split('@')[0] || 'Avonturier';
            setUid(user.uid);
            setDisplayName(inferredName);
            setPlayerName((prev) => prev || inferredName);
          } else {
            autoResumeAttemptRef.current = '';
            setUid(null);
            setDisplayName('');
            setIsOwner(false);
            setCurrentEntitlement(null);
            setIsOwnerPanelOpen(false);
            setRole(null);
            setSessionId('');
            setSessionDocId('');
            setView('landing');
            setRecentSessions([]);
            resetAmbienceState();
            clearPersistedActiveSession();
            appBackStackRef.current = [];
            appBackTrackerRef.current.initialized = false;
            hasBackGuardRef.current = false;
          }

          setAuthError('');
          finishAuthLoad();
        },
        (error) => {
          console.error('Auth state observer failed:', error);
          setAuthError('Authenticatie initialiseren is mislukt. Probeer opnieuw of gebruik e-mail.');
          finishAuthLoad();
        }
      );
    } catch (error) {
      console.error('Auth observer setup failed:', error);
      setAuthError('Authenticatie kon niet worden gestart. Probeer opnieuw of gebruik e-mail.');
      finishAuthLoad();
    }

    return () => {
      window.clearTimeout(authLoadFallbackTimer);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!uid) {
      setRecentSessions([]);
      setRecentSessionsLoaded(false);
      return undefined;
    }

    setRecentSessionsLoaded(false);

    const membershipsRef = collection(db, 'users', uid, 'memberships');
    const unsub = onSnapshot(
      query(membershipsRef, orderBy('updatedAt', 'desc'), limit(12)),
      (snap) => {
        const incoming = snap.docs.map((d) => {
          const m = d.data() || {};
          return {
            sessionId: d.id,
            sessionName: m.sessionName || '',
            joinTag: m.joinTag || '',
            role: m.role || 'player',
            status: m.status || 'active',
            updatedAtLabel: formatLastEditedLabel(m.updatedAt),
          };
        });
        setRecentSessions(incoming);
        setRecentSessionsLoaded(true);
      },
      (err) => {
        console.error('Recente sessies laden fout:', err);
        setRecentSessionsLoaded(true);
      }
    );

    return () => {
      try {
        unsub();
      } catch (_) {
        // no-op
      }
    };
  }, [uid]);

  useEffect(() => {
    if (authLoading || sessionBusy || !uid || !recentSessionsLoaded) return;
    if (view !== 'landing' || sessionDocId) return;
    if (autoResumeAttemptRef.current === uid) return;

    if (!latestActiveRecentSession) {
      autoResumeAttemptRef.current = uid;
      return;
    }

    autoResumeAttemptRef.current = uid;
    const preferredRole = latestActiveRecentSession.role === 'dm' ? 'gm' : 'player';
    handleResumeRecentSession(latestActiveRecentSession, preferredRole);
  }, [authLoading, latestActiveRecentSession, recentSessionsLoaded, sessionBusy, sessionDocId, uid, view]);

  useEffect(() => {
    if (view === 'dashboard' && sessionDocId && role) {
      writePersistedActiveSession({
        view: 'dashboard',
        role,
        sessionId,
        sessionDocId,
        activeTab,
        playerName,
        savedAt: Date.now(),
      });
      return;
    }

    if (!authLoading && view === 'landing') {
      clearPersistedActiveSession();
    }
  }, [activeTab, authLoading, playerName, role, sessionDocId, sessionId, view]);

  useEffect(() => {
    const pushInAppBackAction = (action) => {
      if (typeof window === 'undefined') return;
      if (view !== 'dashboard') return;
      if (isHandlingInAppBackRef.current) return;

      appBackStackRef.current.push(action);
      window.history.pushState({ [APP_BACK_GUARD_KEY]: true }, '', window.location.href);
      hasBackGuardRef.current = true;
    };

    if (view !== 'dashboard') {
      appBackStackRef.current = [];
      appBackTrackerRef.current.initialized = false;
      hasBackGuardRef.current = false;
      return;
    }

    const currentState = {
      activeTab,
      isPartyOpen,
      isAmbiencePanelOpen,
      showShareModal,
      isSettingsOpen,
      isSessionPanelOpen,
      isSourcelistOpen,
      isNpcModalOpen,
      isAddItemModalOpen,
      hasDamageModal: Boolean(damageTarget),
      hasProfileModal: Boolean(profileTarget),
      hasHandoutModal: Boolean(selectedHandout),
      hasPreparationModal: selectedPreparation !== null,
      hasAssignPreparationModal: Boolean(assigningPreparation),
      hasPreparationOfferModal: Boolean(pendingPreparationOffer) && role === 'player',
    };

    if (!hasBackGuardRef.current && typeof window !== 'undefined') {
      window.history.pushState({ [APP_BACK_GUARD_KEY]: true }, '', window.location.href);
      hasBackGuardRef.current = true;
    }

    if (!appBackTrackerRef.current.initialized) {
      appBackTrackerRef.current = {
        initialized: true,
        ...currentState,
      };
      return;
    }

    const previousState = appBackTrackerRef.current;

    if (previousState.activeTab !== currentState.activeTab) {
      pushInAppBackAction({ type: 'tab', previousTab: previousState.activeTab || 'handouts' });
    }

    const closableFlags = [
      ['isPartyOpen', 'party'],
      ['isAmbiencePanelOpen', 'ambiencePanel'],
      ['showShareModal', 'shareModal'],
      ['isSettingsOpen', 'settingsModal'],
      ['isSessionPanelOpen', 'sessionPanel'],
      ['isSourcelistOpen', 'sourcelistModal'],
      ['isNpcModalOpen', 'npcModal'],
      ['isAddItemModalOpen', 'addItemModal'],
      ['hasDamageModal', 'damageModal'],
      ['hasProfileModal', 'profileModal'],
      ['hasHandoutModal', 'handoutModal'],
      ['hasPreparationModal', 'preparationModal'],
      ['hasAssignPreparationModal', 'assignPreparationModal'],
      ['hasPreparationOfferModal', 'preparationOfferModal'],
    ];

    closableFlags.forEach(([flagKey, target]) => {
      if (!previousState[flagKey] && currentState[flagKey]) {
        pushInAppBackAction({ type: 'close', target });
      }
    });

    appBackTrackerRef.current = {
      initialized: true,
      ...currentState,
    };
  }, [
    activeTab,
    assigningPreparation,
    damageTarget,
    isAddItemModalOpen,
    isAmbiencePanelOpen,
    isNpcModalOpen,
    isPartyOpen,
    isSessionPanelOpen,
    isSettingsOpen,
    isSourcelistOpen,
    pendingPreparationOffer,
    profileTarget,
    role,
    selectedHandout,
    selectedPreparation,
    showShareModal,
    view,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const closeTargetByName = (target) => {
      if (target === 'handoutModal') {
        setSelectedHandout(null);
      } else if (target === 'preparationModal') {
        setSelectedPreparation(null);
      } else if (target === 'assignPreparationModal') {
        setAssigningPreparation(null);
      } else if (target === 'profileModal') {
        setProfileTarget(null);
      } else if (target === 'damageModal') {
        setDamageTarget(null);
      } else if (target === 'addItemModal') {
        setIsAddItemModalOpen(false);
      } else if (target === 'npcModal') {
        setIsNpcModalOpen(false);
      } else if (target === 'settingsModal') {
        setIsSettingsOpen(false);
      } else if (target === 'sessionPanel') {
        setIsSessionPanelOpen(false);
      } else if (target === 'sourcelistModal') {
        setIsSourcelistOpen(false);
      } else if (target === 'shareModal') {
        setShowShareModal(false);
      } else if (target === 'ambiencePanel') {
        setIsAmbiencePanelOpen(false);
      } else if (target === 'party') {
        setIsPartyOpen(false);
      } else if (target === 'preparationOfferModal') {
        setPendingPreparationOffer(null);
      }
    };

    const handlePopState = () => {
      if (view !== 'dashboard') {
        hasBackGuardRef.current = false;
        appBackStackRef.current = [];
        appBackTrackerRef.current.initialized = false;
        return;
      }

      const action = appBackStackRef.current.pop();
      if (!action) {
        leaveSessionRef.current();
        return;
      }

      isHandlingInAppBackRef.current = true;

      if (action.type === 'tab') {
        setActiveTab(action.previousTab || 'handouts');
      }

      if (action.type === 'close') {
        closeTargetByName(action.target);
      }

      window.setTimeout(() => {
        isHandlingInAppBackRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [view]);

  useEffect(() => {
    if (!sessionDocId || view !== 'dashboard') {
      subscribedSessionRef.current = null;
      return undefined;
    }

    const unsubs = [];
    const sid = sessionDocId;
    const sessionChanged = subscribedSessionRef.current !== sid;
    subscribedSessionRef.current = sid;

    if (sessionChanged) {
      setHandouts([]);
      setParty([]);
      setChat([]);
      setInventory([]);
      setInventoryLoaded(false);
      setWallets({});
      setNotes([]);
      setPreparations([]);
      setPreparationBackups([]);
      setPendingPreparationOffer(null);
      resetAmbienceState();
      lastInventorySectionCleanupSignatureRef.current = '';
      isClearingInventorySectionsRef.current = false;
      lastInventoryDescriptionBackfillSignatureRef.current = '';
      isBackfillingInventoryDescriptionsRef.current = false;
    }

    const toIsoTime = (ts) => {
      const ms = ts?.toMillis ? ts.toMillis() : Date.now();
      return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const toIsoDate = (ts) => {
      const ms = ts?.toMillis ? ts.toMillis() : Date.now();
      return new Date(ms).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const toIsoMs = (ts) => (ts?.toMillis ? ts.toMillis() : Date.now());

    unsubs.push(
      onSnapshot(doc(db, 'sessions', sid), (snap) => {
        const s = snap.data() || {};
        const { skipCombatUpdate } = reconcileCombatFromSnapshot(s);

        setCampaignSessionNumber(Number(s.campaignSessionNumber || 1));
        setSessionAmbience(normalizeAmbienceState(s.ambience));

        if (s.gmUid && uid) {
          const shouldBeGm = s.gmUid === uid;
          setRole((current) => {
            const next = shouldBeGm ? 'gm' : 'player';
            return current === next ? current : next;
          });
        }

        if (skipCombatUpdate) return;
      })
    );

    unsubs.push(
      onSnapshot(collection(db, 'sessions', sid, 'handouts'), (snap) => {
        const incoming = snap.docs.map((d) => {
          const h = d.data() || {};
          const createdAtMs = h.createdAt?.toMillis ? h.createdAt.toMillis() : 0;
          const updatedAtCandidate = h.updatedAt || h.createdAt || null;
          const updatedAtMs = updatedAtCandidate?.toMillis ? updatedAtCandidate.toMillis() : createdAtMs;
          return {
            id: d.id,
            title: h.title || 'Naamloze handout',
            type: String(h.type || 'clue').toLowerCase(),
            content: h.publicContent || h.content || '',
            secret: h.secretContent || h.secret || '',
            isRevealed: h.revealed === true || h.isRevealed === true,
            claimable: h.claimable === true,
            claimedBy: h.claimedByUid || h.claimedBy || null,
            assignedToUid: String(h.assignedToUid || '').trim() || null,
            assignedToNick: String(h.assignedToNick || '').trim() || null,
            secretRevealed: h.secretRevealed === true
              || (h.secretRevealed !== false
                && Array.isArray(h.secretVisibleToUids)
                && h.secretVisibleToUids.length > 0),
            imageUrl: h.imageUrl || null,
            imagePosition: normalizeAvatarPosition(h.imagePosition),
            npcSubtitle: h.npcSubtitle || 'Vijand',
            npcHp: Number(h.npcHp ?? 15),
            npcAc: Number(h.npcAc ?? 12),
            npcInitMod: Number(h.npcInitMod ?? 2),
            createdAtMs,
            updatedAtMs,
          };
        });

        setHandouts(incoming);
      })
    );

    unsubs.push(
      onSnapshot(collection(db, 'sessions', sid, 'players'), (snap) => {
        const incoming = snap.docs.map((d) => {
          const p = d.data() || {};
          const fallbackName = p.nickname || p.displayName || (p.isNpc ? 'NPC' : 'Avonturier');
          const normalizedConditions = Array.isArray(p.conditions)
            ? p.conditions
              .filter((entry) => typeof entry?.id === 'string' && entry.id.trim())
              .map((entry) => ({ id: entry.id.trim(), active: entry.active !== false }))
            : [];

          return {
            id: d.id,
            name: fallbackName,
            subtitle: p.subtitle || (p.isNpc ? 'Vijand' : 'Speler'),
            hp: Number(p.hp ?? p.hitPoints ?? 0),
            maxHp: Number(p.maxHp ?? p.maxHitPoints ?? p.hp ?? p.hitPoints ?? 0),
            ac: Number(p.ac ?? p.armorClass ?? 10),
            init: p.initiative ?? null,
            initMod: Number(p.dexterityMod ?? p.initMod ?? 0),
            isNpc: p.isNpc === true,
            isRevealed: p.isRevealed === false || p.revealed === false ? false : true,
            avatar: p.avatarUrl || p.avatar || null,
            avatarPosition: normalizeAvatarPosition(p.avatarPosition),
            bio: p.bio || '',
            customStats: Array.isArray(p.customStats) ? p.customStats : [],
            conditions: normalizedConditions,
            hasAlertFeat: p.hasAlertFeat === true,
            proficiencyBonus: Number(p.proficiencyBonus ?? 2),
            combatParticipation: normalizeCombatParticipation(p.combatParticipation),
            combatJoinRequestStatus: normalizeCombatJoinRequestStatus(p.combatJoinRequestStatus),
          };
        });

        setParty(incoming);
      })
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'sessions', sid, 'chatMessages'), orderBy('createdAt', 'asc'), limit(250)),
        (snap) => {
          const incoming = snap.docs.map((d) => {
            const c = d.data() || {};
            return {
              id: d.id,
              uid: c.uid || '',
              author: c.displayName || c.author || 'Onbekend',
              text: c.message || c.text || '',
              time: toIsoTime(c.createdAt),
              date: toIsoDate(c.createdAt),
              ms: toIsoMs(c.createdAt),
              color: c.color || 'indigo',
              replyTo: c.replyTo || null,
              clientMessageId: c.clientMessageId || null,
            };
          });

          setChat(incoming);
        }
      )
    );

    unsubs.push(
      onSnapshot(collection(db, 'sessions', sid, 'inventory'), (snap) => {
        const incoming = snap.docs.map((d) => {
          const i = d.data() || {};
          const desc = typeof i.desc === 'string' ? i.desc : '';
          const legacyDescription = typeof i.description === 'string' ? i.description : '';

          return {
            id: d.id,
            ownerId: i.ownerId || i.ownerUid || 'p1',
            name: i.name || 'Onbekend item',
            desc: desc || legacyDescription || '',
            legacyDescription,
            needsDescriptionBackfill: !hasNonEmptyText(desc) && hasNonEmptyText(legacyDescription),
            amount: Number(i.amount ?? 1),
            imageUrl: i.imageUrl || i.avatarUrl || null,
            category: normalizeItemCategory(i.category),
            section: normalizeInventorySectionName(i.section),
          };
        });

        setInventory(incoming);
        setInventoryLoaded(true);
      })
    );

    unsubs.push(
      onSnapshot(collection(db, 'sessions', sid, 'wallets'), (snap) => {
        const nextWallets = {};
        snap.docs.forEach((d) => {
          const w = d.data() || {};
          nextWallets[d.id] = {
            platinum: Number(w.platinum ?? 0),
            gold: Number(w.gold ?? 0),
            silver: Number(w.silver ?? 0),
            bronze: Number(w.bronze ?? w.copper ?? 0),
          };
        });
        setWallets(nextWallets);
      })
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'sessions', sid, 'noteFiles'), where('ownerUid', '==', uid)),
        (snap) => {
          const incoming = snap.docs
            .map((d) => {
              const n = d.data() || {};
              const status = String(n.status || 'active').toLowerCase();
              if (status !== 'active') return null;

              return {
                id: d.id,
                authorId: n.ownerRole === 'dm' ? 'gm' : (n.ownerUid || uid),
                title: typeof n.title === 'string' ? n.title : 'Nieuwe Notitie',
                content: n.content || '',
                lastEditedMs: (n.updatedAt || n.createdAt)?.toMillis ? (n.updatedAt || n.createdAt).toMillis() : Date.now(),
                lastEdited: formatLastEditedLabel(n.updatedAt || n.createdAt),
              };
            })
            .filter(Boolean)
            .sort((a, b) => Number(b.lastEditedMs || 0) - Number(a.lastEditedMs || 0));

          setNotes(incoming);
        }
      )
    );

    if (role === 'gm') {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'sessions', sid, 'characterTemplates'), orderBy('updatedAt', 'desc')),
          (snap) => {
            const incoming = snap.docs.map((entry) => normalizePreparationDoc(entry));
            setPreparations(incoming);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sessions', sid, 'preparationBackups'), orderBy('createdAt', 'desc'), limit(8)),
          (snap) => {
            const incoming = snap.docs.map((entry) => normalizePreparationBackupDoc(entry));
            setPreparationBackups(incoming);
          }
        )
      );
    }

    if (role === 'player' && uid) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'sessions', sid, 'characterTemplates'), where('assignedToUid', '==', uid)),
          (snap) => {
            const incoming = snap.docs.map((entry) => normalizePreparationDoc(entry));
            const nextPending = incoming
              .filter((entry) => entry.assignmentStatus === 'pending')
              .sort((left, right) => Number(right.offeredAtMs || 0) - Number(left.offeredAtMs || 0))[0] || null;
            setPendingPreparationOffer(nextPending);
          }
        )
      );
    }

    return () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          // no-op
        }
      });
    };
  }, [role, sessionDocId, uid, view]);

  useEffect(() => {
    if (!sessionDocId || view !== 'dashboard' || !inventoryLoaded) return;
    if (isClearingInventorySectionsRef.current) return;

    const sectionedItems = inventory.filter((item) => normalizeInventorySectionName(item.section));

    if (sectionedItems.length === 0) {
      lastInventorySectionCleanupSignatureRef.current = '';
      return;
    }

    const signature = sectionedItems
      .map((item) => `${item.id}:${normalizeInventorySectionName(item.section).toLowerCase()}`)
      .sort()
      .join('|');

    if (lastInventorySectionCleanupSignatureRef.current === signature) return;

    lastInventorySectionCleanupSignatureRef.current = signature;
    isClearingInventorySectionsRef.current = true;

    const sectionedIds = new Set(sectionedItems.map((item) => item.id));
    setInventory((prev) => prev.map((item) => (sectionedIds.has(item.id) ? { ...item, section: '' } : item)));

    (async () => {
      try {
        const batch = writeBatch(db);
        sectionedItems.forEach((item) => {
          batch.update(doc(db, 'sessions', sessionDocId, 'inventory', item.id), {
            section: '',
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      } catch (err) {
        console.error('Inventaris-secties opschonen mislukt:', err);
      } finally {
        isClearingInventorySectionsRef.current = false;
      }
    })();
  }, [inventory, inventoryLoaded, sessionDocId, view]);

  useEffect(() => {
    if (!sessionDocId || view !== 'dashboard' || !inventoryLoaded) return;
    if (isBackfillingInventoryDescriptionsRef.current) return;

    const itemsNeedingDescriptionBackfill = inventory.filter((item) => item.needsDescriptionBackfill);

    if (itemsNeedingDescriptionBackfill.length === 0) {
      lastInventoryDescriptionBackfillSignatureRef.current = '';
      return;
    }

    const signature = itemsNeedingDescriptionBackfill
      .map((item) => `${item.id}:${String(item.legacyDescription || '').trim()}`)
      .sort()
      .join('|');

    if (lastInventoryDescriptionBackfillSignatureRef.current === signature) return;

    lastInventoryDescriptionBackfillSignatureRef.current = signature;
    isBackfillingInventoryDescriptionsRef.current = true;

    const itemIds = new Set(itemsNeedingDescriptionBackfill.map((item) => item.id));
    setInventory((prev) => prev.map((item) => {
      if (!itemIds.has(item.id)) return item;
      return {
        ...item,
        desc: item.legacyDescription || item.desc || '',
        needsDescriptionBackfill: false,
      };
    }));

    (async () => {
      try {
        const batch = writeBatch(db);
        itemsNeedingDescriptionBackfill.forEach((item) => {
          batch.set(doc(db, 'sessions', sessionDocId, 'inventory', item.id), {
            desc: item.legacyDescription || '',
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        await batch.commit();
      } catch (err) {
        console.error('Legacy item-beschrijvingen backfillen mislukt:', err);
      } finally {
        isBackfillingInventoryDescriptionsRef.current = false;
      }
    })();
  }, [inventory, inventoryLoaded, sessionDocId, view]);

  const handleSignInGoogle = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(toFriendlyAuthError(err, 'Google inloggen is mislukt.'));
    }
  };

  const handleSignInGuest = async () => {
    setAuthError('');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setAuthError(toFriendlyAuthError(err, 'Gastmodus starten is mislukt.'));
    }
  };

  const handleSignInEmail = async ({ email, password }) => {
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(toFriendlyAuthError(err, 'Inloggen met e-mail is mislukt.'));
    }
  };

  const handleSignUpEmail = async ({ name, email, password }) => {
    setAuthError('');
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name?.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
    } catch (err) {
      setAuthError(toFriendlyAuthError(err, 'Account aanmaken is mislukt.'));
    }
  };

  useEffect(() => {
    if (!localDevBootstrap || view !== 'landing' || authLoading || sessionBusy) return;

    const bootstrapKey = [
      localDevBootstrap.role,
      localDevBootstrap.joinTag,
      localDevBootstrap.pin,
      localDevBootstrap.sessionName,
      localDevBootstrap.playerName,
    ].join('|');

    if (localDevBootstrapRef.current.key !== bootstrapKey) {
      localDevBootstrapRef.current = {
        key: bootstrapKey,
        lastAuthAttemptAt: 0,
        lastJoinAttemptAt: 0,
      };
    }

    const now = Date.now();

    if (!uid) {
      if (now - localDevBootstrapRef.current.lastAuthAttemptAt < 1500) return;
      localDevBootstrapRef.current.lastAuthAttemptAt = now;
      void handleSignInGuest();
      return;
    }

    if (now - localDevBootstrapRef.current.lastJoinAttemptAt < 1500) return;
    localDevBootstrapRef.current.lastJoinAttemptAt = now;

    if (localDevBootstrap.role === 'gm') {
      void handleJoin('gm', localDevBootstrap.sessionName, {
        skipPinPrompt: true,
        defaultPin: localDevBootstrap.pin,
        fixedJoinTag: localDevBootstrap.joinTag,
        forceSessionName: localDevBootstrap.sessionName,
        allowLocalDevTakeover: true,
      });
      return;
    }

    if (playerName !== localDevBootstrap.playerName) {
      setPlayerName(localDevBootstrap.playerName);
    }

    void handleJoin('player', toLegacyHashJoinTag(localDevBootstrap.joinTag), {
      pin: localDevBootstrap.pin,
      playerName: localDevBootstrap.playerName,
    });
  }, [authLoading, localDevBootstrap, playerName, sessionBusy, uid, view]);

  const handleClaimHandout = async (handoutId, playerId) => {
    let didPersist = false;

    try {
      if (sessionDocId) {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId), {
          claimedByUid: playerId,
          claimedByNick: playerName || displayName || 'Speler',
          mapVisibleToUid: null,
          claimedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      didPersist = true;
    } catch (err) {
      console.error('Claim handout fout:', err);
    }

    if (didPersist) {
      setHandouts(handouts.map(h => h.id === handoutId ? { ...h, claimedBy: playerId } : h));
    }
  };

  const handleUnclaimHandout = async (handoutId) => {
    let didPersist = false;

    try {
      if (sessionDocId) {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId), {
          claimedByUid: null,
          claimedByNick: null,
          mapVisibleToUid: null,
          claimedAt: null,
          updatedAt: serverTimestamp(),
        });
      }
      didPersist = true;
    } catch (err) {
      console.error('Unclaim handout fout:', err);
    }

    if (didPersist) {
      setHandouts(handouts.map(h => h.id === handoutId ? { ...h, claimedBy: null } : h));
    }
  };

  const handleSendChatRemote = async ({ text, color, replyTo, clientMessageId } = {}) => {
    if (!sessionDocId || !uid) {
      throw new Error('Geen actieve sessie voor chat.');
    }
    await addDoc(collection(db, 'sessions', sessionDocId, 'chatMessages'), {
      uid,
      displayName: role === 'gm' ? 'GM' : (playerName || displayName || 'Avonturier'),
      avatarUrl: '',
      message: String(text || '').trim(),
      color: color || 'indigo',
      replyTo: replyTo || null,
      clientMessageId: clientMessageId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expireAt: Timestamp.fromMillis(Date.now() + (1000 * 60 * 60 * 24 * 365 * 2)),
    });
  };

  const handleEditChatMessage = async (msgId, newText) => {
    if (!sessionDocId || !msgId) return;
    try {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'chatMessages', msgId), {
        message: String(newText || '').trim(),
      });
    } catch (err) {
      console.error('Bewerk chat mislukt:', err);
    }
  };

  const handleDeleteChatMessage = async (msgId) => {
    if (!sessionDocId || !msgId || msgId.startsWith('tmp-')) return;
    try {
      await deleteDoc(doc(db, 'sessions', sessionDocId, 'chatMessages', msgId));
    } catch (err) {
      console.error('Verwijder chat mislukt:', err);
    }
  };

  const handleUpdateChatColor = async (nextColor) => {
    const normalizedColor = String(nextColor || '').trim();
    if (!sessionDocId || !uid || !CHAT_ACCENT_COLORS[normalizedColor]) return;

    safeLocalStorageSet('tv_chatcolor', normalizedColor);
    setPreferredChatColor(normalizedColor);

    try {
      const legacyDisplayName = role === 'gm' ? 'GM' : (playerName || displayName || 'Avonturier');
      const [uidSnap, legacySnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions', sessionDocId, 'chatMessages'), where('uid', '==', uid))),
        getDocs(query(collection(db, 'sessions', sessionDocId, 'chatMessages'), where('displayName', '==', legacyDisplayName))),
        writeMembership({ uid, sessionId: sessionDocId, preferredChatColor: normalizedColor }),
      ]);

      const allDocs = [...uidSnap.docs, ...legacySnap.docs];
      if (!allDocs.length) return;

      const seen = new Set();
      const uniqueDocs = allDocs.filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });

      for (let i = 0; i < uniqueDocs.length; i += 450) {
        const batch = writeBatch(db);
        uniqueDocs.slice(i, i + 450).forEach((d) => {
          batch.update(d.ref, { color: normalizedColor });
        });
        await batch.commit();
      }

      setChat((prev) => prev.map((msg) => {
        const mineByUid = msg.uid && msg.uid === uid;
        const mineLegacy = !msg.uid && msg.author === legacyDisplayName;
        return mineByUid || mineLegacy ? { ...msg, color: normalizedColor } : msg;
      }));
    } catch (err) {
      console.error('Chatkleur historisch bijwerken mislukt:', err);
    }
  };

  const handleUpdateCampaignSessionNumber = async (nextNumber) => {
    const safe = Math.max(1, Number(nextNumber) || 1);
    setCampaignSessionNumber(safe);

    if (!sessionDocId || role !== 'gm') return;
    try {
      await updateDoc(doc(db, 'sessions', sessionDocId), {
        campaignSessionNumber: safe,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Campagne sessienummer bijwerken mislukt:', err);
    }
  };

  const persistSessionAmbience = async (nextAmbience, { refreshStartedAt = false } = {}) => {
    if (!sessionDocId || role !== 'gm') return;

    const normalized = normalizeAmbienceState({
      ...sessionAmbienceRef.current,
      ...nextAmbience,
      updatedBy: uid || null,
    });
    const optimisticAmbience = {
      ...normalized,
      startedAtMs: refreshStartedAt ? Date.now() : normalized.startedAtMs,
      updatedBy: uid || null,
    };

    sessionAmbienceRef.current = optimisticAmbience;
    setSessionAmbience(optimisticAmbience);
    setAmbienceError('');

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId), {
        ambience: buildAmbienceSessionPatch(optimisticAmbience, { includeStartedAt: true }),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Ambience bijwerken mislukt:', err);
      setAmbienceError('Sessie-sfeer opslaan is mislukt. Controleer Firestore en probeer opnieuw.');
    }
  };

  const handleToggleAmbiencePlayback = () => {
    if (role !== 'gm') return;

    const shouldStart = !sessionAmbienceRef.current.isPlaying;
    void persistSessionAmbience(
      {
        isPlaying: shouldStart,
      },
      { refreshStartedAt: shouldStart }
    );
  };

  const handleSelectAmbienceTrack = (trackId) => {
    if (role !== 'gm') return;

    const resolvedTrack = getAmbienceTrackById(trackId);
    const refreshStartedAt = sessionAmbienceRef.current.isPlaying && sessionAmbienceRef.current.trackId !== resolvedTrack.id;

    void persistSessionAmbience(
      {
        trackId: resolvedTrack.id,
      },
      { refreshStartedAt }
    );
  };

  const handleSetSessionAmbienceVolume = (nextVolume) => {
    if (role !== 'gm') return;

    void persistSessionAmbience({
      masterVolume: clampAmbienceVolume(nextVolume, sessionAmbienceRef.current.masterVolume),
    });
  };

  const handleUnlockAmbienceAudio = async () => {
    const audio = ambienceAudioRef.current;
    if (!audio) return;

    setAmbienceError('');

    if (!sessionAmbienceRef.current.isPlaying) {
      setNeedsAudioUnlock(false);
      return;
    }

    try {
      audio.volume = effectiveAmbienceVolume;
      await audio.play();
      setNeedsAudioUnlock(false);
    } catch (err) {
      console.warn('Audio unlock mislukt:', err);
      setNeedsAudioUnlock(true);
      setAmbienceError('De browser houdt audio nog tegen. Probeer opnieuw na een expliciete klik.');
    }
  };

  const buildPreparationPayload = (preparation = {}) => ({
    name: String(preparation.name || '').trim() || 'Naamloos personage',
    subtitle: String(preparation.subtitle || '').trim(),
    bio: String(preparation.bio || '').trim(),
    imageUrl: typeof preparation.imageUrl === 'string' && !preparation.imageUrl.startsWith('blob:') ? preparation.imageUrl : null,
    hp: Number(preparation.hp ?? 0),
    maxHp: Number(preparation.maxHp ?? preparation.hp ?? 0),
    ac: Number(preparation.ac ?? 10),
    initMod: Number(preparation.initMod ?? 0),
    customStats: sanitizeCustomStats(preparation.customStats),
    sourceUid: String(preparation.sourceUid || '').trim() || null,
    sourceType: String(preparation.sourceType || '').trim() || 'manual',
    updatedAt: serverTimestamp(),
  });

  const handleSavePreparationRemote = async (draft, pendingFile) => {
    if (!sessionDocId || role !== 'gm' || !uid) {
      throw new Error('Geen actieve GM-sessie voor voorbereidingen.');
    }

    let imageUrl = typeof draft?.imageUrl === 'string' && !draft.imageUrl.startsWith('blob:') ? draft.imageUrl : null;

    if (pendingFile) {
      try {
        const ext = pendingFile.name.split('.').pop();
        const fileName = `${draft?.id || Date.now()}.${ext}`;
        imageUrl = await uploadImageToStorage(pendingFile, `users/${uid}/preparations/${fileName}`);
      } catch (err) {
        console.error('Voorbereidingsavatar uploaden mislukt:', err);
        imageUrl = draft?.id ? (preparations.find((item) => item.id === draft.id)?.imageUrl || null) : null;
      }
    }

    const payload = buildPreparationPayload({ ...draft, imageUrl });
    const targetPlayerUid = String(draft?.targetPlayerUid || draft?.preparedForUid || '').trim() || null;
    const offerOnSave = Boolean(draft?.offerOnSave && targetPlayerUid);
    const isUnassigned = !draft?.id || (draft?.assignmentStatus || 'unassigned') === 'unassigned';
    let preparationId = draft?.id || null;

    if (draft?.id) {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', draft.id), {
        ...payload,
        ...(isUnassigned ? { preparedForUid: offerOnSave ? null : targetPlayerUid } : {}),
      });
    } else {
      const created = await addDoc(collection(db, 'sessions', sessionDocId, 'characterTemplates'), {
        ...payload,
        createdAt: serverTimestamp(),
        createdByUid: uid,
        assignedToUid: null,
        preparedForUid: offerOnSave ? null : targetPlayerUid,
        assignmentStatus: 'unassigned',
        offeredAt: null,
        respondedAt: null,
      });
      preparationId = created.id;
    }

    if (offerOnSave && targetPlayerUid && preparationId) {
      await handleAssignPreparationRemote(preparationId, targetPlayerUid);
    }

    return preparationId;
  };

  const handleDeletePreparationRemote = async (preparationOrId) => {
    const preparationId = typeof preparationOrId === 'string' ? preparationOrId : preparationOrId?.id;
    if (!sessionDocId || !preparationId || role !== 'gm') return;

    await deleteDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', preparationId));
  };

  const handleAssignPreparationRemote = async (preparationId, targetUid) => {
    if (!sessionDocId || role !== 'gm' || !preparationId || !targetUid) return;

    await updateDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', preparationId), {
      assignedToUid: targetUid,
      assignmentStatus: 'pending',
      offeredAt: serverTimestamp(),
      respondedAt: null,
      updatedAt: serverTimestamp(),
    });
  };

  const handleRestorePreparationBackup = async (backup) => {
    if (!sessionDocId || role !== 'gm' || !backup?.playerUid) return;

    await updateDoc(doc(db, 'sessions', sessionDocId, 'players', backup.playerUid), {
      nickname: backup.snapshot.name || 'Avonturier',
      subtitle: backup.snapshot.subtitle || '',
      hp: backup.snapshot.hp ?? 0,
      maxHp: backup.snapshot.maxHp ?? backup.snapshot.hp ?? 0,
      ac: backup.snapshot.ac ?? 10,
      initMod: backup.snapshot.initMod ?? 0,
      bio: backup.snapshot.bio || '',
      customStats: backup.snapshot.customStats || [],
      avatarUrl: backup.snapshot.avatarUrl || null,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'sessions', sessionDocId, 'preparationBackups', backup.id), {
      restoredAt: serverTimestamp(),
    });
  };

  const handleAcceptPreparationOffer = async () => {
    if (!sessionDocId || !uid || !pendingPreparationOffer) return;

    const currentPlayer = party.find((member) => member.id === uid && member.isNpc !== true) || {};
    const previousSnapshot = buildPreparationBackupSnapshot(currentPlayer, {
      name: playerName || displayName || 'Avonturier',
    });

    await addDoc(collection(db, 'sessions', sessionDocId, 'preparationBackups'), {
      playerUid: uid,
      playerName: previousSnapshot.name || 'Avonturier',
      templateId: pendingPreparationOffer.id,
      templateName: pendingPreparationOffer.name || 'Naamloos personage',
      snapshot: previousSnapshot,
      createdAt: serverTimestamp(),
      restoredAt: null,
    });

    await updateDoc(doc(db, 'sessions', sessionDocId, 'players', uid), {
      nickname: pendingPreparationOffer.name || previousSnapshot.name || 'Avonturier',
      subtitle: pendingPreparationOffer.subtitle || '',
      hp: pendingPreparationOffer.hp ?? 0,
      maxHp: pendingPreparationOffer.maxHp ?? pendingPreparationOffer.hp ?? 0,
      ac: pendingPreparationOffer.ac ?? 10,
      initMod: pendingPreparationOffer.initMod ?? 0,
      bio: pendingPreparationOffer.bio || '',
      customStats: pendingPreparationOffer.customStats || [],
      avatarUrl: pendingPreparationOffer.imageUrl || null,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', pendingPreparationOffer.id), {
      assignmentStatus: 'accepted',
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const nextName = pendingPreparationOffer.name || previousSnapshot.name || 'Avonturier';
    setPlayerName(nextName);
    setDisplayName(nextName);
    if (auth.currentUser && nextName) {
      try {
        await updateProfile(auth.currentUser, { displayName: nextName });
      } catch (err) {
        console.warn('Auth displayName bijwerken voor voorbereiding mislukt:', err);
      }
    }
    setPendingPreparationOffer(null);
  };

  const handleRejectPreparationOffer = async () => {
    if (!sessionDocId || !uid || !pendingPreparationOffer) return;

    await updateDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', pendingPreparationOffer.id), {
      assignmentStatus: 'rejected',
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setPendingPreparationOffer(null);
  };

  const buildHandoutPayload = (handout = {}) => {
    const normalizedType = String(handout.type || 'clue').toLowerCase();
    const assignedToUid = String(handout.assignedToUid || '').trim() || null;
    const assignedPlayer = party.find((member) => member.id === assignedToUid && member.isNpc !== true);
    const hasSecretContent = handoutHasSecret(handout);

    return {
      title: handout.title || 'Naamloze handout',
      type: normalizedType,
      publicContent: handout.content || '',
      secretContent: resolveHandoutSecret(handout),
      revealed: handout.isRevealed === true,
      claimable: normalizedType === 'loot' ? handout.claimable === true : false,
      claimedByUid: handout.claimedBy || null,
      assignedToUid,
      assignedToNick: assignedPlayer?.name || null,
      secretRevealed: hasSecretContent ? handout.secretRevealed === true : false,
      secretVisibleToUids: [],
      imageUrl: handout.imageUrl || null,
      imagePosition: normalizeAvatarPosition(handout.imagePosition || DEFAULT_AVATAR_POSITION),
      npcSubtitle: String(handout.npcSubtitle || 'Vijand').trim() || 'Vijand',
      npcHp: Math.max(0, Number(handout.npcHp) || 0),
      npcAc: Math.max(0, Number(handout.npcAc) || 10),
      npcInitMod: Number(handout.npcInitMod) || 0,
      updatedAt: serverTimestamp(),
    };
  };

  const handleCreateHandoutRemote = async (handout) => {
    if (role !== 'gm') {
      throw new Error('Alleen de GM kan handouts aanmaken.');
    }
    if (!sessionDocId || !uid) {
      throw new Error('Geen actieve sessie voor handouts.');
    }

    const created = await addDoc(collection(db, 'sessions', sessionDocId, 'handouts'), {
      ...buildHandoutPayload(handout),
      createdByUid: uid,
      createdAt: serverTimestamp(),
    });

    return created.id;
  };

  const handleUpdateHandoutRemote = async (handout) => {
    if (role !== 'gm') {
      throw new Error('Alleen de GM kan handouts bewerken.');
    }
    if (!sessionDocId || !handout?.id) {
      throw new Error('Kan handout niet bijwerken zonder actieve sessie en id.');
    }

    await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handout.id), {
      ...buildHandoutPayload(handout),
    });
  };

  const handleDeleteHandoutRemote = async (handoutId) => {
    if (role !== 'gm') {
      throw new Error('Alleen de GM kan handouts verwijderen.');
    }
    if (!sessionDocId || !handoutId) {
      throw new Error('Kan handout niet verwijderen zonder actieve sessie en id.');
    }

    await deleteDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId));
  };

  const handleToggleVisibility = async (id) => {
    if (role !== 'gm') return;

    const normalizedId = String(id ?? '').trim();
    if (!normalizedId) return;

    let next;
    setHandouts((prev) => {
      const handout = prev.find((entry) => String(entry.id) === normalizedId);
      if (!handout) return prev;
      next = !handout.isRevealed;
      return prev.map((entry) => (String(entry.id) === normalizedId ? { ...entry, isRevealed: next } : entry));
    });

    if (next === undefined || !sessionDocId) return;

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', normalizedId), {
        revealed: next,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Visibility toggle fout:', err);
      setHandouts((prev) => prev.map((entry) => (String(entry.id) === normalizedId ? { ...entry, isRevealed: !next } : entry)));
    }
  };

  const handleToggleSecretVisibility = async (id) => {
    if (role !== 'gm') {
      return { ok: false, reason: 'no-gm' };
    }

    const normalizedId = String(id ?? '').trim();
    if (!normalizedId) {
      return { ok: false, reason: 'missing' };
    }

    const handout = handoutsRef.current.find((entry) => String(entry.id) === normalizedId);
    if (!handout) {
      return { ok: false, reason: 'missing' };
    }
    if (!handoutHasSecret(handout)) {
      return { ok: false, reason: 'no-secret' };
    }

    const next = handout.secretRevealed !== true;

    setHandouts((prev) => prev.map((entry) => (
      String(entry.id) === normalizedId ? { ...entry, secretRevealed: next } : entry
    )));

    setSelectedHandout((current) => {
      if (!current || current === 'new' || String(current.id) !== normalizedId) return current;
      return { ...current, secretRevealed: next };
    });

    if (!sessionDocId) {
      return { ok: true, revealed: next, persisted: false, reason: 'no-session' };
    }

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', normalizedId), {
        secretRevealed: next,
        secretVisibleToUids: [],
        updatedAt: serverTimestamp(),
      });
      return { ok: true, revealed: next, persisted: true };
    } catch (err) {
      console.error('Secret toggle fout:', err);
      setHandouts((prev) => prev.map((entry) => (
        String(entry.id) === normalizedId ? { ...entry, secretRevealed: !next } : entry
      )));
      setSelectedHandout((current) => {
        if (!current || current === 'new' || String(current.id) !== normalizedId) return current;
        return { ...current, secretRevealed: !next };
      });
      return { ok: false, reason: 'firestore' };
    }
  };

  const handleUpdatePlayerStat = async (memberId, key, val) => {
    setParty(party.map(p => p.id === memberId ? { ...p, [key]: val } : p));
    if (sessionDocId) {
      const fsKey = key === 'init' ? 'initiative' : key;
      try {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'players', memberId), {
          [fsKey]: val,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Stat update fout:', err);
      }
    }
  };

  const handleToggleParty = () => {
    setIsPartyOpen((previous) => {
      const next = !previous;
      safeLocalStorageSet(SLAGORDE_OPEN_KEY, String(next));
      return next;
    });
  };

  const handleRemoveFromCombat = async (character) => {
    if (!character || role !== 'gm' || combatStatus === COMBAT_STATUS.ACTIVE) return;
    if (character.isNpc) {
      await handleDeleteNpc(character.id);
      return;
    }
    await handleKickPlayerFromCombat(character.id);
  };

  const handleAddNpcFromHandout = async (handout) => {
    if (!handout || role !== 'gm' || combatStatus === COMBAT_STATUS.ACTIVE) return;

    await handleAddNpcSave({
      name: handout.title || 'Naamloze NPC',
      subtitle: handout.npcSubtitle || 'Vijand',
      hp: Number(handout.npcHp ?? 15) || 15,
      maxHp: Number(handout.npcHp ?? 15) || 15,
      ac: Number(handout.npcAc ?? 12) || 12,
      initMod: Number(handout.npcInitMod ?? 2) || 0,
      avatar: handout.imageUrl || null,
      bio: handout.content || '',
    });

    setSelectedHandout(null);
    setIsPartyOpen(true);
  };

  const handleDamageModalSave = async (memberId, newHp) => {
    if (role !== 'gm') return;
    setParty(party.map(p => p.id === memberId ? { ...p, hp: newHp } : p));
    setDamageTarget(null);
    if (sessionDocId) {
      try {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'players', memberId), {
          hp: newHp,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('HP update fout:', err);
      }
    }
  };

  const handleProfileSave = async (updatedChar, pendingAvatarFile) => {
    let finalChar = { ...updatedChar };

    if (pendingAvatarFile && uid) {
      try {
        const ext = pendingAvatarFile.name.split('.').pop();
        const storagePath = `users/${uid}/avatars/${updatedChar.id}.${ext}`;
        const downloadUrl = await uploadImageToStorage(pendingAvatarFile, storagePath);
        finalChar = { ...finalChar, avatar: downloadUrl };
      } catch (err) {
        console.error('Avatar uploaden naar Storage mislukt:', err);
      }
    }

    finalChar = {
      ...finalChar,
      avatar: normalizeAvatarUrl(finalChar.avatar),
      avatarPosition: normalizeAvatarPosition(finalChar.avatarPosition || DEFAULT_AVATAR_POSITION),
    };

    setParty(party.map(p => p.id === finalChar.id ? finalChar : p));
    setProfileTarget(null);
    if (sessionDocId) {
      try {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'players', finalChar.id), {
          nickname: finalChar.name,
          subtitle: finalChar.subtitle || '',
          hp: finalChar.hp ?? 0,
          maxHp: finalChar.maxHp ?? 0,
          ac: finalChar.ac ?? 10,
          initMod: finalChar.initMod ?? 0,
          hasAlertFeat: finalChar.hasAlertFeat === true,
          proficiencyBonus: Number(finalChar.proficiencyBonus ?? 2),
          bio: finalChar.bio || '',
          customStats: finalChar.customStats || [],
          avatarUrl: finalChar.avatar || null,
          avatarPosition: normalizeAvatarPosition(finalChar.avatarPosition || DEFAULT_AVATAR_POSITION),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Profiel opslaan fout:', err);
      }
    }
  };

  const handleTransferGm = async (targetMember) => {
    if (role !== 'gm' || !sessionDocId || !uid || !targetMember?.id || targetMember.id === uid || targetMember.isNpc) return;

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId), {
        gmUid: targetMember.id,
        updatedAt: serverTimestamp(),
      });

      await writeMembership({
        uid: targetMember.id,
        sessionId: sessionDocId,
        role: 'dm',
        sessionName: '',
        joinTag: sessionId,
      });

      await writeMembership({
        uid,
        sessionId: sessionDocId,
        role: 'player',
        sessionName: '',
        joinTag: sessionId,
      });

      setRole('player');
      setSessionInfo(`${targetMember.name || 'Speler'} is nu GM van deze sessie.`);
      setProfileTarget(null);
    } catch (err) {
      console.error('GM overdracht mislukt:', err);
      setSessionError('GM overdracht is mislukt. Probeer opnieuw.');
    }
  };

  const handleAddNpcSave = async (npcData, pendingAvatarFile) => {
    if (role !== 'gm') return;
    const tempId = 'n' + Date.now();
    let avatarUrl = npcData.avatar || null;

    if (pendingAvatarFile && uid) {
      try {
        const ext = pendingAvatarFile.name.split('.').pop();
        const storagePath = `users/${uid}/npcs/${Date.now()}.${ext}`;
        avatarUrl = await uploadImageToStorage(pendingAvatarFile, storagePath);
      } catch (err) {
        console.error('NPC portret uploaden mislukt:', err);
      }
    }

    setParty([
      ...party,
      {
        ...npcData,
        id: tempId,
        isNpc: true,
        init: null,
        bio: npcData.bio || '',
        avatar: avatarUrl,
        avatarPosition: normalizeAvatarPosition(npcData.avatarPosition || DEFAULT_AVATAR_POSITION),
      },
    ]);
    setIsNpcModalOpen(false);
    if (sessionDocId) {
      try {
        await setDoc(doc(db, 'sessions', sessionDocId, 'players', tempId), {
          nickname: npcData.name,
          subtitle: npcData.subtitle || 'Vijand',
          hp: npcData.hp ?? 0,
          maxHp: npcData.maxHp ?? npcData.hp ?? 0,
          ac: npcData.ac ?? 10,
          initMod: npcData.initMod ?? 0,
          initiative: null,
          isNpc: true,
          combatParticipation: COMBAT_PARTICIPATION_STATUS.ACTIVE,
          combatJoinRequestStatus: COMBAT_JOIN_REQUEST_STATUS.NONE,
          isRevealed: true,
          avatarUrl,
          avatarPosition: normalizeAvatarPosition(npcData.avatarPosition || DEFAULT_AVATAR_POSITION),
          bio: npcData.bio || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('NPC toevoegen fout:', err);
      }
    }
  };

  const handleAddItemSave = async (newItem, pendingFile) => {
    const tempId = 'i' + Date.now();
    let finalItem = { ...newItem };

    if (pendingFile && uid) {
      try {
        const ext = pendingFile.name.split('.').pop();
        const storagePath = `users/${uid}/items/${Date.now()}.${ext}`;
        const downloadUrl = await uploadImageToStorage(pendingFile, storagePath);
        finalItem = { ...finalItem, imageUrl: downloadUrl };
      } catch (err) {
        console.error('Item afbeelding uploaden mislukt:', err);
      }
    }

    finalItem = { ...finalItem, section: '' };

    setInventory([...inventory, { ...finalItem, id: tempId }]);
    setIsAddItemModalOpen(false);
    if (sessionDocId) {
      try {
        await addDoc(collection(db, 'sessions', sessionDocId, 'inventory'), {
          ownerUid: newItem.ownerId || null,
          ownerId: newItem.ownerId || null,
          name: newItem.name || 'Item',
          desc: newItem.desc || '',
          amount: Number(newItem.amount) || 1,
          imageUrl: finalItem.imageUrl || null,
          category: normalizeItemCategory(newItem.category),
          section: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Item toevoegen fout:', err);
      }
    }
  };

  const handleUpdateItemAmount = async (itemId, nextAmount) => {
    const safeAmount = Math.max(1, Number(nextAmount) || 1);
    const previousInventory = inventory;
    setInventory((prev) => prev.map((item) => (item.id === itemId ? { ...item, amount: safeAmount } : item)));

    if (sessionDocId) {
      try {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'inventory', itemId), {
          amount: safeAmount,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Item aantal updaten fout:', err);
        setInventory(previousInventory);
      }
    }
  };

  const handleDeleteItem = async (itemId) => {
    const target = inventory.find((item) => item.id === itemId);
    if (!target) return;

    const previousInventory = inventory;
    setInventory((prev) => prev.filter((item) => item.id !== itemId));

    if (sessionDocId) {
      try {
        await deleteDoc(doc(db, 'sessions', sessionDocId, 'inventory', itemId));
      } catch (err) {
        console.error('Item verwijderen fout:', err);
        setInventory(previousInventory);
      }
    }
  };

  const handleSaveSettings = async ({ nextPlayerName, nextTheme, nextBrightness, nextSessionNumber, nextUiSounds }) => {
    if (typeof nextPlayerName === 'string') setPlayerName(nextPlayerName);
    if (typeof nextTheme === 'string') applyTheme(nextTheme);
    if (Number.isFinite(nextBrightness)) handleBrightnessChange(nextBrightness);
    if (typeof nextUiSounds === 'boolean') {
      setUiSounds(nextUiSounds);
      setUiSoundsEnabled(nextUiSounds);
    }
    if (role === 'gm' && Number.isFinite(Number(nextSessionNumber))) {
      await handleUpdateCampaignSessionNumber(nextSessionNumber);
    }
  };

  const buildPlayerArchivePayload = () => {
    const isGmExport = role === 'gm';
    const currentPlayer = party.find((member) => member.id === CURRENT_PLAYER_ID && member.isNpc !== true) || null;

    const visibleHandouts = handouts
      .filter((entry) => {
        if (isGmExport) return true;
        if (entry.isRevealed !== true) return false;
        if (entry.assignedToUid && entry.assignedToUid !== CURRENT_PLAYER_ID) return false;
        return true;
      })
      .map((entry) => ({
        title: entry.title,
        type: entry.type,
        content: String(entry.content || '').trim(),
        secret: String(entry.secret || '').trim(),
        assignedToUid: entry.assignedToUid || null,
        assignedToNick: entry.assignedToNick || null,
      }));

    const playerInventory = inventory
      .filter((item) => isGmExport || item.ownerId === CURRENT_PLAYER_ID)
      .map((item) => ({
        name: item.name,
        amount: item.amount,
        category: normalizeItemCategory(item.category),
        desc: item.desc,
        ownerId: item.ownerId,
        ownerName: party.find((member) => member.id === item.ownerId)?.name || null,
      }));

    const recentChat = chat.slice(-120).map((message) => ({
      author: message.author,
      text: message.text,
      time: message.time,
      date: message.date,
    }));

    const gmWalletRows = Object.entries(wallets || {}).map(([ownerId, wallet]) => {
      const ownerName = ownerId === 'party'
        ? 'Party'
        : (party.find((member) => member.id === ownerId)?.name || ownerId);

      return [
        ownerName,
        String(Number(wallet?.platinum ?? 0)),
        String(Number(wallet?.gold ?? 0)),
        String(Number(wallet?.silver ?? 0)),
        String(Number(wallet?.bronze ?? 0)),
      ];
    });

    return {
      mode: isGmExport ? 'gm' : 'player',
      layoutVersion: 'TV-PDF-R4',
      sessionId,
      generatedAt: new Date().toISOString(),
      subjectName: currentPlayer?.name || playerName || displayName || 'Avonturier',
      profile: {
        name: currentPlayer?.name || playerName || displayName || 'Avonturier',
        subtitle: currentPlayer?.subtitle || '',
        hp: Number(currentPlayer?.hp ?? 0),
        maxHp: Number(currentPlayer?.maxHp ?? currentPlayer?.hp ?? 0),
        ac: Number(currentPlayer?.ac ?? 10),
        initMod: Number(currentPlayer?.initMod ?? 0),
        customStats: Array.isArray(currentPlayer?.customStats) ? currentPlayer.customStats : [],
      },
      notes: notes.map((entry) => ({
        title: entry.title,
        content: entry.content,
        lastEdited: entry.lastEdited,
      })),
      inventory: playerInventory,
      wallet: wallets?.[CURRENT_PLAYER_ID] || { platinum: 0, gold: 0, silver: 0, bronze: 0 },
      handouts: visibleHandouts,
      chat: recentChat,
      gmData: isGmExport
        ? {
            combatStatus,
            turnRound,
            currentTurnId,
            party: party.map((member) => ({
              id: member.id,
              name: member.name,
              subtitle: member.subtitle,
              hp: member.hp,
              maxHp: member.maxHp,
              ac: member.ac,
              init: member.init,
              isNpc: member.isNpc,
            })),
            handouts: handouts.map((entry) => ({ id: entry.id, title: entry.title })),
            preparations: preparations.map((entry) => ({
              id: entry.id,
              name: entry.name,
              assignmentStatus: entry.assignmentStatus,
              assignedToUid: entry.assignedToUid || null,
              assignedToName: party.find((member) => member.id === entry.assignedToUid)?.name || null,
              updatedAtMs: entry.updatedAtMs || 0,
            })),
            preparationBackups: preparationBackups.map((entry) => ({
              id: entry.id,
              playerName: entry.playerName,
              templateName: entry.templateName,
              createdAtMs: entry.createdAtMs,
              restoredAtMs: entry.restoredAtMs || 0,
            })),
            walletRows: gmWalletRows,
          }
        : null,
    };
  };

  const handleExportPlayerArchivePdf = async () => {
    if (isArchiveExporting) return;

    setIsArchiveExporting(true);
    try {
      const payload = buildPlayerArchivePayload();
      const fileName = await downloadPlayerArchivePdf(payload);
      setSessionInfo(`Export voltooid: ${fileName}`);
      setSessionError('');
    } catch (err) {
      console.error('Player archive export fout:', err);
      setSessionError('Exporteren is mislukt. Probeer opnieuw.');
    } finally {
      setIsArchiveExporting(false);
    }
  };

  const handleAdjustWallet = async (ownerId, coinKey, delta) => {
    if (!['platinum', 'gold', 'silver', 'bronze'].includes(coinKey)) return;
    if (role !== 'gm' && ownerId !== CURRENT_PLAYER_ID) return;

    const previousWallets = wallets;
    const currentValue = Number(previousWallets?.[ownerId]?.[coinKey] || 0);
    const nextValue = Math.max(0, currentValue + delta);

    setWallets((prev) => ({
      ...prev,
      [ownerId]: {
        platinum: Number(prev?.[ownerId]?.platinum || 0),
        gold: Number(prev?.[ownerId]?.gold || 0),
        silver: Number(prev?.[ownerId]?.silver || 0),
        bronze: Number(prev?.[ownerId]?.bronze || 0),
        [coinKey]: nextValue,
      },
    }));

    if (sessionDocId) {
      try {
        await setDoc(
          doc(db, 'sessions', sessionDocId, 'wallets', ownerId),
          {
            [coinKey]: nextValue,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Wallet updaten fout:', err);
        setWallets(previousWallets);
      }
    }
  };

  const handleCreateNoteRemote = async ({ role: actorRole, title, content }) => {
    if (!sessionDocId || !uid) {
      throw new Error('Geen actieve sessie voor notities.');
    }

    const created = await addDoc(collection(db, 'sessions', sessionDocId, 'noteFiles'), {
      ownerUid: uid,
      ownerRole: actorRole === 'gm' ? 'dm' : 'player',
      title: title || 'Nieuwe Notitie',
      content: content || '',
      tags: [],
      status: 'active',
      noteDate: new Date().toISOString().slice(0, 10),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return created.id;
  };

  const handleUpdateNoteRemote = async (id, patch = {}) => {
    if (!sessionDocId || !id) return;

    const payload = {
      updatedAt: serverTimestamp(),
    };

    if (typeof patch.title === 'string') payload.title = patch.title;
    if (typeof patch.content === 'string') payload.content = patch.content;

    await updateDoc(doc(db, 'sessions', sessionDocId, 'noteFiles', id), payload);
  };

  const handleDeleteNoteRemote = async (id) => {
    if (!sessionDocId || !id) return;
    await deleteDoc(doc(db, 'sessions', sessionDocId, 'noteFiles', id));
  };

  const updateCharacterLevel = (characterId, newLevel) => {
    // Logic to update the character's level in the database
    const characterRef = doc(db, 'characters', characterId);
    updateDoc(characterRef, { level: newLevel });

    // Optionally, you can add additional logic here if needed
  };

  if (view === 'landing') {
    // QR-code invite flow — no PIN required after sign-in
    if (showQRJoin) {
      return (
        <QRJoinScreen
          inviteCode={qrInviteCode}
          uid={uid}
          authLoading={authLoading}
          sessionBusy={sessionBusy}
          authError={authError}
          sessionError={sessionError}
          theme={theme}
          onSignInGoogle={handleSignInGoogle}
          onUseFullLogin={() => setQrJoinDone(true)}
          onJoin={(playerNameInput, code) => {
            setQrJoinDone(true);
            handleJoin('player', code, {
              skipPin: true,
              playerName: playerNameInput,
            });
          }}
        />
      );
    }

    return (
      <LandingScreen
        onJoin={handleJoin}
        onResumeRecentSession={handleResumeRecentSession}
          onHideRecentSession={handleHideRecentSession}
          onRestoreRecentSession={handleRestoreRecentSession}
          onDeleteRecentSession={handleDeleteRecentSession}
          recentSessions={recentSessions}
          playerName={playerName}
          setPlayerName={setPlayerName}
          uid={uid}
          authLoading={authLoading}
          authError={authError}
          onSignInGoogle={handleSignInGoogle}
          onSignInEmail={handleSignInEmail}
          onSignUpEmail={handleSignUpEmail}
          onSignOut={handleLogout}
          sessionError={sessionError}
          sessionInfo={sessionInfo}
          sessionBusy={sessionBusy}
          showSessionHub={showLandingSessionHub}
          onBackfillMemberships={handleBackfillMemberships}
          runtimeBadge={runtimeBadge}
          theme={theme}
          onThemeChange={applyTheme}
          appUpdateNotice={appUpdateNotice}
          onReloadApp={() => window.location.reload()}
      />
    );
  }

  const getCharacterChatColor = (character) => {
    if (!character) return null;
    const byUid = [...chat].reverse().find((m) => m.uid && m.uid === character.id && m.color);
    if (byUid?.color) return byUid.color;
    const byName = [...chat].reverse().find((m) => !m.uid && m.author === character.name && m.color);
    return byName?.color || null;
  };

  return (
    <div className={`tv-app tv-app-shell relative flex h-screen w-full flex-col overflow-hidden font-sans tv-text${isMobilePartyOverlay ? ' tv-app-shell--party-overlay' : ''}`} data-theme={theme} data-brightness-step={brightness}>
      {appUpdateNotice ? (
        <div className="absolute inset-x-4 top-3 z-50 mx-auto max-w-3xl rounded-xl px-4 py-3 tv-update-banner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{appUpdateNotice}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tv-satisfy-pop rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] tv-update-banner__action"
            >
              Nu verversen
            </button>
          </div>
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="tv-ambience-overlay pointer-events-none absolute inset-0 z-0"
        style={{ opacity: brightnessOverlayOpacity }}
      />
      <div className="relative z-10 flex h-full flex-col">
        <TopBar 
          role={role} 
          sessionId={sessionId}
          sessionNumber={campaignSessionNumber}
          theme={theme}
          combatStatus={combatStatus}
          currentTurnId={currentTurnId}
          initiativeOrder={initiativeOrder}
          party={party}
          currentPlayerId={CURRENT_PLAYER_ID}
          onLogout={handleLeaveSession} 
          ambience={{
            isOpen: isAmbiencePanelOpen,
            currentTrack: currentAmbienceTrack,
            isPlaying: sessionAmbience.isPlaying,
            sessionVolume: sessionAmbience.masterVolume,
            listenerVolume: listenerAmbienceVolume,
            verifiedTracks: verifiedAmbienceTracks,
            archivedTracks: archivedAmbienceTracks,
            needsAudioUnlock,
            ambienceError,
          }}
          onToggleAmbiencePanel={() => setIsAmbiencePanelOpen((prev) => !prev)}
          onCloseAmbiencePanel={() => setIsAmbiencePanelOpen(false)}
          onToggleAmbiencePlayback={handleToggleAmbiencePlayback}
          onSelectAmbienceTrack={handleSelectAmbienceTrack}
          onSetSessionAmbienceVolume={handleSetSessionAmbienceVolume}
          onSetListenerAmbienceVolume={(nextVolume) => setListenerAmbienceVolume(clampAmbienceVolume(nextVolume, listenerAmbienceVolume))}
          onUnlockAmbienceAudio={handleUnlockAmbienceAudio}
          onToggleParty={handleToggleParty}
          isPartyOpen={isPartyOpen}
          onOpenShare={() => setShowShareModal(true)}
          onOpenProfile={() => setProfileTarget(party.find(p => p.id === CURRENT_PLAYER_ID))}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSessionPanel={() => setIsSessionPanelOpen(true)}
          onOpenSourcelist={() => setIsSourcelistOpen(true)}
          runtimeBadge={runtimeBadge}
        />
        
        <div className="relative flex flex-1 overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenSettings={() => setIsSettingsOpen(true)}
            role={role}
            sessionNumber={campaignSessionNumber}
            combatStatus={combatStatus}
            hideMobileNav={isMobilePartyOverlay}
          />
          
          <main className="app-shell-main relative flex-1 min-h-0 min-w-0 overflow-hidden p-3 transition-opacity duration-300 md:p-5">
            <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-full -translate-x-1/2 bg-[color-mix(in_srgb,var(--tv-accent),transparent_90%)] blur-[120px]" />
            
            <div className="tv-main-canvas relative z-10 mx-auto h-full max-w-full min-h-0">
              {activeTab === 'handouts' && (
                <div key="handouts-view" className="tv-tab-stage">
                  <HandoutsView 
                    role={role} 
                    handouts={handouts} 
                    currentPlayerId={CURRENT_PLAYER_ID}
                    onToggleVisibility={handleToggleVisibility}
                    onToggleSecretVisibility={handleToggleSecretVisibility}
                    onOpenHandout={(h) => setSelectedHandout(h)} 
                    onCreateHandout={() => setSelectedHandout('new')}
                    onClaim={(id) => handleClaimHandout(id, CURRENT_PLAYER_ID)}
                  />
                </div>
              )}
              {activeTab === 'chat' && (
                <div key="chat-view" className="tv-tab-stage">
                  <ChatView
                    chat={chat}
                    setChat={setChat}
                    role={role}
                    uid={uid}
                    playerName={playerName || 'Speler'}
                    preferredChatColor={preferredChatColor}
                    theme={theme}
                    onSendMessageRemote={handleSendChatRemote}
                    onEditMessage={handleEditChatMessage}
                    onDeleteMessage={handleDeleteChatMessage}
                    onChangeColor={handleUpdateChatColor}
                  />
                </div>
              )}
              {activeTab === 'inventory' && (
                <div key="inventory-view" className="tv-tab-stage">
                  <InventoryView 
                    role={role} 
                    inventory={inventory} 
                    wallets={wallets} 
                    party={party} 
                    currentPlayerId={CURRENT_PLAYER_ID} 
                    handouts={handouts}
                    onUnclaim={handleUnclaimHandout}
                    onOpenHandout={(h) => setSelectedHandout(h)}
                    onOpenAddItem={(ownerId) => {
                      setAddItemPreferredOwner(ownerId || null);
                      setIsAddItemModalOpen(true);
                    }}
                    onUpdateItemAmount={handleUpdateItemAmount}
                    onDeleteItem={handleDeleteItem}
                    onAdjustWallet={handleAdjustWallet}
                  />
                </div>
              )}
              {activeTab === 'preparations' && role === 'gm' && (
                <div key="preparations-view" className="tv-tab-stage">
                  <PreparationsView
                    templates={preparations}
                    backups={preparationBackups}
                    party={party}
                    onCreatePreparation={() => setSelectedPreparation('new')}
                    onCreateFromPlayer={() => setImportingPreparationPlayer(true)}
                    onEditPreparation={(preparation) => setSelectedPreparation(preparation)}
                    onDeletePreparation={(preparation) => handleDeletePreparationRemote(preparation)}
                    onAssignPreparation={(preparation) => setAssigningPreparation(preparation)}
                    onRestoreBackup={handleRestorePreparationBackup}
                  />
                </div>
              )}
              {activeTab === 'notes' && (
                <div key="notes-view" className="tv-tab-stage">
                  <NotesView 
                    role={role} 
                    notes={notes} 
                    setNotes={setNotes} 
                    currentPlayerId={CURRENT_PLAYER_ID}
                    onCreateNoteRemote={handleCreateNoteRemote}
                    onUpdateNoteRemote={handleUpdateNoteRemote}
                    onDeleteNoteRemote={handleDeleteNoteRemote}
                  />
                </div>
              )}
            </div>
          </main>

          <RightSidebar 
            party={party} 
            role={role} 
            isOpen={isPartyOpen} 
            onClose={() => setIsPartyOpen(false)}
            combatStatus={combatStatus}
            currentTurnId={currentTurnId}
            turnRound={turnRound}
            initiativeOrder={initiativeOrder}
            onStartCombat={handleStartCombat}
            onPauseCombat={handlePauseCombat}
            onResumeCombat={handleResumeCombat}
            onEndCombat={handleEndCombat}
            onAdvanceTurn={handleAdvanceTurn}
            onRollAllInitiative={handleBatchUpdateInitiatives}
            onKickPlayerFromCombat={handleKickPlayerFromCombat}
            onRequestCombatJoin={handleRequestCombatJoin}
            onOpenNpcModal={() => setIsNpcModalOpen(true)}
            onOpenDamageModal={(member) => setDamageTarget(member)}
            onOpenProfile={(member) => setProfileTarget(member)}
            currentPlayerId={CURRENT_PLAYER_ID}
            onUpdateStat={handleUpdatePlayerStat}
            isPinned={isSidebarPinned}
            setIsPinned={setIsSidebarPinned}
            theme={theme}
          />
        </div>
      </div>

        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)} 
          sessionId={sessionId} 
          theme={theme}
        />

        <AddNpcModal
          isOpen={isNpcModalOpen}
          onClose={() => setIsNpcModalOpen(false)}
          onSave={handleAddNpcSave}
        />

        <DamageModal 
          isOpen={!!damageTarget} 
          target={damageTarget} 
          onClose={() => setDamageTarget(null)} 
          onSave={handleDamageModalSave}
        />

        <CharacterProfileModal
          isOpen={!!profileTarget}
          character={profileTarget}
          onClose={() => setProfileTarget(null)}
          role={role}
          currentPlayerId={CURRENT_PLAYER_ID}
          combatStatus={combatStatus}
          onSave={handleProfileSave}
          onTransferGm={handleTransferGm}
          onRemoveFromCombat={handleRemoveFromCombat}
          onUpdateStat={handleUpdatePlayerStat}
          chatColor={getCharacterChatColor(profileTarget)}
          initiativeOrder={initiativeOrder}
          onOpenInitiativeSwap={(member) => {
            setInitiativeSwapTarget(member);
            setProfileTarget(null);
          }}
        />

        <InitiativeSwapModal
          isOpen={!!initiativeSwapTarget}
          onClose={() => setInitiativeSwapTarget(null)}
          member={initiativeSwapTarget}
          party={party}
          initiativeOrder={initiativeOrder}
          onSwapInitiative={handleInitiativeSwap}
        />

        <PreparationModal
          isOpen={selectedPreparation !== null}
          preparation={selectedPreparation === 'new' ? null : selectedPreparation}
          players={party.filter((member) => member.isNpc !== true)}
          theme={theme}
          onClose={() => setSelectedPreparation(null)}
          onSave={async (draft, pendingFile) => {
            await handleSavePreparationRemote(draft, pendingFile);
            setSelectedPreparation(null);
          }}
          onDelete={async (preparationId) => {
            if (!window.confirm('Verwijder deze voorbereiding definitief?')) return;
            await handleDeletePreparationRemote(preparationId);
            setSelectedPreparation(null);
          }}
        />

        <PlayerPickerModal
          isOpen={importingPreparationPlayer}
          mode="import"
          players={party.filter((member) => member.isNpc !== true)}
          onClose={() => setImportingPreparationPlayer(false)}
          onSelect={(player) => {
            setSelectedPreparation({
              ...snapshotPreparationFromCharacter({
                id: player.id,
                name: player.name,
                subtitle: player.subtitle,
                bio: player.bio,
                avatar: player.avatar,
                hp: player.hp,
                maxHp: player.maxHp,
                ac: player.ac,
                initMod: player.initMod,
                customStats: player.customStats,
              }),
              preparedForUid: player.id,
              assignmentStatus: 'unassigned',
            });
            setImportingPreparationPlayer(false);
          }}
        />

        <PlayerPickerModal
          isOpen={!!assigningPreparation}
          players={party.filter((member) => member.isNpc !== true)}
          preparation={assigningPreparation}
          onClose={() => setAssigningPreparation(null)}
          onAssign={async (targetUid) => {
            await handleAssignPreparationRemote(assigningPreparation?.id, targetUid);
            setAssigningPreparation(null);
          }}
        />

        <PreparationOfferModal
          isOpen={role === 'player' && !!pendingPreparationOffer}
          preparation={pendingPreparationOffer}
          onAccept={handleAcceptPreparationOffer}
          onReject={handleRejectPreparationOffer}
        />

        <AddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => {
            setIsAddItemModalOpen(false);
            setAddItemPreferredOwner(null);
          }}
          preferredOwnerId={addItemPreferredOwner}
          role={role}
          party={party}
          currentPlayerId={CURRENT_PLAYER_ID}
          onSave={handleAddItemSave}
        />

        <HandoutModal
          isOpen={!!selectedHandout}
          handout={selectedHandout === 'new' ? null : selectedHandout}
          role={role}
          players={party.filter((member) => member.isNpc !== true)}
          currentPlayerId={CURRENT_PLAYER_ID}
          canAddToInitiative={role === 'gm' && combatStatus !== COMBAT_STATUS.ACTIVE}
          onAddToInitiative={handleAddNpcFromHandout}
          onClose={() => setSelectedHandout(null)}
          onSave={async (updatedHandout, pendingFile) => {
            let finalHandout = { ...updatedHandout };

            // Als er een eigen file is geÃ¼pload, eerst naar Storage
            if (pendingFile && uid) {
              try {
                const ext = pendingFile.name.split('.').pop();
                const storagePath = `users/${uid}/handouts/${Date.now()}.${ext}`;
                const downloadUrl = await uploadImageToStorage(pendingFile, storagePath);
                finalHandout = { ...finalHandout, imageUrl: downloadUrl };
              } catch (err) {
                console.error('Afbeelding uploaden naar Storage mislukt:', err);
                // Doorgaan zonder afbeelding in Firestore, blob-preview blijft lokaal
                finalHandout = { ...finalHandout, imageUrl: null };
              }
            }

            try {
              if (selectedHandout === 'new') {
                const newId = await handleCreateHandoutRemote(finalHandout);
                setHandouts((prev) => [{ ...finalHandout, id: newId }, ...prev]);
              } else {
                await handleUpdateHandoutRemote(finalHandout);
                setHandouts((prev) => prev.map((h) => (String(h.id) === String(finalHandout.id) ? finalHandout : h)));
              }
            } catch (err) {
              console.error('Handout opslaan fout:', err);
              if (selectedHandout === 'new') {
                setHandouts((prev) => [{ ...finalHandout, id: Date.now().toString() }, ...prev]);
              } else {
                setHandouts((prev) => prev.map((h) => (String(h.id) === String(finalHandout.id) ? finalHandout : h)));
              }
            }

            setSelectedHandout(null);
          }}
          onDelete={async (id) => {
            try {
              await handleDeleteHandoutRemote(id);
            } catch (err) {
              console.error('Handout verwijderen fout:', err);
            }
            setHandouts((prev) => prev.filter((h) => String(h.id) !== String(id)));
            setSelectedHandout(null);
          }}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          playerName={playerName}
          role={role}
          onLogout={handleLeaveSession}
          onExportArchive={handleExportPlayerArchivePdf}
          exportBusy={isArchiveExporting}
          theme={theme}
          brightness={brightness}
          uiSounds={uiSounds}
          currentPlanLabel={currentAccessPlan.label}
          currentAccessPlan={currentAccessPlan}
          canOpenOwnerPanel={isOwner}
          onOpenOwnerPanel={() => setIsOwnerPanelOpen(true)}
          onSaveSettings={handleSaveSettings}
        />

        <OwnerAdminPanel
          isOpen={isOwnerPanelOpen}
          onClose={() => setIsOwnerPanelOpen(false)}
          uid={uid}
          isOwner={isOwner}
        />

        <SessionManageModal
          isOpen={isSessionPanelOpen}
          onClose={() => setIsSessionPanelOpen(false)}
          role={role}
          sessionId={sessionId}
          sessionNumber={campaignSessionNumber}
          theme={theme}
          onSaveSessionNumber={async (n) => { await handleUpdateCampaignSessionNumber(n); }}
          onOpenShare={() => { setIsSessionPanelOpen(false); setShowShareModal(true); }}
        />

        <SourcelistModal
          isOpen={isSourcelistOpen}
          onClose={() => setIsSourcelistOpen(false)}
          theme={theme}
          verifiedTracks={verifiedAmbienceTracks}
          archivedTracks={archivedAmbienceTracks}
        />
      </div>
  );
}

