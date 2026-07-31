import { onLanguageChange, t } from '../i18n/index.js';

let controlsInitialized = false;

function getPokemonCatalogControls() {
  return {
    amountSelect: document.getElementById('amountSelect'),
    generationFilter: document.getElementById('generation-filter'),
    loadMoreButton: document.getElementById('load-more-button'),
    loadMoreControls: document.getElementById('load-more-controls'),
    orderButton: document.getElementById('sort-order-button'),
    resetButton: document.getElementById('Reset_Btn'),
    searchForm: document.getElementById('pokemon-search-form'),
    searchInput: document.getElementById('Search_Pokemon'),
    sortFilter: document.getElementById('sort-filter'),
    statusMessage: document.getElementById('filterMessage'),
    typeFilter: document.getElementById('type-filter'),
  };
}

function getSelectedLoadAmount(defaultPageSize) {
  const { amountSelect } = getPokemonCatalogControls();
  const amount = Number(amountSelect.value);

  return Number.isInteger(amount) && amount > 0 ? amount : defaultPageSize;
}

function readPokemonListControls(order) {
  const { generationFilter, searchInput, sortFilter, typeFilter } =
    getPokemonCatalogControls();

  return {
    generation: generationFilter.value,
    order,
    query: searchInput.value,
    sort: sortFilter.value,
    type: typeFilter.value,
  };
}

function syncPokemonListControls(listState) {
  const {
    generationFilter,
    orderButton,
    resetButton,
    searchInput,
    sortFilter,
    typeFilter,
  } = getPokemonCatalogControls();
  const isDescending = listState.order === 'desc';

  searchInput.value = listState.query;
  typeFilter.value = listState.type;
  generationFilter.value = listState.generation;
  sortFilter.value = listState.sort;
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

function renderPokemonFilterMessage(key, parameters = {}) {
  getPokemonCatalogControls().statusMessage.textContent = t(key, parameters);
}

function updatePokemonLoadMoreButtonLabel({
  defaultPageSize,
  hasMore,
  isDiscovering,
  remainingCount,
}) {
  const { loadMoreButton } = getPokemonCatalogControls();
  const selectedAmount = getSelectedLoadAmount(defaultPageSize);

  if (isDiscovering) {
    loadMoreButton.textContent =
      remainingCount > 0
        ? t('list.loadMoreMatches', {
            count: Math.min(selectedAmount, remainingCount),
          })
        : t('list.allMatchesLoaded');
    return;
  }

  loadMoreButton.textContent = hasMore
    ? t('list.loadMore', { count: selectedAmount })
    : t('list.allLoaded');
}

function updatePokemonLoadMoreControls({
  defaultPageSize,
  hasMore,
  isAvailable,
  isDiscovering,
  remainingCount,
  totalMatches,
}) {
  const { amountSelect, loadMoreButton, loadMoreControls } = getPokemonCatalogControls();

  loadMoreControls.hidden = isDiscovering && totalMatches === 0;
  loadMoreButton.disabled = !isAvailable;
  amountSelect.disabled = !isAvailable;
  updatePokemonLoadMoreButtonLabel({
    defaultPageSize,
    hasMore,
    isDiscovering,
    remainingCount,
  });
}

function initPokemonCatalogControls({
  defaultPageSize,
  listState,
  onAmountChange,
  onCriteriaChange,
  onLanguageChanged,
  onLoadMore,
  onOrderToggle,
  onPopState,
  onQueryInput,
  onReset,
  onSearchSubmit,
  onSortChange,
}) {
  if (controlsInitialized) return false;

  const {
    amountSelect,
    generationFilter,
    loadMoreButton,
    orderButton,
    resetButton,
    searchForm,
    searchInput,
    sortFilter,
    typeFilter,
  } = getPokemonCatalogControls();

  syncPokemonListControls(listState);
  searchInput.addEventListener('input', onQueryInput);
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    onSearchSubmit();
  });
  resetButton.addEventListener('click', onReset);
  typeFilter.addEventListener('change', onCriteriaChange);
  generationFilter.addEventListener('change', onCriteriaChange);
  sortFilter.addEventListener('change', onSortChange);
  orderButton.addEventListener('click', onOrderToggle);
  amountSelect.addEventListener('change', onAmountChange);
  loadMoreButton.addEventListener('click', () => {
    onLoadMore(getSelectedLoadAmount(defaultPageSize));
  });
  window.addEventListener('popstate', onPopState);
  onLanguageChange(onLanguageChanged);

  controlsInitialized = true;
  return true;
}

export {
  initPokemonCatalogControls,
  readPokemonListControls,
  renderPokemonFilterMessage,
  syncPokemonListControls,
  updatePokemonLoadMoreButtonLabel,
  updatePokemonLoadMoreControls,
};
