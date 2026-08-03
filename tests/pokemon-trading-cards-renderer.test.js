import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateTradingCardsHTML } from '../src/ui/pokemon-detail-tabs.js';

function createCard(id) {
  return {
    id: `card-${id}`,
    images: { large: `https://example.com/large-${id}.png`, small: null },
    name: `Card ${id}`,
    number: String(id),
    rarity: 'Common',
    set: { name: 'Test set' },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Trading card results renderer', () => {
  it('renders an accessible load-more control for only the remaining amount', () => {
    const content = { innerHTML: '' };
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => content),
    });

    generateTradingCardsHTML({
      cards: Array.from({ length: 16 }, (_, index) => createCard(index + 1)),
      totalCount: 18,
      loadMoreCount: 2,
    });

    expect(content.innerHTML).toContain('18 trading cards found.');
    expect(content.innerHTML).toContain('16 of 18 cards loaded.');
    expect(content.innerHTML).toContain('data-action="load-more-tcg"');
    expect(content.innerHTML).toContain('aria-controls="tcg-card-grid"');
    expect(content.innerHTML).toContain('Load 2 more');
    expect(content.innerHTML).toContain('role="status"');
  });

  it('removes the control when all cards are visible', () => {
    const content = { innerHTML: '' };
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => content),
    });

    generateTradingCardsHTML({
      cards: Array.from({ length: 18 }, (_, index) => createCard(index + 1)),
      totalCount: 18,
      loadMoreCount: 0,
    });

    expect(content.innerHTML).toContain('18 trading cards found.');
    expect(content.innerHTML).toContain('18 of 18 cards loaded.');
    expect(content.innerHTML).not.toContain('data-action="load-more-tcg"');
  });
});
