import { afterEach, describe, expect, it, vi } from 'vitest';

function createControlElement({ value = '' } = {}) {
  const attributes = new Map();
  const listeners = new Map();
  const icon = { textContent: '' };
  const label = { textContent: '' };

  return {
    attributes,
    disabled: false,
    hidden: false,
    icon,
    label,
    listeners,
    textContent: '',
    value,
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    querySelector: vi.fn((selector) => (selector === '[aria-hidden]' ? icon : label)),
    setAttribute: vi.fn((name, attributeValue) => attributes.set(name, attributeValue)),
  };
}

function createCatalogControlsEnvironment() {
  const elements = {
    Reset_Btn: createControlElement(),
    Search_Pokemon: createControlElement(),
    amountSelect: createControlElement({ value: '40' }),
    filterMessage: createControlElement(),
    'generation-filter': createControlElement(),
    'load-more-button': createControlElement(),
    'load-more-controls': createControlElement(),
    'pokemon-search-form': createControlElement(),
    'sort-filter': createControlElement(),
    'sort-order-button': createControlElement(),
    'type-filter': createControlElement(),
  };
  const windowListeners = new Map();

  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
  vi.stubGlobal('document', {
    getElementById: vi.fn((id) => elements[id]),
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn((type, listener) => windowListeners.set(type, listener)),
  });

  return { elements, windowListeners };
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('pokemon catalog controls', () => {
  it('synchronizes and reads the list controls', async () => {
    const { elements } = createCatalogControlsEnvironment();
    const { readPokemonListControls, syncPokemonListControls } =
      await import('../src/ui/pokemon-catalog-controls.js');

    syncPokemonListControls({
      generation: '2',
      order: 'desc',
      query: 'pika',
      sort: 'name',
      type: 'electric',
    });

    expect(readPokemonListControls('desc')).toEqual({
      generation: '2',
      order: 'desc',
      query: 'pika',
      sort: 'name',
      type: 'electric',
    });
    expect(elements.Reset_Btn.hidden).toBe(false);
    expect(elements['sort-order-button'].attributes.get('aria-pressed')).toBe('true');
    expect(elements['sort-order-button'].icon.textContent).toBe('↓');
    expect(elements['sort-order-button'].label.textContent).toBe('Descending');
  });

  it('updates load-more state and caps the displayed amount', async () => {
    const { elements } = createCatalogControlsEnvironment();
    const { updatePokemonLoadMoreControls } =
      await import('../src/ui/pokemon-catalog-controls.js');

    updatePokemonLoadMoreControls({
      defaultPageSize: 20,
      hasMore: true,
      isAvailable: true,
      isDiscovering: true,
      remainingCount: 17,
      totalMatches: 37,
    });

    expect(elements['load-more-controls'].hidden).toBe(false);
    expect(elements['load-more-button'].disabled).toBe(false);
    expect(elements.amountSelect.disabled).toBe(false);
    expect(elements['load-more-button'].textContent).toContain('17');
  });

  it('binds each interaction once and forwards the selected amount', async () => {
    const { elements, windowListeners } = createCatalogControlsEnvironment();
    const handlers = {
      onAmountChange: vi.fn(),
      onCriteriaChange: vi.fn(),
      onLanguageChanged: vi.fn(),
      onLoadMore: vi.fn(),
      onOrderToggle: vi.fn(),
      onPopState: vi.fn(),
      onQueryInput: vi.fn(),
      onReset: vi.fn(),
      onSearchSubmit: vi.fn(),
      onSortChange: vi.fn(),
    };
    const { initPokemonCatalogControls } =
      await import('../src/ui/pokemon-catalog-controls.js');
    const options = {
      defaultPageSize: 20,
      listState: {
        generation: 'all',
        order: 'asc',
        query: '',
        sort: 'number',
        type: 'all',
      },
      ...handlers,
    };

    expect(initPokemonCatalogControls(options)).toBe(true);
    expect(initPokemonCatalogControls(options)).toBe(false);

    elements.Search_Pokemon.listeners.get('input')();
    const submitEvent = { preventDefault: vi.fn() };
    elements['pokemon-search-form'].listeners.get('submit')(submitEvent);
    elements.Reset_Btn.listeners.get('click')();
    elements['type-filter'].listeners.get('change')();
    elements['generation-filter'].listeners.get('change')();
    elements['sort-filter'].listeners.get('change')();
    elements['sort-order-button'].listeners.get('click')();
    elements.amountSelect.listeners.get('change')();
    elements['load-more-button'].listeners.get('click')();
    windowListeners.get('popstate')();

    expect(handlers.onQueryInput).toHaveBeenCalledOnce();
    expect(submitEvent.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.onSearchSubmit).toHaveBeenCalledOnce();
    expect(handlers.onReset).toHaveBeenCalledOnce();
    expect(handlers.onCriteriaChange).toHaveBeenCalledTimes(2);
    expect(handlers.onSortChange).toHaveBeenCalledOnce();
    expect(handlers.onOrderToggle).toHaveBeenCalledOnce();
    expect(handlers.onAmountChange).toHaveBeenCalledOnce();
    expect(handlers.onLoadMore).toHaveBeenCalledWith(40);
    expect(handlers.onPopState).toHaveBeenCalledOnce();
    expect(window.addEventListener).toHaveBeenCalledOnce();
  });
});
