import { DEFAULT_LANGUAGE, normalizeLanguage } from '../i18n/i18n.js';

const DEFAULT_STORAGE_KEY = 'pokedex-explorer:language';

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStoredLanguage(storage, key, fallbackLanguage) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return fallbackLanguage;

    const storedLanguage = storage.getItem(key);
    return storedLanguage === null ? fallbackLanguage : normalizeLanguage(storedLanguage);
  } catch {
    return fallbackLanguage;
  }
}

function createLanguageStore({
  defaultLanguage = DEFAULT_LANGUAGE,
  key = DEFAULT_STORAGE_KEY,
  storage = getDefaultStorage(),
} = {}) {
  const storageKey = typeof key === 'string' && key.trim() ? key : DEFAULT_STORAGE_KEY;
  const fallbackLanguage = normalizeLanguage(defaultLanguage);
  const subscribers = new Set();
  let language = readStoredLanguage(storage, storageKey, fallbackLanguage);

  function getLanguage() {
    return language;
  }

  function setLanguage(nextLanguage) {
    const normalizedLanguage = normalizeLanguage(nextLanguage);

    if (normalizedLanguage === language) return language;

    language = normalizedLanguage;

    try {
      storage?.setItem?.(storageKey, language);
    } catch {
      // Keep language switching available when storage is blocked or full.
    }

    for (const subscriber of subscribers) subscriber(language);
    return language;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== 'function') {
      throw new TypeError('Subscriber must be a function.');
    }

    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  return { getLanguage, setLanguage, subscribe };
}

export { createLanguageStore };
