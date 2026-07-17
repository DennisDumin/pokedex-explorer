const pokemonById = new Map();
const pokemonOrder = [];

let nextOffset = 0;
let totalPokemon = null;

function addPokemonPage({ pokemon, offset, nextOffset: pageNextOffset, total }) {
  if (offset !== nextOffset) {
    return [];
  }

  const addedPokemon = [];

  for (const entry of pokemon) {
    if (pokemonById.has(entry.id)) {
      continue;
    }

    pokemonById.set(entry.id, entry);
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

function getLoadedPokemonAt(index) {
  const id = pokemonOrder[index];
  return id === undefined ? null : pokemonById.get(id);
}

function getNextPokemonOffset() {
  return nextOffset;
}

function hasMorePokemon() {
  return totalPokemon === null || nextOffset < totalPokemon;
}

export {
  addPokemonPage,
  getLoadedPokemon,
  getLoadedPokemonAt,
  getNextPokemonOffset,
  hasMorePokemon,
};
