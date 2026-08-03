import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cachePokemon } from '../src/state/pokemon-store.js';
import { showGif, showImg } from '../src/ui/pokemon-card.js';

const mediaMocks = vi.hoisted(() => ({
  isMediaPreloaded: vi.fn(() => true),
  preloadMediaUrls: vi.fn(),
}));

vi.mock('../src/utils/media.js', () => mediaMocks);

function createPokemon() {
  return {
    id: 15,
    sprites: {
      front_default: 'sprite.png',
      other: {
        'official-artwork': { front_default: 'artwork.png' },
        showdown: { front_default: 'animation.gif' },
      },
    },
  };
}

function createCard() {
  const image = {
    classList: { add: vi.fn(), remove: vi.fn() },
    dataset: {},
    removeAttribute: vi.fn(),
    src: 'animation.gif',
  };
  const card = {
    isConnected: true,
    matches: vi.fn(() => true),
    querySelector: vi.fn(() => image),
  };

  return { card, image };
}

beforeEach(() => {
  mediaMocks.isMediaPreloaded.mockReturnValue(true);
  mediaMocks.preloadMediaUrls.mockReset();
  cachePokemon([createPokemon()]);
});

describe('Pokémon card animation', () => {
  it('keeps the artwork after a pending hover animation is cancelled', async () => {
    let finishPreload;
    mediaMocks.preloadMediaUrls.mockImplementation(
      () => new Promise((resolve) => (finishPreload = resolve)),
    );
    const { card, image } = createCard();

    const pendingAnimation = showGif(15, card);
    showImg(15, card);
    finishPreload();
    await pendingAnimation;

    expect(image.src).toBe('artwork.png');
    expect(image.classList.remove).toHaveBeenCalledWith('is-animated');
    expect(image.classList.add).not.toHaveBeenCalled();
  });
});
