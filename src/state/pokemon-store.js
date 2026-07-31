const pokemonById = new Map();
const pokemonOrder = [];

let nextOffset = 0;
let totalPokemon = null;

function cachePokemon(pokemon) {
  const cachedPokemon = [];

  for (const entry of pokemon ?? []) {
    if (!Number.isSafeInteger(entry?.id) || entry.id < 1) continue;

    pokemonById.set(entry.id, entry);
    cachedPokemon.push(entry);
  }

  return cachedPokemon;
}

function addPokemonPage({ pokemon, offset, nextOffset: pageNextOffset, total }) {
  if (offset !== nextOffset) {
    return [];
  }

  const addedPokemon = [];

  for (const entry of cachePokemon(pokemon)) {
    if (pokemonOrder.includes(entry.id)) {
      continue;
    }

    pokemonOrder.push(entry.id);
    addedPokemon.push(entry);
  }

  nextOffset = pageNextOffset;
  totalPokemon = total;

  return addedPokemon;
}

function getLoadedPokemon() {
  return pokemonOrder.map((id) => pokemonById.get(id));
}

function getPokemonById(id) {
  const pokemonId = Number(id);

  return Number.isSafeInteger(pokemonId) ? (pokemonById.get(pokemonId) ?? null) : null;
}

function getNextPokemonOffset() {
  return nextOffset;
}

function hasMorePokemon() {
  return totalPokemon === null || nextOffset < totalPokemon;
}

export {
  addPokemonPage,
  cachePokemon,
  getLoadedPokemon,
  getNextPokemonOffset,
  getPokemonById,
  hasMorePokemon,
};
