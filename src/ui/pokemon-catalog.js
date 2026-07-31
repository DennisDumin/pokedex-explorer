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
import { getPokemonListLocalization, renderPokemonCards } from './pokemon-card.js';
import {
  initPokemonCatalogControls,
  readPokemonListControls,
  renderPokemonFilterMessage,
  syncPokemonListControls,
  updatePokemonLoadMoreButtonLabel,
  updatePokemonLoadMoreControls,
} from './pokemon-catalog-controls.js';
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
      if (!hasDiscoveryCriteria()) {
        showRequestError({
          messageKey: 'errors.pageLoad',
          onRetry: () => loadNextPokemon({ limit }),
        });
      }
      return [];
    }

    if (hasDiscoveryCriteria()) {
      const addedPokemon = addPokemonPage(page);
      void preloadPokemonMedia(addedPokemon, { includeAnimation: false });
      return addedPokemon;
    }

    try {
      await preloadPokemonMedia(page.pokemon, { includeAnimation: false });
      const addedPokemon = renderPokemonPage(page);
      void preloadPokemonMedia(addedPokemon, {
        concurrency: 3,
        includeArtwork: false,
      });
      return addedPokemon;
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

  if (!hasDiscoveryCriteria()) {
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

function updateLoadMoreButtonLabel() {
  updatePokemonLoadMoreButtonLabel({
    defaultPageSize: DEFAULT_PAGE_SIZE,
    hasMore: hasMorePokemon(),
    isDiscovering: hasDiscoveryCriteria(),
    remainingCount: getDiscoveryRemainingCount(),
  });
}

function updateLoadMoreAvailability() {
  const isDiscovering = hasDiscoveryCriteria();
  const remainingCount = getDiscoveryRemainingCount();
  const hasMore = hasMorePokemon();

  updatePokemonLoadMoreControls({
    defaultPageSize: DEFAULT_PAGE_SIZE,
    hasMore,
    isAvailable: isDiscovering ? remainingCount > 0 : hasMore,
    isDiscovering,
    remainingCount,
    totalMatches: discoveryTotalMatches,
  });
}

function readListStateFromControls() {
  return normalizePokemonListState(readPokemonListControls(listState.order));
}

function syncListControls() {
  syncPokemonListControls(listState);
}

function setFilterMessage(key, parameters = {}) {
  filterStatus = { key, parameters };
  renderPokemonFilterMessage(key, parameters);
}

function renderFilterMessage() {
  const { key, parameters } = filterStatus;
  renderPokemonFilterMessage(key, parameters);
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

    if (requestVersion !== discoveryRequestVersion) return [];

    await preloadPokemonMedia(pokemon, { includeAnimation: false });

    if (requestVersion !== discoveryRequestVersion) return [];

    const visiblePokemon = filterAndSortPokemon(
      pokemon,
      searchState,
      getPokemonListLocalization(),
    );
    discoveryRenderedCount = visiblePokemon.length;
    discoveryTotalMatches = allMatches.length;
    renderPokemonCards(visiblePokemon);
    void preloadPokemonMedia(visiblePokemon, {
      concurrency: 3,
      includeArtwork: false,
    });
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
  const didInitialize = initPokemonCatalogControls({
    defaultPageSize: DEFAULT_PAGE_SIZE,
    listState,
    onAmountChange: updateLoadMoreButtonLabel,
    onCriteriaChange: () => updateStateFromControls(),
    onLanguageChanged: refreshPokemonListLanguage,
    onLoadMore: loadMorePokemon,
    onOrderToggle: () => {
      listState = {
        ...readListStateFromControls(),
        order: listState.order === 'asc' ? 'desc' : 'asc',
      };
      void applyPokemonListState({ resetDiscoveryLimit: false });
    },
    onPopState: () => {
      const nextListState = parsePokemonListState(window.location.search);

      if (arePokemonListStatesEqual(listState, nextListState)) return;

      listState = nextListState;
      void applyPokemonListState({ updateUrl: false });
    },
    onQueryInput: () => updateStateFromControls({ debounce: true }),
    onReset: resetFilter,
    onSearchSubmit: () => updateStateFromControls(),
    onSortChange: () => updateStateFromControls({ resetDiscoveryLimit: false }),
  });

  if (!didInitialize) return;

  updateLoadMoreButtonLabel();
}

function restorePokemonListFromUrl() {
  listState = parsePokemonListState(window.location.search);

  if (!hasDiscoveryCriteria()) {
    syncListControls();
    return loadPokemonApi();
  }

  return applyPokemonListState({ updateUrl: false });
}

export { initPokemonListControls, resetFilter, restorePokemonListFromUrl };
