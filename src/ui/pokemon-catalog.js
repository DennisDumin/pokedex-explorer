import pokemonFallbackUrl from '../../img/pokeball-icon.svg';
import { getLanguage, onLanguageChange, t, translateType } from '../i18n/index.js';
import { getLocalizedPokemonName } from '../i18n/pokemon-names.js';
import {
  getGenerationPokemonIds,
  getPokemonBatch,
  getPokemonCatalog,
  getPokemonPage,
  getTypePokemonIds,
} from '../api/pokemon-api.js';
import { collectionStore } from '../state/collections.js';
import { comparisonSelectionStore } from '../state/comparison-selection.js';
import {
  addPokemonPage,
  cachePokemon,
  getLoadedPokemon,
  getNextPokemonOffset,
  getPokemonById,
  hasMorePokemon,
} from '../state/pokemon-store.js';
import { formatPokemonNumber } from '../utils/formatters.js';
import {
  filterAndSortPokemon,
  findPokemonCatalogMatches,
  getNextResultLimit,
  getPokemonId,
  getRemainingResultCount,
} from '../utils/pokemon-list.js';
import { preloadPokemonMedia } from '../utils/media.js';
import { prefersReducedMotion } from '../utils/motion.js';
import {
  getPokemonAnimation as selectPokemonAnimation,
  getPokemonArtwork,
} from '../utils/pokemon-media.js';
import {
  normalizePokemonListState,
  parsePokemonListState,
  updatePokemonListUrl,
} from '../utils/url-state.js';
import { beginRequest, clearRequestError, showRequestError } from './request-feedback.js';

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_DELAY = 350;
const GENERATION_RESOURCE_NAMES = {
  1: 'generation-i',
  2: 'generation-ii',
  3: 'generation-iii',
  4: 'generation-iv',
  5: 'generation-v',
  6: 'generation-vi',
  7: 'generation-vii',
  8: 'generation-viii',
  9: 'generation-ix',
};

const TYPE_COLORS = {
  bug: '170, 184, 33',
  dark: '46, 35, 28',
  dragon: '86, 112, 190',
  electric: '247, 208, 43',
  fairy: '180, 99, 151',
  fighting: '178, 68, 68',
  fire: '224, 87, 53',
  flying: '92, 147, 177',
  ghost: '112, 85, 155',
  grass: '74, 153, 77',
  ground: '175, 115, 68',
  ice: '37, 142, 154',
  normal: '117, 117, 117',
  poison: '123, 76, 151',
  psychic: '205, 75, 129',
  rock: '139, 124, 76',
  steel: '96, 125, 138',
  water: '66, 120, 184',
};

const TYPE_COLOR_DARKENING = {
  bug: 0.35,
  dragon: 0.04,
  electric: 0.46,
  fairy: 0.09,
  fire: 0.13,
  flying: 0.18,
  grass: 0.16,
  ground: 0.11,
  ice: 0.11,
  normal: 0.05,
  psychic: 0.06,
  rock: 0.08,
  steel: 0.05,
  water: 0.04,
};

let activePageRequest = null;
let cardInteractionsInitialized = false;
let controlsInitialized = false;
let discoveryRequestVersion = 0;
let discoveryRenderedCount = 0;
let discoveryResultLimit = DEFAULT_PAGE_SIZE;
let discoveryTotalMatches = 0;
let searchTimerId = null;
let selectPokemonCard = null;
let visiblePokemonIds = [];
let listState = parsePokemonListState(window.location.search);
let filterStatus = { key: 'list.loaded', parameters: { count: 0 } };

function arePokemonListStatesEqual(firstState, secondState) {
  return (
    firstState.query === secondState.query &&
    firstState.type === secondState.type &&
    firstState.generation === secondState.generation &&
    firstState.sort === secondState.sort &&
    firstState.order === secondState.order
  );
}

function hasDiscoveryCriteria(state = listState) {
  return state.query !== '' || state.type !== 'all' || state.generation !== 'all';
}

function loadPokemonApi() {
  if (getLoadedPokemon().length > 0) {
    renderLoadedPokemon();
    return Promise.resolve(getLoadedPokemon());
  }

  return loadNextPokemon({ limit: DEFAULT_PAGE_SIZE });
}

