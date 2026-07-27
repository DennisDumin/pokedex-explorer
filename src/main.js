import './styles/fonts.css';
import './styles/app.css';
import './styles/pokemon-dialog.css';
import './styles/collections.css';
import './styles/responsive.css';

import {
  initPokemonCardInteractions,
  initPokemonListControls,
  loadPokemonApi,
  restorePokemonListFromUrl,
} from './ui/pokemon-catalog.js';
import {
  initPokemonDialog,
  renderOneCard,
  restorePokemonDialogFromUrl,
} from './ui/pokemon-dialog.js';
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
