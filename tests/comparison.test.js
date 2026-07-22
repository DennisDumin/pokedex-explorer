import { describe, expect, it } from 'vitest';

import { BASE_STAT_NAMES, comparePokemonStats } from '../src/utils/comparison.js';

function pokemon(id, name, stats) {
  return {
    id,
    name,
    stats: stats.map(([statName, value]) => ({
      base_stat: value,
      stat: { name: statName },
    })),
  };
}

describe('comparePokemonStats', () => {
  it('matches shuffled values by stat name instead of array position', () => {
    const left = pokemon(1, 'bulbasaur', [
      ['speed', 45],
      ['hp', 45],
      ['attack', 49],
    ]);
    const right = pokemon(4, 'charmander', [
      ['attack', 52],
      ['speed', 65],
      ['hp', 39],
    ]);
    const comparison = comparePokemonStats(left, right);

    expect(comparison.stats.map(({ name }) => name)).toEqual(BASE_STAT_NAMES);
    expect(comparison.stats.find(({ name }) => name === 'hp')).toMatchObject({
      leftValue: 45,
      rightValue: 39,
      outcome: 'left',
    });
    expect(comparison.stats.find(({ name }) => name === 'attack')).toMatchObject({
      leftValue: 49,
      rightValue: 52,
      outcome: 'right',
    });
  });

  it('reports per-stat winners, ties, and a tied summary', () => {
    const left = pokemon(25, 'pikachu', [
      ['hp', 35],
      ['attack', 55],
      ['speed', 90],
    ]);
    const right = pokemon(133, 'eevee', [
      ['hp', 55],
      ['attack', 55],
      ['speed', 55],
    ]);
    const comparison = comparePokemonStats(left, right);

    expect(comparison.stats.find(({ name }) => name === 'hp').outcome).toBe('right');
    expect(comparison.stats.find(({ name }) => name === 'attack').outcome).toBe('tie');
    expect(comparison.stats.find(({ name }) => name === 'speed').outcome).toBe('left');
    expect(comparison.summary).toEqual({
      leftWins: 1,
      rightWins: 1,
      ties: 1,
      unavailable: 3,
      winner: 'tie',
    });
  });

  it('marks a stat unavailable when either value is missing or invalid', () => {
    const left = pokemon(7, 'squirtle', [
      ['hp', 44],
      ['attack', -1],
      ['defense', 0],
      ['unknown-stat', 999],
    ]);
    const right = pokemon(10, 'caterpie', [
      ['attack', 30],
      ['defense', 1],
    ]);
    const comparison = comparePokemonStats(left, right);

    expect(comparison.stats.find(({ name }) => name === 'hp')).toMatchObject({
      leftValue: 44,
      rightValue: null,
      outcome: 'unavailable',
    });
    expect(comparison.stats.find(({ name }) => name === 'attack')).toMatchObject({
      leftValue: null,
      rightValue: 30,
      outcome: 'unavailable',
    });
    expect(comparison.stats.find(({ name }) => name === 'defense')).toMatchObject({
      leftValue: 0,
      rightValue: 1,
      outcome: 'right',
    });
  });

  it('returns safe identities and unavailable results for malformed Pokemon data', () => {
    const comparison = comparePokemonStats(null, { id: -2, name: '', stats: 'invalid' });

    expect(comparison.left).toEqual({ id: null, name: null });
    expect(comparison.right).toEqual({ id: null, name: null });
    expect(comparison.stats).toHaveLength(6);
    expect(comparison.stats.every(({ outcome }) => outcome === 'unavailable')).toBe(true);
    expect(comparison.summary).toEqual({
      leftWins: 0,
      rightWins: 0,
      ties: 0,
      unavailable: 6,
      winner: 'unavailable',
    });
  });

  it('selects the side that wins more comparable stats', () => {
    const left = pokemon(6, 'charizard', [
      ['hp', 78],
      ['attack', 84],
      ['speed', 100],
    ]);
    const right = pokemon(9, 'blastoise', [
      ['hp', 79],
      ['attack', 83],
      ['speed', 78],
    ]);
    const comparison = comparePokemonStats(left, right);

    expect(comparison.summary.winner).toBe('left');
    expect(comparison.summary.leftWins).toBe(2);
    expect(comparison.summary.rightWins).toBe(1);
  });
});
