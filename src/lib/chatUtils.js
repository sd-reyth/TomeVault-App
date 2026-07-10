export const CHAT_EDIT_WINDOW_MS = 5 * 60 * 1000;

export function isOwnChatMessage(message, uid, selfAuthor) {
  if (!message) return false;
  if (message.uid && uid) return message.uid === uid;
  return message.author === selfAuthor;
}

function isOtherChatAuthor(message, uid, selfAuthor) {
  return !isOwnChatMessage(message, uid, selfAuthor);
}

export function isDiceChatMessage(text) {
  if (typeof text !== 'string') return false;
  return /^rolt \d+d\d+:/i.test(text) || /^🎲\s*\d+!\n/i.test(text);
}

export function canEditChatMessage(message, chat, uid, selfAuthor, now = Date.now()) {
  if (!message || !isOwnChatMessage(message, uid, selfAuthor)) return false;
  if (isDiceChatMessage(message.text)) return false;

  const postedAt = Number(message.ms || 0);
  if (!postedAt || now - postedAt > CHAT_EDIT_WINDOW_MS) return false;

  const messageIndex = chat.findIndex((entry) => entry.id === message.id);
  if (messageIndex === -1) return false;

  const hasLaterMessageFromOther = chat
    .slice(messageIndex + 1)
    .some((entry) => isOtherChatAuthor(entry, uid, selfAuthor));

  return !hasLaterMessageFromOther;
}

export function canDeleteChatMessage(message, role, uid, selfAuthor) {
  if (!message) return false;
  if (role === 'gm') return true;
  if (!isOwnChatMessage(message, uid, selfAuthor)) return false;
  return !isDiceChatMessage(message.text);
}

export function buildChatAvatarLookup(party = []) {
  const byUid = new Map();
  const byName = new Map();

  party.forEach((member) => {
    if (!member) return;
    if (member.id) byUid.set(member.id, member);
    const name = String(member.name || '').trim().toLowerCase();
    if (name) byName.set(name, member);
  });

  return { byUid, byName };
}

export function resolveChatSenderProfile(message, lookup) {
  if (!message) {
    return { avatar: null, avatarPosition: null, name: '', memberId: null };
  }

  if (message.uid && lookup?.byUid?.has(message.uid)) {
    const member = lookup.byUid.get(message.uid);
    return {
      avatar: member.avatar || null,
      avatarPosition: member.avatarPosition || null,
      name: member.name || message.author || '',
      memberId: member.id || message.uid,
    };
  }

  const authorKey = String(message.author || '').trim().toLowerCase();
  if (authorKey && lookup?.byName?.has(authorKey)) {
    const member = lookup.byName.get(authorKey);
    return {
      avatar: member.avatar || null,
      avatarPosition: member.avatarPosition || null,
      name: member.name || message.author || '',
      memberId: member.id || null,
    };
  }

  return {
    avatar: null,
    avatarPosition: null,
    name: message.author || '',
    memberId: message.uid || `author:${message.author || 'unknown'}`,
  };
}

export function sendChatMessage(message, type = 'user') {
  const chatMessage = {
    content: message,
    type,
    timestamp: new Date().toISOString(),
  };

  // Placeholder until chat pipeline integration is implemented.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tomevault:chat-message', { detail: chatMessage }));
  }

  return chatMessage;
}