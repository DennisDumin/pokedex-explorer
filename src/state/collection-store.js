const COLLECTION_STATE_VERSION = 2;
const LEGACY_COLLECTION_STATE_VERSION = 1;
const DEFAULT_STORAGE_KEY = 'pokedex-explorer:collection';
const MAX_RECENT_SIZE = 10;

function createEmptyState() {
  return {
    version: COLLECTION_STATE_VERSION,
    favorites: [],
    recent: [],
  };
}

function normalizePokemonId(value) {
  const id =
    typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sanitizeIds(values, limit = Number.POSITIVE_INFINITY) {
  if (!Array.isArray(values)) return [];

  const ids = [];
  const seenIds = new Set();

  for (const value of values) {
    const id = normalizePokemonId(value);

    if (id === null || seenIds.has(id)) continue;

    seenIds.add(id);
    ids.push(id);

    if (ids.length >= limit) break;
  }

  return ids;
}

function sanitizeState(value) {
  const supportedVersion =
    value?.version === COLLECTION_STATE_VERSION ||
    value?.version === LEGACY_COLLECTION_STATE_VERSION;

  if (!value || typeof value !== 'object' || !supportedVersion) {
    return createEmptyState();
  }

  return {
    version: COLLECTION_STATE_VERSION,
    favorites: sanitizeIds([
      ...(Array.isArray(value.favorites) ? value.favorites : []),
      ...(value.version === LEGACY_COLLECTION_STATE_VERSION && Array.isArray(value.team)
        ? value.team
        : []),
    ]),
    recent: sanitizeIds(value.recent, MAX_RECENT_SIZE),
  };
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStoredState(storage, key) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return createEmptyState();

    const serializedState = storage.getItem(key);

    if (serializedState === null) return createEmptyState();

    return sanitizeState(JSON.parse(serializedState));
  } catch {
    return createEmptyState();
  }
}

function createCollectionStore({
  storage = getDefaultStorage(),
  key = DEFAULT_STORAGE_KEY,
} = {}) {
  const storageKey = typeof key === 'string' && key.trim() ? key : DEFAULT_STORAGE_KEY;
  const subscribers = new Set();
  let state = readStoredState(storage, storageKey);

  function getState() {
    return {
      version: state.version,
      favorites: [...state.favorites],
      recent: [...state.recent],
    };
  }

  function persistState() {
    try {
      if (!storage || typeof storage.setItem !== 'function') return;

      storage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Keep the in-memory state usable when storage is blocked or full.
    }
  }

  function notifySubscribers() {
    for (const subscriber of subscribers) {
      subscriber(getState());
    }
  }

  function updateState(nextState) {
    state = nextState;
    persistState();
    notifySubscribers();
  }

  function isFavorite(id) {
    const normalizedId = normalizePokemonId(id);

    return normalizedId !== null && state.favorites.includes(normalizedId);
  }

  function toggleFavorite(id) {
    const normalizedId = normalizePokemonId(id);

    if (normalizedId === null) return false;

    const nextFavorites = isFavorite(normalizedId)
      ? state.favorites.filter((favoriteId) => favoriteId !== normalizedId)
      : [...state.favorites, normalizedId];

    updateState({ ...state, favorites: nextFavorites });
    return nextFavorites.includes(normalizedId);
  }

  function recordRecent(id) {
    const normalizedId = normalizePokemonId(id);

    if (normalizedId === null) return false;

    const nextRecent = [
      normalizedId,
      ...state.recent.filter((recentId) => recentId !== normalizedId),
    ].slice(0, MAX_RECENT_SIZE);

    if (
      nextRecent.length === state.recent.length &&
      nextRecent.every((recentId, index) => recentId === state.recent[index])
    ) {
      return true;
    }

    updateState({ ...state, recent: nextRecent });
    return true;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== 'function') {
      throw new TypeError('Subscriber must be a function.');
    }

    subscribers.add(subscriber);

    return function unsubscribe() {
      subscribers.delete(subscriber);
    };
  }

  return {
    getState,
    isFavorite,
    recordRecent,
    subscribe,
    toggleFavorite,
  };
}

export { createCollectionStore };
