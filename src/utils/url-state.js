const POKEMON_TYPES = Object.freeze([
  'bug',
  'dark',
  'dragon',
  'electric',
  'fairy',
  'fighting',
  'fire',
  'flying',
  'ghost',
  'grass',
  'ground',
  'ice',
  'normal',
  'poison',
  'psychic',
  'rock',
  'steel',
  'water',
]);

const POKEMON_GENERATIONS = Object.freeze(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
const POKEMON_SORT_OPTIONS = Object.freeze(['id', 'name']);
const POKEMON_SORT_ORDERS = Object.freeze(['asc', 'desc']);
const MAX_QUERY_LENGTH = 80;
const MANAGED_QUERY_PARAMETERS = ['q', 'type', 'generation', 'sort', 'order'];

const DEFAULT_POKEMON_LIST_STATE = Object.freeze({
  generation: 'all',
  order: 'asc',
  query: '',
  sort: 'id',
  type: 'all',
});

function normalizeQuery(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUERY_LENGTH) : '';
}

function normalizeOption(value, allowedValues, fallback) {
  if (typeof value !== 'string') return fallback;

  const normalizedValue = value.trim().toLowerCase();
  return allowedValues.includes(normalizedValue) ? normalizedValue : fallback;
}

function normalizePokemonListState(state = {}) {
  return {
    generation: normalizeOption(
      String(state.generation ?? ''),
      POKEMON_GENERATIONS,
      DEFAULT_POKEMON_LIST_STATE.generation,
    ),
    order: normalizeOption(
      state.order,
      POKEMON_SORT_ORDERS,
      DEFAULT_POKEMON_LIST_STATE.order,
    ),
    query: normalizeQuery(state.query),
    sort: normalizeOption(
      state.sort,
      POKEMON_SORT_OPTIONS,
      DEFAULT_POKEMON_LIST_STATE.sort,
    ),
    type: normalizeOption(state.type, POKEMON_TYPES, DEFAULT_POKEMON_LIST_STATE.type),
  };
}

function toSearchParams(search) {
  if (search instanceof URLSearchParams) {
    return new URLSearchParams(search);
  }

  return new URLSearchParams(typeof search === 'string' ? search : '');
}

function parsePokemonListState(search = '') {
  const searchParams = toSearchParams(search);

  return normalizePokemonListState({
    generation: searchParams.get('generation'),
    order: searchParams.get('order'),
    query: searchParams.get('q'),
    sort: searchParams.get('sort'),
    type: searchParams.get('type'),
  });
}

function serializePokemonListState(state = {}) {
  const normalizedState = normalizePokemonListState(state);
  const searchParams = new URLSearchParams();

  if (normalizedState.query !== DEFAULT_POKEMON_LIST_STATE.query) {
    searchParams.set('q', normalizedState.query);
  }
  if (normalizedState.type !== DEFAULT_POKEMON_LIST_STATE.type) {
    searchParams.set('type', normalizedState.type);
  }
  if (normalizedState.generation !== DEFAULT_POKEMON_LIST_STATE.generation) {
    searchParams.set('generation', normalizedState.generation);
  }
  if (normalizedState.sort !== DEFAULT_POKEMON_LIST_STATE.sort) {
    searchParams.set('sort', normalizedState.sort);
  }
  if (normalizedState.order !== DEFAULT_POKEMON_LIST_STATE.order) {
    searchParams.set('order', normalizedState.order);
  }

  return searchParams;
}

function updatePokemonListUrl(state, { replace = true } = {}) {
  const url = new URL(window.location.href);
  const listSearchParams = serializePokemonListState(state);

  for (const parameter of MANAGED_QUERY_PARAMETERS) {
    url.searchParams.delete(parameter);
  }

  for (const [parameter, value] of listSearchParams) {
    url.searchParams.set(parameter, value);
  }

  const relativeUrl = `${url.pathname}${url.search}${url.hash}`;
  const updateHistory = replace ? window.history.replaceState : window.history.pushState;

  updateHistory.call(window.history, window.history.state, '', relativeUrl);
  return relativeUrl;
}

export {
  DEFAULT_POKEMON_LIST_STATE,
  MAX_QUERY_LENGTH,
  POKEMON_GENERATIONS,
  POKEMON_SORT_OPTIONS,
  POKEMON_SORT_ORDERS,
  POKEMON_TYPES,
  normalizePokemonListState,
  parsePokemonListState,
  serializePokemonListState,
  updatePokemonListUrl,
};
