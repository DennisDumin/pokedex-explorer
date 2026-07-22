import { describe, expect, it, vi } from 'vitest';

import { pickDailyPokemon, pickRandomPokemon } from '../src/utils/random.js';

function pokemon(id, name = `pokemon-${id}`) {
  return { id, name };
}

describe('pickRandomPokemon', () => {
  it('returns null without calling the RNG when no eligible Pokemon exist', () => {
    const random = vi.fn(() => 0.5);

    expect(pickRandomPokemon([], random)).toBeNull();
    expect(pickRandomPokemon(null, random)).toBeNull();
    expect(
      pickRandomPokemon([pokemon(0), pokemon(-1), pokemon(10000), pokemon(2.5)], random),
    ).toBeNull();
    expect(random).not.toHaveBeenCalled();
  });

  it('excludes forms and malformed IDs before selecting a Pokemon', () => {
    const first = pokemon(1, 'bulbasaur');
    const last = pokemon(9999, 'last-main-id');
    const catalog = [
      pokemon(0),
      first,
      { id: '25', name: 'string-id' },
      pokemon(10000, 'form'),
      pokemon(Number.NaN),
      last,
    ];

    expect(pickRandomPokemon(catalog, () => 0)).toBe(first);
    expect(pickRandomPokemon(catalog, () => 0.999999)).toBe(last);
  });

  it('safely clamps finite RNG values to the supported interval', () => {
    const catalog = [pokemon(1), pokemon(2), pokemon(3)];

    expect(pickRandomPokemon(catalog, () => -10)).toBe(catalog[0]);
    expect(pickRandomPokemon(catalog, () => 1)).toBe(catalog[2]);
    expect(pickRandomPokemon(catalog, () => 25)).toBe(catalog[2]);
  });

  it('rejects an invalid RNG function or non-finite result', () => {
    const catalog = [pokemon(1)];

    expect(() => pickRandomPokemon(catalog, null)).toThrow(TypeError);
    expect(() => pickRandomPokemon(catalog, () => Number.NaN)).toThrow(RangeError);
    expect(() => pickRandomPokemon(catalog, () => Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });

  it('does not mutate or reorder the input catalog', () => {
    const catalog = [pokemon(10001, 'form'), pokemon(25), pokemon(4)];
    const originalOrder = [...catalog];

    pickRandomPokemon(catalog, () => 0.5);

    expect(catalog).toEqual(originalOrder);
    expect(catalog[0]).toBe(originalOrder[0]);
  });
});

describe('pickDailyPokemon', () => {
  it('returns the same Pokemon throughout one UTC date', () => {
    const catalog = Array.from({ length: 20 }, (_, index) => pokemon(index + 1));
    const beginningOfDay = new Date('2026-07-18T00:00:01.000Z');
    const endOfDay = new Date('2026-07-18T23:59:59.999Z');

    expect(pickDailyPokemon(catalog, beginningOfDay)).toBe(
      pickDailyPokemon(catalog, endOfDay),
    );
  });

  it('uses the UTC date rather than the timezone written in the input', () => {
    const catalog = Array.from({ length: 25 }, (_, index) => pokemon(index + 1));
    const timezoneDate = new Date('2026-07-18T23:30:00.000-02:00');
    const equivalentUtcDate = new Date('2026-07-19T01:30:00.000Z');

    expect(pickDailyPokemon(catalog, timezoneDate)).toBe(
      pickDailyPokemon(catalog, equivalentUtcDate),
    );
  });

  it('applies the same main-Pokemon filtering without mutating the catalog', () => {
    const validPokemon = pokemon(25, 'pikachu');
    const catalog = [pokemon(10025, 'form'), validPokemon, pokemon(-2)];
    const originalOrder = [...catalog];

    expect(pickDailyPokemon(catalog, new Date('2026-07-18T12:00:00Z'))).toBe(
      validPokemon,
    );
    expect(catalog).toEqual(originalOrder);
  });

  it('returns null for an empty eligible catalog', () => {
    expect(pickDailyPokemon([], new Date('2026-07-18T12:00:00Z'))).toBeNull();
    expect(
      pickDailyPokemon([pokemon(10000)], new Date('2026-07-18T12:00:00Z')),
    ).toBeNull();
  });

  it('rejects invalid date inputs when a selection is possible', () => {
    const catalog = [pokemon(1)];

    expect(() => pickDailyPokemon(catalog, '2026-07-18')).toThrow(TypeError);
    expect(() => pickDailyPokemon(catalog, new Date('invalid'))).toThrow(RangeError);
  });
});
