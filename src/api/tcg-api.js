import { createRequestCache } from './request-cache.js';

const TCG_API_CARDS_URL = 'https://api.pokemontcg.io/v2/cards';
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 12;
const TCG_REQUEST_TIMEOUT = 12000;
const TCG_RETRY_DELAYS = Object.freeze([300, 600]);
const RETRYABLE_TCG_STATUS_CODES = new Set([500, 502, 503, 504]);
const CARD_FIELDS = [
  'id',
  'name',
  'number',
  'rarity',
  'artist',
  'hp',
  'types',
  'nationalPokedexNumbers',
  'images',
  'set',
];

const pokemonCardsCache = createRequestCache();

class TcgApiError extends Error {
  constructor(message, { url, status = null, statusText = '', cause } = {}) {
    super(message);
    this.name = 'TcgApiError';
    this.url = url;
    this.status = status;
    this.statusText = statusText;

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

function normalizeNationalPokedexId(value) {
  const id =
    typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new TypeError('National Pokédex ID must be a positive integer.');
  }

  return id;
}

function normalizePageSize(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_PAGE_SIZE) {
    throw new RangeError(`Page size must be between 1 and ${MAX_PAGE_SIZE}.`);
  }

  return value;
}

function normalizePage(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('Page must be a positive integer.');
  }

  return value;
}

function normalizeText(value, maximumLength = 200) {
  if (typeof value !== 'string') return null;

  const text = value.replace(/\s+/g, ' ').trim();

  return text && text.length <= maximumLength ? text : null;
}

function normalizeHttpsUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => normalizeText(entry, 50))
    .filter((entry, index, entries) => entry && entries.indexOf(entry) === index);
}

function normalizeNationalPokedexNumbers(value) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry, index, entries) =>
      Number.isSafeInteger(entry) && entry > 0 && entries.indexOf(entry) === index,
  );
}

function normalizeSet(value) {
  if (!value || typeof value !== 'object') return null;

  const id = normalizeText(value.id, 100);
  const name = normalizeText(value.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    releaseDate: normalizeText(value.releaseDate, 20),
    series: normalizeText(value.series),
  };
}

function normalizeCard(card, nationalPokedexId) {
  if (!card || typeof card !== 'object') return null;

  const id = normalizeText(card.id, 100);
  const name = normalizeText(card.name);
  const nationalPokedexNumbers = normalizeNationalPokedexNumbers(
    card.nationalPokedexNumbers,
  );

  if (!id || !name || !nationalPokedexNumbers.includes(nationalPokedexId)) {
    return null;
  }

  return {
    artist: normalizeText(card.artist),
    hp: normalizeText(card.hp, 20),
    id,
    images: {
      large: normalizeHttpsUrl(card.images?.large),
      small: normalizeHttpsUrl(card.images?.small),
    },
    name,
    nationalPokedexNumbers,
    number: normalizeText(card.number, 50),
    rarity: normalizeText(card.rarity),
    set: normalizeSet(card.set),
    types: normalizeStringList(card.types),
  };
}

function normalizePokemonCards(response, pokemonId) {
  const nationalPokedexId = normalizeNationalPokedexId(pokemonId);

  if (!response || typeof response !== 'object' || !Array.isArray(response.data)) {
    throw new TypeError('The Pokémon TCG API response is invalid.');
  }

  const cards = response.data
    .map((card) => normalizeCard(card, nationalPokedexId))
    .filter(Boolean);
  const totalCount =
    Number.isSafeInteger(response.totalCount) && response.totalCount >= 0
      ? response.totalCount
      : cards.length;

  return { cards, totalCount };
}

function buildPokemonCardsUrl(
  pokemonId,
  { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {},
) {
  const nationalPokedexId = normalizeNationalPokedexId(pokemonId);
  const normalizedPage = normalizePage(page);
  const normalizedPageSize = normalizePageSize(pageSize);
  const url = new URL(TCG_API_CARDS_URL);

  url.searchParams.set('q', `nationalPokedexNumbers:${nationalPokedexId}`);
  url.searchParams.set('page', String(normalizedPage));
  url.searchParams.set('pageSize', String(normalizedPageSize));
  url.searchParams.set('select', CARD_FIELDS.join(','));

  return url.href;
}

function waitForTcgRetry(delay) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delay));
}

function createResponseError(response, url) {
  return new TcgApiError(
    `The Pokémon TCG API request failed with status ${response.status}.`,
    {
      status: response.status,
      statusText: response.statusText,
      url,
    },
  );
}

async function fetchTcgResponse(url) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), TCG_REQUEST_TIMEOUT);

  try {
    try {
      return await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (cause) {
      throw new TcgApiError('Trading card data is currently unavailable.', {
        cause,
        url,
      });
    }
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function fetchTcgJson(url) {
  let response;

  for (let attempt = 0; attempt <= TCG_RETRY_DELAYS.length; attempt += 1) {
    response = await fetchTcgResponse(url);

    if (!response.ok) {
      const error = createResponseError(response, url);
      const canRetry =
        RETRYABLE_TCG_STATUS_CODES.has(response.status) &&
        attempt < TCG_RETRY_DELAYS.length;

      if (!canRetry) throw error;

      await waitForTcgRetry(TCG_RETRY_DELAYS[attempt]);
      continue;
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new TcgApiError('The Pokémon TCG API returned an invalid response.', {
        cause,
        status: response.status,
        statusText: response.statusText,
        url,
      });
    }
  }

  throw createResponseError(response, url);
}

function getPokemonCards(pokemonId, { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const nationalPokedexId = normalizeNationalPokedexId(pokemonId);
  const normalizedPage = normalizePage(page);
  const normalizedPageSize = normalizePageSize(pageSize);
  const cacheKey = `${nationalPokedexId}:${normalizedPage}:${normalizedPageSize}`;

  return pokemonCardsCache.get(cacheKey, async () => {
    const url = buildPokemonCardsUrl(nationalPokedexId, {
      page: normalizedPage,
      pageSize: normalizedPageSize,
    });
    const response = await fetchTcgJson(url);

    try {
      return normalizePokemonCards(response, nationalPokedexId);
    } catch (cause) {
      throw new TcgApiError('The Pokémon TCG API returned an invalid response.', {
        cause,
        status: 200,
        statusText: 'OK',
        url,
      });
    }
  });
}

export { TcgApiError, buildPokemonCardsUrl, getPokemonCards, normalizePokemonCards };
