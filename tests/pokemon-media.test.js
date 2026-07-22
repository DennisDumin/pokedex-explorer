import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { preloadPokemonMedia } from '../src/utils/media.js';
import { getPokemonAnimation, getPokemonArtwork } from '../src/utils/pokemon-media.js';

function createPokemon() {
  return {
    sprites: {
      front_default: 'root-default.png',
      front_shiny: 'root-shiny.png',
      other: {
        'official-artwork': {
          front_default: 'official-default.png',
          front_shiny: 'official-shiny.png',
        },
        home: {
          front_default: 'home-default.png',
          front_shiny: 'home-shiny.png',
        },
        showdown: {
          front_default: 'showdown-default.gif',
          front_shiny: 'showdown-shiny.gif',
        },
      },
      versions: {
        'generation-v': {
          'black-white': {
            animated: {
              front_default: 'gen-v-default.gif',
              front_shiny: 'gen-v-shiny.gif',
            },
          },
        },
      },
    },
  };
}

describe('Pokémon media selection', () => {
  it('selects normal and shiny official artwork first', () => {
    const pokemon = createPokemon();

    expect(getPokemonArtwork(pokemon)).toBe('official-default.png');
    expect(getPokemonArtwork(pokemon, { shiny: true })).toBe('official-shiny.png');
  });

  it('falls back from official artwork to Home and root sprites', () => {
    const pokemon = createPokemon();
    pokemon.sprites.other['official-artwork'].front_default = null;

    expect(getPokemonArtwork(pokemon)).toBe('home-default.png');

    pokemon.sprites.other.home.front_default = '';
    expect(getPokemonArtwork(pokemon)).toBe('root-default.png');
  });

  it('selects Showdown before generation V animation for each variant', () => {
    const pokemon = createPokemon();

    expect(getPokemonAnimation(pokemon)).toBe('showdown-default.gif');
    expect(getPokemonAnimation(pokemon, { shiny: true })).toBe('showdown-shiny.gif');

    pokemon.sprites.other.showdown.front_default = null;
    pokemon.sprites.other.showdown.front_shiny = null;
    expect(getPokemonAnimation(pokemon)).toBe('gen-v-default.gif');
    expect(getPokemonAnimation(pokemon, { shiny: true })).toBe('gen-v-shiny.gif');
  });

  it('uses an explicit fallback URL without crossing between variants', () => {
    const pokemon = createPokemon();
    pokemon.sprites.other['official-artwork'].front_shiny = null;
    pokemon.sprites.other.home.front_shiny = null;
    pokemon.sprites.front_shiny = null;
    pokemon.sprites.other.showdown.front_shiny = null;
    pokemon.sprites.versions['generation-v']['black-white'].animated.front_shiny = null;

    expect(getPokemonArtwork(pokemon, { fallbackUrl: 'fallback.svg', shiny: true })).toBe(
      'fallback.svg',
    );
    expect(
      getPokemonAnimation(pokemon, { fallbackUrl: 'fallback.svg', shiny: true }),
    ).toBe('fallback.svg');
    expect(getPokemonArtwork(null, { fallbackUrl: 'fallback.svg' })).toBe('fallback.svg');
    expect(getPokemonAnimation(null)).toBeNull();
  });
});

describe('preloadPokemonMedia', () => {
  const requestedUrls = [];

  beforeEach(() => {
    requestedUrls.length = 0;

    class FakeImage {
      constructor() {
        this.listeners = new Map();
        this.naturalWidth = 96;
      }

      addEventListener(type, listener) {
        this.listeners.set(type, listener);
      }

      decode() {
        return Promise.resolve();
      }

      set src(value) {
        requestedUrls.push(value);
        queueMicrotask(() => this.listeners.get('load')?.());
      }
    }

    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the standard preload limited to normal artwork and animation', async () => {
    await preloadPokemonMedia([createPokemon()]);

    expect(new Set(requestedUrls)).toEqual(
      new Set(['official-default.png', 'showdown-default.gif']),
    );
  });

  it('optionally preloads both normal and shiny media', async () => {
    await preloadPokemonMedia([createPokemon()], { includeShiny: true });

    expect(new Set(requestedUrls)).toEqual(
      new Set([
        'official-default.png',
        'showdown-default.gif',
        'official-shiny.png',
        'showdown-shiny.gif',
      ]),
    );
  });

  it('deduplicates URLs and safely accepts missing input', async () => {
    const pokemon = createPokemon();
    pokemon.sprites.other.showdown.front_default = 'official-default.png';

    await preloadPokemonMedia([pokemon, pokemon]);
    expect(requestedUrls).toEqual(['official-default.png']);

    requestedUrls.length = 0;
    await expect(preloadPokemonMedia(null)).resolves.toBeUndefined();
    expect(requestedUrls).toEqual([]);
  });
});
