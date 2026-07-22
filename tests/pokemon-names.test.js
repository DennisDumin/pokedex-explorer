import { describe, expect, it } from 'vitest';

import {
  getLocalizedPokemonName,
  getPokemonSpeciesId,
} from '../src/i18n/pokemon-names.js';

function createPokemon(id, name, speciesId = id, speciesName = name) {
  return {
    id,
    name,
    species: {
      name: speciesName,
      url: `https://pokeapi.co/api/v2/pokemon-species/${speciesId}/`,
    },
  };
}

describe('localized Pokémon names', () => {
  it('uses the official German species name from the local PokéAPI data', () => {
    const pokemon = createPokemon(1, 'bulbasaur');

    expect(getPokemonSpeciesId(pokemon)).toBe(1);
    expect(getLocalizedPokemonName(pokemon, 'de')).toBe('Bisasam');
    expect(getLocalizedPokemonName(pokemon, 'en')).toBe('Bulbasaur');
  });

  it('looks up catalog entries by their default Pokémon ID', () => {
    expect(getLocalizedPokemonName({ id: 122, name: 'mr-mime' }, 'de')).toBe('Pantimos');
  });

  it('keeps a readable form suffix without replacing it with the base species', () => {
    const pokemon = createPokemon(10090, 'beedrill-mega', 15, 'beedrill');

    expect(getLocalizedPokemonName(pokemon, 'de')).toBe('Bibor Mega');
  });

  it('falls back to the canonical API name when localized data is missing', () => {
    const pokemon = createPokemon(100000, 'future-pokemon', 2000, 'future-pokemon');

    expect(getLocalizedPokemonName(pokemon, 'de')).toBe('Future Pokemon');
  });
});
