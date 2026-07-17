import pokemonFallbackUrl from './img/pokeball-icon.svg';
import { getPokemonPage } from './src/api/pokemon-api.js';
import {
  addPokemonPage,
  getLoadedPokemon,
  getLoadedPokemonAt,
  getNextPokemonOffset,
  hasMorePokemon,
} from './src/state/pokemon-store.js';
import {
  beginRequest,
  clearRequestError,
  showRequestError,
} from './src/ui/request-feedback.js';
import { formatPokemonName, formatPokemonNumber } from './src/utils/formatters.js';
import { preloadPokemonMedia } from './src/utils/media.js';

const DEFAULT_PAGE_SIZE = 20;
const TYPE_COLORS = {
  bug: '170, 184, 33',
  dark: '46, 35, 28',
  dragon: '86, 112, 190',
  electric: '247, 208, 43',
  fairy: '180, 99, 151',
  fighting: '178, 68, 68',
  fire: '224, 87, 53',
  flying: '92, 147, 177',
  ghost: '112, 85, 155',
  grass: '74, 153, 77',
  ground: '175, 115, 68',
  ice: '37, 142, 154',
  normal: '117, 117, 117',
  poison: '123, 76, 151',
  psychic: '205, 75, 129',
  rock: '139, 124, 76',
  steel: '96, 125, 138',
  water: '66, 120, 184',
};

let activePageRequest = null;
let cardInteractionsInitialized = false;
let selectPokemonCard = null;

function loadPokemonApi() {
  if (getLoadedPokemon().length > 0) {
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
      showRequestError({
        message: 'The Pokémon could not be loaded. Check your connection and try again.',
        onRetry: () => loadNextPokemon({ limit }),
      });
      return [];
    }

    try {
      await preloadPokemonMedia(page.pokemon);
      return renderPokemonPage(page);
    } catch {
      showRequestError({
        message: 'The Pokémon could not be displayed. Please try again.',
        onRetry: () => loadNextPokemon({ limit }),
      });
      return [];
    }
  } finally {
    finishRequest();
    document.getElementById('load-more-button').disabled = !hasMorePokemon();
  }
}

function renderPokemonPage(page) {
  if (page.offset !== getNextPokemonOffset()) return [];

  const loadedIds = new Set(getLoadedPokemon().map((pokemon) => pokemon.id));
  const newPokemon = page.pokemon.filter((pokemon) => !loadedIds.has(pokemon.id));
  const startIndex = getLoadedPokemon().length;
  const template = document.createElement('template');
  template.innerHTML = newPokemon
    .map((pokemon, index) => createPokemonCardMarkup(pokemon, startIndex + index))
    .join('');

  const renderedCards = Array.from(template.content.children);
  document.getElementById('pokemon-card').append(template.content);

  try {
    filterPokemon();
    return addPokemonPage(page);
  } catch (error) {
    renderedCards.forEach((card) => card.remove());
    throw error;
  }
}

function createPokemonCardMarkup(currentPokemon, index) {
  const name = getPokemonName(currentPokemon);
  const pokemonNumber = getPokemonNumber(currentPokemon);
  const types = (currentPokemon.types ?? [])
    .map((entry) => entry?.type?.name)
    .filter(Boolean);
  const primaryType = types[0] ?? 'normal';
  const secondaryType = types[1] ?? null;
  const image = getPokemonImage(currentPokemon);

  return generatePokemonCard({
    backgroundColor: getTypeColor(primaryType, secondaryType),
    image,
    index,
    name,
    pokemonNumber,
    primaryType,
    primaryTypeColor: getTypeColor(primaryType),
    secondaryType,
    secondaryTypeColor: getTypeColor(secondaryType),
  });
}

function generatePokemonCard({
  backgroundColor,
  image,
  index,
  name,
  pokemonNumber,
  primaryType,
  primaryTypeColor,
  secondaryType,
  secondaryTypeColor,
}) {
  return /* html */ `
    <button
      class="pokedex"
      type="button"
      data-pokemon-index="${index}"
      aria-label="Open details for ${name}, ${pokemonNumber}"
      ${backgroundColor}
    >
      <span class="pokemon-card__decoration" aria-hidden="true"></span>
      <span class="name-number">
        <span class="pokemon-card__name">${name}</span>
        <span class="pokemon-card__number">${pokemonNumber}</span>
      </span>
      <span class="pokemon-img">
        <img class="pokemon-card__image" src="${image}" alt="${name}" />
      </span>
      <span class="pokemon-type" aria-label="Types">
        <span class="type" ${primaryTypeColor}>${primaryType}</span>
        ${checkIfType1Available(secondaryType, secondaryTypeColor)}
      </span>
    </button>
  `;
}

function getPokemonName(currentPokemon) {
  return formatPokemonName(currentPokemon?.name);
}

function getPokemonNumber(currentPokemon) {
  return formatPokemonNumber(currentPokemon?.id);
}

