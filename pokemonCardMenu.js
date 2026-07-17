import { getPokemonImage, getPokemonName } from './script.js';
import evolutionArrowUrl from './img/arrow.svg';
import pokemonFallbackUrl from './img/pokeball-icon.svg';
import {
  getEvolutionChain,
  getPokemonBatch,
  getPokemonSpecies,
  getResourceId,
} from './src/api/pokemon-api.js';
import {
  MAX_BASE_STAT,
  formatHeight,
  formatPokemonName,
  formatWeight,
  getStatColor,
  normalizeBaseStat,
} from './src/utils/formatters.js';
import { collectEvolutionIds, parseEvolutionChain } from './src/utils/evolution.js';

/*Menu-Point About */
async function generateAboutHTML(currentPokemon, isCurrentRequest = () => true) {
  const contentContainer = document.getElementById('content');
  const height = formatHeight(currentPokemon.height);
  const weight = formatWeight(currentPokemon.weight);
  const abilities = getPokemonAbilities(currentPokemon);
  const speciesId = getResourceId(currentPokemon.species.url);
  const species = await getPokemonSpecies(speciesId);
  const eggGroups = getPokemonEggGroups(species);

  if (!isCurrentRequest()) return;

  contentContainer.innerHTML = /*html*/ `
      <dl class="about-list">
        <div><dt>Height</dt><dd>${height}</dd></div>
        <div><dt>Weight</dt><dd>${weight}</dd></div>
        <div><dt>Abilities</dt><dd>${abilities}</dd></div>
        <div><dt>Egg groups</dt><dd>${eggGroups}</dd></div>
      </dl>
    `;
}

function getPokemonAbilities(currentPokemon) {
  const abilities = (currentPokemon.abilities ?? [])
    .map((entry) => entry?.ability?.name)
    .filter(Boolean)
    .map(formatPokemonName);

  return abilities.length > 0 ? abilities.join(', ') : 'Not available';
}

function getPokemonEggGroups(species) {
  const eggGroups = (species.egg_groups ?? [])
    .map((entry) => entry?.name)
    .filter(Boolean)
    .map(formatPokemonName);

  return eggGroups.length > 0 ? eggGroups.join(', ') : 'Not available';
}

/*Menu-Point Base Stats*/
async function generateBaseStatsHTML(currentPokemon, isCurrentRequest = () => true) {
  const contentContainer = document.getElementById('content');
  const statLabels = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
  const stats = statLabels
    .map((label, index) => getBaseStats(currentPokemon, index, label))
    .join('');

  if (!isCurrentRequest()) return;

  contentContainer.innerHTML = /*html*/ `
    <div class="base-stats-list">${stats}</div>
    `;
}

function getBaseStats(currentPokemon, index, label) {
  const stat = Number(currentPokemon.stats?.[index]?.base_stat) || 0;
  const barColor = getStatColor(stat);
  const barWidth = normalizeBaseStat(stat);

  return /*html*/ `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <strong class="stat-value">${stat}</strong>
      <div
        class="progress"
        role="progressbar"
        aria-label="${label}"
        aria-valuemin="0"
        aria-valuemax="${MAX_BASE_STAT}"
        aria-valuenow="${stat}"
      >
        <span class="bar" style="width:${barWidth}%; background-color:${barColor}"></span>
      </div>
    </div>
  `;
}

/* Menu-Point Evolution*/
async function generateEvoltionChainNr(currentPokemon, isCurrentRequest = () => true) {
  const speciesId = getResourceId(currentPokemon.species.url);
  const species = await getPokemonSpecies(speciesId);

  if (!isCurrentRequest()) return;

  const evolutionChainId = getResourceId(species.evolution_chain.url);
  const evolutionChain = await getEvolutionChain(evolutionChainId);
  const stages = parseEvolutionChain(evolutionChain);
  const evolutionPokemon = await getPokemonBatch(collectEvolutionIds(stages));

  if (!isCurrentRequest()) return;

  const pokemonById = new Map(evolutionPokemon.map((pokemon) => [pokemon.id, pokemon]));
  generateEvolutionChainHTML(stages, pokemonById);
}

function generateEvolutionChainHTML(stages, pokemonById) {
  const contentContainer = document.getElementById('content');

  if (stages.length === 0) {
    contentContainer.innerHTML =
      '<p class="empty-state">Evolution data is not available.</p>';
    return;
  }

  const stageMarkup = stages
    .map((stage, index) => {
      const pokemonMarkup = stage
        .map((species) => generateEvolutionPokemonHTML(species, pokemonById))
        .join('');
      const arrow =
        index === 0
          ? ''
          : `<img src="${evolutionArrowUrl}" class="evolutionArrow" alt="" aria-hidden="true">`;

      return /* html */ `
        ${arrow}
        <section class="evolution-stage" aria-label="Evolution stage ${index + 1}">
          <span class="evolution-stage__label">Stage ${index + 1}</span>
          <div class="evolution-stage__pokemon">${pokemonMarkup}</div>
        </section>
      `;
    })
    .join('');

  const noEvolutionNote =
    stages.length === 1 && stages[0].length === 1
      ? '<p class="evolution-note">This Pokémon has no known evolutions.</p>'
      : '';

  contentContainer.innerHTML = /* html */ `
    <div class="evolution-tree">${stageMarkup}${noEvolutionNote}</div>
  `;
}

function generateEvolutionPokemonHTML(species, pokemonById) {
  const pokemon = pokemonById.get(species.id);
  const name = pokemon ? getPokemonName(pokemon) : formatPokemonName(species.name);
  const image = pokemon ? getPokemonImage(pokemon) : pokemonFallbackUrl;

  return /* html */ `
    <article class="evolution-pokemon">
      <img src="${image}" alt="${name}">
      <strong>${name}</strong>
    </article>
  `;
}

/*Menu-Point Moves*/
function generateMovesHTML(currentPokemon) {
  const contentContainer = document.getElementById('content');
  const moves = (currentPokemon.moves ?? [])
    .map((entry) => entry?.move?.name)
    .filter(Boolean)
    .map((move) => `<span class="move-chip">${formatPokemonName(move)}</span>`)
    .join('');

  contentContainer.classList.add('arrangeMoveSection');
  contentContainer.innerHTML =
    moves || '<p class="empty-state">No moves are available.</p>';
}

export {
  generateAboutHTML,
  generateBaseStatsHTML,
  generateEvoltionChainNr,
  generateMovesHTML,
};
