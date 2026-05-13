export function safeLocalStorageGet(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch (_) {
    return fallback;
  }
}

export function safeLocalStorageSet(key, value) {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}