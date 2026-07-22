import { describe, expect, it } from 'vitest';

import {
  filterAndSortPokemon,
  findPokemonCatalogMatches,
  getPokemonId,
} from '../src/utils/pokemon-list.js';

function pokemon(id, name, types = []) {
  return {
    id,
    name,
    types: types.map((type) => ({ type: { name: type } })),
  };
}

const pokemonList = [
  pokemon(25, 'pikachu', ['electric']),
  pokemon(1, 'bulbasaur', ['grass', 'poison']),
  pokemon(26, 'raichu', ['electric']),
  pokemon(122, 'mr-mime', ['psychic', 'fairy']),
];

describe('filterAndSortPokemon', () => {
  it('matches names independent of separators and matches formatted IDs exactly', () => {
    expect(filterAndSortPokemon(pokemonList, { query: 'Mr Mime' })).toEqual([
      pokemonList[3],
    ]);
    expect(filterAndSortPokemon(pokemonList, { query: '#025' })).toEqual([
      pokemonList[0],
    ]);
  });

  it('combines type and generation ID filters', () => {
    const matches = filterAndSortPokemon(pokemonList, {
      generationIds: new Set([1, 25, 26]),
      type: 'electric',
    });

    expect(matches.map(({ id }) => id)).toEqual([25, 26]);
  });

  it('sorts by ID or name without mutating the source array', () => {
    const originalOrder = pokemonList.map(({ id }) => id);
    const byDescendingId = filterAndSortPokemon(pokemonList, {
      order: 'desc',
      sort: 'id',
    });
    const byName = filterAndSortPokemon(pokemonList, { sort: 'name' });

    expect(byDescendingId.map(({ id }) => id)).toEqual([122, 26, 25, 1]);
    expect(byName.map(({ id }) => id)).toEqual([1, 122, 25, 26]);
    expect(pokemonList.map(({ id }) => id)).toEqual(originalOrder);
  });

  it('keeps the original order when sort values are equal', () => {
    const variants = [pokemon(10001, 'pikachu'), pokemon(25, 'pikachu')];

    expect(filterAndSortPokemon(variants, { sort: 'name' })).toEqual(variants);
  });

  it('searches and sorts with localized display names when provided', () => {
    const localizedNames = new Map([
      [1, 'Bisasam'],
      [39, 'Pummeluff'],
      [52, 'Mauzi'],
    ]);
    const options = {
      getName: (entry) => localizedNames.get(entry.id) ?? entry.name,
      language: 'de',
    };
    const localizedPokemon = [
      pokemon(39, 'jigglypuff'),
      pokemon(52, 'meowth'),
      pokemon(1, 'bulbasaur'),
    ];

    expect(filterAndSortPokemon(localizedPokemon, { query: 'Bisasam' }, options)).toEqual(
      [localizedPokemon[2]],
    );
    expect(
      filterAndSortPokemon(localizedPokemon.slice(0, 2), { sort: 'name' }, options).map(
        ({ id }) => id,
      ),
    ).toEqual([52, 39]);
  });
});

describe('findPokemonCatalogMatches', () => {
  const catalog = [
    { name: 'pichu', url: 'https://pokeapi.co/api/v2/pokemon/172/' },
    { id: 25, name: 'pikachu' },
    { id: 26, name: 'raichu' },
    { id: 122, name: 'mr-mime' },
  ];

  it('extracts IDs from catalog resource URLs', () => {
    expect(getPokemonId(catalog[0])).toBe(172);
  });

  it('intersects optional type and generation ID sets before limiting results', () => {
    const matches = findPokemonCatalogMatches(
      catalog,
      {
        generationIds: new Set([25, 26, 122]),
        order: 'desc',
        sort: 'name',
        typeIds: new Set([25, 26, 172]),
      },
      { limit: 1 },
    );

    expect(matches).toEqual([catalog[2]]);
  });

  it('applies the result limit after query matching and sorting', () => {
    const matches = findPokemonCatalogMatches(
      catalog,
      { query: 'chu', sort: 'id' },
      {
        limit: 2,
      },
    );

    expect(matches.map((entry) => getPokemonId(entry))).toEqual([25, 26]);
  });

  it('returns no results for an explicit limit of zero', () => {
    expect(findPokemonCatalogMatches(catalog, {}, { limit: 0 })).toEqual([]);
  });
});
