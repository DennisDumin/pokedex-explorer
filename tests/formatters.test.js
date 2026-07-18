import { describe, expect, it } from 'vitest';

import {
  formatHeight,
  formatPokemonName,
  formatPokemonNumber,
  formatWeight,
  getStatColor,
  normalizeBaseStat,
} from '../src/utils/formatters.js';

describe('Pokémon formatters', () => {
  it('formats Pokémon names and real API IDs', () => {
    expect(formatPokemonName('mr-mime')).toBe('Mr Mime');
    expect(formatPokemonNumber(7)).toBe('#007');
    expect(formatPokemonNumber(1025)).toBe('#1025');
  });

  it('formats height in feet, inches, and metric units', () => {
    expect(formatHeight(7)).toBe('2′ 4″ (70 cm)');
    expect(formatHeight(17)).toBe('5′ 7″ (1.7 m)');
    expect(formatHeight(null)).toBe('Not available');
  });

  it('converts hectograms to kilograms and pounds correctly', () => {
    expect(formatWeight(69)).toBe('15.2 lb (6.9 kg)');
    expect(formatWeight(1000)).toBe('220.5 lb (100.0 kg)');
    expect(formatWeight(undefined)).toBe('Not available');
  });
});

describe('base stat presentation', () => {
  it('normalizes base stats and caps the result at 100 percent', () => {
    expect(normalizeBaseStat(0)).toBe(0);
    expect(normalizeBaseStat(255)).toBe(100);
    expect(normalizeBaseStat(999)).toBe(100);
    expect(normalizeBaseStat(-10)).toBe(0);
  });

  it('handles the stat color boundary at exactly 55', () => {
    expect(getStatColor(55)).toBe('#2f855a');
    expect(getStatColor(54)).toBe('#c05621');
    expect(getStatColor(29)).toBe('#c53030');
  });
});
