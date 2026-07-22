import { mapWithConcurrency } from './async.js';
import { getPokemonAnimation, getPokemonArtwork } from './pokemon-media.js';

const MEDIA_LOAD_TIMEOUT = 10000;

function getPokemonMediaUrls(pokemon, { includeShiny = false } = {}) {
  const variants = includeShiny ? [false, true] : [false];

  return variants.flatMap((shiny) => {
    const fallbackUrl = shiny
      ? pokemon?.sprites?.front_shiny
      : pokemon?.sprites?.front_default;
    const artwork = getPokemonArtwork(pokemon, { shiny });
    const animatedSprite = getPokemonAnimation(pokemon, { fallbackUrl, shiny });

    return [artwork, animatedSprite].filter(Boolean);
  });
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    let isSettled = false;

    const finish = async () => {
      if (isSettled) return;
      isSettled = true;
      globalThis.clearTimeout(timeoutId);

      if (image.naturalWidth > 0 && typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch {
          // The load event already confirms that the browser can display it.
        }
      }

      resolve();
    };

    const timeoutId = globalThis.setTimeout(finish, MEDIA_LOAD_TIMEOUT);
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    image.src = url;
  });
}

async function preloadPokemonMedia(
  pokemon,
  { concurrency = 6, includeShiny = false } = {},
) {
  const entries = Array.isArray(pokemon) ? pokemon : [];
  const mediaUrls = [
    ...new Set(entries.flatMap((entry) => getPokemonMediaUrls(entry, { includeShiny }))),
  ];

  await mapWithConcurrency(mediaUrls, preloadImage, { concurrency });
}

async function preloadMediaUrls(urls, { concurrency = 6 } = {}) {
  const mediaUrls = [
    ...new Set(
      (Array.isArray(urls) ? urls : []).filter(
        (url) => typeof url === 'string' && url.trim() !== '',
      ),
    ),
  ];

  await mapWithConcurrency(mediaUrls, preloadImage, { concurrency });
}

export { preloadMediaUrls, preloadPokemonMedia };
