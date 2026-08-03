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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('buildPokemonCardsUrl', () => {
  it('builds a limited query from the real national Pokédex ID', () => {
    const url = new URL(buildPokemonCardsUrl('25', { page: 2, pageSize: 6 }));

    expect(`${url.origin}${url.pathname}`).toBe('https://api.pokemontcg.io/v2/cards');
    expect(url.searchParams.get('q')).toBe('nationalPokedexNumbers:25');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('6');
    expect(url.searchParams.get('select')?.split(',')).toEqual(
      expect.arrayContaining(['id', 'name', 'images', 'set', 'nationalPokedexNumbers']),
    );
    expect(url.searchParams.has('X-Api-Key')).toBe(false);
  });

  it('rejects invalid IDs and excessively large requests', () => {
    expect(() => buildPokemonCardsUrl(0)).toThrow(TypeError);
    expect(() => buildPokemonCardsUrl('pikachu')).toThrow(TypeError);
    expect(() => buildPokemonCardsUrl(25, { page: 0 })).toThrow(RangeError);
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

  it('caches each page independently', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          data: [card({ id: 'tcg-106-1', nationalPokedexNumbers: [106] })],
          totalCount: 2,
        }),
      )
      .mockResolvedValueOnce(
        response({
          data: [card({ id: 'tcg-106-2', nationalPokedexNumbers: [106] })],
          totalCount: 2,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await getPokemonCards(106, { page: 1, pageSize: 1 });
    await getPokemonCards(106, { page: 2, pageSize: 1 });
    await getPokemonCards(106, { page: 2, pageSize: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('page=1');
    expect(fetchMock.mock.calls[1][0]).toContain('page=2');
  });

  it('checks response.ok and exposes useful status information', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(null, {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = getPokemonCards(102);

    await expect(request).rejects.toBeInstanceOf(TcgApiError);
    await expect(request).rejects.toMatchObject({
      status: 429,
      statusText: 'Too Many Requests',
      url: expect.stringContaining('nationalPokedexNumbers%3A102'),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('automatically retries a temporary server error before showing an error', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(null, {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )
      .mockResolvedValueOnce(
        response({
          data: [card({ id: 'tcg-107', nationalPokedexNumbers: [107] })],
          totalCount: 1,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const request = getPokemonCards(107);
    await vi.runAllTimersAsync();

    await expect(request).resolves.toMatchObject({ totalCount: 1 });
    await expect(getPokemonCards(107)).resolves.toMatchObject({ totalCount: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after two repeated server errors', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      response(null, {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = getPokemonCards(108);
    const rejection = expect(request).rejects.toMatchObject({
      name: 'TcgApiError',
      status: 500,
    });
    await vi.runAllTimersAsync();

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