function getPokemonImage(currentPokemon) {
  return (
    currentPokemon?.sprites?.other?.['official-artwork']?.front_default ??
    currentPokemon?.sprites?.front_default ??
    pokemonFallbackUrl
  );
}

function getPokemonAnimation(currentPokemon) {
  return (
    currentPokemon?.sprites?.other?.showdown?.front_default ??
    currentPokemon?.sprites?.versions?.['generation-v']?.['black-white']?.animated
      ?.front_default ??
    null
  );
}

function getTypeColor(primaryType, secondaryType) {
  const primaryColor = TYPE_COLORS[primaryType] ?? TYPE_COLORS.normal;

  if (secondaryType) {
    const secondaryColor = TYPE_COLORS[secondaryType] ?? TYPE_COLORS.normal;
    return `style="background: linear-gradient(135deg, rgb(${primaryColor}), rgb(${secondaryColor}));"`;
  }

  return `style="background-color: rgb(${primaryColor});"`;
}

function checkIfType1Available(pokemonType1, backgroundColor1) {
  if (!pokemonType1) return '';

  return `<span class="type" ${backgroundColor1}>${pokemonType1}</span>`;
}

function getCardElement(index, cardElement) {
  return cardElement ?? document.querySelector(`.pokedex[data-pokemon-index="${index}"]`);
}

function showGif(index, cardElement) {
  const pokemon = getLoadedPokemonAt(index);
  const image = getCardElement(index, cardElement)?.querySelector('.pokemon-card__image');
  const animatedSprite = getPokemonAnimation(pokemon) ?? pokemon?.sprites?.front_default;

  if (image && animatedSprite && image.src !== animatedSprite) {
    image.classList.add('is-animated');
    image.src = animatedSprite;
  }
}

function showImg(index, cardElement) {
  const pokemon = getLoadedPokemonAt(index);
  const image = getCardElement(index, cardElement)?.querySelector('.pokemon-card__image');
  const artwork = getPokemonImage(pokemon);

  if (image && image.src !== artwork) {
    image.classList.remove('is-animated');
    image.src = artwork;
  }
}

function initPokemonCardInteractions({ onSelect }) {
  selectPokemonCard = onSelect;

  if (cardInteractionsInitialized) return;

  const cardContainer = document.getElementById('pokemon-card');

  cardContainer.addEventListener('click', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || !cardContainer.contains(card)) return;

    selectPokemonCard?.(Number(card.dataset.pokemonIndex), card);
  });

  cardContainer.addEventListener('pointerover', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || card.contains(event.relatedTarget)) return;

    showGif(Number(card.dataset.pokemonIndex), card);
  });

  cardContainer.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || card.contains(event.relatedTarget)) return;

    showImg(Number(card.dataset.pokemonIndex), card);
  });

  cardInteractionsInitialized = true;
}

function loadMorePokemon(limit = DEFAULT_PAGE_SIZE) {
  return loadNextPokemon({ limit });
}

function initPokemonListControls() {
  const searchForm = document.getElementById('pokemon-search-form');
  const searchInput = document.getElementById('Search_Pokemon');
  const loadMoreButton = document.getElementById('load-more-button');

  searchInput.addEventListener('input', filterPokemon);
  searchForm.addEventListener('submit', (event) => event.preventDefault());
  searchForm.addEventListener('reset', () => queueMicrotask(filterPokemon));
  loadMoreButton.addEventListener('click', () => loadMorePokemon());
}

function updateVisibility(cards, filter) {
  let found = false;

  for (const card of cards) {
    const name = card.querySelector('.pokemon-card__name').textContent.toLowerCase();
    const isMatch = name.includes(filter);
    card.hidden = !isMatch;
    found ||= isMatch;
  }

  return found;
}

function filterPokemon() {
  const input = document.getElementById('Search_Pokemon');
  const filter = input.value.trim().toLowerCase();
  const loadMoreButton = document.getElementById('load-more-button');
  const resetButton = document.getElementById('Reset_Btn');
  const cards = document.getElementById('pokemon-card').getElementsByClassName('pokedex');
  const filterMessage = document.getElementById('filterMessage');

  loadMoreButton.hidden = filter !== '';
  resetButton.hidden = filter === '';

  if (filter.length < 3) {
    filterMessage.textContent =
      filter === '' ? '' : 'Please enter at least 3 characters.';

    for (const card of cards) card.hidden = false;
    return;
  }

  filterMessage.textContent = '';
  const found = updateVisibility(cards, filter);

  if (!found) filterMessage.textContent = 'No Pokémon found.';
}

function resetFilter() {
  document.getElementById('Search_Pokemon').value = '';
  filterPokemon();
}

export {
  checkIfType1Available,
  filterPokemon,
  getPokemonImage,
  getPokemonAnimation,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
  initPokemonCardInteractions,
  initPokemonListControls,
  loadPokemonApi,
  resetFilter,
  showGif,
  showImg,
};
