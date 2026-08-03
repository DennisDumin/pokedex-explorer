import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  translate,
  translateType,
} from '../src/i18n/i18n.js';

describe('translations', () => {
  it('normalizes supported locales and falls back to English', () => {
    expect(normalizeLanguage('de-DE')).toBe('de');
    expect(normalizeLanguage('EN-us')).toBe('en');
    expect(normalizeLanguage('fr')).toBe(DEFAULT_LANGUAGE);
    expect(normalizeLanguage(null)).toBe(DEFAULT_LANGUAGE);
  });

  it('interpolates dynamic values in both languages', () => {
    expect(translate('en', 'list.loadMore', { count: 40 })).toBe('Load 40 more Pokémon');
    expect(translate('de', 'list.loadMore', { count: 40 })).toBe(
      '40 weitere Pokémon laden',
    );
    expect(translate('en', 'tcg.loadMore', { count: 8 })).toBe('Load 8 more');
    expect(translate('de', 'tcg.loadMore', { count: 2 })).toBe('2 weitere laden');
    expect(translate('de', 'tcg.loadedProgress', { shown: 8, total: 18 })).toBe(
      '8 von 18 Karten geladen.',
    );
    expect(translate('en', 'matchups.title')).toBe('Weaknesses and resistances');
    expect(translate('de', 'matchups.title')).toBe('Schwächen und Resistenzen');
  });

  it('uses English and key fallbacks for missing translations', () => {
    expect(translate('de', 'language.english')).toBe('Englisch');
    expect(translate('en', 'language.german')).toBe('Deutsch');
    expect(translate('de', 'language.german')).toBe('Deutsch');
    expect(translate('de', 'missing.translation')).toBe('missing.translation');
  });

  it('localizes known types and keeps unknown API types readable', () => {
    expect(translateType('de', 'grass')).toBe('Pflanze');
    expect(translateType('en', 'fire')).toBe('Fire');
    expect(translateType('de', 'stellar-form')).toBe('Stellar Form');
    expect(translateType('de', '')).toBe('Nicht verfügbar');
  });
});
