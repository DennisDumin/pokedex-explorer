import { collectEvolutionIds, parseEvolutionChain } from '../utils/evolution.js';
import { mapWithConcurrency } from '../utils/async.js';
import {
  getAbility,
  getEvolutionChain,
  getPokemon,
  getPokemonBatch,
  getPokemonSpecies,
  getResourceId,
  getType,
} from './pokemon-api.js';
import { createRequestCache } from './request-cache.js';

const TYPE_CONCURRENCY = 2;
const ABILITY_CONCURRENCY = 3;
const pokemonDetailsCache = createRequestCache();

function createEvolutionData(stages, pokemon) {
  return {
    pokemon,
    pokemonById: new Map(pokemon.map((entry) => [entry.id, entry])),
    stages,
  };
}

async function loadEvolutionData(species) {
  const evolutionChainUrl = species?.evolution_chain?.url;

  if (!evolutionChainUrl) {
    return createEvolutionData([], []);
  }

  const evolutionChainId = getResourceId(evolutionChainUrl);
  const evolutionChain = await getEvolutionChain(evolutionChainId);
  const stages = parseEvolutionChain(evolutionChain);
  const pokemon = await getPokemonBatch(collectEvolutionIds(stages));

  return createEvolutionData(stages, pokemon);
}

function getReferenceIdentifier(reference) {
  if (typeof reference?.name === 'string' && reference.name.trim() !== '') {
    return reference.name;
  }

  if (typeof reference?.url !== 'string') return null;

  try {
    return getResourceId(reference.url);
  } catch {
    return null;
  }
}

function loadTypeData(pokemon) {
  const typeIdentifiers = (pokemon?.types ?? [])
    .map((entry) => getReferenceIdentifier(entry?.type))
    .filter((identifier) => identifier !== null);

  return mapWithConcurrency(typeIdentifiers, getType, {
    concurrency: TYPE_CONCURRENCY,
  });
}

function loadAbilityData(pokemon) {
  const abilityEntries = (pokemon?.abilities ?? []).filter(
    (entry) => getReferenceIdentifier(entry?.ability) !== null,
  );

  return mapWithConcurrency(
    abilityEntries,
    async (entry) => ({
      ability: await getAbility(getReferenceIdentifier(entry.ability)),
      isHidden: Boolean(entry.is_hidden),
      slot: Number.isSafeInteger(entry.slot) ? entry.slot : null,
    }),
    { concurrency: ABILITY_CONCURRENCY },
  );
}

function getPokemonDetails(id) {
  return pokemonDetailsCache.get(id, async () => {
    const pokemon = await getPokemon(id);
    const speciesId = getResourceId(pokemon.species?.url);
    const speciesPromise = getPokemonSpecies(speciesId);
    const typesPromise = loadTypeData(pokemon);
    const abilitiesPromise = loadAbilityData(pokemon);
    const evolutionPromise = speciesPromise.then(loadEvolutionData);
    const [species, types, abilities, evolution] = await Promise.all([
      speciesPromise,
      typesPromise,
      abilitiesPromise,
      evolutionPromise,
    ]);

    return { abilities, evolution, pokemon, species, types };
  });
}

export { getPokemonDetails };
