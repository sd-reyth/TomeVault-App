import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  deleteField,
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
  slugifySessionName,
  getJoinTagLookupVariants,
  toSafeJoinTagForLink,
  toLegacyHashJoinTag,
  sha256,
  formatLastEditedLabel,
} from './lib/sessionUtils';
import { safeLocalStorageGet, safeLocalStorageSet } from './lib/browserStorage';
import { isBenignFirebaseAuthRaceError, toFriendlyAuthError } from './lib/authErrors';
import {
  getAuthTransitionSlowMs,
  getAuthTransitionTimeoutError,
  getAuthTransitionTimeoutMs,
  isSignInTransition,
} from './lib/authTransition';
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
import { handoutHasSecret, isHandoutDeleted, isHandoutTrashExpired, resolveHandoutSecret, HANDOUT_TRASH_RETENTION_MS } from './lib/handoutUtils';
import { downloadPlayerArchivePdf } from './lib/playerArchivePdf';
import { sanitizeCustomStats } from './lib/statModifiers';
import {
  buildBackupEntry,
  findAcceptedTemplatesForPlayer,
  playerProfileFieldsFromSnapshot,
  profileSnapshotMatchesPlayer,
  templateReturnToPoolFields,
} from './lib/preparationLifecycle';
import { canDeleteChatMessage, canEditChatMessage, sendChatMessage } from './lib/chatUtils';
import LandingScreen from './components/LandingScreen';
import AuthTransitionOverlay from './components/AuthTransitionOverlay';
import QRJoinScreen from './components/QRJoinScreen';
import TopBar from './components/TopBar';
import DamageModal from './components/DamageModal';
import SessionHubModal from './components/SessionHubModal';
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
import { useLocale } from './i18n/LocaleProvider';
import i18n from './i18n/index.js';
import { confirmDialog } from './i18n/dialogs';
import SourcelistModal from './components/SourcelistModal';
import AddItemModal from './components/AddItemModal';
import HandoutModal from './components/HandoutModal';
import HandoutDeleteConfirmModal from './components/HandoutDeleteConfirmModal';
import HandoutTrashModal from './components/HandoutTrashModal';
import CharacterProfileModal from './components/CharacterProfileModal';
import PreparationModal from './components/PreparationModal';
import PlayerPickerModal from './components/PlayerPickerModal';
import PreparationOfferModal from './components/PreparationOfferModal';
import RightSidebar from './components/RightSidebar';
import InitiativeSwapModal from './components/InitiativeSwapModal';
import OwnerAdminPanel from './components/OwnerAdminPanel';
import { resolveActivePlan } from './lib/accessPlans';
import {
  ensureJoinCodeAlias,
  generateUniqueJoinTag,
  resolveSessionDocFromJoinInput,
  resolveSessionPreview,
  rollJoinCodeForSession,
} from './lib/joinCodeUtils';
import { DEFAULT_THEME, LANDING_DEFAULT_THEME } from './lib/appThemes';

async function uploadImageToStorage(file, path) {
  const ref = storageRef(storage, path);
  const snapshot = await uploadBytes(ref, file);
  return getDownloadURL(snapshot.ref);
}

// Prototype source for the React shell migration.

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