function loadNextPokemon({ limit = DEFAULT_PAGE_SIZE } = {}) {
  if (activePageRequest) return activePageRequest;
  if (!hasMorePokemon()) return Promise.resolve([]);

  const pageSize = Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_PAGE_SIZE;

  activePageRequest = performPageLoad(pageSize).finally(() => {
    activePageRequest = null;
  });

  return activePageRequest;
}

async function performPageLoad(limit) {
  const requestedOffset = getNextPokemonOffset();
  const finishRequest = beginRequest({ disableLoadMore: true });
  clearRequestError();

  try {
    let page;

    try {
      page = await getPokemonPage({ limit, offset: requestedOffset });
    } catch {
      showRequestError({
        messageKey: 'errors.pageLoad',
        onRetry: () => loadNextPokemon({ limit }),
      });
      return [];
    }

    try {
      await preloadPokemonMedia(page.pokemon);
      return renderPokemonPage(page);
    } catch {
      showRequestError({
        messageKey: 'errors.pageDisplay',
        onRetry: () => loadNextPokemon({ limit }),
      });
      return [];
    }
  } finally {
    finishRequest();
    updateLoadMoreAvailability();
  }
}

function renderPokemonPage(page) {
  if (page.offset !== getNextPokemonOffset()) return [];

  const addedPokemon = addPokemonPage(page);

  if (hasDiscoveryCriteria()) {
    setFilterMessage('search.searching');
    document.getElementById('pokemon-card').replaceChildren();
  } else {
    renderLoadedPokemon();
  }

  return addedPokemon;
}

function renderLoadedPokemon() {
  const pokemon = filterAndSortPokemon(
    getLoadedPokemon(),
    listState,
    getPokemonListLocalization(),
  );
  renderPokemonCards(pokemon);
  setFilterMessage('list.loaded', { count: pokemon.length });
  updateLoadMoreAvailability();
}

function renderPokemonCards(pokemon) {
  cachePokemon(pokemon);
  visiblePokemonIds = pokemon.map(({ id }) => id);

  const template = document.createElement('template');
  template.innerHTML = pokemon.map(createPokemonCardMarkup).join('');
  document.getElementById('pokemon-card').replaceChildren(template.content);
  updatePokemonCardBadges();
}

function createPokemonCardMarkup(currentPokemon) {
  const name = getPokemonName(currentPokemon);
  const pokemonNumber = getPokemonNumber(currentPokemon);
  const types = (currentPokemon.types ?? [])
    .map((entry) => entry?.type?.name)
    .filter(Boolean);
  const primaryType = types[0] ?? 'normal';
  const secondaryType = types[1] ?? null;

  return generatePokemonCard({
    backgroundColor: getTypeColor(primaryType, secondaryType),
    image: getPokemonImage(currentPokemon),
    name,
    pokemonId: currentPokemon.id,
    pokemonNumber,
    primaryType,
    primaryTypeLabel: translateType(primaryType),
    primaryTypeColor: getTypeColor(primaryType),
    secondaryType,
    secondaryTypeLabel: secondaryType ? translateType(secondaryType) : null,
    secondaryTypeColor: getTypeColor(secondaryType),
  });
}

function generatePokemonCard({
  backgroundColor,
  image,
  name,
  pokemonId,
  pokemonNumber,
  primaryTypeLabel,
  primaryTypeColor,
  secondaryTypeLabel,
  secondaryTypeColor,
}) {
  return /* html */ `
    <button
      class="pokedex"
      type="button"
      data-pokemon-id="${pokemonId}"
      aria-label="${t('card.openDetails', {
        labels: '',
        name,
        number: pokemonNumber,
      })}"
      ${backgroundColor}
    >
      <span class="name-number">
        <span class="pokemon-card__name">${name}</span>
        <span class="pokemon-card__number">${pokemonNumber}</span>
      </span>
      <span class="pokemon-card__collection-badges" aria-hidden="true">
        <span data-card-badge="favorite" hidden>${t('card.favoriteBadge')}</span>
        <span data-card-badge="compare" hidden>${t('card.compareBadge')}</span>
      </span>
      <span class="pokemon-img">
        <img
          class="pokemon-card__image"
          src="${image}"
          data-image-fallback="${pokemonFallbackUrl}"
          alt="${name}"
        />
      </span>
      <span class="pokemon-type" aria-label="${t('detail.types')}">
        <span class="type" ${primaryTypeColor}>${primaryTypeLabel}</span>
        ${checkIfType1Available(secondaryTypeLabel, secondaryTypeColor)}
      </span>
    </button>
  `;
}

