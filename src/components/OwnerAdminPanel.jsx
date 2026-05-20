import React, { useMemo, useState } from 'react';
import { Crown, RotateCcw, Search, Settings } from 'lucide-react';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getPlanDefinition, OWNER_GRANTABLE_PLAN_IDS, OWNER_GRANT_DURATIONS, PLAN_IDS, resolveActivePlan } from '../lib/accessPlans';
import ModalFrame from './ModalFrame';

function buildExpiryTimestamp(durationKey) {
  const duration = OWNER_GRANT_DURATIONS[durationKey] || OWNER_GRANT_DURATIONS['3months'];
  if (duration.days == null) return null;

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + duration.days);
  return Timestamp.fromDate(expiryDate);
}

export default function OwnerAdminPanel({ isOpen, onClose, uid, isOwner = false }) {
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(PLAN_IDS.GM_PREMIUM);
  const [selectedDurationKey, setSelectedDurationKey] = useState('3months');
  const [resolvedUser, setResolvedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedPlan = useMemo(() => getPlanDefinition(selectedPlanId, 'gm'), [selectedPlanId]);
  const durationOptions = Object.entries(OWNER_GRANT_DURATIONS);

  if (!isOpen || !isOwner) return null;

  const resolveUserByEmail = async (rawEmail) => {
    const normalizedEmail = String(rawEmail || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Voer een e-mailadres in.');
    }

    const userSnap = await getDocs(query(collection(db, 'users'), where('normalizedEmail', '==', normalizedEmail)));
    if (userSnap.empty) {
      throw new Error('Geen gebruiker gevonden met dit e-mailadres. Laat deze gebruiker eerst een keer inloggen.');
    }

    const matchedDoc = userSnap.docs[0];
    const [gmEntitlementSnap, playerEntitlementSnap] = await Promise.all([
      getDoc(doc(db, 'users', matchedDoc.id, 'entitlements', 'gm')),
      getDoc(doc(db, 'users', matchedDoc.id, 'entitlements', 'player')),
    ]);

    return {
      id: matchedDoc.id,
      ...matchedDoc.data(),
      entitlements: {
        gm: gmEntitlementSnap.exists() ? gmEntitlementSnap.data() : null,
        player: playerEntitlementSnap.exists() ? playerEntitlementSnap.data() : null,
      },
    };
  };

  const handleLookupUser = async () => {
    setLoading(true);
    setMessage('');

    try {
      const nextUser = await resolveUserByEmail(searchEmail);
      setResolvedUser(nextUser);
      setMessage(`✓ ${nextUser.displayName || nextUser.email || nextUser.id} gevonden.`);
    } catch (err) {
      setResolvedUser(null);
      setMessage(`✗ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPlan = async () => {
    setLoading(true);
    setMessage('');

    try {
      const targetUser = resolvedUser && String(resolvedUser.normalizedEmail || '').trim() === String(searchEmail || '').trim().toLowerCase()
        ? resolvedUser
        : await resolveUserByEmail(searchEmail);
      const targetScope = selectedPlan.audience;
      const expiresAt = buildExpiryTimestamp(selectedDurationKey);

      await setDoc(doc(db, 'users', targetUser.id, 'entitlements', targetScope), {
        planId: selectedPlan.id,
        audience: targetScope,
        status: 'active',
        grantSource: 'owner',
        grantedByUid: uid,
        grantedReason: 'manual-owner-grant',
        subjectUid: targetUser.id,
        subjectEmail: targetUser.email || String(searchEmail || '').trim().toLowerCase(),
        startsAt: serverTimestamp(),
        expiresAt,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const refreshedUser = await resolveUserByEmail(targetUser.email || searchEmail);
      setResolvedUser(refreshedUser);
      setMessage(`✓ ${selectedPlan.label} toegekend aan ${refreshedUser.displayName || refreshedUser.email || refreshedUser.id}.`);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetToFree = async () => {
    setLoading(true);
    setMessage('');

    try {
      const targetUser = resolvedUser && String(resolvedUser.normalizedEmail || '').trim() === String(searchEmail || '').trim().toLowerCase()
        ? resolvedUser
        : await resolveUserByEmail(searchEmail);

      await deleteDoc(doc(db, 'users', targetUser.id, 'entitlements', selectedPlan.audience));

      const refreshedUser = await resolveUserByEmail(targetUser.email || searchEmail);
      setResolvedUser(refreshedUser);
      const fallbackLabel = selectedPlan.audience === 'gm'
        ? getPlanDefinition(PLAN_IDS.GM_FREE, 'gm').label
        : getPlanDefinition(PLAN_IDS.PLAYER_FREE, 'player').label;
      setMessage(`✓ ${refreshedUser.displayName || refreshedUser.email || refreshedUser.id} teruggezet naar ${fallbackLabel}.`);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resolvedGmPlan = resolveActivePlan({ role: 'gm', entitlement: resolvedUser?.entitlements?.gm || null });
  const resolvedPlayerPlan = resolveActivePlan({ role: 'player', entitlement: resolvedUser?.entitlements?.player || null });

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Owner Panel"
      icon={Settings}
      maxWidthClassName="max-w-2xl"
      bodyClassName="gap-5 sm:gap-6"
    >
      <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-100/90">
        Dit is de snelle owner-flow voor handmatige upgrades. Free plannen blijven impliciet: zonder entitlement krijgt een gebruiker automatisch GM Free of Player Free, afhankelijk van de context waarin hij de app gebruikt.
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Gebruiker zoeken op e-mail</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(event) => setSearchEmail(event.target.value)}
                placeholder="tester@example.com"
                className="h-10 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-stone-200 placeholder:text-stone-500 focus:border-amber-400/70 focus:outline-none focus:bg-white/7 transition-all duration-200"
              />
              <button
                type="button"
                onClick={handleLookupUser}
                disabled={loading}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 font-fantasy text-xs uppercase tracking-[0.16em] text-stone-300 transition-all duration-200 hover:border-amber-400/50 hover:bg-white/7 hover:text-amber-200 active:scale-95 disabled:opacity-50"
              >
                <Search className="h-4 w-4" /> Zoek
              </button>
            </div>
          </div>

          {resolvedUser ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-fantasy text-sm uppercase tracking-[0.16em] text-stone-100">{resolvedUser.displayName || 'Naamloos account'}</p>
                  <p className="mt-1 text-sm text-stone-400">{resolvedUser.email || searchEmail}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">UID: {resolvedUser.id}</p>
                  {resolvedUser.lastKnownRole ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-amber-400">Laatste bekende rol: {resolvedUser.lastKnownRole}</p>
                  ) : null}
                </div>
                <div className="rounded-full border border-amber-700/40 bg-amber-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                  Gevonden
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">GM plan</p>
                  <p className="mt-2 text-sm font-semibold text-stone-100">{resolvedGmPlan.label}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">Player plan</p>
                  <p className="mt-2 text-sm font-semibold text-stone-100">{resolvedPlayerPlan.label}</p>
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <div className={`rounded-2xl border p-3 text-sm font-semibold ${message.startsWith('✗') ? 'border-rose-700/40 bg-rose-950/30 text-rose-200' : 'border-emerald-700/40 bg-emerald-950/30 text-emerald-200'}`}>
              {message}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border border-stone-800 bg-stone-950/40 p-4">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Plan</label>
            <select
              value={selectedPlanId}
              onChange={(event) => setSelectedPlanId(event.target.value)}
              className="h-10 w-full rounded-lg border border-stone-700 bg-stone-950/80 px-3 text-sm text-stone-200 focus:border-amber-600/50 focus:outline-none"
            >
              {OWNER_GRANTABLE_PLAN_IDS.map((planId) => {
                const plan = getPlanDefinition(planId, 'gm');
                return <option key={planId} value={planId}>{plan.label}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Duur</label>
            <select
              value={selectedDurationKey}
              onChange={(event) => setSelectedDurationKey(event.target.value)}
              className="h-10 w-full rounded-lg border border-stone-700 bg-stone-950/80 px-3 text-sm text-stone-200 focus:border-amber-600/50 focus:outline-none"
            >
              {durationOptions.map(([key, option]) => (
                <option key={key} value={key}>{option.label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGrantPlan}
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-gradient-to-r from-amber-700 to-amber-600 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-100 transition-all duration-200 hover:shadow-lg hover:shadow-amber-700/40 active:scale-95 disabled:opacity-50"
          >
            <Crown className="h-4 w-4" /> {loading ? 'Bezig...' : `${selectedPlan.label} toekennen`}
          </button>

          <button
            type="button"
            onClick={handleResetToFree}
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-900 font-fantasy text-sm uppercase tracking-[0.16em] text-stone-200 transition-all duration-200 hover:border-stone-600 hover:text-stone-100 active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Terug naar gratis
          </button>

          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-xs leading-relaxed text-stone-400">
            Stripe, redeem codes en usage analytics horen in fase 2. Deze panel is bewust gebouwd voor directe owner grants zonder publieke Cloud Functions.
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
