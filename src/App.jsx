import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music } from 'lucide-react';
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
import { getLocalDevBootstrapConfig, getRuntimeBadgeState } from './lib/runtimeContext';
import LandingScreen from './components/LandingScreen';
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
import AddItemModal from './components/AddItemModal';
import HandoutModal from './components/HandoutModal';
import CharacterProfileModal from './components/CharacterProfileModal';
import PreparationModal from './components/PreparationModal';
import PlayerPickerModal from './components/PlayerPickerModal';
import PreparationOfferModal from './components/PreparationOfferModal';
import RightSidebar from './components/RightSidebar';

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

async function writeMembership({ uid, sessionId, role, sessionName, joinTag }) {
  if (!uid || !sessionId) return;
  const ref = doc(db, 'users', uid, 'memberships', sessionId);
  await setDoc(ref, {
    sessionId,
    role,
    sessionName: sessionName || '',
    joinTag: joinTag || '',
    status: 'active',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

const CHAT_ACCENT_COLORS = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  teal: '#14b8a6',
  emerald: '#10b981',
  lime: '#84cc16',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#f43f5e',
  pink: '#ec4899',
  fuchsia: '#d946ef',
  cyan: '#22d3ee',
};

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
    imageUrl: String(data.imageUrl || data.avatarUrl || '').trim() || null,
    hp: Number(data.hp ?? data.hitPoints ?? 0),
    maxHp: Number(data.maxHp ?? data.maxHitPoints ?? data.hp ?? data.hitPoints ?? 0),
    ac: Number(data.ac ?? data.armorClass ?? 10),
    initMod: Number(data.initMod ?? data.dexterityMod ?? 0),
    customStats: sanitizeCustomStats(data.customStats),
    sourceUid: String(data.sourceUid || '').trim() || null,
    sourceType: String(data.sourceType || '').trim() || 'manual',
    createdByUid: String(data.createdByUid || '').trim() || null,
    assignedToUid: String(data.assignedToUid || '').trim() || null,
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
      avatarUrl: String(snapshot.avatarUrl || '').trim() || null,
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
    imageUrl: String(character.avatar || '').trim() || null,
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
    avatarUrl: String(player.avatar || fallbacks.avatarUrl || '').trim() || null,
    hp: Number(player.hp ?? fallbacks.hp ?? 0),
    maxHp: Number(player.maxHp ?? fallbacks.maxHp ?? player.hp ?? fallbacks.hp ?? 0),
    ac: Number(player.ac ?? fallbacks.ac ?? 10),
    initMod: Number(player.initMod ?? fallbacks.initMod ?? 0),
    customStats: sanitizeCustomStats(player.customStats || fallbacks.customStats),
  };
}

// --- COMPONENTEN ---

