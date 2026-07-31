import { onLanguageChange, t } from '../i18n/index.js';
import {
  getGenerationPokemonIds,
  getPokemonBatch,
  getPokemonCatalog,
  getPokemonPage,
  getTypePokemonIds,
} from '../api/pokemon-api.js';
import {
  addPokemonPage,
  getLoadedPokemon,
  getNextPokemonOffset,
  hasMorePokemon,
} from '../state/pokemon-store.js';
import {
  filterAndSortPokemon,
  findPokemonCatalogMatches,
  getNextResultLimit,
  getPokemonId,
  getRemainingResultCount,
} from '../utils/pokemon-list.js';
import { preloadPokemonMedia } from '../utils/media.js';
import {
  normalizePokemonListState,
  parsePokemonListState,
  updatePokemonListUrl,
} from '../utils/url-state.js';
import {
  checkIfType1Available,
  getPokemonAnimation,
  getPokemonImage,
  getPokemonListLocalization,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
  getVisiblePokemonIds,
  initPokemonCardInteractions,
  renderPokemonCards,
  showGif,
  showImg,
} from './pokemon-card.js';
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

let activePageRequest = null;
let controlsInitialized = false;
let discoveryRequestVersion = 0;
let discoveryRenderedCount = 0;
let discoveryResultLimit = DEFAULT_PAGE_SIZE;
let discoveryTotalMatches = 0;
let searchTimerId = null;
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
