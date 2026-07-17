import { mapWithConcurrency } from '../utils/async.js';
import { fetchJson } from './client.js';
import { createRequestCache } from './request-cache.js';

const POKE_API_BASE_URL = 'https://pokeapi.co/api/v2';
const DEFAULT_CONCURRENCY = 6;

const pokemonCache = createRequestCache();
const speciesCache = createRequestCache();
const evolutionChainCache = createRequestCache();

function normalizeId(id, resourceName) {
  const normalizedId =
    typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;

  if (!Number.isSafeInteger(normalizedId) || normalizedId < 1) {
    throw new TypeError(`${resourceName} ID must be a positive integer.`);
  }

  return normalizedId;
}

function validatePagination(limit, offset) {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('Limit must be a positive integer.');
  }

  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new RangeError('Offset must be a non-negative integer.');
  }
}

function getResourceId(url) {
  let resourceUrl;

  try {
    resourceUrl = new URL(url, `${POKE_API_BASE_URL}/`);
  } catch (cause) {
    throw new TypeError('The resource URL is invalid.', { cause });
  }

  const pathSegments = resourceUrl.pathname.split('/').filter(Boolean);
  const id = Number(pathSegments.at(-1));

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new TypeError('The resource URL does not contain a valid ID.');
  }

  return id;
}

function getPokemon(id) {
  const pokemonId = normalizeId(id, 'Pokémon');

  return pokemonCache.get(pokemonId, () =>
    fetchJson(`${POKE_API_BASE_URL}/pokemon/${pokemonId}/`),
  );
}

function getPokemonSpecies(id) {
  const speciesId = normalizeId(id, 'Species');

  return speciesCache.get(speciesId, () =>
    fetchJson(`${POKE_API_BASE_URL}/pokemon-species/${speciesId}/`),
  );
}

function getEvolutionChain(id) {
  const chainId = normalizeId(id, 'Evolution chain');

  return evolutionChainCache.get(chainId, () =>
    fetchJson(`${POKE_API_BASE_URL}/evolution-chain/${chainId}/`),
  );
}

function getPokemonBatch(
  ids,
  { concurrency = DEFAULT_CONCURRENCY } = {},
) {
  return mapWithConcurrency(ids, (id) => getPokemon(id), { concurrency });
}

async function getPokemonPage({
  limit = 20,
  offset = 0,
  concurrency = DEFAULT_CONCURRENCY,
} = {}) {
  validatePagination(limit, offset);

  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const list = await fetchJson(`${POKE_API_BASE_URL}/pokemon/?${query}`);

  if (!Array.isArray(list.results) || !Number.isSafeInteger(list.count)) {
    throw new TypeError('The Pokémon list response is invalid.');
  }

  const ids = list.results.map((resource) => getResourceId(resource.url));
  const pokemon = await getPokemonBatch(ids, { concurrency });
  const nextOffset = offset + list.results.length;

  return {
    hasMore: nextOffset < list.count,
    limit,
    nextOffset,
    offset,
    pokemon,
    total: list.count,
  };
}

export {
  getEvolutionChain,
  getPokemon,
  getPokemonBatch,
  getPokemonPage,
  getPokemonSpecies,
  getResourceId,
};