function updatePokemonCardBadges() {
  const favoriteIds = new Set(collectionStore.getState().favorites);
  const comparisonIds = new Set(comparisonSelectionStore.getState().selectedIds);

  for (const card of document.querySelectorAll('.pokedex[data-pokemon-id]')) {
    const pokemonId = Number(card.dataset.pokemonId);
    const favoriteBadge = card.querySelector('[data-card-badge="favorite"]');
    const comparisonBadge = card.querySelector('[data-card-badge="compare"]');
    const name =
      card.querySelector('.pokemon-card__name')?.textContent?.trim() ??
      t('common.pokemon');
    const number = card.querySelector('.pokemon-card__number')?.textContent?.trim() ?? '';
    const collectionLabels = [];

    favoriteBadge.hidden = !favoriteIds.has(pokemonId);
    comparisonBadge.hidden = !comparisonIds.has(pokemonId);
    if (!favoriteBadge.hidden) collectionLabels.push(t('card.favoriteLabel'));
    if (!comparisonBadge.hidden) collectionLabels.push(t('card.compareLabel'));

    card.setAttribute(
      'aria-label',
      t('card.openDetails', {
        labels: collectionLabels.length ? `, ${collectionLabels.join(', ')}` : '',
        name,
        number,
      }),
    );
  }
}

function getPokemonName(currentPokemon) {
  return getLocalizedPokemonName(currentPokemon, getLanguage());
}

function getPokemonListLocalization() {
  return { getName: getPokemonName, language: getLanguage() };
}

function getPokemonNumber(currentPokemon) {
  return formatPokemonNumber(currentPokemon?.id);
}

function getPokemonImage(currentPokemon, { shiny = false } = {}) {
  return (
    getPokemonArtwork(currentPokemon, { shiny }) ??
    (shiny ? getPokemonArtwork(currentPokemon) : null) ??
    pokemonFallbackUrl
  );
}

function getPokemonAnimation(currentPokemon, { shiny = false } = {}) {
  return (
    selectPokemonAnimation(currentPokemon, { shiny }) ??
    (shiny ? selectPokemonAnimation(currentPokemon) : null)
  );
}

function getTypeColor(primaryType, secondaryType) {
  const primaryColor = TYPE_COLORS[primaryType] ?? TYPE_COLORS.normal;
  const darkening = Math.max(
    TYPE_COLOR_DARKENING[primaryType] ?? 0,
    TYPE_COLOR_DARKENING[secondaryType] ?? 0,
  );
  const contrastLayer = `linear-gradient(rgba(7, 15, 29, ${darkening}), rgba(7, 15, 29, ${darkening}))`;

  if (secondaryType) {
    const secondaryColor = TYPE_COLORS[secondaryType] ?? TYPE_COLORS.normal;
    return `style="background-image: ${contrastLayer}, linear-gradient(135deg, rgb(${primaryColor}), rgb(${secondaryColor}));"`;
  }

  if (darkening > 0) {
    return `style="background-color: rgb(${primaryColor}); background-image: ${contrastLayer};"`;
  }

  return `style="background-color: rgb(${primaryColor});"`;
}

function checkIfType1Available(pokemonType1, backgroundColor1) {
  if (!pokemonType1) return '';

  return `<span class="type" ${backgroundColor1}>${pokemonType1}</span>`;
}

function getCardElement(pokemonId, cardElement) {
  return (
    cardElement ?? document.querySelector(`.pokedex[data-pokemon-id="${pokemonId}"]`)
  );
}

