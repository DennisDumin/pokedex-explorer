import { getPokemonCatalog } from '../api/pokemon-api.js';
import { t } from '../i18n/index.js';
import { beginRequest, clearRequestError, showRequestError } from './request-feedback.js';
import { pickDailyPokemon, pickRandomPokemon } from '../utils/random.js';
import { renderOneCard } from './pokemon-dialog.js';

let exploreActionsInitialized = false;
let activeExploreRequest = null;

function setExploreButtonsDisabled(disabled) {
  document.getElementById('random-pokemon-button').disabled = disabled;
  document.getElementById('daily-pokemon-button').disabled = disabled;
}

async function performExploreAction(picker, triggerElement) {
  const finishRequest = beginRequest();
  clearRequestError();
  setExploreButtonsDisabled(true);

  try {
    const catalog = await getPokemonCatalog();
    const selectedPokemon = picker(catalog);

    if (!selectedPokemon) {
      throw new Error(t('errors.catalogEmpty'));
    }

    const detailRequest = renderOneCard(selectedPokemon.id, triggerElement);
    finishRequest();
    await detailRequest;
  } catch {
    showRequestError({
      messageKey: 'errors.explore',
      onRetry: () => openExplorePokemon(picker, triggerElement),
    });
  } finally {
    setExploreButtonsDisabled(false);
    finishRequest();
  }
}

function openExplorePokemon(picker, triggerElement) {
  if (activeExploreRequest) return activeExploreRequest;

  activeExploreRequest = performExploreAction(picker, triggerElement).finally(() => {
    activeExploreRequest = null;
  });

  return activeExploreRequest;
}

function initExploreActions() {
  if (exploreActionsInitialized) return;

  document.getElementById('random-pokemon-button').addEventListener('click', (event) => {
    void openExplorePokemon(pickRandomPokemon, event.currentTarget);
  });
  document.getElementById('daily-pokemon-button').addEventListener('click', (event) => {
    void openExplorePokemon(pickDailyPokemon, event.currentTarget);
  });

  exploreActionsInitialized = true;
}

export { initExploreActions };