async function ensureSessionPlayerProfile({
  sessionId,
  uid,
  name,
  defaultCombatParticipation = COMBAT_PARTICIPATION_STATUS.ACTIVE,
}) {
  if (!sessionId || !uid) return '';

  const playerRef = doc(db, 'sessions', sessionId, 'players', uid);
  const playerSnap = await getDoc(playerRef);
  const existing = playerSnap.data() || {};
  const resolvedName = String(existing.nickname || name || 'Avonturier').trim() || 'Avonturier';
  const payload = {
    nickname: resolvedName,
    lastSeenAt: serverTimestamp(),
    isNpc: false,
    isRevealed: true,
  };

  if (!playerSnap.exists()) {
    payload.joinedAt = serverTimestamp();
    payload.initiative = null;
    payload.combatParticipation = defaultCombatParticipation;
    payload.combatJoinRequestStatus = COMBAT_JOIN_REQUEST_STATUS.NONE;
  }

  await setDoc(playerRef, payload, { merge: true });
  return resolvedName;
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


function normalizeInventorySectionName(sectionName) {
  return String(sectionName || '').trim();
}

function hasNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
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
    reason: String(data.reason || 'accept').trim() || 'accept',
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

const MAX_PROFILE_BACKUPS = 3;

function getProfileBackupReasonLabel(reason) {
  return i18n.t(`session:profileBackup.reasons.${reason}`, {
    defaultValue: i18n.t('common:fallbacks.backupPoint'),
  });
}

function buildProfileBackupSnapshot(player = {}) {
  return {
    name: String(player.name || '').trim() || i18n.t('common:fallbacks.adventurer'),
    subtitle: String(player.subtitle || '').trim(),
    bio: String(player.bio || '').trim(),
    avatarUrl: normalizeAvatarUrl(player.avatar || player.avatarUrl),
    avatarPosition: normalizeAvatarPosition(player.avatarPosition),
    hp: Number(player.hp ?? 0),
    maxHp: Number(player.maxHp ?? player.hp ?? 0),
    ac: Number(player.ac ?? 10),
    initMod: Number(player.initMod ?? 0),
    hasAlertFeat: player.hasAlertFeat === true,
    proficiencyBonus: Number(player.proficiencyBonus ?? 2),
    customStats: sanitizeCustomStats(player.customStats),
  };
}

function profileBackupSignature(snapshot) {
  return JSON.stringify(buildProfileBackupSnapshot(snapshot || {}));
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
  const { locale, setLocale } = useLocale();
  const persistedActiveSession = useMemo(() => readPersistedActiveSession(), []);
  const [view, setView] = useState(() => persistedActiveSession?.view || 'landing');
  const [role, setRole] = useState(() => persistedActiveSession?.role || null);
  const [sessionId, setSessionId] = useState(() => persistedActiveSession?.sessionId || '');
  const [sessionDocId, setSessionDocId] = useState(() => persistedActiveSession?.sessionDocId || '');
  const [isSessionHubOpen, setIsSessionHubOpen] = useState(false);
  const [sessionHubInitialTab, setSessionHubInitialTab] = useState('overview');
  const [joinCodeRolling, setJoinCodeRolling] = useState(false);
  const [activeTab, setActiveTab] = useState(() => persistedActiveSession?.activeTab || 'handouts');
  const [playerName, setPlayerName] = useState(() => persistedActiveSession?.playerName || '');

  // Detect QR invite code from URL on mount (once, never changes)
  const [qrInviteCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return String(params.get('code') || '').trim();
  });
  const [qrJoinDone, setQrJoinDone] = useState(false);
  const [qrInvitePreview, setQrInvitePreview] = useState(null);
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
  
  const [handouts, setHandouts] = useState([]);
  const handoutsRef = useRef(handouts);
  const subscribedSessionRef = useRef(null);
  const [party, setParty] = useState([]);
  const [chat, setChat] = useState([]);
  const [preferredChatColor, setPreferredChatColor] = useState(() => {
    const stored = String(safeLocalStorageGet('tv_chatcolor', '') || '').trim();
    return CHAT_ACCENT_COLORS[stored] ? stored : null;
  });
  const [inventory, setInventory] = useState([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [wallets, setWallets] = useState({});
  const [notes, setNotes] = useState([]);
  const [preparations, setPreparations] = useState([]);
  const [preparationBackups, setPreparationBackups] = useState([]);
  const [profileBackups, setProfileBackups] = useState([]);
  const profileBackupInFlightRef = useRef(false);
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
  const authInFlightRef = useRef(false);
  const authTransitionTimersRef = useRef([]);

  // Firebase auth state
  const [uid, setUid] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [currentEntitlement, setCurrentEntitlement] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bootAuthPhase, setBootAuthPhase] = useState('loading');
  const [authTransition, setAuthTransition] = useState(null);
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
    handleReturnPlayerToCombat,
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
    isSessionHubOpen: false,
    isSettingsOpen: false,
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
  const [isSourcelistOpen, setIsSourcelistOpen] = useState(false);
  const [isArchiveExporting, setIsArchiveExporting] = useState(false);
  const [initiativeSwapTarget, setInitiativeSwapTarget] = useState(null);
  const [damageTarget, setDamageTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [selectedHandout, setSelectedHandout] = useState(null);
  const [handoutPendingDelete, setHandoutPendingDelete] = useState(null);
  const [isHandoutTrashOpen, setIsHandoutTrashOpen] = useState(false);

  useEffect(() => {
    handoutsRef.current = handouts;
  }, [handouts]);

  useEffect(() => {
    setSelectedHandout((current) => {
      if (!current || current === 'new') return current;
      const fresh = handouts.find((entry) => String(entry.id) === String(current.id));
      if (!fresh || isHandoutDeleted(fresh)) return null;
      return fresh;
    });
  }, [handouts]);
  const [selectedPreparation, setSelectedPreparation] = useState(null);
  const [assigningPreparation, setAssigningPreparation] = useState(null);
  const [importingPreparationPlayer, setImportingPreparationPlayer] = useState(false);
  const [pendingPreparationOffer, setPendingPreparationOffer] = useState(null);
  const [preparationOfferBusy, setPreparationOfferBusy] = useState(false);
  const [playerProfileArchives, setPlayerProfileArchives] = useState([]);
  const [playerAssignedTemplates, setPlayerAssignedTemplates] = useState([]);
  const [profileArchiveBusy, setProfileArchiveBusy] = useState(false);
  const [claimNotesByHandoutId, setClaimNotesByHandoutId] = useState({});
  const [campaignSessionNumber, setCampaignSessionNumber] = useState(1);
  const [campaignName, setCampaignName] = useState('');
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
      setAuthError(i18n.t('session:appErrors.loginRequired'));
      return;
    }

    try {
      setSessionBusy(true);

      if (selectedRole === 'gm') {
        const sessionName = String(options.forceSessionName || code || 'Session').replace(/^#/, '').replace(/-/g, ' ').trim() || 'Session';
        const pinPlain = String(options.defaultPin || '0000').trim();
        if (!/^\d{4,8}$/.test(pinPlain)) {
          setSessionError(i18n.t('session:appErrors.pinInvalid'));
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
            const byTag = await getDocs(query(collection(db, 'sessions'), where('joinTag', '==', candidate), limit(1)));
            if (!byTag.empty) {
              existing = byTag.docs[0];
              break;
            }
          }

          if (existing) {
            const existingData = existing.data() || {};
            const allowLocalDevTakeover = options.allowLocalDevTakeover === true;

            if (existingData.gmUid !== uid && !allowLocalDevTakeover) {
              setSessionError(i18n.t('session:appErrors.testSessionInUse'));
              return;
            }

            if (existingData.gmUid !== uid && allowLocalDevTakeover) {
              // Firestore rules do not permit arbitrary GM takeover of another
              // anonymous dev session, so create an isolated fresh dev session instead.
              joinTag = await generateUniqueJoinTag(db, sessionName);
              shouldCreateFreshLocalDevSession = true;
              setSessionInfo(i18n.t('session:appInfo.devSessionTakenover'));
            }

            if (!shouldCreateFreshLocalDevSession) {
              await writeMembership({
                uid,
                sessionId: existing.id,
                role: 'dm',
                sessionName: existingData.name || sessionName,
                joinTag: toLegacyHashJoinTag(existingData.joinTag || joinTag),
              });
              const resolvedGmPlayerName = await ensureSessionPlayerProfile({
                sessionId: existing.id,
                uid,
                name: playerName || displayName || 'GM',
                defaultCombatParticipation: COMBAT_PARTICIPATION_STATUS.REMOVED,
              });

              setPlayerName(resolvedGmPlayerName || playerName);
              setRole('gm');
              setSessionDocId(existing.id);
              setSessionId(toLegacyHashJoinTag(existingData.joinTag || joinTag));
              setCampaignName(String(existingData.name || sessionName).trim());
              setCampaignSessionNumber(Number(existingData.campaignSessionNumber || 1));
              setView('dashboard');
              return;
            }
          }
        } else {
          joinTag = await generateUniqueJoinTag(db, sessionName);
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

        await ensureJoinCodeAlias(db, created.id, joinTag);

        await writeMembership({
          uid,
          sessionId: created.id,
          role: 'dm',
          sessionName: sessionData?.name || '',
          joinTag: toLegacyHashJoinTag(sessionData?.joinTag || joinTag),
        });
        const resolvedGmPlayerName = await ensureSessionPlayerProfile({
          sessionId: created.id,
          uid,
          name: playerName || displayName || 'GM',
          defaultCombatParticipation: COMBAT_PARTICIPATION_STATUS.REMOVED,
        });

        setPlayerName(resolvedGmPlayerName || playerName);
        setRole('gm');
        setSessionDocId(created.id);
        setSessionId(joinTag);
        setCampaignName(sessionName);
        setCampaignSessionNumber(1);
        setView('dashboard');
        return;
      }

      const joinTagRaw = String(code || '').trim();
      const nick = String(options.playerName || playerName || displayName || 'Avonturier').trim();
      const pinPlain = String(options.pin || '').trim();
      const skipPinCheck = options.skipPin === true;
      if (!joinTagRaw) {
        setSessionError(i18n.t('session:appErrors.sessionCodeMissing'));
        return;
      }
      if (!nick) {
        setSessionError(i18n.t('session:appErrors.characterNameMissing'));
        return;
      }
      if (!skipPinCheck && !/^\d{4,8}$/.test(pinPlain)) {
        setSessionError(i18n.t('session:appErrors.pinInvalid'));
        return;
      }

      const sessionDoc = await resolveSessionDocFromJoinInput(db, joinTagRaw);

      if (!sessionDoc) {
        setSessionError(i18n.t('session:appErrors.sessionNotFound'));
        return;
      }

      const sessionData = sessionDoc.data();
      if (!skipPinCheck) {
        const pinHash = await sha256(pinPlain);
        if (sessionData?.pinHash && sessionData.pinHash !== pinHash) {
          setSessionError(i18n.t('session:appErrors.wrongPin'));
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
      setCampaignName(String(sessionData?.name || '').trim());
      setCampaignSessionNumber(Number(sessionData?.campaignSessionNumber || 1));
      setView('dashboard');
    } catch (err) {
      console.error('Join/Create sessie fout:', err);
      setSessionError(i18n.t('session:appErrors.openSessionFailed'));
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
        setSessionError(i18n.t('session:appErrors.sessionGone'));
        return;
      }

      const data = snap.data() || {};
      const resolvedRole = preferredRole || (membership.role === 'dm' ? 'gm' : 'player');
      const resolvedJoinTag = toLegacyHashJoinTag(data.joinTag || membership.joinTag || membership.sessionId);

      if (resolvedRole === 'gm') {
        if (data.gmUid !== uid && membership.role !== 'dm') {
          setSessionError(i18n.t('session:appErrors.notGm'));
          return;
        }

        await writeMembership({
          uid,
          sessionId: snap.id,
          role: 'dm',
          sessionName: data.name || membership.sessionName || '',
          joinTag: resolvedJoinTag,
        });
        const resolvedGmPlayerName = await ensureSessionPlayerProfile({
          sessionId: snap.id,
          uid,
          name: playerName || displayName || 'GM',
          defaultCombatParticipation: COMBAT_PARTICIPATION_STATUS.REMOVED,
        });

        setPlayerName(resolvedGmPlayerName || playerName);
        setRole('gm');
        setSessionDocId(snap.id);
        setSessionId(resolvedJoinTag);
        setCampaignName(String(data.name || membership.sessionName || '').trim());
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
      setCampaignName(String(data.name || membership.sessionName || '').trim());
      setCampaignSessionNumber(Number(data?.campaignSessionNumber || 1));
      setView('dashboard');
    } catch (err) {
      console.error('Recente sessie hervatten fout:', err);
      setSessionError(i18n.t('session:appErrors.openRecentFailed'));
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

    const sessionName = membership.sessionName || i18n.t('common:fallbacks.unnamedSession');
    const membershipRef = doc(db, 'users', uid, 'memberships', membership.sessionId);

    try {
      if (membership.role === 'dm') {
        const sessionRef = doc(db, 'sessions', membership.sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          await deleteDoc(membershipRef);
          setRecentSessions((prev) => prev.filter((session) => session.sessionId !== membership.sessionId));
          setSessionInfo(i18n.t('session:appInfo.recentReferenceRemoved', { name: sessionName }));
          return;
        }

        const sessionData = sessionSnap.data() || {};
        if (sessionData.gmUid !== uid) {
          throw new Error(i18n.t('session:appErrors.deleteOnlyActiveGm'));
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
        setSessionInfo(i18n.t('session:appInfo.campaignDeleted', { name: sessionName }));

        if (sessionDocId === membership.sessionId) {
          autoResumeAttemptRef.current = uid || autoResumeAttemptRef.current;
          setRole(null);
          setSessionId('');
          setCampaignName('');
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
      setSessionInfo(i18n.t('session:appInfo.sessionLeftAndRemoved', { name: sessionName }));
    } catch (err) {
      console.error('Recente sessie verwijderen fout:', err);
      setSessionError(err?.message || i18n.t('session:appErrors.deleteSessionFailed'));
    } finally {
      setSessionBusy(false);
    }
  };

  const clearAuthTransitionTimers = useCallback(() => {
    authTransitionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    authTransitionTimersRef.current = [];
  }, []);

  const finishAuthTransition = useCallback(() => {
    clearAuthTransitionTimers();
    authInFlightRef.current = false;
    setAuthTransition(null);
  }, [clearAuthTransitionTimers]);

  const startAuthTransition = useCallback((kind) => {
    clearAuthTransitionTimers();
    authInFlightRef.current = true;
    setAuthError('');
    setAuthTransition({ kind, phase: 'loading', startedAt: Date.now() });

    const slowTimer = window.setTimeout(() => {
      setAuthTransition((prev) => (
        prev?.kind === kind && prev.phase === 'loading'
          ? { ...prev, phase: 'slow' }
          : prev
      ));
    }, getAuthTransitionSlowMs(kind));

    const timeoutTimer = window.setTimeout(() => {
      const errorMessage = getAuthTransitionTimeoutError(kind);
      setAuthError(errorMessage);
      setAuthTransition((prev) => (
        prev?.kind === kind
          ? { ...prev, phase: 'timeout', error: errorMessage }
          : prev
      ));
      authInFlightRef.current = false;
    }, getAuthTransitionTimeoutMs(kind));

    authTransitionTimersRef.current = [slowTimer, timeoutTimer];
  }, [clearAuthTransitionTimers]);

  const handleAuthRetry = useCallback(() => {
    finishAuthTransition();
    setAuthError('');
  }, [finishAuthTransition]);

  const activeAuthOverlay = useMemo(() => {
    if (authTransition) return authTransition;
    if (authLoading) return { kind: 'boot', phase: bootAuthPhase };
    return null;
  }, [authTransition, authLoading, bootAuthPhase]);

  const authBusy = authLoading || Boolean(authTransition);

  const renderAuthOverlay = () => (
    activeAuthOverlay ? (
      <AuthTransitionOverlay
        kind={activeAuthOverlay.kind}
        phase={activeAuthOverlay.phase}
        error={activeAuthOverlay.error || ''}
        onRetry={activeAuthOverlay.phase === 'timeout' ? handleAuthRetry : undefined}
      />
    ) : null
  );

  const handleLogout = async () => {
    if (authInFlightRef.current) return;

    startAuthTransition('sign-out');

    try {
      await createProfileBackup('logout');
    } catch (_) {
      // best-effort backup; never block logout
    }

    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout fout:', err);
      const message = i18n.t('session:appErrors.logoutFailed');
      setAuthError(message);
      setAuthTransition((prev) => (
        prev ? { ...prev, phase: 'timeout', error: message } : prev
      ));
      clearAuthTransitionTimers();
      authInFlightRef.current = false;
      return;
    }

    autoResumeAttemptRef.current = '';
    setRole(null);
    setSessionId('');
    setCampaignName('');
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
    void createProfileBackup('leave');
    autoResumeAttemptRef.current = uid || autoResumeAttemptRef.current;
    setSessionError('');
    setSessionInfo('');
    setRole(null);
    setSessionId('');
    setCampaignName('');
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

        const membershipRef = doc(db, 'users', uid, 'memberships', sessionDoc.id);
        const membershipSnap = await getDoc(membershipRef);
        if (membershipSnap.exists()) continue;

        await writeMembership({
          uid,
          sessionId: sessionDoc.id,
          role,
          sessionName: sessionData.name || '',
          joinTag: toLegacyHashJoinTag(sessionData.joinTag || sessionDoc.id),
        });

        restored += 1;
      }

      if (restored === 0) {
        setSessionInfo(i18n.t('session:appInfo.backfillNoneFound', { scanned }));
      } else {
        setSessionInfo(i18n.t('session:appInfo.backfillComplete', { restored }));
      }
    } catch (err) {
      console.error('Membership herstel fout:', err);
      setSessionError(i18n.t('session:appErrors.restoreSessionsFailed'));
    } finally {
      setSessionBusy(false);
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';

    const handleAudioError = () => {
      setAmbienceError(i18n.t('session:appErrors.ambienceTrackLoadFailed'));
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

    const updateMessage = '1';

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
    if (!authLoading) {
      setBootAuthPhase('loading');
      return undefined;
    }

    setBootAuthPhase('loading');
    const slowTimer = window.setTimeout(() => {
      setBootAuthPhase('slow');
    }, getAuthTransitionSlowMs('boot'));

    return () => window.clearTimeout(slowTimer);
  }, [authLoading]);

  useEffect(() => {
    if (!authTransition || authTransition.phase === 'timeout') return undefined;

    if (isSignInTransition(authTransition.kind) && uid) {
      finishAuthTransition();
      return undefined;
    }

    if (authTransition.kind === 'sign-out' && !uid && !authLoading) {
      finishAuthTransition();
    }

    return undefined;
  }, [authLoading, authTransition, finishAuthTransition, uid]);

  useEffect(() => () => clearAuthTransitionTimers(), [clearAuthTransitionTimers]);

  useEffect(() => {
    let didResolveAuth = false;
    const authLoadFallbackTimer = window.setTimeout(() => {
      if (didResolveAuth) return;
      setAuthError(i18n.t('session:appErrors.authTimeout'));
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
          setAuthError(i18n.t('session:appErrors.authInitFailed'));
          finishAuthLoad();
        }
      );
    } catch (error) {
      console.error('Auth observer setup failed:', error);
      setAuthError(i18n.t('session:appErrors.authStartFailed'));
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
      isSessionHubOpen,
      isSettingsOpen,
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
      ['isSessionHubOpen', 'sessionHub'],
      ['isSettingsOpen', 'settingsModal'],
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
    isSessionHubOpen,
    isSettingsOpen,
    isSourcelistOpen,
    pendingPreparationOffer,
    profileTarget,
    role,
    selectedHandout,
    selectedPreparation,
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
      } else if (target === 'sessionHub') {
        setIsSessionHubOpen(false);
      } else if (target === 'sourcelistModal') {
        setIsSourcelistOpen(false);
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
      setProfileBackups([]);
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
        setCampaignName(String(s.name || '').trim());
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
          const deletedAtMs = h.deletedAt?.toMillis ? h.deletedAt.toMillis() : null;
          const deletedExpiresAtMs = h.deletedExpiresAt?.toMillis
            ? h.deletedExpiresAt.toMillis()
            : (deletedAtMs ? deletedAtMs + HANDOUT_TRASH_RETENTION_MS : null);
          return {
            id: d.id,
            title: h.title || i18n.t('common:fallbacks.unnamedHandout'),
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
            npcSubtitle: h.npcSubtitle || i18n.t('common:fallbacks.enemy'),
            npcHp: Number(h.npcHp ?? 15),
            npcAc: Number(h.npcAc ?? 12),
            npcInitMod: Number(h.npcInitMod ?? 2),
            createdAtMs,
            updatedAtMs,
            deletedAtMs,
            deletedByUid: h.deletedByUid || null,
            deletedExpiresAtMs,
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
            subtitle: p.subtitle || (p.isNpc ? i18n.t('common:fallbacks.enemy') : i18n.t('common:roles.player')),
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
            customStats: sanitizeCustomStats(p.customStats),
            conditions: normalizedConditions,
            hasAlertFeat: p.hasAlertFeat === true,
            proficiencyBonus: Number(p.proficiencyBonus ?? 2),
            isDead: p.isDead === true,
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
            setPlayerAssignedTemplates(incoming.filter((entry) => entry.assignmentStatus === 'accepted'));
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sessions', sid, 'preparationBackups'), where('playerUid', '==', uid)),
          (snap) => {
            const incoming = snap.docs
              .map((entry) => normalizePreparationBackupDoc(entry))
              .sort((left, right) => Number(right.createdAtMs || 0) - Number(left.createdAtMs || 0));
            setPlayerProfileArchives(incoming);
          }
        )
      );
    }

    if (uid) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'users', uid, 'profileBackups'), where('sessionDocId', '==', sid)),
          (snap) => {
            const incoming = snap.docs
              .map((entry) => {
                const data = entry.data() || {};
                const createdAtMs = Number(
                  data.createdAtMs
                  ?? (data.createdAt?.toMillis ? data.createdAt.toMillis() : 0)
                );
                return {
                  id: entry.id,
                  snapshot: data.snapshot || {},
                  reason: data.reason || 'manual',
                  reasonLabel: getProfileBackupReasonLabel(data.reason),
                  signature: data.signature || '',
                  createdAtMs,
                  createdAtLabel: createdAtMs ? formatLastEditedLabel({ toMillis: () => createdAtMs }) : '',
                };
              })
              .sort((left, right) => Number(right.createdAtMs || 0) - Number(left.createdAtMs || 0))
              .slice(0, MAX_PROFILE_BACKUPS);
            setProfileBackups(incoming);
          },
          (err) => {
            console.error('Profielback-ups laden mislukt:', err);
            setProfileBackups([]);
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
    if (!sessionDocId || view !== 'dashboard' || !uid || role !== 'player') {
      setClaimNotesByHandoutId({});
      return undefined;
    }

    const claimedIds = (handouts || [])
      .filter((entry) => entry.claimedBy === uid)
      .map((entry) => String(entry.id));

    if (claimedIds.length === 0) {
      setClaimNotesByHandoutId({});
      return undefined;
    }

    const unsubs = claimedIds.map((handoutId) => onSnapshot(
      doc(db, 'sessions', sessionDocId, 'handouts', handoutId, 'claimNotes', uid),
      (snap) => {
        setClaimNotesByHandoutId((prev) => {
          const next = { ...prev };
          if (!snap.exists() || !String(snap.data()?.note || '').trim()) {
            delete next[handoutId];
          } else {
            next[handoutId] = String(snap.data().note || '').trim();
          }
          return next;
        });
      }
    ));

    return () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          // no-op
        }
      });
    };
  }, [handouts, role, sessionDocId, uid, view]);

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
    if (authInFlightRef.current || authLoading || sessionBusy) return;

    startAuthTransition('sign-in-google');

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (isBenignFirebaseAuthRaceError(err) && auth.currentUser) {
        return;
      }
      const message = toFriendlyAuthError(err, 'auth:errors.fallbackGoogleSignIn');
      setAuthError(message);
      setAuthTransition((prev) => (
        prev ? { ...prev, phase: 'timeout', error: message } : prev
      ));
      clearAuthTransitionTimers();
      authInFlightRef.current = false;
    }
  };

  const handleSignInGuest = async () => {
    if (authInFlightRef.current || authLoading || sessionBusy) return;

    startAuthTransition('sign-in-guest');

    try {
      await signInAnonymously(auth);
    } catch (err) {
      const message = toFriendlyAuthError(err, 'auth:errors.fallbackGuestSignIn');
      setAuthError(message);
      setAuthTransition((prev) => (
        prev ? { ...prev, phase: 'timeout', error: message } : prev
      ));
      clearAuthTransitionTimers();
      authInFlightRef.current = false;
    }
  };

  const handleSignInEmail = async ({ email, password }) => {
    if (authInFlightRef.current || authLoading || sessionBusy) return;

    startAuthTransition('sign-in-email');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = toFriendlyAuthError(err, 'auth:errors.fallbackEmailSignIn');
      setAuthError(message);
      setAuthTransition((prev) => (
        prev ? { ...prev, phase: 'timeout', error: message } : prev
      ));
      clearAuthTransitionTimers();
      authInFlightRef.current = false;
    }
  };

  const handleSignUpEmail = async ({ name, email, password }) => {
    if (authInFlightRef.current || authLoading || sessionBusy) return;

    startAuthTransition('sign-in-email');

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name?.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
    } catch (err) {
      const message = toFriendlyAuthError(err, 'auth:errors.fallbackSignUp');
      setAuthError(message);
      setAuthTransition((prev) => (
        prev ? { ...prev, phase: 'timeout', error: message } : prev
      ));
      clearAuthTransitionTimers();
      authInFlightRef.current = false;
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

  const handleSaveHandoutClaimNote = async (handoutId, note) => {
    if (!sessionDocId || !uid || !handoutId) return;

    const trimmed = String(note || '').trim();
    const noteRef = doc(db, 'sessions', sessionDocId, 'handouts', handoutId, 'claimNotes', uid);

    try {
      if (!trimmed) {
        await deleteDoc(noteRef);
        setClaimNotesByHandoutId((prev) => {
          const next = { ...prev };
          delete next[handoutId];
          return next;
        });
        return;
      }

      await setDoc(noteRef, {
        playerUid: uid,
        note: trimmed,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setClaimNotesByHandoutId((prev) => ({ ...prev, [handoutId]: trimmed }));
    } catch (err) {
      console.error('Handout-notitie opslaan mislukt:', err);
      setSessionError(i18n.t('session:appErrors.noteSaveFailed'));
    }
  };

  const handleUnclaimHandout = async (handoutId) => {
    const handout = handouts.find((entry) => String(entry.id) === String(handoutId));
    const claimantUid = String(handout?.claimedBy || '').trim();
    let didPersist = false;

    try {
      if (sessionDocId) {
        if (claimantUid) {
          try {
            await deleteDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId, 'claimNotes', claimantUid));
          } catch (err) {
            console.warn('Claim-notitie verwijderen mislukt:', err);
          }
        }

        // The GM can also clear an assignment so the handout fully returns to
        // the pool. Players may only touch claim metadata (Firestore rules),
        // so assignment fields are GM-only here.
        const assignmentReset = role === 'gm'
          ? { assignedToUid: null, assignedToNick: null }
          : {};

        await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId), {
          claimedByUid: null,
          claimedByNick: null,
          mapVisibleToUid: null,
          claimedAt: null,
          ...assignmentReset,
          updatedAt: serverTimestamp(),
        });
      }
      didPersist = true;
    } catch (err) {
      console.error('Unclaim handout fout:', err);
      setSessionError(i18n.t('session:appErrors.returnToHandoutsFailed'));
    }

    if (didPersist) {
      setHandouts(handouts.map((h) => (h.id === handoutId
        ? { ...h, claimedBy: null, ...(role === 'gm' ? { assignedToUid: null, assignedToNick: null } : {}) }
        : h)));
      setClaimNotesByHandoutId((prev) => {
        const next = { ...prev };
        delete next[handoutId];
        return next;
      });
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

    const selfAuthor = role === 'gm' ? 'GM' : (playerName || 'Speler');
    const message = chat.find((entry) => entry.id === msgId);
    if (!canEditChatMessage(message, chat, uid, selfAuthor)) return;

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

    const selfAuthor = role === 'gm' ? 'GM' : (playerName || 'Speler');
    const message = chat.find((entry) => entry.id === msgId);
    if (!canDeleteChatMessage(message, role, uid, selfAuthor)) return;

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
      throw err;
    }
  };

  const handleUpdateCampaignName = async (nextName) => {
    const trimmed = String(nextName || '').trim().slice(0, 48);
    if (!trimmed || !sessionDocId || role !== 'gm') return;

    setCampaignName(trimmed);

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId), {
        name: trimmed,
        updatedAt: serverTimestamp(),
      });

      if (uid) {
        await writeMembership({
          uid,
          sessionId: sessionDocId,
          sessionName: trimmed,
        });
      }
    } catch (err) {
      console.error('Campagnenaam bijwerken mislukt:', err);
      throw err;
    }
  };

  const handleRollJoinCode = async () => {
    if (!sessionDocId || role !== 'gm' || !sessionId) return;

    setJoinCodeRolling(true);
    try {
      const newTag = await rollJoinCodeForSession(db, {
        sessionDocId,
        sessionName: campaignName || 'Session',
        currentJoinTag: sessionId,
      });

      setSessionId(newTag);

      if (uid) {
        await writeMembership({
          uid,
          sessionId: sessionDocId,
          joinTag: newTag,
        });
      }
    } catch (err) {
      console.error('Join-code rollen mislukt:', err);
      throw err;
    } finally {
      setJoinCodeRolling(false);
    }
  };

  const openSessionHub = (tab = 'overview') => {
    setSessionHubInitialTab(tab);
    setIsSessionHubOpen(true);

    if (role === 'gm' && sessionDocId && sessionId) {
      void ensureJoinCodeAlias(db, sessionDocId, sessionId).catch((err) => {
        console.warn('[TomeVault] join-code alias kon niet worden geborgd.', err);
      });
    }
  };

  const activePlayerCount = useMemo(
    () => party.filter((member) => member.isNpc !== true).length,
    [party]
  );

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

  const handleReturnPreparationToPool = async (preparationOrId) => {
    const preparationId = typeof preparationOrId === 'string' ? preparationOrId : preparationOrId?.id;
    if (!sessionDocId || role !== 'gm' || !preparationId) return;

    await updateDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', preparationId), {
      ...templateReturnToPoolFields(),
      updatedAt: serverTimestamp(),
    });
  };

  const handleRestorePreparationBackup = async (backup) => {
    if (!sessionDocId || role !== 'gm' || !backup?.playerUid) return;

    const batch = writeBatch(db);

    batch.update(doc(db, 'sessions', sessionDocId, 'players', backup.playerUid), {
      ...playerProfileFieldsFromSnapshot(backup.snapshot, backup.playerName || 'Avonturier'),
      updatedAt: serverTimestamp(),
    });

    if (backup.templateId) {
      const linkedTemplate = preparations.find((entry) => entry.id === backup.templateId);
      if (linkedTemplate?.assignmentStatus === 'accepted') {
        batch.update(doc(db, 'sessions', sessionDocId, 'characterTemplates', backup.templateId), {
          ...templateReturnToPoolFields(),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      findAcceptedTemplatesForPlayer(preparations, backup.playerUid).forEach((entry) => {
        batch.update(doc(db, 'sessions', sessionDocId, 'characterTemplates', entry.id), {
          ...templateReturnToPoolFields(),
          updatedAt: serverTimestamp(),
        });
      });
    }

    batch.update(doc(db, 'sessions', sessionDocId, 'preparationBackups', backup.id), {
      restoredAt: serverTimestamp(),
    });

    await batch.commit();
  };

  const releaseAcceptedTemplatesInBatch = (batch, playerId, excludeId = null, templates = []) => {
    findAcceptedTemplatesForPlayer(templates, playerId, excludeId).forEach((entry) => {
      batch.update(doc(db, 'sessions', sessionDocId, 'characterTemplates', entry.id), {
        ...templateReturnToPoolFields(),
        updatedAt: serverTimestamp(),
      });
    });
  };

  const handleAcceptPreparationOffer = async () => {
    if (!sessionDocId || !uid || !pendingPreparationOffer || preparationOfferBusy) return;

    const currentPlayer = party.find((member) => member.id === uid && member.isNpc !== true) || {};
    const previousSnapshot = buildPreparationBackupSnapshot(currentPlayer, {
      name: playerName || displayName || 'Avonturier',
    });
    const offer = pendingPreparationOffer;

    setPreparationOfferBusy(true);
    setSessionError('');

    try {
      const batch = writeBatch(db);
      const backupRef = doc(collection(db, 'sessions', sessionDocId, 'preparationBackups'));

      batch.set(backupRef, {
        ...buildBackupEntry({
          playerUid: uid,
          playerName: previousSnapshot.name || 'Avonturier',
          snapshot: previousSnapshot,
          templateId: offer.id,
          templateName: offer.name || 'Naamloos personage',
          reason: 'accept',
        }),
        createdAt: serverTimestamp(),
      });

      releaseAcceptedTemplatesInBatch(batch, uid, offer.id, playerAssignedTemplates);

      batch.update(doc(db, 'sessions', sessionDocId, 'players', uid), {
        ...playerProfileFieldsFromSnapshot({
          name: offer.name,
          subtitle: offer.subtitle,
          hp: offer.hp,
          maxHp: offer.maxHp,
          ac: offer.ac,
          initMod: offer.initMod,
          bio: offer.bio,
          customStats: offer.customStats,
          avatarUrl: offer.imageUrl,
        }, previousSnapshot.name || 'Avonturier'),
        updatedAt: serverTimestamp(),
      });

      batch.update(doc(db, 'sessions', sessionDocId, 'characterTemplates', offer.id), {
        assignmentStatus: 'accepted',
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const nextName = offer.name || previousSnapshot.name || 'Avonturier';
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
      setSessionInfo(i18n.t('session:appInfo.roleOfferAccepted', { name: nextName }));
    } catch (err) {
      console.error('Rolvoorstel accepteren mislukt:', err);
      setSessionError(i18n.t('session:appErrors.acceptRoleOfferFailed'));
    } finally {
      setPreparationOfferBusy(false);
    }
  };

  const handleRejectPreparationOffer = async () => {
    if (!sessionDocId || !uid || !pendingPreparationOffer || preparationOfferBusy) return;

    setPreparationOfferBusy(true);
    setSessionError('');

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', pendingPreparationOffer.id), {
        ...templateReturnToPoolFields(),
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPendingPreparationOffer(null);
      setSessionInfo(i18n.t('session:appInfo.roleOfferDeclined'));
    } catch (err) {
      console.error('Rolvoorstel weigeren mislukt:', err);
      setSessionError(i18n.t('session:appErrors.declineRoleOfferFailed'));
    } finally {
      setPreparationOfferBusy(false);
    }
  };

  const handlePlayerActivateProfileArchive = async (backup) => {
    if (!sessionDocId || !uid || profileArchiveBusy || !backup?.snapshot) return;

    const currentPlayer = party.find((member) => member.id === uid && member.isNpc !== true) || {};
    if (profileSnapshotMatchesPlayer(backup.snapshot, currentPlayer)) {
      setSessionInfo(i18n.t('session:profileArchive.alreadyActive'));
      return;
    }

    const confirmed = typeof window !== 'undefined'
      ? confirmDialog('session:profileArchive.activateConfirm', {
        name: backup.snapshot.name || i18n.t('common:fallbacks.thisProfile'),
      })
      : true;
    if (!confirmed) return;

    const currentSnapshot = buildPreparationBackupSnapshot(currentPlayer, {
      name: playerName || displayName || 'Avonturier',
    });

    setProfileArchiveBusy(true);
    setSessionError('');

    try {
      const batch = writeBatch(db);
      const archiveRef = doc(collection(db, 'sessions', sessionDocId, 'preparationBackups'));

      batch.set(archiveRef, {
        ...buildBackupEntry({
          playerUid: uid,
          playerName: currentSnapshot.name || 'Avonturier',
          snapshot: currentSnapshot,
          templateId: null,
          templateName: 'Profielwissel',
          reason: 'profile_switch',
        }),
        createdAt: serverTimestamp(),
      });

      releaseAcceptedTemplatesInBatch(batch, uid, null, playerAssignedTemplates);

      batch.update(doc(db, 'sessions', sessionDocId, 'players', uid), {
        ...playerProfileFieldsFromSnapshot(backup.snapshot, currentSnapshot.name || 'Avonturier'),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const nextName = backup.snapshot.name || currentSnapshot.name || 'Avonturier';
      setPlayerName(nextName);
      setDisplayName(nextName);
      if (auth.currentUser && nextName) {
        try {
          await updateProfile(auth.currentUser, { displayName: nextName });
        } catch (err) {
          console.warn('Auth displayName bijwerken na archiefwissel mislukt:', err);
        }
      }
      setSessionInfo(i18n.t('session:appInfo.profileActivated', { name: nextName }));
    } catch (err) {
      console.error('Profielarchief activeren mislukt:', err);
      setSessionError(i18n.t('session:appErrors.switchProfileFailed'));
    } finally {
      setProfileArchiveBusy(false);
    }
  };

  const buildHandoutPayload = (handout = {}) => {
    const normalizedType = String(handout.type || 'clue').toLowerCase();
    const assignedToUid = String(handout.assignedToUid || '').trim() || null;
    const assignedPlayer = party.find((member) => member.id === assignedToUid && member.isNpc !== true);
    const hasSecretContent = handoutHasSecret(handout);

    return {
      title: handout.title || i18n.t('common:fallbacks.unnamedHandout'),
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
      npcSubtitle: String(handout.npcSubtitle || i18n.t('common:fallbacks.enemy')).trim() || i18n.t('common:fallbacks.enemy'),
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

  const handleSoftDeleteHandoutRemote = async (handoutId) => {
    if (role !== 'gm') {
      throw new Error('Alleen de GM kan handouts verwijderen.');
    }
    if (!sessionDocId || !handoutId || !uid) {
      throw new Error('Kan handout niet verwijderen zonder actieve sessie en id.');
    }

    const deletedExpiresAt = Timestamp.fromMillis(Date.now() + HANDOUT_TRASH_RETENTION_MS);
    await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId), {
      deletedAt: serverTimestamp(),
      deletedByUid: uid,
      deletedExpiresAt,
      updatedAt: serverTimestamp(),
    });
  };

  const handleRestoreHandoutRemote = async (handoutId) => {
    if (role !== 'gm') {
      throw new Error('Alleen de GM kan handouts terugzetten.');
    }
    if (!sessionDocId || !handoutId) {
      throw new Error('Kan handout niet terugzetten zonder actieve sessie en id.');
    }

    await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId), {
      deletedAt: deleteField(),
      deletedByUid: deleteField(),
      deletedExpiresAt: deleteField(),
      updatedAt: serverTimestamp(),
    });
  };

  const handlePermanentDeleteHandoutRemote = async (handoutId) => {
    if (role !== 'gm') {
      throw new Error('Alleen de GM kan handouts definitief verwijderen.');
    }
    if (!sessionDocId || !handoutId) {
      throw new Error('Kan handout niet verwijderen zonder actieve sessie en id.');
    }

    await deleteDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId));
  };

  const trashedHandouts = useMemo(
    () => (role === 'gm'
      ? handouts.filter((entry) => isHandoutDeleted(entry) && !isHandoutTrashExpired(entry))
      : []),
    [handouts, role]
  );

  useEffect(() => {
    if (role !== 'gm' || !sessionDocId) return undefined;

    const expired = handouts.filter(isHandoutTrashExpired);
    if (expired.length === 0) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const batch = writeBatch(db);
        expired.forEach((entry) => {
          batch.delete(doc(db, 'sessions', sessionDocId, 'handouts', entry.id));
        });
        await batch.commit();
      } catch (err) {
        if (!cancelled) console.error('Verlopen handouts opruimen mislukt:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [handouts, role, sessionDocId]);

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
    const member = party.find((p) => p.id === memberId);
    let nextMember = member ? { ...member, [key]: val } : null;

    if (key === 'hp' && member && (Number(val) || 0) > 0 && member.isDead) {
      nextMember = { ...nextMember, isDead: false };
    }

    setParty(party.map((p) => (p.id === memberId && nextMember ? nextMember : p)));
    if (sessionDocId) {
      const fsKey = key === 'init' ? 'initiative' : key;
      try {
        const payload = {
          [fsKey]: val,
          updatedAt: serverTimestamp(),
        };
        if (key === 'hp' && nextMember?.isDead === false && member?.isDead) {
          payload.isDead = false;
        }
        await updateDoc(doc(db, 'sessions', sessionDocId, 'players', memberId), payload);
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
      name: handout.title || i18n.t('common:fallbacks.unnamedNpc'),
      subtitle: handout.npcSubtitle || i18n.t('common:fallbacks.enemy'),
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
    const member = party.find((p) => p.id === memberId);
    const shouldRevive = (Number(newHp) || 0) > 0 && member?.isDead;
    const nextMember = {
      ...member,
      hp: newHp,
      ...(shouldRevive ? { isDead: false } : {}),
    };

    setParty(party.map((p) => (p.id === memberId ? nextMember : p)));
    setDamageTarget(null);
    if (sessionDocId) {
      try {
        const payload = {
          hp: newHp,
          updatedAt: serverTimestamp(),
        };
        if (shouldRevive) payload.isDead = false;
        await updateDoc(doc(db, 'sessions', sessionDocId, 'players', memberId), payload);
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
      customStats: sanitizeCustomStats(finalChar.customStats),
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
          isRevealed: finalChar.isRevealed !== false,
          isDead: finalChar.isDead === true,
          bio: finalChar.bio || '',
          customStats: sanitizeCustomStats(finalChar.customStats),
          avatarUrl: finalChar.avatar || null,
          avatarPosition: normalizeAvatarPosition(finalChar.avatarPosition || DEFAULT_AVATAR_POSITION),
          updatedAt: serverTimestamp(),
        });

        if (finalChar.id === uid && finalChar.isNpc !== true) {
          void createProfileBackup('profile_save', finalChar);
        }
      } catch (err) {
        console.error('Profiel opslaan fout:', err);
      }
    }
  };

  const createProfileBackup = async (reason = 'manual', overridePlayer = null) => {
    if (!uid || !sessionDocId) return;
    if (profileBackupInFlightRef.current) return;

    const ownPlayer = overridePlayer
      || party.find((member) => member.id === uid && member.isNpc !== true);
    if (!ownPlayer || !ownPlayer.name) return;

    const snapshot = buildProfileBackupSnapshot(ownPlayer);
    const signature = profileBackupSignature(snapshot);

    profileBackupInFlightRef.current = true;
    try {
      const backupsRef = collection(db, 'users', uid, 'profileBackups');
      const existingSnap = await getDocs(
        query(backupsRef, where('sessionDocId', '==', sessionDocId))
      );
      const existing = existingSnap.docs
        .map((entry) => ({ id: entry.id, ...(entry.data() || {}) }))
        .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0));

      if (existing[0] && existing[0].signature === signature) {
        return;
      }

      const nowMs = Date.now();
      await addDoc(backupsRef, {
        snapshot,
        signature,
        reason,
        sessionDocId,
        sessionJoinTag: sessionId || '',
        sessionNumber: Number(campaignSessionNumber || 1),
        playerName: snapshot.name,
        createdAt: serverTimestamp(),
        createdAtMs: nowMs,
      });

      const overflow = existing.slice(MAX_PROFILE_BACKUPS - 1);
      if (overflow.length > 0) {
        await Promise.all(
          overflow.map((entry) =>
            deleteDoc(doc(db, 'users', uid, 'profileBackups', entry.id)).catch(() => {})
          )
        );
      }
    } catch (err) {
      console.error('Profielback-up maken mislukt:', err);
    } finally {
      profileBackupInFlightRef.current = false;
    }
  };

  const handleRestoreProfileBackup = async (backup) => {
    if (!uid || !sessionDocId || !backup?.snapshot) return;

    const snapshot = backup.snapshot;
    const restoredFields = {
      nickname: String(snapshot.name || '').trim() || 'Avonturier',
      subtitle: String(snapshot.subtitle || '').trim(),
      bio: String(snapshot.bio || '').trim(),
      hp: Number(snapshot.hp ?? 0),
      maxHp: Number(snapshot.maxHp ?? snapshot.hp ?? 0),
      ac: Number(snapshot.ac ?? 10),
      initMod: Number(snapshot.initMod ?? 0),
      hasAlertFeat: snapshot.hasAlertFeat === true,
      proficiencyBonus: Number(snapshot.proficiencyBonus ?? 2),
      customStats: sanitizeCustomStats(snapshot.customStats),
      avatarUrl: normalizeAvatarUrl(snapshot.avatarUrl),
      avatarPosition: normalizeAvatarPosition(snapshot.avatarPosition),
    };

    try {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'players', uid), {
        ...restoredFields,
        updatedAt: serverTimestamp(),
      });
      setParty((prev) => prev.map((member) => (
        member.id === uid
          ? {
              ...member,
              name: restoredFields.nickname,
              subtitle: restoredFields.subtitle,
              bio: restoredFields.bio,
              hp: restoredFields.hp,
              maxHp: restoredFields.maxHp,
              ac: restoredFields.ac,
              initMod: restoredFields.initMod,
              hasAlertFeat: restoredFields.hasAlertFeat,
              proficiencyBonus: restoredFields.proficiencyBonus,
              customStats: restoredFields.customStats,
              avatar: restoredFields.avatarUrl,
              avatarPosition: restoredFields.avatarPosition,
            }
          : member
      )));
      if (typeof snapshot.name === 'string' && snapshot.name.trim()) {
        setPlayerName(snapshot.name.trim());
      }
      setSessionInfo(i18n.t('session:appInfo.profileRestored'));
    } catch (err) {
      console.error('Profiel herstellen mislukt:', err);
      setSessionError(i18n.t('session:appErrors.restoreProfileFailed'));
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
      setSessionInfo(i18n.t('session:gmTransfer.success', { name: targetMember.name || i18n.t('common:roles.player') }));
      setProfileTarget(null);
    } catch (err) {
      console.error('GM overdracht mislukt:', err);
      setSessionError(i18n.t('session:appErrors.gmTransferFailed'));
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
        isRevealed: npcData.isRevealed === true,
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
          subtitle: npcData.subtitle || i18n.t('common:fallbacks.enemy'),
          hp: npcData.hp ?? 0,
          maxHp: npcData.maxHp ?? npcData.hp ?? 0,
          ac: npcData.ac ?? 10,
          initMod: npcData.initMod ?? 0,
          initiative: null,
          isNpc: true,
          combatParticipation: COMBAT_PARTICIPATION_STATUS.ACTIVE,
          combatJoinRequestStatus: COMBAT_JOIN_REQUEST_STATUS.NONE,
          isRevealed: npcData.isRevealed === true,
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

  const handleSaveSettings = async ({
    nextPlayerName,
    nextAvatarFile,
    nextAvatarUrl,
    nextGmParticipates,
    nextTheme,
    nextBrightness,
    nextSessionNumber,
    nextUiSounds,
    nextLocale,
  }) => {
    let resolvedAvatarUrl = typeof nextAvatarUrl === 'string' && !nextAvatarUrl.startsWith('blob:')
      ? nextAvatarUrl
      : null;

    if (nextAvatarFile && uid) {
      try {
        const ext = nextAvatarFile.name.split('.').pop();
        resolvedAvatarUrl = await uploadImageToStorage(nextAvatarFile, `users/${uid}/avatars/${uid}.${ext}`);
      } catch (err) {
        console.error('Configuratie-avatar uploaden mislukt:', err);
      }
    }

    const normalizedPlayerName = typeof nextPlayerName === 'string'
      ? nextPlayerName.trim()
      : '';

    if (normalizedPlayerName) setPlayerName(normalizedPlayerName);

    if (sessionDocId && uid && (normalizedPlayerName || resolvedAvatarUrl || typeof nextGmParticipates === 'boolean')) {
      const nextCombatParticipation = typeof nextGmParticipates === 'boolean'
        ? (nextGmParticipates ? COMBAT_PARTICIPATION_STATUS.ACTIVE : COMBAT_PARTICIPATION_STATUS.REMOVED)
        : undefined;

      setParty((currentParty) => currentParty.map((member) => (
        member.id === uid && member.isNpc !== true
          ? {
              ...member,
              ...(normalizedPlayerName ? { name: normalizedPlayerName } : {}),
              ...(resolvedAvatarUrl ? { avatar: resolvedAvatarUrl } : {}),
              ...(nextCombatParticipation ? { combatParticipation: nextCombatParticipation } : {}),
            }
          : member
      )));

      try {
        const payload = {
          updatedAt: serverTimestamp(),
          isNpc: false,
          isRevealed: true,
        };
        if (normalizedPlayerName) payload.nickname = normalizedPlayerName;
        if (resolvedAvatarUrl) payload.avatarUrl = resolvedAvatarUrl;
        if (nextCombatParticipation) {
          payload.combatParticipation = nextCombatParticipation;
          payload.combatJoinRequestStatus = COMBAT_JOIN_REQUEST_STATUS.NONE;
        }

        await setDoc(doc(db, 'sessions', sessionDocId, 'players', uid), payload, { merge: true });
      } catch (err) {
        console.error('Configuratieprofiel opslaan mislukt:', err);
      }
    }

    if (typeof nextTheme === 'string') applyTheme(nextTheme);
    if (Number.isFinite(nextBrightness)) handleBrightnessChange(nextBrightness);
    if (typeof nextUiSounds === 'boolean') {
      setUiSounds(nextUiSounds);
      setUiSoundsEnabled(nextUiSounds);
    }
    if (typeof nextLocale === 'string' && nextLocale !== locale) {
      setLocale(nextLocale);
    }
    if (role === 'gm' && Number.isFinite(Number(nextSessionNumber))) {
      await handleUpdateCampaignSessionNumber(nextSessionNumber);
    }

    void createProfileBackup('settings_save');
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
      layoutVersion: 'TV-PDF-R5',
      theme,
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
        customStats: sanitizeCustomStats(currentPlayer?.customStats),
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
      const result = await downloadPlayerArchivePdf(payload);
      setSessionInfo(i18n.t('session:appInfo.exportSuccess', {
        pageCount: result.pageCount,
        sectionCount: result.sectionCount,
        filename: result.filename,
      }));
      setSessionError('');
    } catch (err) {
      console.error('Player archive export fout:', err);
      setSessionError(i18n.t('session:appErrors.exportFailed'));
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

  useEffect(() => {
    if (!qrInviteCode || !showQRJoin) {
      setQrInvitePreview(null);
      return undefined;
    }

    let cancelled = false;

    void resolveSessionPreview(db, qrInviteCode)
      .then((preview) => {
        if (!cancelled) {
          setQrInvitePreview(preview);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrInvitePreview(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qrInviteCode, showQRJoin]);

  if (view === 'landing') {
    // QR-code invite flow — no PIN required after sign-in
    if (showQRJoin) {
      return (
        <>
          <QRJoinScreen
            inviteCode={qrInviteCode}
            campaignName={qrInvitePreview?.campaignName || ''}
            sessionNumber={qrInvitePreview?.sessionNumber || null}
            uid={uid}
            authLoading={authLoading}
            authBusy={authBusy}
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
          {renderAuthOverlay()}
        </>
      );
    }

    return (
      <>
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
          authBusy={authBusy}
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
        {renderAuthOverlay()}
      </>
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
    <>
    <div className={`tv-app tv-app-shell relative flex h-screen w-full flex-col overflow-hidden font-sans tv-text${isMobilePartyOverlay ? ' tv-app-shell--party-overlay' : ''}`} data-theme={theme} data-brightness-step={brightness}>
      {appUpdateNotice ? (
        <div className="absolute inset-x-4 top-3 z-50 mx-auto max-w-3xl rounded-xl px-4 py-3 tv-update-banner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{i18n.t('common:updateBanner.message')}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tv-satisfy-pop rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] tv-update-banner__action"
            >
              {i18n.t('common:updateBanner.refresh')}
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
          campaignName={campaignName}
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
          onOpenSessionHub={() => openSessionHub('overview')}
          onOpenProfile={() => setProfileTarget(party.find(p => p.id === CURRENT_PLAYER_ID))}
          onOpenSettings={() => setIsSettingsOpen(true)}
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
                    trashCount={trashedHandouts.length}
                    onOpenTrash={() => setIsHandoutTrashOpen(true)}
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
                    playerName={playerName || i18n.t('common:roles.player')}
                    preferredChatColor={preferredChatColor}
                    theme={theme}
                    party={party}
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
                    claimNotesByHandoutId={claimNotesByHandoutId}
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
                    onReturnToPool={handleReturnPreparationToPool}
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
            onReturnPlayerToCombat={handleReturnPlayerToCombat}
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

        <SessionHubModal
          isOpen={isSessionHubOpen}
          onClose={() => setIsSessionHubOpen(false)}
          role={role}
          campaignName={campaignName}
          sessionId={sessionId}
          sessionNumber={campaignSessionNumber}
          activePlayerCount={activePlayerCount}
          theme={theme}
          initialTab={sessionHubInitialTab}
          onSaveSessionNumber={handleUpdateCampaignSessionNumber}
          onSaveCampaignName={handleUpdateCampaignName}
          onRollJoinCode={handleRollJoinCode}
          joinCodeRolling={joinCodeRolling}
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
          profileArchives={role === 'player' ? playerProfileArchives : []}
          onActivateProfileArchive={handlePlayerActivateProfileArchive}
          profileArchiveBusy={profileArchiveBusy}
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
            if (!confirmDialog('preparations:modal.deleteConfirmPermanent')) return;
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
          busy={preparationOfferBusy}
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
          claimNote={selectedHandout && selectedHandout !== 'new' ? (claimNotesByHandoutId[selectedHandout.id] || '') : ''}
          onSaveClaimNote={handleSaveHandoutClaimNote}
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

            const upsertHandout = (entry) => setHandouts((prev) => {
              const withoutDup = prev.filter((h) => String(h.id) !== String(entry.id));
              const existedBefore = withoutDup.length !== prev.length;
              return existedBefore
                ? prev.map((h) => (String(h.id) === String(entry.id) ? entry : h))
                : [entry, ...withoutDup];
            });

            try {
              if (selectedHandout === 'new') {
                const newId = await handleCreateHandoutRemote(finalHandout);
                upsertHandout({ ...finalHandout, id: newId });
              } else {
                await handleUpdateHandoutRemote(finalHandout);
                upsertHandout(finalHandout);
              }
            } catch (err) {
              console.error('Handout opslaan fout:', err);
              if (selectedHandout === 'new') {
                upsertHandout({ ...finalHandout, id: Date.now().toString() });
              } else {
                upsertHandout(finalHandout);
              }
            }

            setSelectedHandout(null);
          }}
          onDelete={(handout) => {
            if (!handout?.id) return;
            setHandoutPendingDelete(handout);
          }}
        />

        <HandoutDeleteConfirmModal
          isOpen={Boolean(handoutPendingDelete)}
          handoutTitle={handoutPendingDelete?.title || 'deze handout'}
          onClose={() => setHandoutPendingDelete(null)}
          onConfirm={async () => {
            const id = handoutPendingDelete?.id;
            if (!id) return;
            try {
              await handleSoftDeleteHandoutRemote(id);
            } catch (err) {
              console.error('Handout verwijderen fout:', err);
              return;
            }
            setHandouts((prev) => prev.map((entry) => (
              String(entry.id) === String(id)
                ? {
                  ...entry,
                  deletedAtMs: Date.now(),
                  deletedByUid: uid,
                  deletedExpiresAtMs: Date.now() + HANDOUT_TRASH_RETENTION_MS,
                }
                : entry
            )));
            setHandoutPendingDelete(null);
            setSelectedHandout(null);
          }}
        />

        <HandoutTrashModal
          isOpen={isHandoutTrashOpen}
          onClose={() => setIsHandoutTrashOpen(false)}
          handouts={trashedHandouts}
          onRestore={async (id) => {
            try {
              await handleRestoreHandoutRemote(id);
            } catch (err) {
              console.error('Handout terugzetten mislukt:', err);
            }
          }}
          onPermanentDelete={async (id) => {
            try {
              await handlePermanentDeleteHandoutRemote(id);
            } catch (err) {
              console.error('Handout definitief verwijderen mislukt:', err);
            }
            setHandouts((prev) => prev.filter((entry) => String(entry.id) !== String(id)));
            if (selectedHandout && String(selectedHandout.id) === String(id)) {
              setSelectedHandout(null);
            }
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
          locale={locale}
          onLocaleChange={setLocale}
          currentPlanLabel={currentAccessPlan.label}
          currentAccessPlan={currentAccessPlan}
          sessionPlayerProfile={party.find((member) => member.id === CURRENT_PLAYER_ID && member.isNpc !== true) || null}
          canOpenOwnerPanel={isOwner}
          onOpenOwnerPanel={() => setIsOwnerPanelOpen(true)}
          onSaveSettings={handleSaveSettings}
          profileBackups={profileBackups}
          onRestoreProfileBackup={handleRestoreProfileBackup}
        />

        <OwnerAdminPanel
          isOpen={isOwnerPanelOpen}
          onClose={() => setIsOwnerPanelOpen(false)}
          uid={uid}
          isOwner={isOwner}
        />

        <SourcelistModal
          isOpen={isSourcelistOpen}
          onClose={() => setIsSourcelistOpen(false)}
          theme={theme}
          verifiedTracks={verifiedAmbienceTracks}
          archivedTracks={archivedAmbienceTracks}
        />
      </div>
      {renderAuthOverlay()}
    </>
  );
}