function showGif(pokemonId, cardElement) {
  if (prefersReducedMotion()) return;

  const pokemon = getPokemonById(pokemonId);
  const image = getCardElement(pokemonId, cardElement)?.querySelector(
    '.pokemon-card__image',
  );
  const animatedSprite = getPokemonAnimation(pokemon) ?? pokemon?.sprites?.front_default;

  if (image && animatedSprite && image.src !== animatedSprite) {
    image.dataset.imageFallback = getPokemonImage(pokemon);
    image.dataset.imageFinalFallback = pokemonFallbackUrl;
    image.classList.add('is-animated');
    image.src = animatedSprite;
  }
}

function showImg(pokemonId, cardElement) {
  const pokemon = getPokemonById(pokemonId);
  const image = getCardElement(pokemonId, cardElement)?.querySelector(
    '.pokemon-card__image',
  );
  const artwork = getPokemonImage(pokemon);

  if (image && image.src !== artwork) {
    image.dataset.imageFallback = pokemonFallbackUrl;
    image.removeAttribute('data-image-final-fallback');
    image.classList.remove('is-animated');
    image.src = artwork;
  }
}

function initPokemonCardInteractions({ onSelect }) {
  selectPokemonCard = onSelect;

  if (cardInteractionsInitialized) return;

  const cardContainer = document.getElementById('pokemon-card');

  cardContainer.addEventListener('click', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || !cardContainer.contains(card)) return;

    selectPokemonCard?.(Number(card.dataset.pokemonId), card);
  });

  cardContainer.addEventListener('pointerover', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || card.contains(event.relatedTarget)) return;

    showGif(Number(card.dataset.pokemonId), card);
  });

  cardContainer.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || card.contains(event.relatedTarget)) return;

    showImg(Number(card.dataset.pokemonId), card);
  });
  collectionStore.subscribe(updatePokemonCardBadges);
  comparisonSelectionStore.subscribe(updatePokemonCardBadges);

  cardInteractionsInitialized = true;
}

function resetDiscoveryPagination() {
  discoveryRenderedCount = 0;
  discoveryResultLimit = DEFAULT_PAGE_SIZE;
  discoveryTotalMatches = 0;
}

function getDiscoveryRemainingCount() {
  return getRemainingResultCount(discoveryRenderedCount, discoveryTotalMatches);
}

function loadMorePokemon(limit = DEFAULT_PAGE_SIZE) {
  if (!hasDiscoveryCriteria()) return loadNextPokemon({ limit });

  const remainingCount = getDiscoveryRemainingCount();
  if (remainingCount === 0) return Promise.resolve([]);

  discoveryResultLimit = getNextResultLimit(
    discoveryResultLimit,
    limit,
    discoveryTotalMatches,
  );

  return applyPokemonListState({
    resetDiscoveryLimit: false,
    updateUrl: false,
  });
}

function getSelectedLoadAmount() {
  const amount = Number(document.getElementById('amountSelect').value);

  return Number.isInteger(amount) && amount > 0 ? amount : DEFAULT_PAGE_SIZE;
}

function updateLoadMoreButtonLabel() {
  const loadMoreButton = document.getElementById('load-more-button');

  if (hasDiscoveryCriteria()) {
    const remainingCount = getDiscoveryRemainingCount();
    loadMoreButton.textContent =
      remainingCount > 0
        ? t('list.loadMoreMatches', {
            count: Math.min(getSelectedLoadAmount(), remainingCount),
          })
        : t('list.allMatchesLoaded');
    return;
  }

  loadMoreButton.textContent = hasMorePokemon()
    ? t('list.loadMore', { count: getSelectedLoadAmount() })
    : t('list.allLoaded');
}

function updateLoadMoreAvailability() {
  const isDiscovering = hasDiscoveryCriteria();
  const isAvailable = isDiscovering ? getDiscoveryRemainingCount() > 0 : hasMorePokemon();

  document.getElementById('load-more-controls').hidden =
    isDiscovering && discoveryTotalMatches === 0;
  document.getElementById('load-more-button').disabled = !isAvailable;
  document.getElementById('amountSelect').disabled = !isAvailable;
  updateLoadMoreButtonLabel();
}

