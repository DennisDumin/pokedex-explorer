import { checkIfType1Available } from './script.js';
import arrowLeftUrl from './img/arrow-left.svg';
import arrowRightUrl from './img/arrow-right.svg';
import closeIconUrl from './img/cross.svg';

function cardHTML({
  backgroundColor,
  image,
  imageIsAnimated,
  index,
  name,
  nextIndex,
  pokemonNumber,
  primaryType,
  primaryTypeColor,
  previousIndex,
  secondaryType,
  secondaryTypeColor,
  soundAvailable,
}) {
  const soundLabel = soundAvailable
    ? `Play ${name}'s cry`
    : `${name}'s cry is not available`;

  return /* html */ `
    <article class="OnePokemonCard" ${backgroundColor} data-pokemon-index="${index}">
      <section class="mainInfo">
        <div class="detail-toolbar">
          <div class="detail-navigation" aria-label="Browse loaded Pokémon">
            <button
              class="detail-icon-button"
              type="button"
              data-action="previous"
              data-index="${previousIndex}"
              aria-label="Show previous Pokémon"
            >
              <img src="${arrowLeftUrl}" alt="" aria-hidden="true">
            </button>
            <button
              class="detail-icon-button"
              type="button"
              data-action="next"
              data-index="${nextIndex}"
              aria-label="Show next Pokémon"
            >
              <img src="${arrowRightUrl}" alt="" aria-hidden="true">
            </button>
          </div>
          <button
            class="detail-icon-button detail-close-button"
            type="button"
            data-action="close"
            aria-label="Close Pokémon details"
          >
            <img src="${closeIconUrl}" alt="" aria-hidden="true">
          </button>
        </div>

        <div class="detail-heading">
          <div>
            <h2 id="pokemon-dialog-title" class="OnePokemonCard-Name">${name}</h2>
            <div class="pokemon-type" aria-label="Types">
              <span class="type" ${primaryTypeColor}>${primaryType}</span>
              ${checkIfType1Available(secondaryType, secondaryTypeColor)}
            </div>
          </div>
          <span class="identification">${pokemonNumber}</span>
        </div>

        <img
          src="${image}"
          class="OnePokemonCard-Image${imageIsAnimated ? ' is-animated' : ''}"
          alt="${name}"
        >

        <button
          class="pokemon-sound-button"
          type="button"
          data-action="play-cry"
          aria-label="${soundLabel}"
          ${soundAvailable ? '' : 'disabled'}
        >
          <span aria-hidden="true">🔊</span>
          <span>${soundAvailable ? 'Play cry' : 'Cry unavailable'}</span>
        </button>
      </section>

      <section class="infoContainer">
        <div class="detail-tabs" role="tablist" aria-label="Pokémon information">
          ${generateTabButton(1, 'About', true)}
          ${generateTabButton(2, 'Base stats')}
          ${generateTabButton(3, 'Evolution')}
          ${generateTabButton(4, 'Moves')}
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

function generateTabButton(menuPoint, label, isSelected = false) {
  return /* html */ `
    <button
      id="pokemon-tab-${menuPoint}"
      class="detail-tab${isSelected ? ' selectedMenuPoint' : ''}"
      type="button"
      role="tab"
      data-menu-point="${menuPoint}"
      aria-controls="content"
      aria-selected="${isSelected}"
      tabindex="${isSelected ? '0' : '-1'}"
    >
      ${label}
    </button>
  `;
}

export { cardHTML };
