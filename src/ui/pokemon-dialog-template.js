import arrowLeftUrl from '../../img/arrow-left.svg';
import arrowRightUrl from '../../img/arrow-right.svg';
import closeIconUrl from '../../img/cross.svg';
import { t } from '../i18n/index.js';
import { checkIfType1Available } from './pokemon-card.js';

function cardHTML({
  backgroundColor,
  fallbackImage,
  finalFallbackImage,
  hasNavigation,
  image,
  imageIsAnimated,
  isFavorite,
  isComparisonSelected,
  isShiny,
  name,
  nextId,
  pokemonId,
  pokemonNumber,
  primaryType,
  primaryTypeColor,
  previousId,
  secondaryType,
  secondaryTypeColor,
  shinyAvailable,
  soundAvailable,
  varieties,
}) {
  const soundLabel = soundAvailable
    ? t('detail.playNamedCry', { name })
    : t('detail.namedCryUnavailable', { name });

  return /* html */ `
    <article class="OnePokemonCard" ${backgroundColor} data-pokemon-id="${pokemonId}">
      <section class="mainInfo">
        <div class="detail-toolbar">
          <div
            class="detail-navigation"
            aria-label="${t('detail.browse')}"
            ${hasNavigation ? '' : 'hidden'}
          >
            <button
              class="detail-icon-button"
              type="button"
              data-action="previous"
              data-pokemon-id="${previousId}"
              aria-label="${t('detail.previous')}"
              ${hasNavigation ? '' : 'disabled'}
            >
              <img src="${arrowLeftUrl}" alt="" aria-hidden="true">
            </button>
            <button
              class="detail-icon-button"
              type="button"
              data-action="next"
              data-pokemon-id="${nextId}"
              aria-label="${t('detail.next')}"
              ${hasNavigation ? '' : 'disabled'}
            >
              <img src="${arrowRightUrl}" alt="" aria-hidden="true">
            </button>
          </div>
          <div class="detail-actions" role="group" aria-label="${t('detail.actions')}">
            <button
              class="detail-icon-button detail-collection-button"
              type="button"
              data-action="toggle-shiny"
              aria-label="${isShiny ? t('detail.showNormal') : t('detail.showShiny')}"
              aria-pressed="${isShiny}"
              title="${
                shinyAvailable
                  ? isShiny
                    ? t('detail.showNormal')
                    : t('detail.showShiny')
                  : t('detail.noShiny')
              }"
              ${shinyAvailable ? '' : 'disabled'}
            >
              <span class="shiny-icon" aria-hidden="true">✦</span>
              <span class="detail-action-label">${t('detail.shiny')}</span>
            </button>
            <button
              class="detail-icon-button detail-collection-button"
              type="button"
              data-action="toggle-favorite"
              aria-label="${isFavorite ? t('detail.removeFavorite') : t('detail.addFavorite')}"
              aria-pressed="${isFavorite}"
              title="${isFavorite ? t('detail.removeFavorite') : t('detail.addFavorite')}"
            >
              <span class="favorite-icon" aria-hidden="true">${isFavorite ? '♥' : '♡'}</span>
              <span class="detail-action-label">${t('detail.favorite')}</span>
            </button>
            <button
              class="detail-icon-button detail-collection-button"
              type="button"
              data-action="toggle-compare"
              aria-label="${
                isComparisonSelected
                  ? t('detail.removeCompare', { name })
                  : t('detail.selectCompare', { name })
              }"
              aria-pressed="${isComparisonSelected}"
              title="${
                isComparisonSelected
                  ? t('detail.removeCompareShort')
                  : t('detail.selectCompareShort')
              }"
            >
              <span class="compare-icon" aria-hidden="true">${isComparisonSelected ? '✓' : '⇄'}</span>
              <span class="detail-action-label">${
                isComparisonSelected ? t('detail.selected') : t('detail.compare')
              }</span>
            </button>
          </div>
          <button
            class="detail-icon-button detail-close-button"
            type="button"
            data-action="close"
            aria-label="${t('detail.close')}"
          >
            <img src="${closeIconUrl}" alt="" aria-hidden="true">
          </button>
        </div>

        <div class="detail-heading">
          <div>
            <h2 id="pokemon-dialog-title" class="OnePokemonCard-Name">${name}</h2>
            <div class="pokemon-type" aria-label="${t('detail.types')}">
              <span class="type" ${primaryTypeColor}>${primaryType}</span>
              ${checkIfType1Available(secondaryType, secondaryTypeColor)}
            </div>
          </div>
          <span class="identification">${pokemonNumber}</span>
        </div>

        <img
          src="${image}"
          data-image-fallback="${fallbackImage}"
          data-image-final-fallback="${finalFallbackImage}"
          class="OnePokemonCard-Image${imageIsAnimated ? ' is-animated' : ''}"
          alt="${isShiny ? `${t('detail.shiny')} ${name}` : name}"
        >

        <button
          class="pokemon-sound-button"
          type="button"
          data-action="play-cry"
          aria-label="${soundLabel}"
          ${soundAvailable ? '' : 'disabled'}
        >
          <span aria-hidden="true">🔊</span>
          <span>${soundAvailable ? t('detail.playCry') : t('detail.cryUnavailable')}</span>
        </button>
      </section>

      <section class="infoContainer">
        ${generateVarietyPicker(varieties, pokemonId)}
        <div class="detail-tabs" role="tablist" aria-label="${t('detail.information')}">
          ${generateTabButton(1, t('detail.tab.about'), true)}
          ${generateTabButton(2, t('detail.tab.stats'), false, t('detail.tab.statsAccessible'))}
          ${generateTabButton(3, t('detail.tab.matchups'))}
          ${generateTabButton(4, t('detail.tab.evolution'))}
          ${generateTabButton(5, t('detail.tab.cards'), false, t('detail.tab.cardsAccessible'))}
        </div>
        <div
          id="content"
          class="detail-content"
          role="tabpanel"
          aria-live="polite"
          aria-labelledby="pokemon-tab-1"
        ></div>
      </section>
    </article>
  `;
}

function generateVarietyPicker(varieties, currentPokemonId) {
  if (!Array.isArray(varieties) || varieties.length < 2) return '';

  const options = varieties
    .map(
      ({ id, name }) => /* html */ `
        <option value="${id}" ${id === currentPokemonId ? 'selected' : ''}>${name}</option>
      `,
    )
    .join('');

  return /* html */ `
    <label class="variety-picker">
      <span>${t('detail.form')}</span>
      <select data-action="change-variety" aria-label="${t('detail.chooseForm')}">
        ${options}
      </select>
    </label>
  `;
}

function generateTabButton(
  menuPoint,
  label,
  isSelected = false,
  accessibleLabel = label,
) {
  return /* html */ `
    <button
      id="pokemon-tab-${menuPoint}"
      class="detail-tab${isSelected ? ' selectedMenuPoint' : ''}"
      type="button"
      role="tab"
      data-menu-point="${menuPoint}"
      aria-controls="content"
      aria-label="${accessibleLabel}"
      aria-selected="${isSelected}"
      tabindex="${isSelected ? '0' : '-1'}"
    >
      ${label}
    </button>
  `;
}

export { cardHTML };
