import { describe, expect, it } from 'vitest';

import { collectEvolutionIds, parseEvolutionChain } from '../src/utils/evolution.js';

function species(id, name, evolvesTo = []) {
  return {
    species: {
      name,
      url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
    },
    evolves_to: evolvesTo,
  };
}

describe('parseEvolutionChain', () => {
  it('represents a Pokémon without evolutions as one stage', () => {
    const stages = parseEvolutionChain({ chain: species(132, 'ditto') });

    expect(stages).toEqual([[{ id: 132, name: 'ditto', parentId: null }]]);
  });

  it('keeps a linear evolution chain in API order', () => {
    const chain = species(1, 'bulbasaur', [
      species(2, 'ivysaur', [species(3, 'venusaur')]),
    ]);
    const stages = parseEvolutionChain({ chain });

    expect(collectEvolutionIds(stages)).toEqual([1, 2, 3]);
  });

  it('keeps every branch and its parent for Wurmple-style chains', () => {
    const chain = species(265, 'wurmple', [
      species(266, 'silcoon', [species(267, 'beautifly')]),
      species(268, 'cascoon', [species(269, 'dustox')]),
    ]);
    const stages = parseEvolutionChain({ chain });

    expect(stages[1]).toEqual([
      { id: 266, name: 'silcoon', parentId: 265 },
      { id: 268, name: 'cascoon', parentId: 265 },
    ]);
    expect(stages[2].map(({ id, parentId }) => ({ id, parentId }))).toEqual([
      { id: 267, parentId: 266 },
      { id: 269, parentId: 268 },
    ]);
  });

  it('collects all eight Eevee branches without sorting them', () => {
    const evolutionIds = [134, 135, 136, 196, 197, 470, 471, 700];
    const chain = species(
      133,
      'eevee',
      evolutionIds.map((id) => species(id, `evolution-${id}`)),
    );
    const stages = parseEvolutionChain({ chain });

    expect(stages[1].map(({ id }) => id)).toEqual(evolutionIds);
    expect(collectEvolutionIds(stages)).toEqual([133, ...evolutionIds]);
  });
});
