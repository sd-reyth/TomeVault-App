/** Shared preparation / profile-archive helpers (no Firebase imports). */

import { sanitizeCustomStats } from './statModifiers';

export function templateReturnToPoolFields() {
  return {
    assignmentStatus: 'unassigned',
    assignedToUid: null,
  };
}

export function playerProfileFieldsFromSnapshot(snapshot, fallbackName = 'Avonturier') {
  return {
    nickname: String(snapshot?.name || '').trim() || fallbackName,
    subtitle: String(snapshot?.subtitle || '').trim(),
    hp: Number(snapshot?.hp ?? 0),
    maxHp: Number(snapshot?.maxHp ?? snapshot?.hp ?? 0),
    ac: Number(snapshot?.ac ?? 10),
    initMod: Number(snapshot?.initMod ?? 0),
    bio: String(snapshot?.bio || '').trim(),
    customStats: sanitizeCustomStats(snapshot?.customStats),
    avatarUrl: snapshot?.avatarUrl || null,
  };
}

export function buildBackupEntry({
  playerUid,
  playerName,
  snapshot,
  templateId = null,
  templateName = 'Profielarchief',
  reason = 'accept',
}) {
  return {
    playerUid,
    playerName: String(playerName || snapshot?.name || '').trim() || 'Avonturier',
    templateId,
    templateName: String(templateName || '').trim() || 'Profielarchief',
    snapshot,
    restoredAt: null,
    reason,
  };
}

export function findAcceptedTemplatesForPlayer(templates, playerUid, excludeId = null) {
  return (templates || []).filter((entry) => (
    entry.assignedToUid === playerUid
    && entry.assignmentStatus === 'accepted'
    && entry.id !== excludeId
  ));
}

export function profileSnapshotMatchesPlayer(snapshot, player = {}) {
  const fields = playerProfileFieldsFromSnapshot(snapshot, player.name || 'Avonturier');
  return String(player.name || '').trim() === fields.nickname
    && String(player.subtitle || '').trim() === fields.subtitle
    && Number(player.hp ?? 0) === fields.hp
    && Number(player.maxHp ?? 0) === fields.maxHp
    && Number(player.ac ?? 10) === fields.ac
    && Number(player.initMod ?? 0) === fields.initMod;
}
