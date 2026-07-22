import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_POKEMON_LIST_STATE,
  MAX_QUERY_LENGTH,
  parsePokemonListState,
  serializePokemonListState,
  updatePokemonListUrl,
} from '../src/utils/url-state.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PokÃ©mon list URL state', () => {
  it('uses defaults for missing or unsupported URL values', () => {
    const state = parsePokemonListState(
      '?type=unknown&generation=42&sort=weight&order=sideways',
    );

    expect(state).toEqual(DEFAULT_POKEMON_LIST_STATE);
  });

  it('parses supported values and safely trims the query', () => {
    const state = parsePokemonListState(
      '?q=%20Mr%20Mime%20&type=PSYCHIC&generation=1&sort=name&order=desc',
    );

    expect(state).toEqual({
      generation: '1',
      order: 'desc',
      query: 'Mr Mime',
      sort: 'name',
      type: 'psychic',
    });
  });

  it('limits excessively long search values', () => {
    const state = parsePokemonListState(`?q=${'a'.repeat(MAX_QUERY_LENGTH + 20)}`);

    expect(state.query).toHaveLength(MAX_QUERY_LENGTH);
  });

  it('omits default values while serializing', () => {
    expect(serializePokemonListState(DEFAULT_POKEMON_LIST_STATE).toString()).toBe('');
    expect(
      serializePokemonListState({
        generation: 2,
        order: 'desc',
        query: 'eevee',
        sort: 'name',
        type: 'normal',
      }).toString(),
    ).toBe('q=eevee&type=normal&generation=2&sort=name&order=desc');
  });

  it('updates only managed parameters and preserves detail and hash state', () => {
    const replaceState = vi.fn();
    const pushState = vi.fn();
    const historyState = { source: 'test' };

    vi.stubGlobal('window', {
      history: { pushState, replaceState, state: historyState },
      location: {
        href: 'https://example.com/pokedex/?pokemon=25&q=old&type=fire#details',
      },
    });

    const relativeUrl = updatePokemonListUrl({ query: 'pika', sort: 'name' });

    expect(relativeUrl).toBe('/pokedex/?pokemon=25&q=pika&sort=name#details');
    expect(replaceState).toHaveBeenCalledWith(historyState, '', relativeUrl);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('can push a new history entry', () => {
    const replaceState = vi.fn();
    const pushState = vi.fn();

    vi.stubGlobal('window', {
      history: { pushState, replaceState, state: null },
      location: { href: 'https://example.com/pokedex/' },
    });

    updatePokemonListUrl({ type: 'water' }, { replace: false });

    expect(pushState).toHaveBeenCalledWith(null, '', '/pokedex/?type=water');
    expect(replaceState).not.toHaveBeenCalled();
  });
});
