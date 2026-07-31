import { getPokemonCards } from '../api/tcg-api.js';
import { preloadMediaUrls } from '../utils/media.js';
import {
  generateTradingCardsErrorHTML,
  generateTradingCardsHTML,
  generateTradingCardsLoadingHTML,
  setTradingCardsLoadMorePending,
} from './pokemon-detail-tabs.js';

const TCG_PAGE_SIZE = 8;

function mergeCards(currentCards, nextCards) {
  const cardsById = new Map(currentCards.map((card) => [card.id, card]));

  for (const card of nextCards) {
    cardsById.set(card.id, card);
  }

  return [...cardsById.values()];
}

function createPokemonTradingCardsController({
  fetchCards = getPokemonCards,
  preloadImages = preloadMediaUrls,
  renderError = generateTradingCardsErrorHTML,
  renderLoading = generateTradingCardsLoadingHTML,
  renderResults = generateTradingCardsHTML,
  setLoadingMore = setTradingCardsLoadMorePending,
} = {}) {
  let activeResult = null;
  let activePage = 0;
  let activePokemonId = null;
  let currentRequestVersion = 0;
  let isCurrentDetailRequest = null;
  let isLoadingMore = false;
  let loadMoreFailed = false;
  let retryHandler = null;

  function isCurrentRequest(requestVersion) {
    return (
      requestVersion === currentRequestVersion && isCurrentDetailRequest?.() === true
    );
  }

  function getRenderState() {
    if (!activeResult) return null;

    const loadedWindowSize = Math.min(
      activeResult.totalCount,
      activePage * TCG_PAGE_SIZE,
    );
    const remainingCount = Math.max(0, activeResult.totalCount - loadedWindowSize);

    return {
      ...activeResult,
      isLoadingMore,
      loadMoreCount: Math.min(TCG_PAGE_SIZE, remainingCount),
      loadMoreFailed,
    };
  }

  function renderCurrentResult({ restoreLoadMoreFocus = false } = {}) {
    const renderState = getRenderState();
    if (!renderState) return;

    if (restoreLoadMoreFocus) {
      renderResults(renderState, { restoreLoadMoreFocus: true });
      return;
    }

    renderResults(renderState);
  }

  async function loadInitialPage(details, requestVersion) {
    try {
      const pokemonId = details.species?.id ?? details.pokemon.id;
      const result = await fetchCards(pokemonId, {
        page: 1,
        pageSize: TCG_PAGE_SIZE,
      });
      await preloadImages(
        result.cards.map((card) => card.images.small ?? card.images.large),
        { concurrency: 4 },
      );

      if (!isCurrentRequest(requestVersion)) return;

      activeResult = result;
      activePage = 1;
      activePokemonId = pokemonId;
      renderCurrentResult();
    } catch {
      if (isCurrentRequest(requestVersion)) renderError();
    }
  }

  async function loadNextPage() {
    if (
      !activeResult ||
      activePokemonId === null ||
      isLoadingMore ||
      getRenderState().loadMoreCount === 0
    ) {
      return;
    }

    const requestVersion = currentRequestVersion;
    const nextPage = activePage + 1;
    isLoadingMore = true;
    loadMoreFailed = false;
    setLoadingMore(true);

    try {
      const result = await fetchCards(activePokemonId, {
        page: nextPage,
        pageSize: TCG_PAGE_SIZE,
      });
      await preloadImages(
        result.cards.map((card) => card.images.small ?? card.images.large),
        { concurrency: 4 },
      );

      if (!isCurrentRequest(requestVersion)) return;

      activeResult = {
        cards: mergeCards(activeResult.cards, result.cards),
        totalCount: result.totalCount,
      };
      activePage = nextPage;
      isLoadingMore = false;
      renderCurrentResult({ restoreLoadMoreFocus: true });
    } catch {
      if (!isCurrentRequest(requestVersion)) return;

      isLoadingMore = false;
      loadMoreFailed = true;
      renderCurrentResult({ restoreLoadMoreFocus: true });
    }
  }

  function render({ details, isCurrentRequest, onRetry }) {
    currentRequestVersion += 1;
    const requestVersion = currentRequestVersion;
    activeResult = null;
    activePage = 0;
    activePokemonId = null;
    isCurrentDetailRequest = isCurrentRequest;
    isLoadingMore = false;
    loadMoreFailed = false;
    retryHandler = typeof onRetry === 'function' ? onRetry : null;
    renderLoading();
    return loadInitialPage(details, requestVersion);
  }

  function handleAction(action) {
    if (action === 'load-more-tcg') {
      void loadNextPage();
      return true;
    }

    if (action !== 'retry-tcg' || retryHandler === null) return false;

    retryHandler();
    return true;
  }

  function refreshLanguage() {
    if (activeResult) {
      renderCurrentResult();
      return;
    }

    renderLoading();
  }

  function reset() {
    currentRequestVersion += 1;
    activeResult = null;
    activePage = 0;
    activePokemonId = null;
    isCurrentDetailRequest = null;
    isLoadingMore = false;
    loadMoreFailed = false;
    retryHandler = null;
  }

  return {
    handleAction,
    refreshLanguage,
    render,
    reset,
  };
}

const pokemonTradingCardsController = createPokemonTradingCardsController();

export { createPokemonTradingCardsController, pokemonTradingCardsController };
