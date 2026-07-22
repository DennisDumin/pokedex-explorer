const DEFAULT_STORAGE_KEY = 'pokedex-explorer:view-preferences';

function createDefaultState() {
  return { shiny: false };
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function sanitizeStoredState(value) {
  if (!value || typeof value !== 'object' || typeof value.shiny !== 'boolean') {
    return createDefaultState();
  }

  return { shiny: value.shiny };
}

function readStoredState(storage, key) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return createDefaultState();

    const serializedState = storage.getItem(key);
    if (serializedState === null) return createDefaultState();

    return sanitizeStoredState(JSON.parse(serializedState));
  } catch {
    return createDefaultState();
  }
}

function createViewPreferences({ storage = getDefaultStorage(), key } = {}) {
  const storageKey =
    typeof key === 'string' && key.trim() !== '' ? key.trim() : DEFAULT_STORAGE_KEY;
  const subscribers = new Set();
  let state = readStoredState(storage, storageKey);

  function getState() {
    return { shiny: state.shiny };
  }

  function persistState() {
    try {
      if (!storage || typeof storage.setItem !== 'function') return;

      storage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Preferences remain available in memory when storage is blocked or full.
    }
  }

  function notifySubscribers() {
    for (const subscriber of subscribers) subscriber(getState());
  }

  function setShiny(shiny) {
    if (typeof shiny !== 'boolean') {
      throw new TypeError('Shiny preference must be a boolean.');
    }

    if (state.shiny === shiny) return state.shiny;

    state = { shiny };
    persistState();
    notifySubscribers();
    return state.shiny;
  }

  function toggleShiny() {
    return setShiny(!state.shiny);
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

  return { getState, setShiny, subscribe, toggleShiny };
}

export { createViewPreferences };
