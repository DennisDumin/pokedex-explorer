import { mapWithConcurrency } from '../utils/async.js';
import { fetchJson } from './client.js';
import { createRequestCache } from './request-cache.js';

const POKE_API_BASE_URL = 'https://pokeapi.co/api/v2';
const DEFAULT_CONCURRENCY = 6;

const pokemonCache = createRequestCache();
const speciesCache = createRequestCache();
const evolutionChainCache = createRequestCache();
const catalogCache = createRequestCache();
const typeCache = createRequestCache();
const typePokemonIdsCache = createRequestCache();
const abilityCache = createRequestCache();
const generationCache = createRequestCache();

function normalizeId(id, resourceName) {
  const normalizedId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;

  if (!Number.isSafeInteger(normalizedId) || normalizedId < 1) {
    throw new TypeError(`${resourceName} ID must be a positive integer.`);
  }

  return normalizedId;
}

function normalizePokemonIdentifier(identifier) {
  const numericIdentifier =
    typeof identifier === 'string' && /^#?\d+$/.test(identifier.trim())
      ? Number(identifier.trim().replace('#', ''))
      : identifier;

  if (Number.isSafeInteger(numericIdentifier) && numericIdentifier > 0) {
    return numericIdentifier;
  }

  if (typeof identifier !== 'string') {
    throw new TypeError('Pokémon identifier must be a name or positive integer.');
  }

  const name = identifier.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new TypeError('Pokémon name contains invalid characters.');
  }

  return name;
}

function normalizeResourceName(name, resourceName) {
  if (typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name)) {
    throw new TypeError(`${resourceName} name is invalid.`);
  }

  return name;
}

function normalizeNamedResourceIdentifier(identifier, resourceName) {
  if (typeof identifier === 'number') {
    if (Number.isSafeInteger(identifier) && identifier > 0) return identifier;
    throw new TypeError(`${resourceName} identifier must be a name or positive integer.`);
  }

  if (typeof identifier !== 'string') {
    throw new TypeError(`${resourceName} identifier must be a name or positive integer.`);
  }

  const trimmedIdentifier = identifier.trim();

  if (/^\d+$/.test(trimmedIdentifier)) {
    const numericIdentifier = Number(trimmedIdentifier);

    if (Number.isSafeInteger(numericIdentifier) && numericIdentifier > 0) {
      return numericIdentifier;
    }

    throw new TypeError(`${resourceName} ID must be a positive integer.`);
  }

  const name = trimmedIdentifier.toLowerCase();

  if (name.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new TypeError(`${resourceName} name contains invalid characters.`);
  }

  return name;
}

function getNamedResource(identifier, { cache, endpoint, resourceName }) {
  const resourceIdentifier = normalizeNamedResourceIdentifier(identifier, resourceName);

  return cache.get(resourceIdentifier, async () => {
    const resource = await fetchJson(
      `${POKE_API_BASE_URL}/${endpoint}/${encodeURIComponent(resourceIdentifier)}/`,
    );

    if (Number.isSafeInteger(resource?.id) && resource.id > 0) {
      cache.set(resource.id, resource);
    }

    if (typeof resource?.name === 'string') {
      const resourceNameKey = normalizeNamedResourceIdentifier(
        resource.name,
        resourceName,
      );
      cache.set(resourceNameKey, resource);
    }

    return resource;
  });
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

function getPokemon(identifier) {
  const pokemonIdentifier = normalizePokemonIdentifier(identifier);

  return pokemonCache.get(pokemonIdentifier, async () => {
    const pokemon = await fetchJson(
      `${POKE_API_BASE_URL}/pokemon/${encodeURIComponent(pokemonIdentifier)}/`,
    );

    if (Number.isSafeInteger(pokemon?.id)) pokemonCache.set(pokemon.id, pokemon);
    if (typeof pokemon?.name === 'string') pokemonCache.set(pokemon.name, pokemon);

    return pokemon;
  });
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

function getType(identifier) {
  return getNamedResource(identifier, {
    cache: typeCache,
    endpoint: 'type',
    resourceName: 'Type',
  });
}

function getAbility(identifier) {
  return getNamedResource(identifier, {
    cache: abilityCache,
    endpoint: 'ability',
    resourceName: 'Ability',
  });
}

function getPokemonCatalog() {
  return catalogCache.get('all', async () => {
    const list = await fetchJson(`${POKE_API_BASE_URL}/pokemon/?limit=100000&offset=0`);

    if (!Array.isArray(list.results)) {
      throw new TypeError('The Pokémon catalog response is invalid.');
    }

    return list.results
      .map((resource) => ({
        id: getResourceId(resource.url),
        name: resource.name,
      }))
      .filter((entry) => typeof entry.name === 'string');
  });
}

function getTypePokemonIds(type) {
  const typeName = normalizeResourceName(type, 'Type');

  return typePokemonIdsCache.get(typeName, async () => {
    const resource = await getType(typeName);

    return new Set(
      (resource.pokemon ?? [])
        .map((entry) => entry?.pokemon?.url)
        .filter(Boolean)
        .map(getResourceId),
    );
  });
}

function getGenerationPokemonIds(generation) {
  const generationName = normalizeResourceName(generation, 'Generation');

  return generationCache.get(generationName, async () => {
    const resource = await fetchJson(
      `${POKE_API_BASE_URL}/generation/${encodeURIComponent(generationName)}/`,
    );

    return new Set(
      (resource.pokemon_species ?? [])
        .map((entry) => entry?.url)
        .filter(Boolean)
        .map(getResourceId),
    );
  });
}

function getPokemonBatch(ids, { concurrency = DEFAULT_CONCURRENCY } = {}) {
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
  getAbility,
  getEvolutionChain,
  getGenerationPokemonIds,
  getPokemon,
  getPokemonBatch,
  getPokemonCatalog,
  getPokemonPage,
  getPokemonSpecies,
  getResourceId,
  getType,
  getTypePokemonIds,
};
