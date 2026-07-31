import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_POKEMON_DETAIL_ROUTE,
  DETAIL_ROUTE_HISTORY_STATE_KEY,
  isPokemonDetailHistoryEntry,
  openPokemonDetailRoute,
  parsePokemonDetailRoute,
  removePokemonDetailRoute,
  updatePokemonDetailRoute,
} from '../src/utils/detail-route.js';

function stubWindow(href, state = null) {
  const back = vi.fn();
  const pushState = vi.fn();
  const replaceState = vi.fn();

  vi.stubGlobal('window', {
    history: { back, pushState, replaceState, state },
    location: { href },
  });

  return { back, pushState, replaceState };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parsePokemonDetailRoute', () => {
  it('parses a valid detail route', () => {
    expect(parsePokemonDetailRoute('?pokemon=25&tab=matchups&shiny=1')).toEqual({
      pokemonId: 25,
      shiny: true,
      tab: 'matchups',
    });
  });

  it('falls back safely for invalid detail parameters', () => {
    expect(parsePokemonDetailRoute('?pokemon=-1&tab=unknown&shiny=true')).toEqual(
      DEFAULT_POKEMON_DETAIL_ROUTE,
    );
  });

  it('accepts URLSearchParams and normalizes leading zeros and tab casing', () => {
    const searchParams = new URLSearchParams('pokemon=0025&tab=STATS');

    expect(parsePokemonDetailRoute(searchParams)).toEqual({
      pokemonId: 25,
      shiny: false,
      tab: 'stats',
    });
  });

  it('accepts the trading cards tab', () => {
    expect(parsePokemonDetailRoute('?pokemon=25&tab=cards')).toEqual({
      pokemonId: 25,
      shiny: false,
      tab: 'cards',
    });
  });

  it('falls back to About for removed moves links', () => {
    expect(parsePokemonDetailRoute('?pokemon=3&tab=moves')).toEqual({
      pokemonId: 3,
      shiny: false,
      tab: 'about',
    });
  });
});

describe('Pokemon detail history', () => {
  it('opens a detail route with pushState, a marker, and preserved list state', () => {
    const previousState = { source: 'list' };
    const { pushState, replaceState } = stubWindow(
      'https://example.com/pokedex/?q=pika&type=electric#results',
      previousState,
    );

    const relativeUrl = openPokemonDetailRoute(25, {
      shiny: true,
      tab: 'evolution',
    });

    expect(relativeUrl).toBe(
      '/pokedex/?q=pika&type=electric&pokemon=25&tab=evolution&shiny=1#results',
    );
    expect(pushState).toHaveBeenCalledWith(
      {
        source: 'list',
        [DETAIL_ROUTE_HISTORY_STATE_KEY]: true,
      },
      '',
      relativeUrl,
    );
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('omits default tab and shiny values when opening', () => {
    const { pushState } = stubWindow('https://example.com/pokedex/?sort=name');

    const relativeUrl = openPokemonDetailRoute('007');

    expect(relativeUrl).toBe('/pokedex/?sort=name&pokemon=7');
    expect(pushState).toHaveBeenCalledOnce();
  });

  it('rejects invalid Pokemon IDs before changing history', () => {
    const { pushState, replaceState } = stubWindow('https://example.com/pokedex/');

    expect(() => openPokemonDetailRoute(0)).toThrow(
      'Pokémon ID must be a positive integer.',
    );
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('updates a detail route with replaceState and keeps its marker', () => {
    const historyState = {
      [DETAIL_ROUTE_HISTORY_STATE_KEY]: true,
      source: 'list',
    };
    const { pushState, replaceState } = stubWindow(
      'https://example.com/pokedex/?q=pika&pokemon=25&tab=cards&shiny=1',
      historyState,
    );

    const relativeUrl = updatePokemonDetailRoute({ shiny: false, tab: 'about' });

    expect(relativeUrl).toBe('/pokedex/?q=pika&pokemon=25');
    expect(replaceState).toHaveBeenCalledWith(historyState, '', relativeUrl);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('rejects an update without a valid Pokemon ID', () => {
    const { pushState, replaceState } = stubWindow('https://example.com/pokedex/');

    expect(() => updatePokemonDetailRoute({ pokemonId: 'invalid' })).toThrow(
      'Pokémon ID must be a positive integer.',
    );
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('marks an explicitly pushed update as a detail entry', () => {
    const { pushState } = stubWindow('https://example.com/pokedex/?pokemon=25', {
      source: 'direct-link',
    });

    updatePokemonDetailRoute({ pokemonId: 26, tab: 'stats' }, { replace: false });

    expect(pushState.mock.calls[0][0]).toEqual({
      source: 'direct-link',
      [DETAIL_ROUTE_HISTORY_STATE_KEY]: true,
    });
  });

  it('recognizes only an explicit detail history marker', () => {
    expect(isPokemonDetailHistoryEntry({ [DETAIL_ROUTE_HISTORY_STATE_KEY]: true })).toBe(
      true,
    );
    expect(isPokemonDetailHistoryEntry({ [DETAIL_ROUTE_HISTORY_STATE_KEY]: false })).toBe(
      false,
    );
    expect(isPokemonDetailHistoryEntry(null)).toBe(false);
  });
});

describe('removePokemonDetailRoute', () => {
  it('navigates back when the detail was opened by this application', () => {
    const historyState = { [DETAIL_ROUTE_HISTORY_STATE_KEY]: true };
    const { back, pushState, replaceState } = stubWindow(
      'https://example.com/pokedex/?q=pika&pokemon=25',
      historyState,
    );

    expect(removePokemonDetailRoute()).toBeNull();
    expect(back).toHaveBeenCalledOnce();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('removes only detail parameters from a direct link', () => {
    const historyState = { source: 'direct-link' };
    const { back, replaceState } = stubWindow(
      'https://example.com/pokedex/?q=eevee&type=normal&pokemon=133&tab=stats&shiny=1#card',
      historyState,
    );

    const relativeUrl = removePokemonDetailRoute();

    expect(relativeUrl).toBe('/pokedex/?q=eevee&type=normal#card');
    expect(replaceState).toHaveBeenCalledWith(historyState, '', relativeUrl);
    expect(back).not.toHaveBeenCalled();
  });

  it('can replace a marked entry and removes the stale marker', () => {
    const historyState = {
      [DETAIL_ROUTE_HISTORY_STATE_KEY]: true,
      source: 'list',
    };
    const { back, replaceState } = stubWindow(
      'https://example.com/pokedex/?pokemon=25&sort=name',
      historyState,
    );

    const relativeUrl = removePokemonDetailRoute({ preferHistoryBack: false });

    expect(relativeUrl).toBe('/pokedex/?sort=name');
    expect(replaceState).toHaveBeenCalledWith({ source: 'list' }, '', relativeUrl);
    expect(back).not.toHaveBeenCalled();
  });
});
