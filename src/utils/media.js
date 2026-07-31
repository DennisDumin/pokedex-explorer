import { mapWithConcurrency } from './async.js';
import { getPokemonAnimation, getPokemonArtwork } from './pokemon-media.js';

const MEDIA_LOAD_TIMEOUT = 10000;
const mediaPreloadCache = new Map();

function getPokemonMediaUrls(
  pokemon,
  { includeAnimation = true, includeArtwork = true, includeShiny = false } = {},
) {
  const variants = includeShiny ? [false, true] : [false];

  return variants.flatMap((shiny) => {
    const fallbackUrl = shiny
      ? pokemon?.sprites?.front_shiny
      : pokemon?.sprites?.front_default;
    const artwork = getPokemonArtwork(pokemon, { shiny });
    const animatedSprite = getPokemonAnimation(pokemon, { fallbackUrl, shiny });

    return [
      includeArtwork ? artwork : null,
      includeAnimation ? animatedSprite : null,
    ].filter(Boolean);
  });
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    let isSettled = false;

    const finish = async (didLoad) => {
      if (isSettled) return;
      isSettled = true;
      globalThis.clearTimeout(timeoutId);

      if (didLoad && image.naturalWidth > 0 && typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch {
          // The load event already confirms that the browser can display it.
        }
      }

      resolve(didLoad);
    };

    const timeoutId = globalThis.setTimeout(() => finish(false), MEDIA_LOAD_TIMEOUT);
    image.addEventListener('load', () => finish(true), { once: true });
    image.addEventListener('error', () => finish(false), { once: true });
    image.src = url;
  });
}

function preloadCachedImage(url) {
  if (mediaPreloadCache.has(url)) return mediaPreloadCache.get(url);

  const request = preloadImage(url).then((didLoad) => {
    if (!didLoad && mediaPreloadCache.get(url) === request) {
      mediaPreloadCache.delete(url);
    }

    return didLoad;
  });

  mediaPreloadCache.set(url, request);
  return request;
}

function clearMediaPreloadCache() {
  mediaPreloadCache.clear();
}

function isMediaPreloaded(url) {
  return typeof url === 'string' && mediaPreloadCache.has(url);
}

async function preloadPokemonMedia(
  pokemon,
  {
    concurrency = 6,
    includeAnimation = true,
    includeArtwork = true,
    includeShiny = false,
  } = {},
) {
  const entries = Array.isArray(pokemon) ? pokemon : [];
  const mediaUrls = [
    ...new Set(
      entries.flatMap((entry) =>
        getPokemonMediaUrls(entry, {
          includeAnimation,
          includeArtwork,
          includeShiny,
        }),
      ),
    ),
  ];

  await mapWithConcurrency(mediaUrls, preloadCachedImage, { concurrency });
}

async function preloadMediaUrls(urls, { concurrency = 6 } = {}) {
  const mediaUrls = [
    ...new Set(
      (Array.isArray(urls) ? urls : []).filter(
        (url) => typeof url === 'string' && url.trim() !== '',
      ),
    ),
  ];

  await mapWithConcurrency(mediaUrls, preloadCachedImage, { concurrency });
}

export {
  clearMediaPreloadCache,
  isMediaPreloaded,
  preloadMediaUrls,
  preloadPokemonMedia,
};
