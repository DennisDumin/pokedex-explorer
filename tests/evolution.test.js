import { describe, expect, it } from 'vitest';

import {
  collectEvolutionIds,
  formatEvolutionConditions,
  parseEvolutionChain,
} from '../src/utils/evolution.js';

function species(
  id,
  name,
  evolvesTo = [],
  { evolutionDetails = [], isBaby = false } = {},
) {
  return {
    evolution_details: evolutionDetails,
    species: {
      name,
      url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
    },
    is_baby: isBaby,
    evolves_to: evolvesTo,
  };
}

describe('parseEvolutionChain', () => {
  it('represents a Pokémon without evolutions as one stage', () => {
    const stages = parseEvolutionChain({ chain: species(132, 'ditto') });

    expect(stages).toEqual([
      [
        {
          evolutionDetails: [],
          id: 132,
          isBaby: false,
          name: 'ditto',
          parentId: null,
        },
      ],
    ]);
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
      {
        evolutionDetails: [],
        id: 266,
        isBaby: false,
        name: 'silcoon',
        parentId: 265,
      },
      {
        evolutionDetails: [],
        id: 268,
        isBaby: false,
        name: 'cascoon',
        parentId: 265,
      },
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

  it('preserves baby state and the conditions attached to each child node', () => {
    const conditions = [{ min_level: 16, trigger: { name: 'level-up' } }];
    const chain = species(
      172,
      'pichu',
      [species(25, 'pikachu', [], { evolutionDetails: conditions })],
      { isBaby: true },
    );
    const stages = parseEvolutionChain({ chain });

    expect(stages[0][0].isBaby).toBe(true);
    expect(stages[1][0].evolutionDetails).toEqual(conditions);
  });
});

describe('formatEvolutionConditions', () => {
  it('formats level and item evolutions', () => {
    expect(
      formatEvolutionConditions([{ min_level: 16, trigger: { name: 'level-up' } }]),
    ).toBe('Level 16');
    expect(
      formatEvolutionConditions([
        { item: { name: 'thunder-stone' }, trigger: { name: 'use-item' } },
      ]),
    ).toBe('Use Thunder Stone');
  });

  it('combines trade and held-item requirements', () => {
    expect(
      formatEvolutionConditions([
        {
          held_item: { name: 'metal-coat' },
          trigger: { name: 'trade' },
        },
      ]),
    ).toBe('Trade AND Hold Metal Coat');
  });

  it('formats friendship, time, gender, move, type, and location requirements', () => {
    expect(
      formatEvolutionConditions([
        {
          gender: 1,
          known_move: { name: 'ancient-power' },
          known_move_type: { name: 'fairy' },
          location: { name: 'mount-coronet' },
          min_happiness: 220,
          time_of_day: 'night',
          trigger: { name: 'level-up' },
        },
      ]),
    ).toBe(
      'Happiness 220+ AND At night AND Female only AND Know Ancient Power AND Know a Fairy-type move AND At Mount Coronet',
    );
  });

  it('formats weather, party, stat-relation, and upside-down requirements', () => {
    expect(
      formatEvolutionConditions([
        {
          needs_overworld_rain: true,
          party_species: { name: 'remoraid' },
          party_type: { name: 'dark' },
          relative_physical_stats: -1,
          trigger: { name: 'level-up' },
          turn_upside_down: true,
        },
      ]),
    ).toBe(
      'During rain AND With Remoraid in the party AND With a Dark-type Pokémon in the party AND Attack < Defense AND Turn the device upside down',
    );
  });

  it('makes alternative evolution paths explicit and removes duplicates', () => {
    expect(
      formatEvolutionConditions([
        { min_level: 20, time_of_day: 'night', trigger: { name: 'level-up' } },
        { item: { name: 'moon-stone' }, trigger: { name: 'use-item' } },
        { item: { name: 'moon-stone' }, trigger: { name: 'use-item' } },
      ]),
    ).toBe('(Level 20 AND At night) OR Use Moon Stone');
  });

  it('uses safe fallbacks for missing conditions and unknown genders', () => {
    expect(formatEvolutionConditions([])).toBe('Not available');
    expect(formatEvolutionConditions([{ gender: 7 }])).toBe('Gender 7');
    expect(formatEvolutionConditions([{ trigger: { name: 'level-up' } }])).toBe(
      'Level up',
    );
  });

  it('localizes conditions, conjunctions, and Pokémon types in German', () => {
    expect(
      formatEvolutionConditions(
        [
          {
            gender: 1,
            known_move_type: { name: 'fairy' },
            min_level: 16,
            needs_overworld_rain: true,
            time_of_day: 'night',
            trigger: { name: 'level-up' },
          },
        ],
        'de',
      ),
    ).toBe(
      'Level 16 UND Bei Nacht UND Nur weiblich UND Eine Attacke vom Typ Fee beherrschen UND Bei Regen',
    );
    expect(formatEvolutionConditions([], 'de')).toBe('Nicht verfügbar');
  });
});
