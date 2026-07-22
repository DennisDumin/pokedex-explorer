import { describe, expect, it, vi } from 'vitest';

import { createComparisonSelectionStore } from '../src/state/comparison-selection-store.js';

describe('createComparisonSelectionStore', () => {
  it('starts empty and rejects invalid Pokemon IDs', () => {
    const store = createComparisonSelectionStore();

    expect(store.getState()).toEqual({ selectedIds: [] });
    expect(store.toggle(0)).toBe(false);
    expect(store.toggle('invalid')).toBe(false);
    expect(store.getState()).toEqual({ selectedIds: [] });
  });

  it('selects a Pokemon and deselects it when toggled again', () => {
    const store = createComparisonSelectionStore();

    expect(store.toggle('3')).toBe(true);
    expect(store.isSelected(3)).toBe(true);
    expect(store.getState().selectedIds).toEqual([3]);

    expect(store.toggle(3)).toBe(false);
    expect(store.isSelected(3)).toBe(false);
    expect(store.getState().selectedIds).toEqual([]);
  });

  it('keeps an ordered pair and never accepts more than two Pokemon', () => {
    const store = createComparisonSelectionStore();

    expect(store.toggle(3)).toBe(true);
    expect(store.toggle(6)).toBe(true);
    expect(store.toggle(9)).toBe(false);
    expect(store.getState().selectedIds).toEqual([3, 6]);
  });

  it('clears selections and notifies subscribers with defensive snapshots', () => {
    const store = createComparisonSelectionStore();
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe(subscriber);

    store.toggle(25);
    const snapshot = subscriber.mock.calls[0][0];
    snapshot.selectedIds.push(99);

    expect(store.getState().selectedIds).toEqual([25]);
    store.clear();
    expect(store.getState().selectedIds).toEqual([]);
    expect(subscriber).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.toggle(133);
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(() => store.subscribe(null)).toThrow(TypeError);
  });
});
