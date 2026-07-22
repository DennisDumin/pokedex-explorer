const POKEMON_DETAIL_TABS = Object.freeze([
  'about',
  'stats',
  'matchups',
  'evolution',
  'cards',
]);

const DEFAULT_POKEMON_DETAIL_ROUTE = Object.freeze({
  pokemonId: null,
  shiny: false,
  tab: 'about',
});

const DETAIL_ROUTE_HISTORY_STATE_KEY = '__pokedexDetailEntry';
const DETAIL_ROUTE_PARAMETERS = ['pokemon', 'tab', 'shiny'];

function normalizePokemonId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;

  const pokemonId = Number(value.trim());
  return Number.isSafeInteger(pokemonId) && pokemonId > 0 ? pokemonId : null;
}

function normalizeTab(value) {
  if (typeof value !== 'string') return DEFAULT_POKEMON_DETAIL_ROUTE.tab;

  const tab = value.trim().toLowerCase();
  return POKEMON_DETAIL_TABS.includes(tab) ? tab : DEFAULT_POKEMON_DETAIL_ROUTE.tab;
}

function normalizeShiny(value) {
  return value === true || value === 1 || value === '1';
}

function toSearchParams(search) {
  if (search instanceof URLSearchParams) {
    return new URLSearchParams(search);
  }

  return new URLSearchParams(typeof search === 'string' ? search : '');
}

function parsePokemonDetailRoute(search = '') {
  const searchParams = toSearchParams(search);

  return {
    pokemonId: normalizePokemonId(searchParams.get('pokemon')),
    shiny: searchParams.get('shiny') === '1',
    tab: normalizeTab(searchParams.get('tab')),
  };
}

function getWindowUrl() {
  return new URL(window.location.href);
}

function getRelativeUrl(url) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function isStateRecord(state) {
  return state !== null && typeof state === 'object' && !Array.isArray(state);
}

function addDetailHistoryMarker(state) {
  return {
    ...(isStateRecord(state) ? state : {}),
    [DETAIL_ROUTE_HISTORY_STATE_KEY]: true,
  };
}

function removeDetailHistoryMarker(state) {
  if (!isStateRecord(state) || !(DETAIL_ROUTE_HISTORY_STATE_KEY in state)) {
    return state;
  }

  const nextState = { ...state };
  delete nextState[DETAIL_ROUTE_HISTORY_STATE_KEY];

  return Object.keys(nextState).length === 0 ? null : nextState;
}

function isPokemonDetailHistoryEntry(state = window.history.state) {
  return (
    isStateRecord(state) &&
    Object.prototype.hasOwnProperty.call(state, DETAIL_ROUTE_HISTORY_STATE_KEY) &&
    state[DETAIL_ROUTE_HISTORY_STATE_KEY] === true
  );
}

function writeDetailRoute(url, { markDetailEntry = false, replace = true } = {}) {
  const relativeUrl = getRelativeUrl(url);
  const currentState = window.history.state;
  const historyState = markDetailEntry
    ? addDetailHistoryMarker(currentState)
    : currentState;
  const updateHistory = replace ? window.history.replaceState : window.history.pushState;

  updateHistory.call(window.history, historyState, '', relativeUrl);
  return relativeUrl;
}

function applyDetailRoute(url, { pokemonId, shiny, tab }) {
  url.searchParams.set('pokemon', String(pokemonId));

  if (tab === DEFAULT_POKEMON_DETAIL_ROUTE.tab) {
    url.searchParams.delete('tab');
  } else {
    url.searchParams.set('tab', tab);
  }

  if (shiny) {
    url.searchParams.set('shiny', '1');
  } else {
    url.searchParams.delete('shiny');
  }
}

function openPokemonDetailRoute(
  pokemonId,
  { shiny = false, tab = DEFAULT_POKEMON_DETAIL_ROUTE.tab } = {},
) {
  const normalizedPokemonId = normalizePokemonId(pokemonId);

  if (normalizedPokemonId === null) {
    throw new TypeError('PokÃ©mon ID must be a positive integer.');
  }

  const url = getWindowUrl();
  applyDetailRoute(url, {
    pokemonId: normalizedPokemonId,
    shiny: normalizeShiny(shiny),
    tab: normalizeTab(tab),
  });

  return writeDetailRoute(url, { markDetailEntry: true, replace: false });
}

function updatePokemonDetailRoute(updates = {}, { replace = true } = {}) {
  const url = getWindowUrl();
  const currentRoute = parsePokemonDetailRoute(url.search);
  const pokemonId =
    updates.pokemonId === undefined
      ? currentRoute.pokemonId
      : normalizePokemonId(updates.pokemonId);

  if (pokemonId === null) {
    throw new TypeError('PokÃ©mon ID must be a positive integer.');
  }

  applyDetailRoute(url, {
    pokemonId,
    shiny:
      updates.shiny === undefined ? currentRoute.shiny : normalizeShiny(updates.shiny),
    tab: updates.tab === undefined ? currentRoute.tab : normalizeTab(updates.tab),
  });

  return writeDetailRoute(url, {
    markDetailEntry: !replace,
    replace,
  });
}

function removePokemonDetailRoute({ preferHistoryBack = true, replace = true } = {}) {
  const url = getWindowUrl();
  const hasOpenDetail = parsePokemonDetailRoute(url.search).pokemonId !== null;

  if (
    preferHistoryBack &&
    hasOpenDetail &&
    isPokemonDetailHistoryEntry(window.history.state)
  ) {
    window.history.back();
    return null;
  }

  for (const parameter of DETAIL_ROUTE_PARAMETERS) {
    url.searchParams.delete(parameter);
  }

  const relativeUrl = getRelativeUrl(url);
  const historyState = removeDetailHistoryMarker(window.history.state);
  const updateHistory = replace ? window.history.replaceState : window.history.pushState;

  updateHistory.call(window.history, historyState, '', relativeUrl);
  return relativeUrl;
}

export {
  DEFAULT_POKEMON_DETAIL_ROUTE,
  DETAIL_ROUTE_HISTORY_STATE_KEY,
  POKEMON_DETAIL_TABS,
  isPokemonDetailHistoryEntry,
  openPokemonDetailRoute,
  parsePokemonDetailRoute,
  removePokemonDetailRoute,
  updatePokemonDetailRoute,
};
