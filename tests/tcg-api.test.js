import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TcgApiError,
  buildPokemonCardsUrl,
  getPokemonCards,
  normalizePokemonCards,
} from '../src/api/tcg-api.js';

function card(overrides = {}) {
  return {
    artist: 'Mitsuhiro Arita',
    hp: '60',
    id: 'base1-58',
    images: {
      large: 'https://images.pokemontcg.io/base1/58_hires.png',
      small: 'https://images.pokemontcg.io/base1/58.png',
    },
    name: 'Pikachu',
    nationalPokedexNumbers: [25],
    number: '58',
    rarity: 'Common',
    set: {
      id: 'base1',
      name: 'Base',
      releaseDate: '1999/01/09',
      series: 'Base',
    },
    types: ['Lightning'],
    ...overrides,
  };
}

function response(payload, overrides = {}) {
  return {
    json: vi.fn().mockResolvedValue(payload),
    ok: true,
    status: 200,
    statusText: 'OK',
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildPokemonCardsUrl', () => {
  it('builds a limited query from the real national Pokédex ID', () => {
    const url = new URL(buildPokemonCardsUrl('25', { pageSize: 6 }));

    expect(`${url.origin}${url.pathname}`).toBe('https://api.pokemontcg.io/v2/cards');
    expect(url.searchParams.get('q')).toBe('nationalPokedexNumbers:25');
    expect(url.searchParams.get('pageSize')).toBe('6');
    expect(url.searchParams.get('select')?.split(',')).toEqual(
      expect.arrayContaining(['id', 'name', 'images', 'set', 'nationalPokedexNumbers']),
    );
    expect(url.searchParams.has('X-Api-Key')).toBe(false);
  });

  it('rejects invalid IDs and excessively large requests', () => {
    expect(() => buildPokemonCardsUrl(0)).toThrow(TypeError);
    expect(() => buildPokemonCardsUrl('pikachu')).toThrow(TypeError);
    expect(() => buildPokemonCardsUrl(25, { pageSize: 13 })).toThrow(RangeError);
  });
});

describe('normalizePokemonCards', () => {
  it('normalizes safe card fields and filters unrelated or malformed cards', () => {
    const result = normalizePokemonCards(
      {
        data: [
          card({ name: '  Pikachu\nV  ', types: ['Lightning', 'Lightning', null] }),
          card({ id: 'wrong-species', nationalPokedexNumbers: [26] }),
          card({ id: '' }),
        ],
        totalCount: 42,
      },
      25,
    );

    expect(result).toEqual({
      cards: [
        {
          artist: 'Mitsuhiro Arita',
          hp: '60',
          id: 'base1-58',
          images: {
            large: 'https://images.pokemontcg.io/base1/58_hires.png',
            small: 'https://images.pokemontcg.io/base1/58.png',
          },
          name: 'Pikachu V',
          nationalPokedexNumbers: [25],
          number: '58',
          rarity: 'Common',
          set: {
            id: 'base1',
            name: 'Base',
            releaseDate: '1999/01/09',
            series: 'Base',
          },
          types: ['Lightning'],
        },
      ],
      totalCount: 42,
    });
  });

  it('drops unsafe image URLs and rejects an invalid response shape', () => {
    const result = normalizePokemonCards(
      {
        data: [
          card({
            images: {
              large: 'javascript:alert(1)',
              small: 'http://images.pokemontcg.io/insecure.png',
            },
          }),
        ],
      },
      25,
    );

    expect(result.cards[0].images).toEqual({ large: null, small: null });
    expect(() => normalizePokemonCards({ data: null }, 25)).toThrow(TypeError);
  });
});

describe('getPokemonCards', () => {
  it('deduplicates running requests and reuses the normalized cached result', async () => {
    let resolveRequest;
    const pendingResponse = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn(() => pendingResponse);
    vi.stubGlobal('fetch', fetchMock);

    const firstRequest = getPokemonCards(101, { pageSize: 4 });
    const secondRequest = getPokemonCards(101, { pageSize: 4 });

    expect(firstRequest).toBe(secondRequest);
    resolveRequest(
      response({
        data: [card({ id: 'tcg-101', nationalPokedexNumbers: [101] })],
        totalCount: 1,
      }),
    );

    const firstResult = await firstRequest;
    const cachedResult = await getPokemonCards(101, { pageSize: 4 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('nationalPokedexNumbers%3A101'),
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(cachedResult).toBe(firstResult);
  });

  it('checks response.ok and exposes useful status information', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(null, {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        }),
      ),
    );

    const request = getPokemonCards(102);

    await expect(request).rejects.toBeInstanceOf(TcgApiError);
    await expect(request).rejects.toMatchObject({
      status: 429,
      statusText: 'Too Many Requests',
      url: expect.stringContaining('nationalPokedexNumbers%3A102'),
    });
  });

  it('reports invalid JSON and malformed API payloads consistently', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(null, { json: vi.fn().mockRejectedValue(new SyntaxError('bad json')) }),
      )
      .mockResolvedValueOnce(response({ data: null }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPokemonCards(103)).rejects.toMatchObject({
      message: 'The Pokémon TCG API returned an invalid response.',
      name: 'TcgApiError',
    });
    await expect(getPokemonCards(104)).rejects.toMatchObject({
      message: 'The Pokémon TCG API returned an invalid response.',
      name: 'TcgApiError',
    });
  });

  it('does not cache failed requests and allows a clean retry', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(
        response({
          data: [card({ id: 'tcg-105', nationalPokedexNumbers: [105] })],
          totalCount: 1,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPokemonCards(105)).rejects.toMatchObject({
      message: 'Trading card data is currently unavailable.',
      name: 'TcgApiError',
    });
    await expect(getPokemonCards(105)).resolves.toMatchObject({ totalCount: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
