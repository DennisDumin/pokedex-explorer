import {
  getPokemonImage,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
  getVisiblePokemonIds,
} from './pokemon-catalog.js';
import pokemonFallbackUrl from '../../img/pokeball-icon.svg';
import { getPokemonDetails } from '../api/pokemon-details.js';
import { getResourceId } from '../api/pokemon-api.js';
import { getPokemonCards } from '../api/tcg-api.js';
import { onLanguageChange, t, translateType } from '../i18n/index.js';
import { collectionStore } from '../state/collections.js';
import { comparisonSelectionStore } from '../state/comparison-selection.js';
import { createViewPreferences } from '../state/view-preferences.js';
import { beginRequest, clearRequestError, showRequestError } from './request-feedback.js';
import { acquireScrollLock } from './scroll-lock.js';
import { togglePokemonComparison } from './comparison.js';
import {
  openPokemonDetailRoute,
  parsePokemonDetailRoute,
  removePokemonDetailRoute,
  updatePokemonDetailRoute,
} from '../utils/detail-route.js';
import { preloadMediaUrls, preloadPokemonMedia } from '../utils/media.js';
import { prefersReducedMotion } from '../utils/motion.js';
import {
  getPokemonAnimation as selectPokemonAnimation,
  getPokemonArtwork,
} from '../utils/pokemon-media.js';
import { cardHTML } from './pokemon-dialog-template.js';
import {
  generateAboutHTML,
  generateBaseStatsHTML,
  generateEvolutionHTML,
  generateTradingCardsErrorHTML,
  generateTradingCardsHTML,
  generateTradingCardsLoadingHTML,
  generateTypeMatchupsHTML,
} from './pokemon-detail-tabs.js';

const POKEMON_CRY_VOLUME = 0.12;
const MENU_POINT_BY_ROUTE_TAB = Object.freeze({
  about: 1,
  cards: 5,
  evolution: 4,
  matchups: 3,
  stats: 2,
});
const ROUTE_TAB_BY_MENU_POINT = Object.freeze({
  1: 'about',
  2: 'stats',
  3: 'matchups',
  4: 'evolution',
  5: 'cards',
});
const viewPreferences = createViewPreferences();

let detailRequestVersion = 0;
let menuRequestVersion = 0;
let activePokemonId = null;
let activePokemonDetails = null;
let activeTradingCardsResult = null;
let activeMenuPoint = 1;
let activeShiny = false;
let activeCry = null;
let dialogInitialized = false;
let finishActiveDetailRequest = null;
let lastFocusedElement = null;
let releaseDetailScrollLock = null;

function getMenuPointFromRouteTab(tab) {
  return MENU_POINT_BY_ROUTE_TAB[tab] ?? 1;
}

function getRouteTabFromMenuPoint(menuPoint) {
  return ROUTE_TAB_BY_MENU_POINT[menuPoint] ?? 'about';
}

function hasShinyMedia(pokemon) {
  return Boolean(
    selectPokemonAnimation(pokemon, { shiny: true }) ||
    getPokemonArtwork(pokemon, { shiny: true }),
  );
}

function syncDetailRoute({ historyMode, wasOpen }) {
  if (historyMode === 'none') return;

  const route = {
    shiny: activeShiny,
    tab: getRouteTabFromMenuPoint(activeMenuPoint),
  };

  if (historyMode === 'push' || (historyMode === 'auto' && !wasOpen)) {
    openPokemonDetailRoute(activePokemonId, route);
    return;
  }

  updatePokemonDetailRoute({ pokemonId: activePokemonId, ...route });
}

