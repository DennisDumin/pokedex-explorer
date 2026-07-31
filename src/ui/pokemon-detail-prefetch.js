import { getPokemonDetails } from '../api/pokemon-details.js';
import { preloadPokemonMedia } from '../utils/media.js';

const prefetchRequests = new Map();
const pendingPrefetches = [];
const MAX_CONCURRENT_PREFETCHES = 2;

let activePrefetchCount = 0;

async function loadPokemonDetailPrefetch(pokemonId) {
  try {
    const details = await getPokemonDetails(pokemonId);
    const otherEvolutionPokemon = details.evolution.pokemon.filter(
      (pokemon) => pokemon.id !== pokemonId,
    );

    await Promise.all([
      preloadPokemonMedia([details.pokemon], {
        concurrency: 2,
        includeShiny: true,
      }),
      preloadPokemonMedia(otherEvolutionPokemon, {
        concurrency: 2,
        includeAnimation: false,
      }),
    ]);

    return details;
  } catch {
    prefetchRequests.delete(pokemonId);
    return null;
  }
}

function runPendingPrefetches() {
  while (
    activePrefetchCount < MAX_CONCURRENT_PREFETCHES &&
    pendingPrefetches.length > 0
  ) {
    const { pokemonId, resolve } = pendingPrefetches.shift();
    activePrefetchCount += 1;

    void loadPokemonDetailPrefetch(pokemonId)
      .then(resolve)
      .finally(() => {
        activePrefetchCount -= 1;
        runPendingPrefetches();
      });
  }
}

function enqueuePokemonDetailPrefetch(pokemonId) {
  return new Promise((resolve) => {
    pendingPrefetches.push({ pokemonId, resolve });
    runPendingPrefetches();
  });
}

function prefetchPokemonDetails(pokemonId) {
  const normalizedPokemonId = Number(pokemonId);

  if (!Number.isSafeInteger(normalizedPokemonId) || normalizedPokemonId < 1) {
    return Promise.resolve(null);
  }

  if (prefetchRequests.has(normalizedPokemonId)) {
    return prefetchRequests.get(normalizedPokemonId);
  }

  const request = enqueuePokemonDetailPrefetch(normalizedPokemonId);

  prefetchRequests.set(normalizedPokemonId, request);
  return request;
}

export { prefetchPokemonDetails };
