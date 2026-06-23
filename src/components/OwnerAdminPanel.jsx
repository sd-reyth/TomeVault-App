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
      title="Owner"
      icon={Settings}
      maxWidthClassName="max-w-2xl"
      bodyClassName="gap-5 sm:gap-6"
    >
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--tv-accent),transparent_55%)] bg-[color-mix(in_srgb,var(--tv-accent),transparent_88%)] p-4 text-sm tv-accent">
        Handmatige plan-toekenning. Zonder entitlement krijgt een gebruiker automatisch het gratis plan.
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div>
            <label className="tv-label mb-2 block">E-mail</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(event) => setSearchEmail(event.target.value)}
                placeholder="tester@example.com"
                className="tv-field h-10 flex-1"
              />
              <button
                type="button"
                onClick={handleLookupUser}
                disabled={loading}
                className="tv-button-secondary inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-fantasy uppercase tracking-[0.16em]">Zoek</span>
              </button>
            </div>
          </div>

          {resolvedUser ? (
            <div className="tv-panel-inset rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-fantasy text-sm uppercase tracking-[0.16em] tv-text">{resolvedUser.displayName || 'Naamloos'}</p>
                  <p className="tv-text-sub mt-1 text-sm">{resolvedUser.email || searchEmail}</p>
                  <p className="tv-muted mt-2 text-xs uppercase tracking-[0.16em]">UID: {resolvedUser.id}</p>
                  {resolvedUser.lastKnownRole ? (
                    <p className="tv-accent mt-2 text-xs uppercase tracking-[0.16em]">Rol: {resolvedUser.lastKnownRole}</p>
                  ) : null}
                </div>
                <div className="tv-chip-surface tv-accent rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                  OK
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="tv-panel-inset rounded-xl p-3">
                  <p className="tv-label">GM</p>
                  <p className="mt-2 text-sm font-semibold tv-text">{resolvedGmPlan.label}</p>
                </div>
                <div className="tv-panel-inset rounded-xl p-3">
                  <p className="tv-label">Player</p>
                  <p className="mt-2 text-sm font-semibold tv-text">{resolvedPlayerPlan.label}</p>
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

        <div className="tv-panel-inset space-y-4 rounded-2xl p-4">
          <div>
            <label className="tv-label mb-2 block">Plan</label>
            <select
              value={selectedPlanId}
              onChange={(event) => setSelectedPlanId(event.target.value)}
              className="tv-select"
            >
              {OWNER_GRANTABLE_PLAN_IDS.map((planId) => {
                const plan = getPlanDefinition(planId, 'gm');
                return <option key={planId} value={planId}>{plan.label}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="tv-label mb-2 block">Duur</label>
            <select
              value={selectedDurationKey}
              onChange={(event) => setSelectedDurationKey(event.target.value)}
              className="tv-select"
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
            className="tv-button-primary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-50"
          >
            <Crown className="h-4 w-4" /> {loading ? '…' : selectedPlan.label}
          </button>

          <button
            type="button"
            onClick={handleResetToFree}
            disabled={loading}
            className="tv-button-secondary inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg font-fantasy text-sm uppercase tracking-[0.16em] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Gratis
          </button>

          <div className="tv-meta rounded-xl p-3 text-xs leading-relaxed">
            Stripe en redeem codes volgen in fase 2.
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