async function renderOneCard(
  pokemonId,
  triggerElement = null,
  { historyMode = 'auto', menuPoint = 1, shiny } = {},
) {
  const normalizedPokemonId = Number(pokemonId);

  if (!Number.isSafeInteger(normalizedPokemonId) || normalizedPokemonId < 1) return;

  const selectedMenuPoint = ROUTE_TAB_BY_MENU_POINT[menuPoint] ? menuPoint : 1;
  const selectedShiny =
    typeof shiny === 'boolean' ? shiny : viewPreferences.getState().shiny;
  const requestVersion = ++detailRequestVersion;
  const dialog = document.getElementById('pokemon-dialog');
  const wasOpen = dialog.open;
  menuRequestVersion += 1;
  activePokemonId = normalizedPokemonId;
  activePokemonDetails = null;
  activeTradingCardsResult = null;
  clearRequestError();
  stopPokemonCry();

  if (!wasOpen) {
    lastFocusedElement = triggerElement ?? document.activeElement;
  }

  const finishRequest = beginRequest();
  const finishPreviousRequest = finishActiveDetailRequest;
  finishActiveDetailRequest = finishRequest;
  finishPreviousRequest?.();

  try {
    const details = await getPokemonDetails(normalizedPokemonId);
    await Promise.all([
      preloadPokemonMedia([details.pokemon], { includeShiny: true }),
      preloadPokemonMedia(details.evolution.pokemon),
    ]);

    if (requestVersion !== detailRequestVersion) return;

    activePokemonDetails = details;
    activeMenuPoint = selectedMenuPoint;
    activeShiny = selectedShiny && hasShinyMedia(details.pokemon);
    generateCardHTML(details);
    renderMenuPointContent(selectedMenuPoint, normalizedPokemonId, requestVersion);
    collectionStore.recordRecent(normalizedPokemonId);
    syncDetailRoute({ historyMode, wasOpen });
    finishRequest();

    if (!wasOpen) {
      releaseDetailScrollLock = acquireScrollLock();
      dialog.showModal();
    }

    restoreDetailFocus({ triggerElement, wasOpen });
    playPokemonCry(details.pokemon);
  } catch {
    if (requestVersion === detailRequestVersion) {
      const retryTrigger = dialog.open ? lastFocusedElement : triggerElement;
      if (dialog.open) closePokemonDialog();

      showRequestError({
        messageKey: 'errors.detailLoad',
        onRetry: () =>
          renderOneCard(
            normalizedPokemonId,
            retryTrigger?.isConnected ? retryTrigger : document.activeElement,
            {
              historyMode,
              menuPoint: selectedMenuPoint,
              shiny: selectedShiny,
            },
          ),
      });
    }
  } finally {
    finishRequest();
    if (finishActiveDetailRequest === finishRequest) {
      finishActiveDetailRequest = null;
    }
  }
}

function getAdjacentPokemonIds(pokemonId) {
  const visibleIds = getVisiblePokemonIds();
  const currentIndex = visibleIds.indexOf(pokemonId);

  if (currentIndex === -1 || visibleIds.length < 2) {
    return { hasNavigation: false, nextId: pokemonId, previousId: pokemonId };
  }

  return {
    hasNavigation: true,
    nextId: visibleIds[(currentIndex + 1) % visibleIds.length],
    previousId: visibleIds[(currentIndex - 1 + visibleIds.length) % visibleIds.length],
  };
}

function getPokemonCry(pokemon) {
  return pokemon?.cries?.latest ?? pokemon?.cries?.legacy ?? null;
}

