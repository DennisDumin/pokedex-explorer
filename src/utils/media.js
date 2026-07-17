import { mapWithConcurrency } from './async.js';

const MEDIA_LOAD_TIMEOUT = 10000;

function getPokemonMediaUrls(pokemon) {
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default;
  const animatedSprite =
    pokemon.sprites?.other?.showdown?.front_default ??
    pokemon.sprites?.front_default;

  return [artwork, animatedSprite].filter(Boolean);
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    let isSettled = false;

    const finish = async () => {
      if (isSettled) return;
      isSettled = true;
      window.clearTimeout(timeoutId);

      if (image.naturalWidth > 0 && typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch {
          // The load event already confirms that the browser can display it.
        }
      }

      resolve();
    };

    const timeoutId = window.setTimeout(finish, MEDIA_LOAD_TIMEOUT);
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    image.src = url;
  });
}

async function preloadPokemonMedia(pokemon, { concurrency = 6 } = {}) {
  const mediaUrls = [
    ...new Set(pokemon.flatMap((entry) => getPokemonMediaUrls(entry))),
  ];

  await mapWithConcurrency(mediaUrls, preloadImage, { concurrency });
}

export { preloadPokemonMedia };
