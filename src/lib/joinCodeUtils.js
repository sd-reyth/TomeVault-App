import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  getJoinTagLookupVariants,
  slugifySessionName,
  toLegacyHashJoinTag,
  toSafeJoinTagForLink,
} from './sessionUtils';

function isPermissionError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('permission-denied') || message.includes('missing or insufficient permissions');
}

async function getJoinCodeAliasDoc(db, safeCode) {
  try {
    return await getDoc(doc(db, 'joinCodes', safeCode));
  } catch (error) {
    if (isPermissionError(error)) return null;
    throw error;
  }
}

async function isJoinTagAvailable(db, candidate) {
  const sessionsRef = collection(db, 'sessions');
  const safeCandidate = toSafeJoinTagForLink(candidate);
  const [hashSnap, safeSnap, aliasSnap] = await Promise.all([
    getDocs(query(sessionsRef, where('joinTag', '==', candidate))),
    getDocs(query(sessionsRef, where('joinTag', '==', safeCandidate))),
    getJoinCodeAliasDoc(db, safeCandidate),
  ]);

  return hashSnap.empty && safeSnap.empty && !(aliasSnap?.exists?.());
}

export async function generateUniqueJoinTag(db, sessionName) {
  const base = slugifySessionName(sessionName);

  for (let i = 0; i < 30; i += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${base}#${code}`;
    if (await isJoinTagAvailable(db, candidate)) {
      return toLegacyHashJoinTag(candidate);
    }
  }

  return toLegacyHashJoinTag(`${base}#${String(Date.now()).slice(-4)}`);
}

export async function resolveSessionDocFromJoinInput(db, joinTagRaw) {
  const variants = getJoinTagLookupVariants(joinTagRaw);
  const seenSessionIds = new Set();

  for (const candidate of variants) {
    const safeCode = toSafeJoinTagForLink(candidate);
    const aliasSnap = await getJoinCodeAliasDoc(db, safeCode);
    if (aliasSnap?.exists?.()) {
      const { sessionId } = aliasSnap.data() || {};
      if (sessionId && !seenSessionIds.has(sessionId)) {
        seenSessionIds.add(sessionId);
        const sessionSnap = await getDoc(doc(db, 'sessions', sessionId));
        if (sessionSnap.exists()) {
          return sessionSnap;
        }
      }
    }
  }

  const sessionsRef = collection(db, 'sessions');
  for (const candidate of variants) {
    const byTag = await getDocs(query(sessionsRef, where('joinTag', '==', candidate)));
    if (!byTag.empty) {
      return byTag.docs[0];
    }
  }

  for (const candidate of variants) {
    const byId = await getDoc(doc(db, 'sessions', candidate));
    if (byId.exists()) {
      return byId;
    }
  }

  return null;
}

export async function resolveSessionPreview(db, joinTagRaw) {
  const sessionDoc = await resolveSessionDocFromJoinInput(db, joinTagRaw);
  if (!sessionDoc) return null;

  const data = sessionDoc.data() || {};
  return {
    sessionDocId: sessionDoc.id,
    campaignName: String(data.name || '').trim(),
    sessionNumber: Math.max(1, Number(data.campaignSessionNumber) || 1),
    joinTag: toLegacyHashJoinTag(data.joinTag || joinTagRaw),
  };
}

export async function ensureJoinCodeAlias(db, sessionDocId, joinTag) {
  if (!sessionDocId || !joinTag) return;

  const normalizedTag = toLegacyHashJoinTag(joinTag);
  const safeCode = toSafeJoinTagForLink(normalizedTag);
  const aliasRef = doc(db, 'joinCodes', safeCode);
  const aliasSnap = await getJoinCodeAliasDoc(db, safeCode);

  if (aliasSnap?.exists?.()) {
    const existing = aliasSnap.data() || {};
    return existing.sessionId === sessionDocId;
  }

  try {
    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(aliasRef);
      if (freshSnap.exists()) return;

      transaction.set(aliasRef, {
        sessionId: sessionDocId,
        joinTag: normalizedTag,
        createdAt: serverTimestamp(),
      });
    });

    return true;
  } catch (error) {
    if (isPermissionError(error)) return false;
    throw error;
  }
}

export async function rollJoinCodeForSession(db, { sessionDocId, sessionName, currentJoinTag }) {
  if (!sessionDocId) {
    throw new Error('Sessie ontbreekt.');
  }

  const newJoinTag = await generateUniqueJoinTag(db, sessionName);
  const oldSafeCode = toSafeJoinTagForLink(currentJoinTag);
  const newSafeCode = toSafeJoinTagForLink(newJoinTag);
  const sessionRef = doc(db, 'sessions', sessionDocId);
  const newAliasRef = doc(db, 'joinCodes', newSafeCode);

  await runTransaction(db, async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error('Sessie niet gevonden.');
    }

    const aliasSnap = await transaction.get(newAliasRef);
    if (aliasSnap.exists()) {
      throw new Error('Nieuwe code is al bezet. Probeer opnieuw.');
    }

    transaction.set(newAliasRef, {
      sessionId: sessionDocId,
      joinTag: newJoinTag,
      createdAt: serverTimestamp(),
    });

    transaction.update(sessionRef, {
      joinTag: newJoinTag,
      updatedAt: serverTimestamp(),
    });

    if (oldSafeCode && oldSafeCode !== newSafeCode) {
      transaction.delete(doc(db, 'joinCodes', oldSafeCode));
    }
  });

  return newJoinTag;
}
