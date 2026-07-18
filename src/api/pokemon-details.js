import { collectEvolutionIds, parseEvolutionChain } from '../utils/evolution.js';
import {
  getEvolutionChain,
  getPokemon,
  getPokemonBatch,
  getPokemonSpecies,
  getResourceId,
} from './pokemon-api.js';
import { createRequestCache } from './request-cache.js';

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

function getPokemonDetails(id) {
  return pokemonDetailsCache.get(id, async () => {
    const pokemon = await getPokemon(id);
    const speciesId = getResourceId(pokemon.species?.url);
    const species = await getPokemonSpecies(speciesId);
    const evolution = await loadEvolutionData(species);

    return { evolution, pokemon, species };
  });
}

export { getPokemonDetails };
