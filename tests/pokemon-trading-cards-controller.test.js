import { describe, expect, it, vi } from 'vitest';

import { createPokemonTradingCardsController } from '../src/ui/pokemon-trading-cards-controller.js';

function createController(overrides = {}) {
  const dependencies = {
    fetchCards: vi.fn(),
    preloadImages: vi.fn(() => Promise.resolve()),
    renderError: vi.fn(),
    renderLoading: vi.fn(),
    renderResults: vi.fn(),
    setLoadingMore: vi.fn(),
    ...overrides,
  };

  return {
    controller: createPokemonTradingCardsController(dependencies),
    dependencies,
  };
}

function createResult() {
  return {
    cards: [
      { images: { large: 'large-one.png', small: 'small-one.png' } },
      { images: { large: 'large-two.png', small: null } },
    ],
    totalCount: 2,
  };
}

function createCards(start, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `card-${start + index}`,
    images: {
      large: `large-${start + index}.png`,
      small: `small-${start + index}.png`,
    },
  }));
}

describe('Pokemon trading cards controller', () => {
  it('loads cards by species ID and preloads their preferred images before rendering', async () => {
    const result = createResult();
    const order = [];
    const { controller, dependencies } = createController({
      fetchCards: vi.fn(async () => {
        order.push('fetch');
        return result;
      }),
      preloadImages: vi.fn(async () => {
        order.push('preload');
      }),
      renderLoading: vi.fn(() => order.push('loading')),
      renderResults: vi.fn(() => order.push('results')),
    });

    await controller.render({
      details: { pokemon: { id: 10025 }, species: { id: 25 } },
      isCurrentRequest: () => true,
    });

    expect(dependencies.fetchCards).toHaveBeenCalledWith(25, {
      page: 1,
      pageSize: 8,
    });
    expect(dependencies.preloadImages).toHaveBeenCalledWith(
      ['small-one.png', 'large-two.png'],
      { concurrency: 4 },
    );
    expect(dependencies.renderResults).toHaveBeenCalledWith({
      ...result,
      isLoadingMore: false,
      loadMoreCount: 0,
      loadMoreFailed: false,
    });
    expect(order).toEqual(['loading', 'fetch', 'preload', 'results']);
  });

  it('does not render a result or error for a stale request', async () => {
    const result = createResult();
    const successfulRequest = createController({
      fetchCards: vi.fn(() => Promise.resolve(result)),
    });
    const failedRequest = createController({
      fetchCards: vi.fn(() => Promise.reject(new Error('Unavailable'))),
    });

    await successfulRequest.controller.render({
      details: { pokemon: { id: 25 }, species: null },
      isCurrentRequest: () => false,
    });
    await failedRequest.controller.render({
      details: { pokemon: { id: 25 }, species: null },
      isCurrentRequest: () => false,
    });

    expect(successfulRequest.dependencies.fetchCards).toHaveBeenCalledWith(25, {
      page: 1,
      pageSize: 8,
    });
    expect(successfulRequest.dependencies.renderResults).not.toHaveBeenCalled();
    expect(failedRequest.dependencies.renderError).not.toHaveBeenCalled();
  });

  it('renders the local trading-card error for a current failed request', async () => {
    const { controller, dependencies } = createController({
      fetchCards: vi.fn(() => Promise.reject(new Error('Unavailable'))),
    });

    await controller.render({
      details: { pokemon: { id: 133 }, species: { id: 133 } },
      isCurrentRequest: () => true,
    });

    expect(dependencies.renderError).toHaveBeenCalledOnce();
    expect(dependencies.renderResults).not.toHaveBeenCalled();
  });

  it('owns retry handling and re-renders the current state after a language change', async () => {
    const result = createResult();
    const onRetry = vi.fn();
    const { controller, dependencies } = createController({
      fetchCards: vi.fn(() => Promise.resolve(result)),
    });

    expect(controller.handleAction('toggle-favorite')).toBe(false);

    await controller.render({
      details: { pokemon: { id: 7 }, species: { id: 7 } },
      isCurrentRequest: () => true,
      onRetry,
    });
    controller.refreshLanguage();

    expect(controller.handleAction('retry-tcg')).toBe(true);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(dependencies.renderResults).toHaveBeenNthCalledWith(2, {
      ...result,
      isLoadingMore: false,
      loadMoreCount: 0,
      loadMoreFailed: false,
    });

    controller.reset();
    expect(controller.handleAction('retry-tcg')).toBe(false);
    controller.refreshLanguage();
    expect(dependencies.renderLoading).toHaveBeenCalledTimes(2);
  });

  it('loads the remaining cards page by page and exposes the correct next amount', async () => {
    const firstPage = { cards: createCards(1, 8), totalCount: 18 };
    const secondPage = { cards: createCards(9, 8), totalCount: 18 };
    const finalPage = { cards: createCards(17, 2), totalCount: 18 };
    const { controller, dependencies } = createController({
      fetchCards: vi
        .fn()
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage)
        .mockResolvedValueOnce(finalPage),
    });

    await controller.render({
      details: { pokemon: { id: 15 }, species: { id: 15 } },
      isCurrentRequest: () => true,
    });

    expect(dependencies.renderResults).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cards: firstPage.cards,
        loadMoreCount: 8,
      }),
    );

    expect(controller.handleAction('load-more-tcg')).toBe(true);
    expect(dependencies.setLoadingMore).toHaveBeenLastCalledWith(true);
    await vi.waitFor(() => {
      expect(dependencies.fetchCards).toHaveBeenLastCalledWith(15, {
        page: 2,
        pageSize: 8,
      });
      expect(dependencies.renderResults).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cards: [...firstPage.cards, ...secondPage.cards],
          isLoadingMore: false,
          loadMoreCount: 2,
        }),
        { restoreLoadMoreFocus: true },
      );
    });

    expect(controller.handleAction('load-more-tcg')).toBe(true);
    await vi.waitFor(() => {
      expect(dependencies.fetchCards).toHaveBeenLastCalledWith(15, {
        page: 3,
        pageSize: 8,
      });
      expect(dependencies.renderResults).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cards: [...firstPage.cards, ...secondPage.cards, ...finalPage.cards],
          isLoadingMore: false,
          loadMoreCount: 0,
        }),
        { restoreLoadMoreFocus: true },
      );
    });

    expect(dependencies.preloadImages).toHaveBeenNthCalledWith(
      3,
      ['small-17.png', 'small-18.png'],
      { concurrency: 4 },
    );
  });

  it('prevents duplicate page requests and keeps loaded cards after a page error', async () => {
    let rejectNextPage;
    const nextPage = new Promise((_, reject) => {
      rejectNextPage = reject;
    });
    const firstPage = { cards: createCards(1, 8), totalCount: 18 };
    const { controller, dependencies } = createController({
      fetchCards: vi.fn().mockResolvedValueOnce(firstPage).mockReturnValueOnce(nextPage),
    });

    await controller.render({
      details: { pokemon: { id: 25 }, species: { id: 25 } },
      isCurrentRequest: () => true,
    });

    expect(controller.handleAction('load-more-tcg')).toBe(true);
    expect(controller.handleAction('load-more-tcg')).toBe(true);
    expect(dependencies.fetchCards).toHaveBeenCalledTimes(2);

    rejectNextPage(new Error('Unavailable'));
    await vi.waitFor(() => {
      expect(dependencies.renderResults).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cards: firstPage.cards,
          isLoadingMore: false,
          loadMoreCount: 8,
          loadMoreFailed: true,
        }),
        { restoreLoadMoreFocus: true },
      );
    });
    expect(dependencies.renderError).not.toHaveBeenCalled();
  });
});
