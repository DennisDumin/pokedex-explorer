import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('image fallbacks', () => {
  it('falls back from animation to artwork and then to the local icon', async () => {
    let errorListener;
    vi.stubGlobal('document', {
      addEventListener: vi.fn((_type, listener) => {
        errorListener = listener;
      }),
      baseURI: 'https://example.com/pokedex/',
    });
    const image = {
      classList: { remove: vi.fn() },
      currentSrc: 'https://img.example/animation.gif',
      dataset: {
        imageFallback: './artwork.png',
        imageFinalFallback: './fallback.svg',
      },
      matches: vi.fn(() => true),
      removeAttribute(attribute) {
        if (attribute === 'data-image-fallback') delete this.dataset.imageFallback;
        if (attribute === 'data-image-final-fallback') {
          delete this.dataset.imageFinalFallback;
        }
      },
      src: 'https://img.example/animation.gif',
    };
    const { initImageFallbacks } = await import('../src/ui/image-fallback.js');

    initImageFallbacks();
    errorListener({ target: image });

    expect(image.src).toBe('https://example.com/pokedex/artwork.png');
    expect(image.dataset.imageFallback).toBe('https://example.com/pokedex/fallback.svg');

    image.currentSrc = image.src;
    errorListener({ target: image });

    expect(image.src).toBe('https://example.com/pokedex/fallback.svg');
    expect(image.classList.remove).toHaveBeenCalledWith('is-animated');
  });
});
