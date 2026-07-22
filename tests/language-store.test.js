import { describe, expect, it, vi } from 'vitest';

import { createLanguageStore } from '../src/state/language-store.js';

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

describe('createLanguageStore', () => {
  it('uses English by default when no preference has been stored', () => {
    const store = createLanguageStore({ storage: createMemoryStorage() });

    expect(store.getLanguage()).toBe('en');
  });

  it('uses a normalized default and restores a stored selection', () => {
    const defaultStore = createLanguageStore({
      defaultLanguage: 'de-DE',
      storage: createMemoryStorage(),
    });
    const restoredStore = createLanguageStore({
      defaultLanguage: 'en',
      key: 'language',
      storage: createMemoryStorage({ language: 'de' }),
    });

    expect(defaultStore.getLanguage()).toBe('de');
    expect(restoredStore.getLanguage()).toBe('de');
  });

  it('persists changes and notifies subscribers until they unsubscribe', () => {
    const storage = createMemoryStorage();
    const subscriber = vi.fn();
    const store = createLanguageStore({ key: 'language', storage });
    const unsubscribe = store.subscribe(subscriber);

    expect(store.setLanguage('de-DE')).toBe('de');
    expect(storage.getItem('language')).toBe('de');
    expect(subscriber).toHaveBeenCalledWith('de');

    unsubscribe();
    store.setLanguage('en');
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(() => store.subscribe(null)).toThrow(TypeError);
  });

  it('ignores repeated values and keeps working when storage is blocked', () => {
    const subscriber = vi.fn();
    const blockedStorage = {
      getItem() {
        throw new DOMException('Blocked', 'SecurityError');
      },
      setItem() {
        throw new DOMException('Full', 'QuotaExceededError');
      },
    };
    const store = createLanguageStore({ storage: blockedStorage });
    store.subscribe(subscriber);

    expect(store.setLanguage('en')).toBe('en');
    expect(subscriber).not.toHaveBeenCalled();
    expect(() => store.setLanguage('de')).not.toThrow();
    expect(store.getLanguage()).toBe('de');
    expect(subscriber).toHaveBeenCalledWith('de');
  });
});
