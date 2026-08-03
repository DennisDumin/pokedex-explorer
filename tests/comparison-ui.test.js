import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const requestFeedbackElement = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  disabled: false,
  hidden: true,
  innerHTML: '',
  scrollTop: 0,
  textContent: '',
}));

vi.hoisted(() => {
  vi.stubGlobal('document', {
    getElementById: vi.fn(() => requestFeedbackElement),
  });
});

import { languageStore } from '../src/state/language.js';
import {
  generateComparisonPokemonMarkup,
  renderComparison,
} from '../src/ui/comparison.js';

function createPokemon() {
  return {
    id: 6,
    name: 'charizard',
    sprites: {
      front_default: 'charizard.png',
      other: { 'official-artwork': { front_default: 'charizard-artwork.png' } },
    },
    types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
  };
}

afterEach(() => {
  languageStore.setLanguage('en');
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('Pokemon comparison card', () => {
  it('uses the same type gradient and localized type badges as catalog cards', () => {
    const markup = generateComparisonPokemonMarkup(createPokemon());

    expect(markup).toContain('linear-gradient(135deg, rgb(224, 87, 53)');
    expect(markup).toContain('rgb(92, 147, 177)');
    expect(markup).toContain('>Fire</span>');
    expect(markup).toContain('>Flying</span>');
  });

  it('translates type badges when German is selected', () => {
    languageStore.setLanguage('de');

    const markup = generateComparisonPokemonMarkup(createPokemon());

    expect(markup).toContain('>Feuer</span>');
    expect(markup).toContain('>Flug</span>');
  });

  it('starts each newly rendered comparison at the top', () => {
    requestFeedbackElement.scrollTop = 96;

    renderComparison(createPokemon(), {
      ...createPokemon(),
      id: 9,
      name: 'blastoise',
      types: [{ type: { name: 'water' } }],
    });

    expect(requestFeedbackElement.scrollTop).toBe(0);
  });
});
