import {
  getPokemonAnimation,
  getPokemonImage,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
} from './script.js';
import { getPokemonDetails } from './src/api/pokemon-details.js';
import { getLoadedPokemon, getLoadedPokemonAt } from './src/state/pokemon-store.js';
import {
  beginRequest,
  clearRequestError,
  showRequestError,
} from './src/ui/request-feedback.js';
import { acquireScrollLock } from './src/ui/scroll-lock.js';
import { preloadPokemonMedia } from './src/utils/media.js';
import { cardHTML } from './pokemonBigCardHTML.js';
import {
  generateAboutHTML,
  generateBaseStatsHTML,
  generateEvolutionHTML,
  generateMovesHTML,
} from './pokemonCardMenu.js';

const POKEMON_CRY_VOLUME = 0.12;

let detailRequestVersion = 0;
let menuRequestVersion = 0;
let activePokemonIndex = null;
let activePokemonDetails = null;
let activeCry = null;
let dialogInitialized = false;
let lastFocusedElement = null;
let releaseDetailScrollLock = null;

async function renderOneCard(index, triggerElement = null) {
  const storedPokemon = getLoadedPokemonAt(index);

  if (!storedPokemon) return;

  const requestVersion = ++detailRequestVersion;
  const dialog = document.getElementById('pokemon-dialog');
  const wasOpen = dialog.open;
  menuRequestVersion += 1;
  activePokemonIndex = index;
  activePokemonDetails = null;
  clearRequestError();
  stopPokemonCry();

  if (!wasOpen) {
    lastFocusedElement = triggerElement ?? document.activeElement;
  }

  const finishRequest = beginRequest();

  try {
    const details = await getPokemonDetails(storedPokemon.id);
    await preloadPokemonMedia([details.pokemon, ...details.evolution.pokemon]);

    if (requestVersion !== detailRequestVersion) return;

    activePokemonDetails = details;
    generateCardHTML(details.pokemon, index);
    renderMenuPointContent(1, index, requestVersion);
    finishRequest();

    if (!wasOpen) {
      releaseDetailScrollLock = acquireScrollLock();
      dialog.showModal();
    }

    restoreDetailFocus({ triggerElement, wasOpen });
    playPokemonCry(details.pokemon);
  } catch {
    if (requestVersion === detailRequestVersion) {
      if (dialog.open) dialog.close();

      showRequestError({
        message: 'The Pokémon details could not be loaded. Please try again.',
        onRetry: () => {
          if (requestVersion !== detailRequestVersion) return Promise.resolve();
          return renderOneCard(index);
        },
      });
    }
  } finally {
    finishRequest();
  }
}

function fetchPokemonLast(index) {
  return index > 0 ? index - 1 : getLoadedPokemon().length - 1;
}

function fetchPokemonNext(index) {
  return index + 1 >= getLoadedPokemon().length ? 0 : index + 1;
}

function getPokemonCry(pokemon) {
  return pokemon?.cries?.latest ?? pokemon?.cries?.legacy ?? null;
}

function generateCardHTML(currentPokemon, index) {
  const name = getPokemonName(currentPokemon);
  const types = (currentPokemon.types ?? [])
    .map((entry) => entry?.type?.name)
    .filter(Boolean);
  const primaryType = types[0] ?? 'normal';
  const secondaryType = types[1] ?? null;
  const animatedImage = getPokemonAnimation(currentPokemon);

  document.getElementById('show-big-card').innerHTML = cardHTML({
    backgroundColor: getTypeColor(primaryType, secondaryType),
    image: animatedImage ?? getPokemonImage(currentPokemon),
    imageIsAnimated: Boolean(animatedImage),
    index,
    name,
    nextIndex: fetchPokemonNext(index),
    pokemonNumber: getPokemonNumber(currentPokemon),
    primaryType,
    primaryTypeColor: getTypeColor(primaryType),
    previousIndex: fetchPokemonLast(index),
    secondaryType,
    secondaryTypeColor: getTypeColor(secondaryType),
    soundAvailable: Boolean(getPokemonCry(currentPokemon)),
  });
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
}

function renderMenuPointContent(
  menuPoint,
  index = activePokemonIndex,
  expectedDetailVersion = detailRequestVersion,
) {
  const requestVersion = ++menuRequestVersion;
  const details = activePokemonDetails;

  if (
    !details ||
    index !== activePokemonIndex ||
    expectedDetailVersion !== detailRequestVersion
  ) {
    return;
  }

  clearRequestError();
  const content = document.getElementById('content');
  content.classList.remove('pokemonEvolutionClass', 'arrangeMoveSection');
  changeMenuPoint(menuPoint);

  const isCurrentRequest = () =>
    requestVersion === menuRequestVersion &&
    expectedDetailVersion === detailRequestVersion;

  try {
    if (menuPoint === 1) {
      generateAboutHTML(details.pokemon, details.species);
    } else if (menuPoint === 2) {
      generateBaseStatsHTML(details.pokemon);
    } else if (menuPoint === 3) {
      generateEvolutionHTML(details.evolution);
      if (!isCurrentRequest()) return;
      content.classList.add('pokemonEvolutionClass');
    } else if (menuPoint === 4) {
      generateMovesHTML(details.pokemon);
    }
  } catch {
    if (isCurrentRequest()) {
      showRequestError({
        message: 'The Pokémon information could not be loaded. Please try again.',
        onRetry: () => {
          if (!isCurrentRequest()) return Promise.resolve();
          return renderMenuPointContent(menuPoint, index, expectedDetailVersion);
        },
      });
    }
  }
}

function stopPokemonCry() {
  activeCry?.pause();
  activeCry = null;
}

function playPokemonCry(pokemon = getLoadedPokemonAt(activePokemonIndex)) {
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

function closePokemonDialog() {
  const dialog = document.getElementById('pokemon-dialog');

  if (!dialog.open) return;

  detailRequestVersion += 1;
  menuRequestVersion += 1;
  clearRequestError();
  stopPokemonCry();
  dialog.close();
}

function handleDialogClosed() {
  releaseDetailScrollLock?.();
  releaseDetailScrollLock = null;
  activePokemonIndex = null;
  activePokemonDetails = null;
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
    if (action === 'previous' || action === 'next') {
      renderOneCard(Number(actionButton.dataset.index), actionButton);
    }
    return;
  }

  const tab = event.target.closest('[data-menu-point]');

  if (tab) {
    renderMenuPointContent(Number(tab.dataset.menuPoint));
  }
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
  renderMenuPointContent(Number(tabs[nextIndex].dataset.menuPoint));
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
  detailContainer.addEventListener('keydown', handleTabKeydown);
  dialogInitialized = true;
}

export { initPokemonDialog, renderMenuPointContent, renderOneCard };
