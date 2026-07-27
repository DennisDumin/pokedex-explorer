const DEFAULT_CATALOG_RESULT_LIMIT = 24;

function normalizeQuery(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeName(value) {
  return typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
    : '';
}

function getPokemonId(pokemon) {
  const directId = Number(pokemon?.id);

  if (Number.isSafeInteger(directId) && directId > 0) {
    return directId;
  }

  if (typeof pokemon?.url !== 'string') return null;

  const match = pokemon.url.match(/\/(\d+)\/?$/);
  const urlId = Number(match?.[1]);

  return Number.isSafeInteger(urlId) && urlId > 0 ? urlId : null;
}

function getQueryId(query) {
  const match = normalizeQuery(query).match(/^#?0*(\d+)$/);
  const id = Number(match?.[1]);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getDisplayName(pokemon, getName) {
  if (typeof getName !== 'function') return pokemon?.name;

  try {
    return getName(pokemon);
  } catch {
    return pokemon?.name;
  }
}

function matchesQuery(pokemon, query, { getName } = {}) {
  const normalizedQuery = normalizeQuery(query);

  if (normalizedQuery === '') return true;

  const queryId = getQueryId(normalizedQuery);

  if (queryId !== null) {
    return getPokemonId(pokemon) === queryId;
  }

  const searchableNames = new Set([
    normalizeName(pokemon?.name),
    normalizeName(getDisplayName(pokemon, getName)),
  ]);
  const searchTerm = normalizeName(normalizedQuery);

  return (
    searchTerm !== '' &&
    [...searchableNames].some((searchableName) => searchableName.includes(searchTerm))
  );
}

function idSetHas(idSet, id) {
  if (!(idSet instanceof Set)) return true;
  return idSet.has(id) || idSet.has(String(id));
}

function matchesIdSets(pokemon, { generationIds, typeIds } = {}) {
  const id = getPokemonId(pokemon);

  if (id === null) return false;

  return idSetHas(typeIds, id) && idSetHas(generationIds, id);
}

function matchesType(pokemon, selectedType) {
  if (typeof selectedType !== 'string' || selectedType === '' || selectedType === 'all') {
    return true;
  }

  const normalizedType = selectedType.toLowerCase();

  return (pokemon?.types ?? []).some(
    (entry) => entry?.type?.name?.toLowerCase() === normalizedType,
  );
}

function compareIds(firstPokemon, secondPokemon) {
  const firstId = getPokemonId(firstPokemon);
  const secondId = getPokemonId(secondPokemon);

  if (firstId === null) return secondId === null ? 0 : 1;
  if (secondId === null) return -1;

  return firstId - secondId;
}

function compareNames(firstPokemon, secondPokemon, { collator, getName } = {}) {
  const firstName = getDisplayName(firstPokemon, getName) ?? '';
  const secondName = getDisplayName(secondPokemon, getName) ?? '';

  if (firstName === '') return secondName === '' ? 0 : 1;
  if (secondName === '') return -1;

  return collator.compare(firstName, secondName);
}

function stableSortPokemon(pokemon, { order = 'asc', sort = 'id' } = {}, options = {}) {
  const collator = new Intl.Collator(options.language ?? 'en', {
    numeric: true,
    sensitivity: 'base',
  });
  const comparePokemon =
    sort === 'name'
      ? (firstPokemon, secondPokemon) =>
          compareNames(firstPokemon, secondPokemon, { ...options, collator })
      : compareIds;
  const direction = order === 'desc' ? -1 : 1;

  return pokemon
    .map((entry, index) => ({ entry, index }))
    .sort((first, second) => {
      const comparison = comparePokemon(first.entry, second.entry);
      return comparison === 0 ? first.index - second.index : comparison * direction;
    })
    .map(({ entry }) => entry);
}

function filterAndSortPokemon(pokemon, state = {}, options = {}) {
  if (!Array.isArray(pokemon)) return [];

  const filteredPokemon = pokemon.filter(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      matchesQuery(entry, state.query, options) &&
      matchesType(entry, state.type) &&
      matchesIdSets(entry, state),
  );

  return stableSortPokemon(filteredPokemon, state, options);
}

function getResultLimit(limit) {
  if (limit === Infinity) return Infinity;
  return Number.isSafeInteger(limit) && limit >= 0 ? limit : DEFAULT_CATALOG_RESULT_LIMIT;
}

function getRemainingResultCount(renderedCount, totalCount) {
  const rendered = Number.isSafeInteger(renderedCount) ? Math.max(0, renderedCount) : 0;
  const total = Number.isSafeInteger(totalCount) ? Math.max(0, totalCount) : 0;

  return Math.max(0, total - rendered);
}

function getNextResultLimit(currentLimit, increment, totalCount) {
  const current = Number.isSafeInteger(currentLimit) ? Math.max(0, currentLimit) : 0;
  const amount = Number.isSafeInteger(increment) ? Math.max(0, increment) : 0;
  const total = Number.isSafeInteger(totalCount) ? Math.max(0, totalCount) : 0;

  return Math.min(total, current + amount);
}

function findPokemonCatalogMatches(catalog, state = {}, { limit, ...options } = {}) {
  if (!Array.isArray(catalog)) return [];

  const matches = catalog.filter(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      getPokemonId(entry) !== null &&
      matchesQuery(entry, state.query, options) &&
      matchesIdSets(entry, state),
  );

  return stableSortPokemon(matches, state, options).slice(0, getResultLimit(limit));
}

export {
  DEFAULT_CATALOG_RESULT_LIMIT,
  filterAndSortPokemon,
  findPokemonCatalogMatches,
  getNextResultLimit,
  getPokemonId,
  getRemainingResultCount,
  matchesQuery,
};
