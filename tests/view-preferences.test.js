import { describe, expect, it, vi } from 'vitest';

import { createViewPreferences } from '../src/state/view-preferences.js';

const STORAGE_KEY = 'test-pokedex-view-preferences';

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

describe('createViewPreferences', () => {
  it('starts with a non-shiny Boolean preference', () => {
    const preferences = createViewPreferences({
      storage: createMemoryStorage(),
      key: STORAGE_KEY,
    });

    expect(preferences.getState()).toEqual({ shiny: false });
    expect(typeof preferences.getState().shiny).toBe('boolean');
  });

  it('restores a valid persisted preference', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify({ shiny: true }),
    });

    expect(createViewPreferences({ storage, key: STORAGE_KEY }).getState()).toEqual({
      shiny: true,
    });
  });

  it('rejects malformed JSON and non-Boolean stored values', () => {
    const malformed = createViewPreferences({
      storage: createMemoryStorage({ [STORAGE_KEY]: '{not-json' }),
      key: STORAGE_KEY,
    });
    const invalidValue = createViewPreferences({
      storage: createMemoryStorage({
        [STORAGE_KEY]: JSON.stringify({ shiny: 'true' }),
      }),
      key: STORAGE_KEY,
    });

    expect(malformed.getState()).toEqual({ shiny: false });
    expect(invalidValue.getState()).toEqual({ shiny: false });
  });

  it('sets, toggles, persists, and restores the shiny preference', () => {
    const storage = createMemoryStorage();
    const preferences = createViewPreferences({ storage, key: STORAGE_KEY });

    expect(preferences.setShiny(true)).toBe(true);
    expect(preferences.toggleShiny()).toBe(false);
    expect(preferences.toggleShiny()).toBe(true);

    const restored = createViewPreferences({ storage, key: STORAGE_KEY });
    expect(restored.getState()).toEqual({ shiny: true });
  });

  it('notifies subscribers with snapshots only when the value changes', () => {
    const preferences = createViewPreferences({
      storage: createMemoryStorage(),
      key: STORAGE_KEY,
    });
    const subscriber = vi.fn();
    const unsubscribe = preferences.subscribe(subscriber);

    preferences.setShiny(false);
    preferences.setShiny(true);
    const snapshot = subscriber.mock.calls[0][0];
    snapshot.shiny = false;

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(preferences.getState()).toEqual({ shiny: true });

    unsubscribe();
    preferences.toggleShiny();
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(() => preferences.subscribe(null)).toThrow(TypeError);
  });

  it('rejects non-Boolean updates without corrupting state', () => {
    const preferences = createViewPreferences({
      storage: createMemoryStorage(),
      key: STORAGE_KEY,
    });

    expect(() => preferences.setShiny('true')).toThrow(TypeError);
    expect(preferences.getState()).toEqual({ shiny: false });
  });

  it('keeps working in memory when storage access is blocked or full', () => {
    const blockedStorage = {
      getItem() {
        throw new DOMException('Blocked', 'SecurityError');
      },
      setItem() {
        throw new DOMException('Full', 'QuotaExceededError');
      },
    };
    const preferences = createViewPreferences({
      storage: blockedStorage,
      key: STORAGE_KEY,
    });

    expect(preferences.getState()).toEqual({ shiny: false });
    expect(() => preferences.setShiny(true)).not.toThrow();
    expect(preferences.getState()).toEqual({ shiny: true });
  });
});
