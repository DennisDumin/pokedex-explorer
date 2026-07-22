import { describe, expect, it } from 'vitest';

import { calculateTypeMatchups } from '../src/utils/type-matchups.js';

function relationTypes(names) {
  return names.map((name) => ({ name }));
}

function typeResource(
  name,
  { doubleDamageFrom = [], halfDamageFrom = [], noDamageFrom = [] } = {},
) {
  return {
    damage_relations: {
      double_damage_from: relationTypes(doubleDamageFrom),
      half_damage_from: relationTypes(halfDamageFrom),
      no_damage_from: relationTypes(noDamageFrom),
    },
    name,
  };
}

describe('calculateTypeMatchups', () => {
  it('returns neutral multipliers when no type data is available', () => {
    const matchups = calculateTypeMatchups(null);

    expect(Object.keys(matchups)).toHaveLength(18);
    expect(Object.values(matchups).every((multiplier) => multiplier === 1)).toBe(true);
  });

  it('multiplies dual Water/Ground defenses, including immunity and cancellation', () => {
    const water = typeResource('water', {
      doubleDamageFrom: ['electric', 'grass'],
      halfDamageFrom: ['fire', 'water', 'ice', 'steel'],
    });
    const ground = typeResource('ground', {
      doubleDamageFrom: ['water', 'grass', 'ice'],
      halfDamageFrom: ['poison', 'rock'],
      noDamageFrom: ['electric'],
    });
    const matchups = calculateTypeMatchups([water, ground]);

    expect(matchups.grass).toBe(4);
    expect(matchups.electric).toBe(0);
    expect(matchups.ice).toBe(1);
    expect(matchups.fire).toBe(0.5);
    expect(matchups.poison).toBe(0.5);
  });

  it('calculates quarter resistance and quadruple weakness for Fire/Flying', () => {
    const fire = typeResource('fire', {
      doubleDamageFrom: ['water', 'ground', 'rock'],
      halfDamageFrom: ['bug', 'steel', 'fire', 'grass', 'ice', 'fairy'],
    });
    const flying = typeResource('flying', {
      doubleDamageFrom: ['rock', 'electric', 'ice'],
      halfDamageFrom: ['fighting', 'bug', 'grass'],
      noDamageFrom: ['ground'],
    });
    const matchups = calculateTypeMatchups([fire, flying]);

    expect(matchups.bug).toBe(0.25);
    expect(matchups.grass).toBe(0.25);
    expect(matchups.rock).toBe(4);
    expect(matchups.ground).toBe(0);
  });

  it('ignores malformed relation entries and retains non-standard API types', () => {
    const matchups = calculateTypeMatchups([
      {
        damage_relations: {
          double_damage_from: [{ name: 'stellar' }, null, { name: '' }],
        },
      },
    ]);

    expect(matchups.stellar).toBe(2);
    expect(matchups.normal).toBe(1);
  });
});
