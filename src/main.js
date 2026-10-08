import './styles/index.css';

import {
  initPokemonListControls,
  restorePokemonListFromUrl,
} from './ui/pokemon-catalog.js';
import { initPokemonCardInteractions } from './ui/pokemon-card.js';
import { prefetchPokemonDetails } from './ui/pokemon-detail-prefetch.js';
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
import { registerServiceWorker } from './pwa/register-service-worker.js';

async function bootstrap() {
  initLanguageSwitcher();
  initPokemonCardInteractions({
    onPrefetch: prefetchPokemonDetails,
    onSelect: renderOneCard,
  });
  initPokemonListControls();
  initPokemonDialog();
  initCollectionUi();
  initComparisonUi();
  initConnectivityStatus();
  initExploreActions();
  initImageFallbacks();
  void registerServiceWorker();
  await restorePokemonListFromUrl();
  await restorePokemonDialogFromUrl();
}

void bootstrap();