function readListStateFromControls() {
  return normalizePokemonListState({
    generation: document.getElementById('generation-filter').value,
    order: listState.order,
    query: document.getElementById('Search_Pokemon').value,
    sort: document.getElementById('sort-filter').value,
    type: document.getElementById('type-filter').value,
  });
}

function syncListControls() {
  const searchInput = document.getElementById('Search_Pokemon');
  const resetButton = document.getElementById('Reset_Btn');
  const orderButton = document.getElementById('sort-order-button');
  const isDescending = listState.order === 'desc';

  searchInput.value = listState.query;
  document.getElementById('type-filter').value = listState.type;
  document.getElementById('generation-filter').value = listState.generation;
  document.getElementById('sort-filter').value = listState.sort;
  resetButton.hidden = listState.query === '';
  orderButton.setAttribute('aria-pressed', String(isDescending));
  orderButton.setAttribute(
    'aria-label',
    isDescending ? t('search.sortDescending') : t('search.sortAscending'),
  );
  orderButton.querySelector('[aria-hidden]').textContent = isDescending ? '↓' : '↑';
  orderButton.querySelector('.sort-order-label').textContent = isDescending
    ? t('search.descending')
    : t('search.ascending');
}

function setFilterMessage(key, parameters = {}) {
  filterStatus = { key, parameters };
  document.getElementById('filterMessage').textContent = t(key, parameters);
}

function renderFilterMessage() {
  const { key, parameters } = filterStatus;
  document.getElementById('filterMessage').textContent = t(key, parameters);
}

function getDiscoveryFilterIds(state) {
  return Promise.all([
    state.type === 'all' ? null : getTypePokemonIds(state.type),
    state.generation === 'all'
      ? null
      : getGenerationPokemonIds(GENERATION_RESOURCE_NAMES[state.generation]),
  ]);
}

function getDiscoveryStatus(matchCount, renderedCount) {
  if (matchCount === 0) return { key: 'search.noMatches', parameters: {} };
  if (matchCount > renderedCount) {
    return {
      key: 'search.showingMatches',
      parameters: { shown: renderedCount, total: matchCount },
    };
  }

  return { key: 'search.matching', parameters: { count: renderedCount } };
}

async function performDiscoverySearch(state, requestVersion) {
  const finishRequest = beginRequest({ disableLoadMore: true });
  clearRequestError();

  try {
    const [catalog, [typeIds, generationIds]] = await Promise.all([
      getPokemonCatalog(),
      getDiscoveryFilterIds(state),
    ]);
    const searchState = { ...state, generationIds, typeIds };
    const allMatches = findPokemonCatalogMatches(catalog, searchState, {
      ...getPokemonListLocalization(),
      limit: Infinity,
    });
    const matches = allMatches.slice(0, discoveryResultLimit);
    const pokemon = await getPokemonBatch(matches.map(getPokemonId));
    await preloadPokemonMedia(pokemon);

    if (requestVersion !== discoveryRequestVersion) return [];

    const visiblePokemon = filterAndSortPokemon(
      pokemon,
      searchState,
      getPokemonListLocalization(),
    );
    discoveryRenderedCount = visiblePokemon.length;
    discoveryTotalMatches = allMatches.length;
    renderPokemonCards(visiblePokemon);
    const status = getDiscoveryStatus(allMatches.length, visiblePokemon.length);
    setFilterMessage(status.key, status.parameters);
    return visiblePokemon;
  } catch {
    if (requestVersion === discoveryRequestVersion) {
      setFilterMessage('search.failed');
      showRequestError({
        messageKey: 'search.completeFailed',
        onRetry: () =>
          applyPokemonListState({
            resetDiscoveryLimit: false,
            updateUrl: false,
          }),
      });
    }
    return [];
  } finally {
    finishRequest();
    updateLoadMoreAvailability();
  }
}

function cancelScheduledSearch() {
  if (searchTimerId === null) return;

  window.clearTimeout(searchTimerId);
  searchTimerId = null;
}

