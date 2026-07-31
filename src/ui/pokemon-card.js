import pokemonFallbackUrl from '../../img/pokeball-icon.svg';
import { getLanguage, t, translateType } from '../i18n/index.js';
import { getLocalizedPokemonName } from '../i18n/pokemon-names.js';
import { collectionStore } from '../state/collections.js';
import { comparisonSelectionStore } from '../state/comparison-selection.js';
import { cachePokemon, getPokemonById } from '../state/pokemon-store.js';
import { formatPokemonNumber } from '../utils/formatters.js';
import { prefersReducedMotion } from '../utils/motion.js';
import {
  getPokemonAnimation as selectPokemonAnimation,
  getPokemonArtwork,
} from '../utils/pokemon-media.js';

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

const TYPE_COLOR_DARKENING = {
  bug: 0.35,
  dragon: 0.04,
  electric: 0.46,
  fairy: 0.09,
  fire: 0.13,
  flying: 0.18,
  grass: 0.16,
  ground: 0.11,
  ice: 0.11,
  normal: 0.05,
  psychic: 0.06,
  rock: 0.08,
  steel: 0.05,
  water: 0.04,
};

let cardInteractionsInitialized = false;
let selectPokemonCard = null;
let visiblePokemonIds = [];

function renderPokemonCards(pokemon) {
  cachePokemon(pokemon);
  visiblePokemonIds = pokemon.map(({ id }) => id);

  const template = document.createElement('template');
  template.innerHTML = pokemon.map(createPokemonCardMarkup).join('');
  document.getElementById('pokemon-card').replaceChildren(template.content);
  updatePokemonCardBadges();
}

function createPokemonCardMarkup(currentPokemon) {
  const name = getPokemonName(currentPokemon);
  const pokemonNumber = getPokemonNumber(currentPokemon);
  const types = (currentPokemon.types ?? [])
    .map((entry) => entry?.type?.name)
    .filter(Boolean);
  const primaryType = types[0] ?? 'normal';
  const secondaryType = types[1] ?? null;

  return generatePokemonCard({
    backgroundColor: getTypeColor(primaryType, secondaryType),
    image: getPokemonImage(currentPokemon),
    name,
    pokemonId: currentPokemon.id,
    pokemonNumber,
    primaryTypeLabel: translateType(primaryType),
    primaryTypeColor: getTypeColor(primaryType),
    secondaryTypeLabel: secondaryType ? translateType(secondaryType) : null,
    secondaryTypeColor: getTypeColor(secondaryType),
  });
}

function generatePokemonCard({
  backgroundColor,
  image,
  name,
  pokemonId,
  pokemonNumber,
  primaryTypeLabel,
  primaryTypeColor,
  secondaryTypeLabel,
  secondaryTypeColor,
}) {
  return /* html */ `
    <button
      class="pokedex"
      type="button"
      data-pokemon-id="${pokemonId}"
      aria-label="${t('card.openDetails', {
        labels: '',
        name,
        number: pokemonNumber,
      })}"
      ${backgroundColor}
    >
      <span class="name-number">
        <span class="pokemon-card__name">${name}</span>
        <span class="pokemon-card__number">${pokemonNumber}</span>
      </span>
      <span class="pokemon-card__collection-badges" aria-hidden="true">
        <span data-card-badge="favorite" hidden>${t('card.favoriteBadge')}</span>
        <span data-card-badge="compare" hidden>${t('card.compareBadge')}</span>
      </span>
      <span class="pokemon-img">
        <img
          class="pokemon-card__image"
          src="${image}"
          data-image-fallback="${pokemonFallbackUrl}"
          alt="${name}"
        />
      </span>
      <span class="pokemon-type" aria-label="${t('detail.types')}">
        <span class="type" ${primaryTypeColor}>${primaryTypeLabel}</span>
        ${checkIfType1Available(secondaryTypeLabel, secondaryTypeColor)}
      </span>
    </button>
  `;
}

function updatePokemonCardBadges() {
  const favoriteIds = new Set(collectionStore.getState().favorites);
  const comparisonIds = new Set(comparisonSelectionStore.getState().selectedIds);

  for (const card of document.querySelectorAll('.pokedex[data-pokemon-id]')) {
    const pokemonId = Number(card.dataset.pokemonId);
    const favoriteBadge = card.querySelector('[data-card-badge="favorite"]');
    const comparisonBadge = card.querySelector('[data-card-badge="compare"]');
    const name =
      card.querySelector('.pokemon-card__name')?.textContent?.trim() ??
      t('common.pokemon');
    const number = card.querySelector('.pokemon-card__number')?.textContent?.trim() ?? '';
    const collectionLabels = [];

    favoriteBadge.hidden = !favoriteIds.has(pokemonId);
    comparisonBadge.hidden = !comparisonIds.has(pokemonId);
    if (!favoriteBadge.hidden) collectionLabels.push(t('card.favoriteLabel'));
    if (!comparisonBadge.hidden) collectionLabels.push(t('card.compareLabel'));

    card.setAttribute(
      'aria-label',
      t('card.openDetails', {
        labels: collectionLabels.length ? `, ${collectionLabels.join(', ')}` : '',
        name,
        number,
      }),
    );
  }
}