function getPokemonVarieties(species) {
  if (!Array.isArray(species?.varieties)) return [];

  return species.varieties
    .map((variety) => {
      try {
        return {
          id: getResourceId(variety?.pokemon?.url),
          name: getPokemonName({
            name: variety?.pokemon?.name,
            species: { id: species.id, name: species.name },
          }),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getDetailMedia(currentPokemon) {
  const animatedImage = prefersReducedMotion()
    ? null
    : selectPokemonAnimation(currentPokemon, {
        shiny: activeShiny,
      });
  const artwork = getPokemonArtwork(currentPokemon, { shiny: activeShiny });

  return {
    fallbackImage: artwork ?? getPokemonImage(currentPokemon, { shiny: activeShiny }),
    finalFallbackImage: pokemonFallbackUrl,
    image: animatedImage ?? artwork ?? getPokemonImage(currentPokemon),
    imageIsAnimated: Boolean(animatedImage),
  };
}

function generateCardHTML(details) {
  const currentPokemon = details.pokemon;
  const name = getPokemonName(currentPokemon);
  const types = (currentPokemon.types ?? [])
    .map((entry) => entry?.type?.name)
    .filter(Boolean);
  const primaryType = types[0] ?? 'normal';
  const secondaryType = types[1] ?? null;
  const media = getDetailMedia(currentPokemon);
  const navigation = getAdjacentPokemonIds(currentPokemon.id);

  document.getElementById('show-big-card').innerHTML = cardHTML({
    backgroundColor: getTypeColor(primaryType, secondaryType),
    fallbackImage: media.fallbackImage,
    finalFallbackImage: media.finalFallbackImage,
    image: media.image,
    imageIsAnimated: media.imageIsAnimated,
    isFavorite: collectionStore.isFavorite(currentPokemon.id),
    isComparisonSelected: comparisonSelectionStore.isSelected(currentPokemon.id),
    isShiny: activeShiny,
    pokemonId: currentPokemon.id,
    hasNavigation: navigation.hasNavigation,
    name,
    nextId: navigation.nextId,
    pokemonNumber: getPokemonNumber({ id: details.species?.id ?? currentPokemon.id }),
    primaryType: translateType(primaryType),
    primaryTypeColor: getTypeColor(primaryType),
    previousId: navigation.previousId,
    secondaryType: secondaryType ? translateType(secondaryType) : null,
    secondaryTypeColor: getTypeColor(secondaryType),
    shinyAvailable: hasShinyMedia(currentPokemon),
    soundAvailable: Boolean(getPokemonCry(currentPokemon)),
    varieties: getPokemonVarieties(details.species),
  });
}

function updateDetailCollectionButtons() {
  if (!activePokemonId) return;

  const favoriteButton = document.querySelector('[data-action="toggle-favorite"]');
  const compareButton = document.querySelector('[data-action="toggle-compare"]');
  const isFavorite = collectionStore.isFavorite(activePokemonId);
  const isComparisonSelected = comparisonSelectionStore.isSelected(activePokemonId);
  const pokemonName = getPokemonName(activePokemonDetails?.pokemon);

  if (favoriteButton) {
    const favoriteAction = isFavorite
      ? t('detail.removeFavorite')
      : t('detail.addFavorite');

    favoriteButton.setAttribute('aria-pressed', String(isFavorite));
    favoriteButton.setAttribute('aria-label', favoriteAction);
    favoriteButton.title = favoriteAction;
    favoriteButton.querySelector('.favorite-icon').textContent = isFavorite ? '♥' : '♡';
  }

  if (compareButton) {
    const compareAction = isComparisonSelected
      ? t('detail.removeCompare', { name: pokemonName })
      : t('detail.selectCompare', { name: pokemonName });

    compareButton.setAttribute('aria-pressed', String(isComparisonSelected));
    compareButton.setAttribute('aria-label', compareAction);
    compareButton.title = isComparisonSelected
      ? t('detail.removeCompareShort')
      : t('detail.selectCompareShort');
    compareButton.querySelector('.compare-icon').textContent = isComparisonSelected
      ? '✓'
      : '⇄';
    compareButton.querySelector('.detail-action-label').textContent = isComparisonSelected
      ? t('detail.selected')
      : t('detail.compare');
  }
}

function updateDetailShinyView() {
  const pokemon = activePokemonDetails?.pokemon;
  const image = document.querySelector('.OnePokemonCard-Image');
  const button = document.querySelector('[data-action="toggle-shiny"]');

  if (!pokemon || !image || !button) return;

  const media = getDetailMedia(pokemon);
  const name = getPokemonName(pokemon);
  image.dataset.imageFallback = media.fallbackImage;
  image.dataset.imageFinalFallback = media.finalFallbackImage;
  image.src = media.image;
  image.alt = activeShiny ? `${t('detail.shiny')} ${name}` : name;
  image.classList.toggle('is-animated', media.imageIsAnimated);
  button.setAttribute('aria-pressed', String(activeShiny));
  button.setAttribute(
    'aria-label',
    activeShiny ? t('detail.showNormal') : t('detail.showShiny'),
  );
  document.querySelector('.OnePokemonCard')?.classList.toggle('is-shiny', activeShiny);
}

function setActiveShiny(shiny, { persist = false, updateRoute = false } = {}) {
  const isAvailable = hasShinyMedia(activePokemonDetails?.pokemon);
  activeShiny = Boolean(shiny && isAvailable);

  if (persist) viewPreferences.setShiny(activeShiny);
  updateDetailShinyView();

  if (updateRoute && activePokemonId) {
    updatePokemonDetailRoute({ shiny: activeShiny });
  }
}

function toggleActivePokemonShiny() {
  if (!hasShinyMedia(activePokemonDetails?.pokemon)) return;

  setActiveShiny(!activeShiny, { persist: true, updateRoute: true });
}

function toggleActivePokemonFavorite() {
  if (!activePokemonId) return;

  collectionStore.toggleFavorite(activePokemonId);
  updateDetailCollectionButtons();
}

function toggleActivePokemonComparison(triggerElement) {
  if (!activePokemonId) return;

  togglePokemonComparison(activePokemonId, triggerElement);
  updateDetailCollectionButtons();
}

function restoreDetailFocus({ triggerElement, wasOpen }) {
  const action = triggerElement?.dataset?.action;
  const focusTarget =
    (wasOpen && action ? document.querySelector(`[data-action="${action}"]`) : null) ??
    document.querySelector('[data-action="close"]');

  focusTarget?.focus({ preventScroll: true });
}

function changeMenuPoint(selectedMenuPoint) {
  const tabs = document.querySelectorAll('[data-menu-point]');

  for (const tab of tabs) {
    const isSelected = Number(tab.dataset.menuPoint) === selectedMenuPoint;
    tab.classList.toggle('selectedMenuPoint', isSelected);
    tab.setAttribute('aria-selected', String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  }

  const selectedTab = document.querySelector(`[data-menu-point="${selectedMenuPoint}"]`);
  document
    .getElementById('content')
    ?.setAttribute('aria-labelledby', selectedTab?.id ?? '');

  globalThis.requestAnimationFrame(() => {
    selectedTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

async function loadTradingCards(details, isCurrentRequest) {
  try {
    const pokemonId = details.species?.id ?? details.pokemon.id;
    const result = await getPokemonCards(pokemonId);
    await preloadMediaUrls(
      result.cards.map((card) => card.images.small ?? card.images.large),
      { concurrency: 4 },
    );

    if (!isCurrentRequest()) return;
    activeTradingCardsResult = result;
    generateTradingCardsHTML(result);
  } catch {
    if (isCurrentRequest()) generateTradingCardsErrorHTML();
  }
}

function renderMenuPointContent(
  menuPoint,
  pokemonId = activePokemonId,
  expectedDetailVersion = detailRequestVersion,
  { updateRoute = false } = {},
) {
  const requestVersion = ++menuRequestVersion;
  const details = activePokemonDetails;

  if (
    !details ||
    pokemonId !== activePokemonId ||
    expectedDetailVersion !== detailRequestVersion
  ) {
    return;
  }

  clearRequestError();
  const content = document.getElementById('content');
  content.classList.remove('pokemonEvolutionClass');
  changeMenuPoint(menuPoint);

  const isCurrentRequest = () =>
    requestVersion === menuRequestVersion &&
    expectedDetailVersion === detailRequestVersion;

  try {
    if (menuPoint === 1) {
      generateAboutHTML(details.pokemon, details.species, details.abilities);
    } else if (menuPoint === 2) {
      generateBaseStatsHTML(details.pokemon);
    } else if (menuPoint === 3) {
      generateTypeMatchupsHTML(details.types);
    } else if (menuPoint === 4) {
      generateEvolutionHTML(details.evolution);
      if (!isCurrentRequest()) return;
      content.classList.add('pokemonEvolutionClass');
    } else if (menuPoint === 5) {
      generateTradingCardsLoadingHTML();
      void loadTradingCards(details, isCurrentRequest);
    }

    if (!isCurrentRequest()) return;

    activeMenuPoint = menuPoint;
    if (updateRoute) {
      updatePokemonDetailRoute({ tab: getRouteTabFromMenuPoint(menuPoint) });
    }
  } catch {
    if (isCurrentRequest()) {
      showRequestError({
        messageKey: 'errors.detailSection',
        onRetry: () => {
          if (!isCurrentRequest()) return Promise.resolve();
          return renderMenuPointContent(menuPoint, pokemonId, expectedDetailVersion, {
            updateRoute,
          });
        },
      });
    }
  }
}

function stopPokemonCry() {
  activeCry?.pause();
  activeCry = null;
}

function playPokemonCry(pokemon = activePokemonDetails?.pokemon) {
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

function closePokemonDialog({ updateRoute = true } = {}) {
  const dialog = document.getElementById('pokemon-dialog');

  if (!dialog.open && activePokemonId === null && !finishActiveDetailRequest) return;

  detailRequestVersion += 1;
  menuRequestVersion += 1;
  finishActiveDetailRequest?.();
  finishActiveDetailRequest = null;
  clearRequestError();
  stopPokemonCry();

  if (dialog.open) {
    dialog.close();
    if (updateRoute) removePokemonDetailRoute();
    return;
  }

  activePokemonId = null;
  activePokemonDetails = null;
  activeTradingCardsResult = null;
  activeMenuPoint = 1;
  activeShiny = false;
  document.getElementById('show-big-card').replaceChildren();

  if (lastFocusedElement?.isConnected) {
    lastFocusedElement.focus({ preventScroll: true });
  }

  lastFocusedElement = null;
}

function handleDialogClosed() {
  releaseDetailScrollLock?.();
  releaseDetailScrollLock = null;
  activePokemonId = null;
  activePokemonDetails = null;
  activeTradingCardsResult = null;
  activeMenuPoint = 1;
  activeShiny = false;
  stopPokemonCry();
  document.getElementById('show-big-card').replaceChildren();

  if (lastFocusedElement?.isConnected) {
    lastFocusedElement.focus({ preventScroll: true });
  }

  lastFocusedElement = null;
}

function handleDetailClick(event) {
  const actionButton = event.target.closest('[data-action]');

  if (actionButton) {
    const action = actionButton.dataset.action;

    if (action === 'close') closePokemonDialog();
    if (action === 'play-cry') playPokemonCry();
    if (action === 'retry-tcg') {
      renderMenuPointContent(5, activePokemonId, detailRequestVersion);
    }
    if (action === 'toggle-shiny') toggleActivePokemonShiny();
    if (action === 'toggle-favorite') toggleActivePokemonFavorite();
    if (action === 'toggle-compare') toggleActivePokemonComparison(actionButton);
    if (action === 'previous' || action === 'next') {
      renderOneCard(Number(actionButton.dataset.pokemonId), actionButton, {
        menuPoint: activeMenuPoint,
        shiny: activeShiny,
      });
    }
    return;
  }

  const tab = event.target.closest('[data-menu-point]');

  if (tab) {
    renderMenuPointContent(
      Number(tab.dataset.menuPoint),
      activePokemonId,
      detailRequestVersion,
      {
        updateRoute: true,
      },
    );
  }
}

function handleDetailChange(event) {
  const varietySelect = event.target.closest('[data-action="change-variety"]');

  if (!varietySelect) return;

  void renderOneCard(Number(varietySelect.value), varietySelect, {
    historyMode: 'replace',
    menuPoint: activeMenuPoint,
    shiny: activeShiny,
  });
}

function handleTabKeydown(event) {
  const currentTab = event.target.closest('[data-menu-point]');

  if (!currentTab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return;
  }

  const tabs = Array.from(document.querySelectorAll('[data-menu-point]'));
  const currentIndex = tabs.indexOf(currentTab);
  let nextIndex = currentIndex;

  if (event.key === 'ArrowLeft')
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = tabs.length - 1;

  event.preventDefault();
  tabs[nextIndex].focus();
  renderMenuPointContent(
    Number(tabs[nextIndex].dataset.menuPoint),
    activePokemonId,
    detailRequestVersion,
    { updateRoute: true },
  );
}

function handleDetailRouteChange() {
  const route = parsePokemonDetailRoute(window.location.search);

  if (route.pokemonId === null) {
    closePokemonDialog({ updateRoute: false });
    return Promise.resolve();
  }

  const menuPoint = getMenuPointFromRouteTab(route.tab);
  const dialog = document.getElementById('pokemon-dialog');

  if (dialog.open && activePokemonId === route.pokemonId && activePokemonDetails) {
    setActiveShiny(route.shiny);
    renderMenuPointContent(menuPoint);
    return Promise.resolve();
  }

  return renderOneCard(route.pokemonId, null, {
    historyMode: 'none',
    menuPoint,
    shiny: route.shiny,
  });
}

function restorePokemonDialogFromUrl() {
  return handleDetailRouteChange();
}

function refreshActiveDetailLanguage() {
  const dialog = document.getElementById('pokemon-dialog');

  if (!dialog.open || !activePokemonDetails) return;

  const focusedAction = document.activeElement?.dataset?.action;
  generateCardHTML(activePokemonDetails);

  if (activeMenuPoint === 5) {
    changeMenuPoint(5);
    if (activeTradingCardsResult) {
      generateTradingCardsHTML(activeTradingCardsResult);
    } else {
      generateTradingCardsLoadingHTML();
    }
  } else {
    renderMenuPointContent(activeMenuPoint);
  }

  const focusTarget = focusedAction
    ? document.querySelector(`[data-action="${focusedAction}"]`)
    : document.querySelector(`[data-menu-point="${activeMenuPoint}"]`);
  focusTarget?.focus({ preventScroll: true });
}

function initPokemonDialog() {
  if (dialogInitialized) return;

  const dialog = document.getElementById('pokemon-dialog');
  const detailContainer = document.getElementById('show-big-card');

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closePokemonDialog();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    closePokemonDialog();
  });
  dialog.addEventListener('close', handleDialogClosed);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closePokemonDialog();
  });
  detailContainer.addEventListener('click', handleDetailClick);
  detailContainer.addEventListener('change', handleDetailChange);
  detailContainer.addEventListener('keydown', handleTabKeydown);
  window.addEventListener('popstate', () => {
    void handleDetailRouteChange();
  });
  comparisonSelectionStore.subscribe(updateDetailCollectionButtons);
  onLanguageChange(refreshActiveDetailLanguage);
  dialogInitialized = true;
}

export {
  initPokemonDialog,
  renderMenuPointContent,
  renderOneCard,
  restorePokemonDialogFromUrl,
};
