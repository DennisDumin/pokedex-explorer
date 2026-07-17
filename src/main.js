import '../style.css';
import '../pokemonBigCard.css';
import '../fonts.css';
import '../mediaQuieries.css';

import {
  filterPokemon,
  loadPokemonApi,
  resetFilter,
  showGif,
  showImg,
  switchAmount,
} from '../script.js';
import {
  closeBigCard,
  closeCard,
  doNotClose,
  renderMenuPointContent,
  renderOneCard,
} from '../pokemonBigCard.js';

Object.assign(window, {
  closeBigCard,
  closeCard,
  doNotClose,
  filterPokemon,
  renderMenuPointContent,
  renderOneCard,
  resetFilter,
  showGif,
  showImg,
  switchAmount,
});

loadPokemonApi();
