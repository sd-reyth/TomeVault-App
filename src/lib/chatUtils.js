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