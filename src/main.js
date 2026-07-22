import '../style.css';
import '../pokemonBigCard.css';
import '../collections.css';
import '../fonts.css';
import '../mediaQueries.css';

import {
  initPokemonCardInteractions,
  initPokemonListControls,
  loadPokemonApi,
  restorePokemonListFromUrl,
} from '../script.js';
import {
  initPokemonDialog,
  renderOneCard,
  restorePokemonDialogFromUrl,
} from '../pokemonBigCard.js';
import { initCollectionUi } from './ui/collections.js';
import { initComparisonUi } from './ui/comparison.js';
import { initConnectivityStatus } from './ui/connectivity-status.js';
import { initExploreActions } from './ui/explore.js';
import { initImageFallbacks } from './ui/image-fallback.js';
import { initLanguageSwitcher } from './ui/language-switcher.js';
import {
  initInstallPrompt,
  registerServiceWorker,
} from './pwa/register-service-worker.js';

async function bootstrap() {
  initLanguageSwitcher();
  initPokemonCardInteractions({ onSelect: renderOneCard });
  initPokemonListControls();
  initPokemonDialog();
  initCollectionUi();
  initComparisonUi();
  initConnectivityStatus();
  initExploreActions();
  initImageFallbacks();
  await registerServiceWorker();
  await loadPokemonApi();
  await restorePokemonListFromUrl();
  await restorePokemonDialogFromUrl();
}

void bootstrap();
initInstallPrompt();
