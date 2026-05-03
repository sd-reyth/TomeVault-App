import React, { useState, useEffect, useRef } from 'react';
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
  updateDoc,
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
  getPersonalTestJoinTag,
} from './lib/sessionUtils';
import LandingScreen from './components/LandingScreen';
import TopBar from './components/TopBar';
import DamageModal from './components/DamageModal';
import ShareModal from './components/ShareModal';
import AddNpcModal from './components/AddNpcModal';
import Sidebar from './components/Sidebar';
import PlaceholderView from './components/PlaceholderView';
import ChatView from './components/ChatView';
import HandoutsView from './components/HandoutsView';
import WalletSection from './components/WalletSection';
import InventoryView from './components/InventoryView';
import NotesView from './components/NotesView';
import EditableStat from './components/EditableStat';
import SettingsModal from './components/SettingsModal';
import AddItemModal from './components/AddItemModal';
import HandoutModal from './components/HandoutModal';
import CharacterProfileModal from './components/CharacterProfileModal';
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

// --- COMPONENTEN ---

export default function TomeVaultApp() {
  const [view, setView] = useState('landing');
  const [role, setRole] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [sessionDocId, setSessionDocId] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState('handouts');
  const [playerName, setPlayerName] = useState('');
  
  const [handouts, setHandouts] = useState(MOCK_HANDOUTS);
  const [party, setParty] = useState(MOCK_PARTY);
  const [chat, setChat] = useState(MOCK_CHAT);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [wallets, setWallets] = useState(MOCK_WALLETS);
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const tavernAudioRef = useRef(null);

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

      await setDoc(doc(db, 'sessions', sessionDoc.id, 'players', uid), {
        nickname: nick,
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

      setPlayerName(nick);
      setRole('player');
      setSessionDocId(sessionDoc.id);
      setSessionId(toLegacyHashJoinTag(sessionData?.joinTag || joinTagRaw));
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
        setView('dashboard');
        return;
      }

      const nick = String(playerName || displayName || 'Avonturier').trim();
      await setDoc(doc(db, 'sessions', snap.id, 'players', uid), {
        nickname: nick,
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

      setPlayerName(nick);
      setRole('player');
      setSessionDocId(snap.id);
      setSessionId(resolvedJoinTag);
      setView('dashboard');
    } catch (err) {
      console.error('Recente sessie hervatten fout:', err);
      setSessionError('Recente sessie openen is mislukt.');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleQuickTestGm = () => {
    if (!uid) return;
    const tag = getPersonalTestJoinTag(uid);
    handleJoin('gm', `#${tag.toUpperCase()}`, {
      skipPinPrompt: true,
      defaultPin: '0000',
      fixedJoinTag: tag,
      forceSessionName: 'Testmodus',
    });
  };

  const handleQuickTestPlayer = () => {
    if (!uid) return;
    const tag = getPersonalTestJoinTag(uid);
    if (!playerName) setPlayerName('Elara');
    handleJoin('player', toLegacyHashJoinTag(tag), {
      skipPin: true,
      playerName: playerName || 'Elara',
    });
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout fout:', err);
    }
    setRole(null);
    setSessionId('');
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
    setWallets({});
    setNotes([]);

    const toIsoTime = (ts) => {
      const ms = ts?.toMillis ? ts.toMillis() : Date.now();
      return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

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
              author: c.displayName || c.author || 'Onbekend',
              text: c.message || c.text || '',
              time: toIsoTime(c.createdAt),
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
          return {
            id: d.id,
            ownerId: i.ownerUid || i.ownerId || 'p1',
            name: i.name || 'Onbekend item',
            desc: i.description || i.desc || '',
            amount: Number(i.amount ?? 1),
            avatarUrl: i.avatarUrl || null,
          };
        });

        setInventory(incoming);
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
                lastEdited: formatLastEditedLabel(n.updatedAt || n.createdAt),
              };
            })
            .filter(Boolean)
            .sort((a, b) => String(b.lastEdited).localeCompare(String(a.lastEdited)));

          setNotes(incoming);
        }
      )
    );

    return () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch (_) {
          // no-op
        }
      });
    };
  }, [sessionDocId, view]);

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

  const handleSendChatRemote = async (text) => {
    if (!sessionDocId || !uid) {
      throw new Error('Geen actieve sessie voor chat.');
    }

    await addDoc(collection(db, 'sessions', sessionDocId, 'chatMessages'), {
      uid,
      displayName: role === 'gm' ? 'GM' : (playerName || displayName || 'Avonturier'),
      message: String(text || '').trim(),
      createdAt: serverTimestamp(),
    });
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

  const handleAddItemSave = async (newItem) => {
    const tempId = 'i' + Date.now();
    setInventory([...inventory, { ...newItem, id: tempId }]);
    setIsAddItemModalOpen(false);
    if (sessionDocId) {
      try {
        await addDoc(collection(db, 'sessions', sessionDocId, 'inventory'), {
          ownerId: newItem.ownerId || null,
          name: newItem.name || 'Item',
          desc: newItem.desc || '',
          amount: Number(newItem.amount) || 1,
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
          onQuickTestGm={handleQuickTestGm}
          onQuickTestPlayer={handleQuickTestPlayer}
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
      />
    );
  }

  return (
    <div className="h-screen w-full bg-stone-950 text-stone-300 font-sans flex flex-col selection:bg-amber-500/30 bg-texture overflow-hidden">
        
        <TopBar 
          role={role} 
          sessionId={sessionId}
          onLogout={handleLogout} 
          isMusicPlaying={isMusicPlaying} 
          setIsMusicPlaying={setIsMusicPlaying} 
          onToggleParty={() => setIsPartyOpen(!isPartyOpen)}
          onOpenShare={() => setShowShareModal(true)}
          onOpenProfile={() => setProfileTarget(party.find(p => p.id === CURRENT_PLAYER_ID))}
        />
        
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setIsSettingsOpen(true)} />
          
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
                  playerName={playerName || 'Speler'}
                  onSendMessageRemote={handleSendChatRemote}
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
          setPlayerName={setPlayerName}
          role={role}
          setRole={setRole}
          onLogout={handleLogout}
        />
      </div>
  );
}