export default function TomeVaultApp() {
  const [view, setView] = useState('landing');
  const [role, setRole] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [sessionDocId, setSessionDocId] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState('handouts');
  const [playerName, setPlayerName] = useState('');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('tv_theme');
    if (saved) {
      if (saved === 'parchment' || saved === 'sunlight') return 'amber';
      return saved;
    }
    return 'purple';
  });

  const handleThemeChange = (t) => { setTheme(t); localStorage.setItem('tv_theme', t); };
  
  const [handouts, setHandouts] = useState(MOCK_HANDOUTS);
  const [party, setParty] = useState(MOCK_PARTY);
  const [chat, setChat] = useState(MOCK_CHAT);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [wallets, setWallets] = useState(MOCK_WALLETS);
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [preparations, setPreparations] = useState([]);
  const [preparationBackups, setPreparationBackups] = useState([]);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const tavernAudioRef = useRef(null);
  const isClearingInventorySectionsRef = useRef(false);
  const lastInventorySectionCleanupSignatureRef = useRef('');
  const isBackfillingInventoryDescriptionsRef = useRef(false);
  const lastInventoryDescriptionBackfillSignatureRef = useRef('');
  const localDevBootstrapRef = useRef({ key: '', lastAuthAttemptAt: 0, lastJoinAttemptAt: 0 });
  const localDevBootstrapFallbackWarnedRef = useRef(false);

  // Firebase auth state
  const [uid, setUid] = useState(null);
  const [isGuest, setIsGuest] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [sessionBusy, setSessionBusy] = useState(false);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentSessionsLoaded, setRecentSessionsLoaded] = useState(false);
  const autoResumeAttemptRef = useRef('');
  
  // State voor Gevechtstracker
  const [battleActive, setBattleActive] = useState(false);
  const [currentTurnId, setCurrentTurnId] = useState(null);
  const [turnRound, setTurnRound] = useState(1);

  // State voor mobiele lay-out en modals
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isNpcModalOpen, setIsNpcModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [damageTarget, setDamageTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [selectedHandout, setSelectedHandout] = useState(null);
  const [selectedPreparation, setSelectedPreparation] = useState(null);
  const [assigningPreparation, setAssigningPreparation] = useState(null);
  const [pendingPreparationOffer, setPendingPreparationOffer] = useState(null);
  const [campaignSessionNumber, setCampaignSessionNumber] = useState(1);
  const localDevBootstrap = useMemo(() => getLocalDevBootstrapConfig(), []);
  const runtimeBadge = useMemo(
    () => getRuntimeBadgeState({ role, localDevBootstrap }),
    [localDevBootstrap, role]
  );

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

          for (const candidate of variants) {
            const byTag = await getDocs(query(collection(db, 'sessions'), where('joinTag', '==', candidate)));
            if (!byTag.empty) {
              existing = byTag.docs[0];
              break;
            }
          }

          if (existing) {
            const existingData = existing.data() || {};
            if (existingData.gmUid !== uid) {
              setSessionError('Deze testsessie is al in gebruik door een andere GM.');
              return;
            }

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
        } else {
          joinTag = await generateUniqueJoinTag(sessionName);
        }

        const sessionData = {
          name: sessionName,
          joinTag,
          pinHash,
          gmUid: uid,
          campaignSessionNumber: 1,
          battleActive: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ambience: { track: 'tavern', volume: 0.6, isPlaying: false },
          isOneShot: false,
        };

        const created = await addDoc(collection(db, 'sessions'), sessionData);

        await writeMembership({
          uid,
          sessionId: created.id,
          role: 'dm',
          sessionName,
          joinTag,
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

      await setDoc(existingPlayerRef, {
        nickname: resolvedNick,
        joinedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        isNpc: false,
        isRevealed: true,
        initiative: null,
      }, { merge: true });

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

      await setDoc(existingPlayerRef, {
        nickname: resolvedNick,
        joinedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        isNpc: false,
        isRevealed: true,
        initiative: null,
      }, { merge: true });

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
          setRole(null);
          setSessionId('');
          setCampaignSessionNumber(1);
          setSessionDocId('');
          setView('landing');
          setIsMusicPlaying(false);
          setIsPartyOpen(false);
          setBattleActive(false);
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
    setRole(null);
    setSessionId('');
    setCampaignSessionNumber(1);
    setSessionDocId('');
    setView('landing');
    setIsMusicPlaying(false);
    setIsPartyOpen(false);
    setBattleActive(false);
  };

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
    const audio = new Audio('/audio/Tavern - Music and Ambience.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    tavernAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      tavernAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = tavernAudioRef.current;
    if (!audio) return;

    if (isMusicPlaying) {
      audio.play().catch((err) => {
        console.warn('Muziek kon niet starten:', err);
        setIsMusicPlaying(false);
      });
      return;
    }

    audio.pause();
  }, [isMusicPlaying]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const inferredName = user.displayName || user.email?.split('@')[0] || 'Avonturier';
        setUid(user.uid);
        setIsGuest(user.isAnonymous);
        setDisplayName(inferredName);
        setPlayerName((prev) => prev || inferredName);
      } else {
        setUid(null);
        setIsGuest(true);
        setDisplayName('');
        setRole(null);
        setSessionId('');
        setSessionDocId('');
        setView('landing');
        setRecentSessions([]);
      }
      setAuthLoading(false);
    });

    return () => unsub();
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

    const latestActiveSession = recentSessions.find((session) => session?.status !== 'hidden');
    if (!latestActiveSession) {
      autoResumeAttemptRef.current = uid;
      return;
    }

    autoResumeAttemptRef.current = uid;
    const preferredRole = latestActiveSession.role === 'dm' ? 'gm' : 'player';
    handleResumeRecentSession(latestActiveSession, preferredRole);
  }, [authLoading, recentSessions, recentSessionsLoaded, sessionBusy, sessionDocId, uid, view]);

  useEffect(() => {
    if (!sessionDocId || view !== 'dashboard') return undefined;

    const unsubs = [];
    const sid = sessionDocId;

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
    lastInventorySectionCleanupSignatureRef.current = '';
    isClearingInventorySectionsRef.current = false;
    lastInventoryDescriptionBackfillSignatureRef.current = '';
    isBackfillingInventoryDescriptionsRef.current = false;

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
        setCampaignSessionNumber(Number(s.campaignSessionNumber || 1));
      })
    );

    unsubs.push(
      onSnapshot(collection(db, 'sessions', sid, 'handouts'), (snap) => {
        const incoming = snap.docs.map((d) => {
          const h = d.data() || {};
          return {
            id: d.id,
            title: h.title || 'Naamloze handout',
            type: String(h.type || 'clue').toLowerCase(),
            content: h.publicContent || h.content || '',
            secret: h.secretContent || h.secret || '',
            isRevealed: h.revealed === true || h.isRevealed === true,
            claimable: h.claimable === true,
            claimedBy: h.claimedByUid || h.claimedBy || null,
            imageUrl: h.imageUrl || null,
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
            avatar: p.avatarUrl || p.avatar || null,
            bio: p.bio || '',
            customStats: Array.isArray(p.customStats) ? p.customStats : [],
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
            ownerId: i.ownerUid || i.ownerId || 'p1',
            name: i.name || 'Onbekend item',
            desc: desc || legacyDescription || '',
            legacyDescription,
            needsDescriptionBackfill: !hasNonEmptyText(desc) && hasNonEmptyText(legacyDescription),
            amount: Number(i.amount ?? 1),
            imageUrl: i.imageUrl || i.avatarUrl || null,
            category: String(i.category || 'overig').toLowerCase(),
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
            bronze: Number(w.bronze ?? 0),
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
                title: n.title || 'Nieuwe Notitie',
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
      setAuthError(err?.message || 'Google inloggen is mislukt.');
    }
  };

  const handleSignInGuest = async () => {
    setAuthError('');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setAuthError(err?.message || 'Gastmodus starten is mislukt.');
    }
  };

  const handleSignInEmail = async ({ email, password }) => {
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err?.message || 'Inloggen met e-mail is mislukt.');
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
      setAuthError(err?.message || 'Account aanmaken is mislukt.');
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
    try {
      if (sessionDocId) {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId), {
          claimedByUid: playerId,
          claimedByNick: playerName || displayName || 'Speler',
          claimedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Claim handout fout:', err);
    }

    setHandouts(handouts.map(h => h.id === handoutId ? { ...h, claimedBy: playerId } : h));
  };

  const handleUnclaimHandout = async (handoutId) => {
    try {
      if (sessionDocId) {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId), {
          claimedByUid: null,
          claimedByNick: null,
          claimedAt: null,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Unclaim handout fout:', err);
    }

    setHandouts(handouts.map(h => h.id === handoutId ? { ...h, claimedBy: null } : h));
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
    if (!sessionDocId || !uid || !nextColor) return;

    try {
      const legacyDisplayName = role === 'gm' ? 'GM' : (playerName || displayName || 'Avonturier');
      const [uidSnap, legacySnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions', sessionDocId, 'chatMessages'), where('uid', '==', uid))),
        getDocs(query(collection(db, 'sessions', sessionDocId, 'chatMessages'), where('displayName', '==', legacyDisplayName))),
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
          batch.update(d.ref, { color: nextColor });
        });
        await batch.commit();
      }

      setChat((prev) => prev.map((msg) => {
        const mineByUid = msg.uid && msg.uid === uid;
        const mineLegacy = !msg.uid && msg.author === legacyDisplayName;
        return mineByUid || mineLegacy ? { ...msg, color: nextColor } : msg;
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

    if (draft?.id) {
      await updateDoc(doc(db, 'sessions', sessionDocId, 'characterTemplates', draft.id), payload);
      return draft.id;
    }

    const created = await addDoc(collection(db, 'sessions', sessionDocId, 'characterTemplates'), {
      ...payload,
      createdAt: serverTimestamp(),
      createdByUid: uid,
      assignedToUid: null,
      assignmentStatus: 'unassigned',
      offeredAt: null,
      respondedAt: null,
    });

    return created.id;
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

  const buildHandoutPayload = (handout = {}) => ({
    title: handout.title || 'Naamloze handout',
    type: String(handout.type || 'clue').toLowerCase(),
    publicContent: handout.content || '',
    secretContent: handout.secret || '',
    revealed: handout.isRevealed === true,
    claimable: handout.claimable === true,
    claimedByUid: handout.claimedBy || null,
    imageUrl: handout.imageUrl || null,
    updatedAt: serverTimestamp(),
  });

  const handleCreateHandoutRemote = async (handout) => {
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
    if (!sessionDocId || !handout?.id) {
      throw new Error('Kan handout niet bijwerken zonder actieve sessie en id.');
    }

    await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', handout.id), {
      ...buildHandoutPayload(handout),
    });
  };

  const handleDeleteHandoutRemote = async (handoutId) => {
    if (!sessionDocId || !handoutId) {
      throw new Error('Kan handout niet verwijderen zonder actieve sessie en id.');
    }

    await deleteDoc(doc(db, 'sessions', sessionDocId, 'handouts', handoutId));
  };

  const handleToggleVisibility = async (id) => {
    if (role !== 'gm') return;
    const handout = handouts.find(h => h.id === id);
    if (!handout) return;
    const next = !handout.isRevealed;
    setHandouts(handouts.map(h => h.id === id ? { ...h, isRevealed: next } : h));
    if (sessionDocId) {
      try {
        await updateDoc(doc(db, 'sessions', sessionDocId, 'handouts', id), {
          revealed: next,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Visibility toggle fout:', err);
        setHandouts(handouts.map(h => h.id === id ? { ...h, isRevealed: !next } : h));
      }
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

  const handleDamageModalSave = async (memberId, newHp) => {
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
          bio: finalChar.bio || '',
          customStats: finalChar.customStats || [],
          avatarUrl: finalChar.avatar || null,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('Profiel opslaan fout:', err);
      }
    }
  };

  const handleOpenPreparationFromCharacter = (character) => {
    if (!character || role !== 'gm') return;
    setSelectedPreparation(snapshotPreparationFromCharacter(character));
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

  const handleAddNpcSave = async (npcData) => {
    const tempId = 'n' + Date.now();
    setParty([...party, { ...npcData, id: tempId, isNpc: true, init: null }]);
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
          isRevealed: true,
          avatarUrl: npcData.avatar || null,
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
          category: String(newItem.category || 'overig').toLowerCase(),
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

  const handleSaveSettings = async ({ nextPlayerName, nextTheme, nextSessionNumber }) => {
    if (typeof nextPlayerName === 'string') setPlayerName(nextPlayerName);
    if (typeof nextTheme === 'string') handleThemeChange(nextTheme);
    if (role === 'gm' && Number.isFinite(Number(nextSessionNumber))) {
      await handleUpdateCampaignSessionNumber(nextSessionNumber);
    }
  };

  const handleAdjustWallet = async (ownerId, coinKey, delta) => {
    if (!['platinum', 'gold', 'silver', 'bronze'].includes(coinKey)) return;

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

  const handleDeleteNpc = async (npcId) => {
    const previousParty = party;
    setParty((prev) => prev.filter((p) => p.id !== npcId));

    if (sessionDocId) {
      try {
        await deleteDoc(doc(db, 'sessions', sessionDocId, 'players', npcId));
      } catch (err) {
        console.error('NPC verwijderen fout:', err);
        setParty(previousParty);
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

  if (view === 'landing') {
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
          isGuest={isGuest}
          displayName={displayName}
          authLoading={authLoading}
          authError={authError}
          onSignInGoogle={handleSignInGoogle}
          onSignInGuest={handleSignInGuest}
          onSignInEmail={handleSignInEmail}
          onSignUpEmail={handleSignUpEmail}
          sessionError={sessionError}
          sessionInfo={sessionInfo}
          sessionBusy={sessionBusy}
          onBackfillMemberships={handleBackfillMemberships}
          runtimeBadge={runtimeBadge}
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
    <div data-theme={theme} className="h-screen w-full bg-stone-950 text-stone-300 font-sans flex flex-col selection:bg-amber-500/30 bg-texture overflow-hidden">
        
        <TopBar 
          role={role} 
          sessionId={sessionId}
          sessionNumber={campaignSessionNumber}
          onLogout={handleLogout} 
          isMusicPlaying={isMusicPlaying} 
          setIsMusicPlaying={setIsMusicPlaying} 
          onToggleParty={() => setIsPartyOpen(!isPartyOpen)}
          onOpenShare={() => setShowShareModal(true)}
          onOpenProfile={() => setProfileTarget(party.find(p => p.id === CURRENT_PLAYER_ID))}
          onOpenSettings={() => setIsSettingsOpen(true)}
          runtimeBadge={runtimeBadge}
        />
        
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setIsSettingsOpen(true)} role={role} />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative no-scrollbar">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-amber-900/5 blur-[100px] pointer-events-none" />
            
            <div className="max-w-[1120px] mx-auto h-full relative z-10">
              {activeTab === 'handouts' && (
                <HandoutsView 
                  role={role} 
                  handouts={handouts} 
                  onToggleVisibility={handleToggleVisibility}
                  onOpenHandout={(h) => setSelectedHandout(h)} 
                  onCreateHandout={() => setSelectedHandout('new')}
                  onClaim={(id) => handleClaimHandout(id, CURRENT_PLAYER_ID)}
                />
              )}
              {activeTab === 'chat' && (
                <ChatView
                  chat={chat}
                  setChat={setChat}
                  role={role}
                  uid={uid}
                  playerName={playerName || 'Speler'}
                  onSendMessageRemote={handleSendChatRemote}
                  onEditMessage={handleEditChatMessage}
                  onDeleteMessage={handleDeleteChatMessage}
                  onChangeColor={handleUpdateChatColor}
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryView 
                  role={role} 
                  inventory={inventory} 
                  wallets={wallets} 
                  party={party} 
                  currentPlayerId={CURRENT_PLAYER_ID} 
                  handouts={handouts}
                  onUnclaim={handleUnclaimHandout}
                  onOpenHandout={(h) => setSelectedHandout(h)}
                  onOpenAddItem={() => setIsAddItemModalOpen(true)}
                  onUpdateItemAmount={handleUpdateItemAmount}
                  onDeleteItem={handleDeleteItem}
                  onAdjustWallet={handleAdjustWallet}
                />
              )}
              {activeTab === 'preparations' && role === 'gm' && (
                <PreparationsView
                  templates={preparations}
                  backups={preparationBackups}
                  party={party}
                  onCreatePreparation={() => setSelectedPreparation('new')}
                  onEditPreparation={(preparation) => setSelectedPreparation(preparation)}
                  onDeletePreparation={(preparation) => handleDeletePreparationRemote(preparation)}
                  onAssignPreparation={(preparation) => setAssigningPreparation(preparation)}
                  onRestoreBackup={handleRestorePreparationBackup}
                />
              )}
              {activeTab === 'notes' && (
                <NotesView 
                  role={role} 
                  notes={notes} 
                  setNotes={setNotes} 
                  currentPlayerId={CURRENT_PLAYER_ID}
                  onCreateNoteRemote={handleCreateNoteRemote}
                  onUpdateNoteRemote={handleUpdateNoteRemote}
                  onDeleteNoteRemote={handleDeleteNoteRemote}
                />
              )}
            </div>
          </main>

          <RightSidebar 
            party={party} 
            setParty={setParty} 
            role={role} 
            isOpen={isPartyOpen} 
            onClose={() => setIsPartyOpen(false)}
            battleActive={battleActive}
            setBattleActive={setBattleActive}
            currentTurnId={currentTurnId}
            setCurrentTurnId={setCurrentTurnId}
            turnRound={turnRound}
            setTurnRound={setTurnRound}
            onOpenNpcModal={() => setIsNpcModalOpen(true)}
            onOpenDamageModal={(member) => setDamageTarget(member)}
            onOpenProfile={(member) => setProfileTarget(member)}
            currentPlayerId={CURRENT_PLAYER_ID}
            onUpdateStat={handleUpdatePlayerStat}
            isPinned={isSidebarPinned}
            setIsPinned={setIsSidebarPinned}
            onRemoveNpc={handleDeleteNpc}
          />
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
          onSave={handleProfileSave}
          onTransferGm={handleTransferGm}
          onSaveAsPreparation={handleOpenPreparationFromCharacter}
          chatColor={getCharacterChatColor(profileTarget)}
        />

        <PreparationModal
          isOpen={selectedPreparation !== null}
          preparation={selectedPreparation === 'new' ? null : selectedPreparation}
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
          onClose={() => setIsAddItemModalOpen(false)}
          role={role}
          party={party}
          currentPlayerId={CURRENT_PLAYER_ID}
          onSave={handleAddItemSave}
        />

        <HandoutModal
          isOpen={!!selectedHandout}
          handout={selectedHandout === 'new' ? null : selectedHandout}
          role={role}
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
                setHandouts([{ ...finalHandout, id: newId }, ...handouts]);
              } else {
                await handleUpdateHandoutRemote(finalHandout);
                setHandouts(handouts.map(h => h.id === finalHandout.id ? finalHandout : h));
              }
            } catch (err) {
              console.error('Handout opslaan fout:', err);
              if (selectedHandout === 'new') {
                setHandouts([{ ...finalHandout, id: Date.now().toString() }, ...handouts]);
              } else {
                setHandouts(handouts.map(h => h.id === finalHandout.id ? finalHandout : h));
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
            setHandouts(handouts.filter(h => h.id !== id));
            setSelectedHandout(null);
          }}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          playerName={playerName}
          role={role}
          onLogout={handleLogout}
          theme={theme}
          sessionNumber={campaignSessionNumber}
          onSaveSettings={handleSaveSettings}
        />
      </div>
  );
}