function applyPokemonListState({ resetDiscoveryLimit = true, updateUrl = true } = {}) {
  cancelScheduledSearch();
  if (resetDiscoveryLimit) resetDiscoveryPagination();
  const requestVersion = ++discoveryRequestVersion;
  syncListControls();
  if (updateUrl) updatePokemonListUrl(listState);

  if (!hasDiscoveryCriteria()) {
    renderLoadedPokemon();
    return Promise.resolve(getLoadedPokemon());
  }

  setFilterMessage('search.searching');
  updateLoadMoreAvailability();
  return performDiscoverySearch({ ...listState }, requestVersion);
}

function schedulePokemonSearch() {
  cancelScheduledSearch();
  resetDiscoveryPagination();
  discoveryRequestVersion += 1;
  syncListControls();
  updatePokemonListUrl(listState);

  if (!hasDiscoveryCriteria()) {
    renderLoadedPokemon();
    return;
  }

  setFilterMessage('search.waiting');
  updateLoadMoreAvailability();
  searchTimerId = window.setTimeout(() => {
    searchTimerId = null;
    void applyPokemonListState({ updateUrl: false });
  }, SEARCH_DEBOUNCE_DELAY);
}

function updateStateFromControls({ debounce = false, resetDiscoveryLimit = true } = {}) {
  listState = readListStateFromControls();

  if (debounce) {
    schedulePokemonSearch();
  } else {
    void applyPokemonListState({ resetDiscoveryLimit });
  }
}

function resetFilter() {
  listState = { ...listState, query: '' };
  syncListControls();
  void applyPokemonListState();
}

function refreshPokemonListLanguage() {
  syncListControls();
  renderFilterMessage();

  if (hasDiscoveryCriteria()) {
    void applyPokemonListState({
      resetDiscoveryLimit: false,
      updateUrl: false,
    });
  } else {
    renderLoadedPokemon();
  }
}

function initPokemonListControls() {
  if (controlsInitialized) return;

  const searchForm = document.getElementById('pokemon-search-form');
  const searchInput = document.getElementById('Search_Pokemon');
  const amountSelect = document.getElementById('amountSelect');

  syncListControls();
  searchInput.addEventListener('input', () =>
    updateStateFromControls({ debounce: true }),
  );
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    updateStateFromControls();
  });
  document.getElementById('Reset_Btn').addEventListener('click', resetFilter);
  document
    .getElementById('type-filter')
    .addEventListener('change', () => updateStateFromControls());
  document
    .getElementById('generation-filter')
    .addEventListener('change', () => updateStateFromControls());
  document
    .getElementById('sort-filter')
    .addEventListener('change', () =>
      updateStateFromControls({ resetDiscoveryLimit: false }),
    );
  document.getElementById('sort-order-button').addEventListener('click', () => {
    listState = {
      ...readListStateFromControls(),
      order: listState.order === 'asc' ? 'desc' : 'asc',
    };
    void applyPokemonListState({ resetDiscoveryLimit: false });
  });
  amountSelect.addEventListener('change', updateLoadMoreButtonLabel);
  document
    .getElementById('load-more-button')
    .addEventListener('click', () => loadMorePokemon(getSelectedLoadAmount()));
  window.addEventListener('popstate', () => {
    const nextListState = parsePokemonListState(window.location.search);

    if (arePokemonListStatesEqual(listState, nextListState)) return;

    listState = nextListState;
    void applyPokemonListState({ updateUrl: false });
  });
  onLanguageChange(refreshPokemonListLanguage);

  controlsInitialized = true;
  updateLoadMoreButtonLabel();
}

function restorePokemonListFromUrl() {
  listState = parsePokemonListState(window.location.search);
  return applyPokemonListState({ updateUrl: false });
}

function getVisiblePokemonIds() {
  return [...visiblePokemonIds];
}

function filterPokemon() {
  return applyPokemonListState();
}

export {
  checkIfType1Available,
  filterPokemon,
  getPokemonAnimation,
  getPokemonImage,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
  getVisiblePokemonIds,
  initPokemonCardInteractions,
  initPokemonListControls,
  loadPokemonApi,
  resetFilter,
  restorePokemonListFromUrl,
  showGif,
  showImg,
};
