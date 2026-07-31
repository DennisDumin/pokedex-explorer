import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPokemonDetails = vi.fn();
const preloadPokemonMedia = vi.fn(() => Promise.resolve());

vi.mock('../src/api/pokemon-details.js', () => ({ getPokemonDetails }));
vi.mock('../src/utils/media.js', () => ({ preloadPokemonMedia }));

const { prefetchPokemonDetails } = await import('../src/ui/pokemon-detail-prefetch.js');

function createDetails(id) {
  return {
    evolution: { pokemon: [{ id }, { id: id + 1 }] },
    pokemon: { id },
  };
}

describe('Pokemon detail prefetch', () => {
  beforeEach(() => {
    getPokemonDetails.mockReset();
    preloadPokemonMedia.mockClear();
  });

  it('ignores invalid Pokemon IDs', async () => {
    await expect(prefetchPokemonDetails(0)).resolves.toBeNull();
    expect(getPokemonDetails).not.toHaveBeenCalled();
  });

  it('loads details, shiny media, and other evolution artwork once', async () => {
    const details = createDetails(901);
    getPokemonDetails.mockResolvedValue(details);

    const firstRequest = prefetchPokemonDetails(901);
    const secondRequest = prefetchPokemonDetails(901);

    expect(secondRequest).toBe(firstRequest);
    await expect(firstRequest).resolves.toBe(details);
    expect(getPokemonDetails).toHaveBeenCalledOnce();
    expect(preloadPokemonMedia).toHaveBeenNthCalledWith(1, [details.pokemon], {
      concurrency: 2,
      includeShiny: true,
    });
    expect(preloadPokemonMedia).toHaveBeenNthCalledWith(
      2,
      [details.evolution.pokemon[1]],
      { concurrency: 2, includeAnimation: false },
    );
  });

  it('limits detail prefetching to two Pokemon at a time', async () => {
    const resolvers = new Map();
    getPokemonDetails.mockImplementation(
      (id) =>
        new Promise((resolve) => {
          resolvers.set(id, resolve);
        }),
    );

    const requests = [902, 903, 904].map((id) => prefetchPokemonDetails(id));

    expect(getPokemonDetails).toHaveBeenCalledTimes(2);
    expect(resolvers.has(904)).toBe(false);

    resolvers.get(902)(createDetails(902));
    await vi.waitFor(() => expect(getPokemonDetails).toHaveBeenCalledTimes(3));
    resolvers.get(903)(createDetails(903));
    resolvers.get(904)(createDetails(904));

    await expect(Promise.all(requests)).resolves.toEqual([
      createDetails(902),
      createDetails(903),
      createDetails(904),
    ]);
  });

  it('allows a later prefetch retry after a transient failure', async () => {
    const details = createDetails(905);
    getPokemonDetails
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(details);

    await expect(prefetchPokemonDetails(905)).resolves.toBeNull();
    await expect(prefetchPokemonDetails(905)).resolves.toBe(details);

    expect(getPokemonDetails).toHaveBeenCalledTimes(2);
  });
});
