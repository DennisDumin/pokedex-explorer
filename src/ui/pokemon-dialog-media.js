import pokemonFallbackUrl from '../../img/pokeball-icon.svg';
import { getPokemonImage } from './pokemon-card.js';
import { prefersReducedMotion } from '../utils/motion.js';
import {
  getPokemonAnimation as selectPokemonAnimation,
  getPokemonArtwork,
} from '../utils/pokemon-media.js';

const POKEMON_CRY_VOLUME = 0.12;

let activeCry = null;

function getPokemonCry(pokemon) {
  return pokemon?.cries?.latest ?? pokemon?.cries?.legacy ?? null;
}

function hasShinyMedia(pokemon) {
  return Boolean(
    selectPokemonAnimation(pokemon, { shiny: true }) ||
    getPokemonArtwork(pokemon, { shiny: true }),
  );
}

function getPokemonDialogMedia(pokemon, { shiny = false } = {}) {
  const animatedImage = prefersReducedMotion()
    ? null
    : selectPokemonAnimation(pokemon, { shiny });
  const artwork = getPokemonArtwork(pokemon, { shiny });

  return {
    fallbackImage: artwork ?? getPokemonImage(pokemon, { shiny }),
    finalFallbackImage: pokemonFallbackUrl,
    image: animatedImage ?? artwork ?? getPokemonImage(pokemon),
    imageIsAnimated: Boolean(animatedImage),
  };
}

function stopPokemonCry() {
  activeCry?.pause();
  activeCry = null;
}

function playPokemonCry(pokemon) {
  const cry = getPokemonCry(pokemon);

  stopPokemonCry();
  if (!cry) return;

  const audio = new Audio(cry);
  activeCry = audio;
  audio.volume = POKEMON_CRY_VOLUME;
  audio.addEventListener(
    'ended',
    () => {
      if (activeCry === audio) activeCry = null;
    },
    { once: true },
  );
  audio.play().catch(() => {
    if (activeCry === audio) activeCry = null;
  });
}

export {
  getPokemonCry,
  getPokemonDialogMedia,
  hasShinyMedia,
  playPokemonCry,
  stopPokemonCry,
};
