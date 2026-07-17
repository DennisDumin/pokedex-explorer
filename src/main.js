import '../style.css';
import '../pokemonBigCard.css';
import '../fonts.css';
import '../mediaQueries.css';

import {
  initPokemonCardInteractions,
  initPokemonListControls,
  loadPokemonApi,
} from '../script.js';
import { initPokemonDialog, renderOneCard } from '../pokemonBigCard.js';

initPokemonCardInteractions({ onSelect: renderOneCard });
initPokemonListControls();
initPokemonDialog();
loadPokemonApi();
