import { describe, expect, it, vi } from 'vitest';

import { createCollectionStore } from '../src/state/collection-store.js';

const STORAGE_KEY = 'test-pokedex-collection';

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

describe('createCollectionStore', () => {
  it('starts with an empty versioned state when no data is stored', () => {
    const store = createCollectionStore({
      storage: createMemoryStorage(),
      key: STORAGE_KEY,
    });

    expect(store.getState()).toEqual({
      version: 2,
      favorites: [],
      recent: [],
    });
  });

  it('sanitizes IDs, removes duplicates, and applies collection limits', () => {
    const storedState = JSON.stringify({
      version: 2,
      favorites: [1, '2', 1, 0, -4, 2.5, 'invalid', null],
      recent: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 12],
    });
    const storage = createMemoryStorage({ [STORAGE_KEY]: storedState });
    const store = createCollectionStore({ storage, key: STORAGE_KEY });

    expect(store.getState()).toEqual({
      version: 2,
      favorites: [1, 2],
      recent: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3],
    });
  });

  it('migrates legacy team members to favorites without losing saved Pokemon', () => {
    const storedState = JSON.stringify({
      version: 1,
      favorites: [1, 2],
      team: [2, 3, 4],
      recent: [25, 6],
    });
    const storage = createMemoryStorage({ [STORAGE_KEY]: storedState });
    const store = createCollectionStore({ storage, key: STORAGE_KEY });

    expect(store.getState()).toEqual({
      version: 2,
      favorites: [1, 2, 3, 4],
      recent: [25, 6],
    });
  });

  it('falls back safely for malformed JSON and unsupported state versions', () => {
    const malformedStore = createCollectionStore({
      storage: createMemoryStorage({ [STORAGE_KEY]: '{not-json' }),
      key: STORAGE_KEY,
    });
    const futureStore = createCollectionStore({
      storage: createMemoryStorage({
        [STORAGE_KEY]: JSON.stringify({ version: 3, favorites: [25] }),
      }),
      key: STORAGE_KEY,
    });

    expect(malformedStore.getState().favorites).toEqual([]);
    expect(futureStore.getState().favorites).toEqual([]);
  });

  it('toggles favorites, persists changes, and rejects invalid IDs', () => {
    const storage = createMemoryStorage();
    const store = createCollectionStore({ storage, key: STORAGE_KEY });

    expect(store.toggleFavorite(25)).toBe(true);
    expect(store.isFavorite('25')).toBe(true);

    const restoredFavoriteStore = createCollectionStore({ storage, key: STORAGE_KEY });
    expect(restoredFavoriteStore.getState().favorites).toEqual([25]);

    expect(store.toggleFavorite(25)).toBe(false);
    expect(store.toggleFavorite(0)).toBe(false);
    expect(store.toggleFavorite('invalid')).toBe(false);

    const restoredStore = createCollectionStore({ storage, key: STORAGE_KEY });
    expect(restoredStore.getState().favorites).toEqual([]);
  });

  it('records recent Pokemon in MRU order, deduplicates, and keeps ten entries', () => {
    const store = createCollectionStore({
      storage: createMemoryStorage(),
      key: STORAGE_KEY,
    });

    for (let id = 1; id <= 12; id += 1) {
      expect(store.recordRecent(id)).toBe(true);
    }

    expect(store.getState().recent).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
    store.recordRecent(7);
    expect(store.getState().recent).toEqual([7, 12, 11, 10, 9, 8, 6, 5, 4, 3]);
    expect(store.recordRecent(-1)).toBe(false);
  });

  it('notifies subscribers with defensive snapshots until they unsubscribe', () => {
    const store = createCollectionStore({
      storage: createMemoryStorage(),
      key: STORAGE_KEY,
    });
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe(subscriber);

    store.toggleFavorite(4);
    const snapshot = subscriber.mock.calls[0][0];
    snapshot.favorites.push(99);

    expect(store.getState().favorites).toEqual([4]);
    unsubscribe();
    store.toggleFavorite(5);
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(() => store.subscribe(null)).toThrow(TypeError);
  });

  it('keeps its in-memory state when storage access is blocked or full', () => {
    const blockedStorage = {
      getItem() {
        throw new DOMException('Blocked', 'SecurityError');
      },
      setItem() {
        throw new DOMException('Full', 'QuotaExceededError');
      },
    };
    const store = createCollectionStore({ storage: blockedStorage, key: STORAGE_KEY });

    expect(() => store.toggleFavorite(133)).not.toThrow();
    expect(() => store.recordRecent(133)).not.toThrow();
    expect(store.getState()).toMatchObject({ favorites: [133], recent: [133] });
  });
});
