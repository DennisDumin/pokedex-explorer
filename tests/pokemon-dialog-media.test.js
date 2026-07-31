import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getPokemonCry,
  getPokemonDialogMedia,
  hasShinyMedia,
  playPokemonCry,
  stopPokemonCry,
} from '../src/ui/pokemon-dialog-media.js';

function createPokemon() {
  return {
    cries: {
      latest: 'latest.ogg',
      legacy: 'legacy.ogg',
    },
    sprites: {
      front_default: 'default.png',
      front_shiny: 'shiny.png',
      other: {
        'official-artwork': {
          front_default: 'artwork.png',
          front_shiny: 'shiny-artwork.png',
        },
        showdown: {
          front_default: 'animation.gif',
          front_shiny: 'shiny-animation.gif',
        },
      },
    },
  };
}

afterEach(() => {
  stopPokemonCry();
  vi.unstubAllGlobals();
});

describe('Pokémon dialog media', () => {
  it('selects matching animation and artwork for shiny Pokémon', () => {
    const pokemon = createPokemon();

    expect(hasShinyMedia(pokemon)).toBe(true);
    expect(getPokemonDialogMedia(pokemon, { shiny: true })).toMatchObject({
      fallbackImage: 'shiny-artwork.png',
      image: 'shiny-animation.gif',
      imageIsAnimated: true,
    });
  });

  it('uses artwork when reduced motion is preferred', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );

    expect(getPokemonDialogMedia(createPokemon())).toMatchObject({
      fallbackImage: 'artwork.png',
      image: 'artwork.png',
      imageIsAnimated: false,
    });
  });

  it('falls back from the latest cry to the legacy cry', () => {
    const pokemon = createPokemon();

    expect(getPokemonCry(pokemon)).toBe('latest.ogg');
    pokemon.cries.latest = null;
    expect(getPokemonCry(pokemon)).toBe('legacy.ogg');
    expect(getPokemonCry(null)).toBeNull();
  });

  it('plays cries at the configured volume and can stop playback', () => {
    const audioInstances = [];

    class FakeAudio {
      constructor(source) {
        this.source = source;
        this.pause = vi.fn();
        this.play = vi.fn(() => Promise.resolve());
        audioInstances.push(this);
      }

      addEventListener() {}
    }

    vi.stubGlobal('Audio', FakeAudio);
    playPokemonCry(createPokemon());

    expect(audioInstances).toHaveLength(1);
    expect(audioInstances[0].source).toBe('latest.ogg');
    expect(audioInstances[0].volume).toBe(0.12);
    expect(audioInstances[0].play).toHaveBeenCalledOnce();

    stopPokemonCry();
    expect(audioInstances[0].pause).toHaveBeenCalledOnce();
  });
});
