import { describe, expect, it } from 'vitest';

import { getSpeciesSummary } from '../src/utils/species.js';

function localized(language, values) {
  return { language: { name: language }, ...values };
}

describe('getSpeciesSummary', () => {
  it('selects the latest requested-language texts and normalizes whitespace', () => {
    const summary = getSpeciesSummary({
      capture_rate: 45,
      flavor_text_entries: [
        localized('en', { flavor_text: 'An older entry.' }),
        localized('de', { flavor_text: 'Ein deutscher Eintrag.' }),
        localized('en', { flavor_text: 'A newer\nentry\fwith   clean text.' }),
      ],
      genera: [
        localized('de', { genus: 'Samen-Pokémon' }),
        localized('en', { genus: 'Seed   Pokémon' }),
      ],
      generation: { name: 'generation-i' },
      growth_rate: { name: 'medium-slow' },
      habitat: { name: 'grassland' },
    });

    expect(summary).toEqual({
      captureRate: '45 / 255',
      flavorText: 'A newer entry with clean text.',
      generation: 'Generation I',
      genus: 'Seed Pokémon',
      growthRate: 'Medium Slow',
      habitat: 'Grassland',
    });
  });

  it('uses the requested language and falls back to English per field', () => {
    const summary = getSpeciesSummary(
      {
        flavor_text_entries: [
          localized('en', { flavor_text: 'English entry.' }),
          localized('de', { flavor_text: 'Deutscher Eintrag.' }),
        ],
        genera: [localized('en', { genus: 'Mouse Pokémon' })],
      },
      'de',
    );

    expect(summary.flavorText).toBe('Deutscher Eintrag.');
    expect(summary.genus).toBe('Mouse Pokémon');
  });

  it('localizes German species resources and missing-value fallbacks', () => {
    const summary = getSpeciesSummary(
      {
        capture_rate: null,
        flavor_text_entries: [
          localized('de', { flavor_text: 'Lebt am Rand eines Gewässers.' }),
        ],
        genera: [localized('de', { genus: 'Maus-Pokémon' })],
        generation: { name: 'generation-iv' },
        growth_rate: { name: 'slow-then-very-fast' },
        habitat: { name: 'waters-edge' },
      },
      'de-DE',
    );

    expect(summary).toEqual({
      captureRate: 'Nicht verfügbar',
      flavorText: 'Lebt am Rand eines Gewässers.',
      generation: 'Generation IV',
      genus: 'Maus-Pokémon',
      growthRate: 'Erst langsam, dann sehr schnell',
      habitat: 'Gewässerrand',
    });
  });

  it('formats compound resource names and a zero capture rate', () => {
    const summary = getSpeciesSummary({
      capture_rate: 0,
      generation: { name: 'generation-iv' },
      growth_rate: { name: 'slow-then-very-fast' },
      habitat: { name: 'waters-edge' },
    });

    expect(summary.captureRate).toBe('0 / 255');
    expect(summary.generation).toBe('Generation IV');
    expect(summary.growthRate).toBe('Slow Then Very Fast');
    expect(summary.habitat).toBe('Waters Edge');
  });

  it('provides safe fallbacks for missing or invalid species values', () => {
    expect(getSpeciesSummary({ capture_rate: 300 })).toEqual({
      captureRate: 'Not available',
      flavorText: 'Not available',
      generation: 'Not available',
      genus: 'Not available',
      growthRate: 'Not available',
      habitat: 'Not available',
    });
    expect(getSpeciesSummary(null)).toEqual({
      captureRate: 'Not available',
      flavorText: 'Not available',
      generation: 'Not available',
      genus: 'Not available',
      growthRate: 'Not available',
      habitat: 'Not available',
    });
    expect(getSpeciesSummary(null, 'de')).toEqual({
      captureRate: 'Nicht verfügbar',
      flavorText: 'Nicht verfügbar',
      generation: 'Nicht verfügbar',
      genus: 'Nicht verfügbar',
      growthRate: 'Nicht verfügbar',
      habitat: 'Nicht verfügbar',
    });
  });
});