function getPokemonName(currentPokemon) {
  return getLocalizedPokemonName(currentPokemon, getLanguage());
}

function getPokemonListLocalization() {
  return { getName: getPokemonName, language: getLanguage() };
}

function getPokemonNumber(currentPokemon) {
  return formatPokemonNumber(currentPokemon?.id);
}

function getPokemonImage(currentPokemon, { shiny = false } = {}) {
  return (
    getPokemonArtwork(currentPokemon, { shiny }) ??
    (shiny ? getPokemonArtwork(currentPokemon) : null) ??
    pokemonFallbackUrl
  );
}

function getPokemonAnimation(currentPokemon, { shiny = false } = {}) {
  return (
    selectPokemonAnimation(currentPokemon, { shiny }) ??
    (shiny ? selectPokemonAnimation(currentPokemon) : null)
  );
}

function getTypeColor(primaryType, secondaryType) {
  const primaryColor = TYPE_COLORS[primaryType] ?? TYPE_COLORS.normal;
  const darkening = Math.max(
    TYPE_COLOR_DARKENING[primaryType] ?? 0,
    TYPE_COLOR_DARKENING[secondaryType] ?? 0,
  );
  const contrastLayer = `linear-gradient(rgba(7, 15, 29, ${darkening}), rgba(7, 15, 29, ${darkening}))`;

  if (secondaryType) {
    const secondaryColor = TYPE_COLORS[secondaryType] ?? TYPE_COLORS.normal;
    return `style="background-image: ${contrastLayer}, linear-gradient(135deg, rgb(${primaryColor}), rgb(${secondaryColor}));"`;
  }

  if (darkening > 0) {
    return `style="background-color: rgb(${primaryColor}); background-image: ${contrastLayer};"`;
  }

  return `style="background-color: rgb(${primaryColor});"`;
}

function checkIfType1Available(pokemonType1, backgroundColor1) {
  if (!pokemonType1) return '';

  return `<span class="type" ${backgroundColor1}>${pokemonType1}</span>`;
}

function getCardElement(pokemonId, cardElement) {
  return (
    cardElement ?? document.querySelector(`.pokedex[data-pokemon-id="${pokemonId}"]`)
  );
}

function showGif(pokemonId, cardElement) {
  if (prefersReducedMotion()) return;

  const pokemon = getPokemonById(pokemonId);
  const image = getCardElement(pokemonId, cardElement)?.querySelector(
    '.pokemon-card__image',
  );
  const animatedSprite = getPokemonAnimation(pokemon) ?? pokemon?.sprites?.front_default;

  if (image && animatedSprite && image.src !== animatedSprite) {
    image.dataset.imageFallback = getPokemonImage(pokemon);
    image.dataset.imageFinalFallback = pokemonFallbackUrl;
    image.classList.add('is-animated');
    image.src = animatedSprite;
  }
}

function showImg(pokemonId, cardElement) {
  const pokemon = getPokemonById(pokemonId);
  const image = getCardElement(pokemonId, cardElement)?.querySelector(
    '.pokemon-card__image',
  );
  const artwork = getPokemonImage(pokemon);

  if (image && image.src !== artwork) {
    image.dataset.imageFallback = pokemonFallbackUrl;
    image.removeAttribute('data-image-final-fallback');
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

    selectPokemonCard?.(Number(card.dataset.pokemonId), card);
  });

  cardContainer.addEventListener('pointerover', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || card.contains(event.relatedTarget)) return;

    showGif(Number(card.dataset.pokemonId), card);
  });

  cardContainer.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.pokedex');
    if (!card || card.contains(event.relatedTarget)) return;

    showImg(Number(card.dataset.pokemonId), card);
  });
  collectionStore.subscribe(updatePokemonCardBadges);
  comparisonSelectionStore.subscribe(updatePokemonCardBadges);

  cardInteractionsInitialized = true;
}

function getVisiblePokemonIds() {
  return [...visiblePokemonIds];
}

export {
  checkIfType1Available,
  getPokemonAnimation,
  getPokemonImage,
  getPokemonListLocalization,
  getPokemonName,
  getPokemonNumber,
  getTypeColor,
  getVisiblePokemonIds,
  initPokemonCardInteractions,
  renderPokemonCards,
  showGif,
  showImg,
};
