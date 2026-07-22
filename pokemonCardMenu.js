import evolutionArrowUrl from './img/arrow.svg';
import pokemonFallbackUrl from './img/pokeball-icon.svg';
import { getPokemonImage, getPokemonName, getTypeColor } from './script.js';
import { getLanguage, t, translateType } from './src/i18n/index.js';
import { formatEvolutionConditions } from './src/utils/evolution.js';
import {
  MAX_BASE_STAT,
  formatHeight,
  formatPokemonName,
  formatWeight,
  getStatColor,
  normalizeBaseStat,
} from './src/utils/formatters.js';
import { getSpeciesSummary } from './src/utils/species.js';
import { calculateTypeMatchups } from './src/utils/type-matchups.js';

const GENERATION_KEYS = Object.freeze({
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getTranslatedValue(key, fallback) {
  const translatedValue = t(key);
  return translatedValue === key ? fallback : translatedValue;
}

function localizeNotAvailable(value) {
  return value === 'Not available' ? t('common.notAvailable') : value;
}

function getResourceText(entries, property, language) {
  if (!Array.isArray(entries)) return '';

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const text = entry?.language?.name === language ? entry?.[property] : '';

    if (typeof text === 'string' && text.trim()) return text;
  }

  return '';
}

function getLanguageFallbackOrder() {
  const language = getLanguage();
  return language === 'en' ? ['en'] : [language, 'en'];
}

function getLocalizedResourceText(entries, property) {
  for (const language of getLanguageFallbackOrder()) {
    const text = getResourceText(entries, property, language);
    if (text) return text;
  }

  return '';
}

function getLocalizedAbilityName(ability) {
  const localizedName = getLocalizedResourceText(ability?.names, 'name');
  if (localizedName) return localizedName.trim();

  return ability?.name ? formatPokemonName(ability.name) : t('common.notAvailable');
}

function getPokemonEggGroups(species) {
  const eggGroups = (species?.egg_groups ?? [])
    .map((entry) => entry?.name)
    .filter(Boolean)
    .map((name) => getTranslatedValue(`eggGroup.${name}`, formatPokemonName(name)));

  return eggGroups.length > 0 ? eggGroups.join(', ') : t('common.notAvailable');
}

function getAbilityDescription(ability) {
  let text = '';

  for (const language of getLanguageFallbackOrder()) {
    text =
      getResourceText(ability?.effect_entries, 'short_effect', language) ||
      getResourceText(ability?.effect_entries, 'effect', language) ||
      getResourceText(ability?.flavor_text_entries, 'flavor_text', language);

    if (text) break;
  }

  text ||= t('about.noDescription');

  return String(text)
    .replace(/[\n\f\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateAbilitiesMarkup(abilities) {
  if (!Array.isArray(abilities) || abilities.length === 0) {
    return `<p class="empty-state">${escapeHtml(t('about.noAbilities'))}</p>`;
  }

  return abilities
    .map(({ ability, isHidden }) => {
      const name = getLocalizedAbilityName(ability);
      const description = getAbilityDescription(ability);

      return /* html */ `
        <details class="ability-card">
          <summary>
            <span>${escapeHtml(name)}</span>
            ${isHidden ? `<span class="ability-badge">${escapeHtml(t('common.hidden'))}</span>` : ''}
          </summary>
          <p>${escapeHtml(description)}</p>
        </details>
      `;
    })
    .join('');
}

function getLocalizedGeneration(species, fallback) {
  const generationName = species?.generation?.name;
  const romanNumeral =
    typeof generationName === 'string'
      ? generationName.match(/^generation-([ivx]+)$/i)?.[1]?.toLowerCase()
      : null;
  const generationKey = GENERATION_KEYS[romanNumeral];

  return generationKey
    ? getTranslatedValue(`generation.${generationKey}`, fallback)
    : fallback;
}

function getLocalizedNamedResource(resource, keyPrefix, fallback) {
  const resourceName = resource?.name;

  return typeof resourceName === 'string' && resourceName.trim()
    ? getTranslatedValue(`${keyPrefix}.${resourceName.trim().toLowerCase()}`, fallback)
    : fallback;
}

function generateAboutHTML(currentPokemon, species, abilities = []) {
  const contentContainer = document.getElementById('content');
  const language = getLanguage();
  const summary = getSpeciesSummary(species, language);
  const generation = getLocalizedGeneration(species, summary.generation);
  const habitat = getLocalizedNamedResource(species?.habitat, 'habitat', summary.habitat);
  const growthRate = getLocalizedNamedResource(
    species?.growth_rate,
    'growth',
    summary.growthRate,
  );

  contentContainer.innerHTML = /* html */ `
    <article class="species-summary">
      <span class="species-summary__genus">${escapeHtml(localizeNotAvailable(summary.genus))}</span>
      <p>${escapeHtml(localizeNotAvailable(summary.flavorText))}</p>
    </article>

    <dl class="about-list">
      <div><dt>${escapeHtml(t('about.height'))}</dt><dd>${escapeHtml(localizeNotAvailable(formatHeight(currentPokemon.height, language)))}</dd></div>
      <div><dt>${escapeHtml(t('about.weight'))}</dt><dd>${escapeHtml(localizeNotAvailable(formatWeight(currentPokemon.weight, language)))}</dd></div>
      <div><dt>${escapeHtml(t('about.generation'))}</dt><dd>${escapeHtml(localizeNotAvailable(generation))}</dd></div>
      <div><dt>${escapeHtml(t('about.habitat'))}</dt><dd>${escapeHtml(localizeNotAvailable(habitat))}</dd></div>
      <div><dt>${escapeHtml(t('about.growthRate'))}</dt><dd>${escapeHtml(localizeNotAvailable(growthRate))}</dd></div>
      <div><dt>${escapeHtml(t('about.captureRate'))}</dt><dd>${escapeHtml(localizeNotAvailable(summary.captureRate))}</dd></div>
      <div><dt>${escapeHtml(t('about.eggGroups'))}</dt><dd>${escapeHtml(getPokemonEggGroups(species))}</dd></div>
    </dl>

    <section class="ability-section" aria-labelledby="ability-heading">
      <h3 id="ability-heading">${escapeHtml(t('about.abilities'))}</h3>
      <div class="ability-list">${generateAbilitiesMarkup(abilities)}</div>
    </section>
  `;
}

function generateBaseStatsHTML(currentPokemon) {
  const contentContainer = document.getElementById('content');
  const statLabels = [
    t('stats.hp'),
    t('stats.attack'),
    t('stats.defense'),
    t('stats.specialAttack'),
    t('stats.specialDefense'),
    t('stats.speed'),
  ];
  const total = (currentPokemon.stats ?? []).reduce(
    (sum, entry) => sum + (Number(entry?.base_stat) || 0),
    0,
  );
  const stats = statLabels
    .map((label, index) => getBaseStats(currentPokemon, index, label))
    .join('');

  contentContainer.innerHTML = /* html */ `
    <div class="base-stats-summary">
      <span>
        <strong>${escapeHtml(t('stats.total'))}</strong>
        <small>${escapeHtml(t('stats.totalDescription'))}</small>
      </span>
      <strong class="base-stats-total">${total}</strong>
    </div>
    <div class="base-stats-list">${stats}</div>
  `;
}

function getBaseStats(currentPokemon, index, label) {
  const stat = Number(currentPokemon.stats?.[index]?.base_stat) || 0;
  const barColor = getStatColor(stat);
  const barWidth = normalizeBaseStat(stat);

  return /* html */ `
    <div class="stat-row">
      <span class="stat-label">${escapeHtml(label)}</span>
      <strong class="stat-value">${stat}</strong>
      <div
        class="progress"
        role="progressbar"
        aria-label="${escapeHtml(label)}"
        aria-valuemin="0"
        aria-valuemax="${MAX_BASE_STAT}"
        aria-valuenow="${stat}"
      >
        <span class="bar" style="width:${barWidth}%; background-color:${barColor}"></span>
      </div>
    </div>
  `;
}

const MATCHUP_GROUPS = [
  { key: 'matchups.veryWeak', multiplier: 4 },
  { key: 'matchups.weak', multiplier: 2 },
  { key: 'matchups.resists', multiplier: 0.5 },
  { key: 'matchups.stronglyResists', multiplier: 0.25 },
  { key: 'matchups.immune', multiplier: 0 },
];

function formatMultiplier(multiplier) {
  if (multiplier === 0.25) return '¼×';
  if (multiplier === 0.5) return '½×';
  return `${multiplier}×`;
}

function generateMatchupChip(type, multiplier) {
  return /* html */ `
    <span class="matchup-chip" ${getTypeColor(type)}>
      <span>${escapeHtml(translateType(type))}</span>
      <strong>${formatMultiplier(multiplier)}</strong>
    </span>
  `;
}

function generateTypeMatchupsHTML(typeResources) {
  const contentContainer = document.getElementById('content');
  const matchups = calculateTypeMatchups(typeResources);
  const groups = MATCHUP_GROUPS.map(({ key, multiplier }) => {
    const chips = Object.entries(matchups)
      .filter(([, value]) => value === multiplier)
      .map(([type]) => generateMatchupChip(type, multiplier))
      .join('');

    if (!chips) return '';

    return /* html */ `
      <section class="matchup-group">
        <h3>${escapeHtml(t(key))}</h3>
        <div class="matchup-chips">${chips}</div>
      </section>
    `;
  }).join('');

  contentContainer.innerHTML = /* html */ `
    <div class="matchups-intro">
      <strong>${escapeHtml(t('matchups.title'))}</strong>
      <p>${escapeHtml(t('matchups.description'))}</p>
    </div>
    <div class="matchup-list">${groups}</div>
  `;
}

function generateEvolutionHTML({ pokemonById, stages }) {
  const contentContainer = document.getElementById('content');

  if (stages.length === 0) {
    contentContainer.innerHTML = `<p class="empty-state">${escapeHtml(t('evolution.unavailable'))}</p>`;
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
        <section class="evolution-stage" aria-label="${escapeHtml(t('evolution.stage', { number: index + 1 }))}">
          <span class="evolution-stage__label">${escapeHtml(t('evolution.stage', { number: index + 1 }))}</span>
          <div class="evolution-stage__pokemon">${pokemonMarkup}</div>
        </section>
      `;
    })
    .join('');

  const noEvolutionNote =
    stages.length === 1 && stages[0].length === 1
      ? `<p class="evolution-note">${escapeHtml(t('evolution.none'))}</p>`
      : '';

  contentContainer.innerHTML = /* html */ `
    <div class="evolution-tree">${stageMarkup}${noEvolutionNote}</div>
  `;
}

function generateEvolutionPokemonHTML(species, pokemonById) {
  const pokemon = pokemonById.get(species.id);
  const parentPokemon = pokemonById.get(species.parentId);
  const name = pokemon ? getPokemonName(pokemon) : formatPokemonName(species.name);
  const image = pokemon ? getPokemonImage(pokemon) : pokemonFallbackUrl;
  const parentName = parentPokemon ? getPokemonName(parentPokemon) : '';
  const conditions = species.parentId
    ? formatEvolutionConditions(species.evolutionDetails, getLanguage())
    : '';

  return /* html */ `
    <article class="evolution-pokemon">
      <img src="${image}" data-image-fallback="${pokemonFallbackUrl}" alt="${escapeHtml(name)}">
      <strong>${escapeHtml(name)}</strong>
      ${species.isBaby ? `<span class="evolution-badge">${escapeHtml(t('evolution.baby'))}</span>` : ''}
      ${parentName ? `<span class="evolution-parent">${escapeHtml(t('evolution.from', { name: parentName }))}</span>` : ''}
      ${conditions ? `<span class="evolution-condition">${escapeHtml(conditions)}</span>` : ''}
    </article>
  `;
}

function generateTradingCardsLoadingHTML() {
  const contentContainer = document.getElementById('content');

  contentContainer.innerHTML = /* html */ `
    <div class="tcg-loading" role="status" aria-label="${escapeHtml(t('tcg.loadingLabel'))}">
      <p>${escapeHtml(t('tcg.loading'))}</p>
      <div class="tcg-skeleton-grid" aria-hidden="true">
        ${'<span class="tcg-skeleton"></span>'.repeat(4)}
      </div>
    </div>
  `;
}

function generateTradingCardMarkup(card) {
  const image = card.images.small ?? card.images.large ?? pokemonFallbackUrl;
  const largeImage = card.images.large;
  const setName = card.set?.name ?? t('tcg.unknownSet');
  const metadata = [card.rarity, card.number ? `#${card.number}` : null]
    .filter(Boolean)
    .join(' · ');
  const imageMarkup = /* html */ `
    <img
      src="${escapeHtml(image)}"
      data-image-fallback="${pokemonFallbackUrl}"
      alt="${escapeHtml(`${card.name} — ${setName}`)}"
      width="245"
      height="342"
    >
  `;

  return /* html */ `
    <article class="tcg-card">
      ${
        largeImage
          ? `<a href="${escapeHtml(largeImage)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(t('tcg.openLarge', { name: card.name }))}">${imageMarkup}</a>`
          : imageMarkup
      }
      <div class="tcg-card__caption">
        <strong>${escapeHtml(card.name)}</strong>
        <span>${escapeHtml(setName)}</span>
        ${metadata ? `<small>${escapeHtml(metadata)}</small>` : ''}
      </div>
    </article>
  `;
}

function generateTradingCardsHTML({ cards, totalCount }) {
  const contentContainer = document.getElementById('content');

  if (!Array.isArray(cards) || cards.length === 0) {
    contentContainer.innerHTML = /* html */ `
      <div class="tcg-empty">
        <p>${escapeHtml(t('tcg.none'))}</p>
        <a href="https://pokemontcg.io" target="_blank" rel="noreferrer">
          ${escapeHtml(t('tcg.provider'))}
        </a>
      </div>
    `;
    return;
  }

  const resultSummary =
    totalCount > cards.length
      ? t('tcg.showing', { shown: cards.length, total: totalCount })
      : t(cards.length === 1 ? 'tcg.foundOne' : 'tcg.foundMany', {
          count: cards.length,
        });

  contentContainer.innerHTML = /* html */ `
    <section class="tcg-results" aria-labelledby="tcg-results-heading">
      <div class="tcg-intro">
        <div>
          <strong id="tcg-results-heading">${escapeHtml(t('tcg.title'))}</strong>
          <p>${escapeHtml(resultSummary)}</p>
        </div>
        <a href="https://pokemontcg.io" target="_blank" rel="noreferrer">
          Pokémon TCG API
        </a>
      </div>
      <div class="tcg-card-grid">${cards.map(generateTradingCardMarkup).join('')}</div>
    </section>
  `;
}

function generateTradingCardsErrorHTML() {
  const contentContainer = document.getElementById('content');

  contentContainer.innerHTML = /* html */ `
    <div class="tcg-error" role="alert">
      <strong>${escapeHtml(t('tcg.unavailable'))}</strong>
      <p>${escapeHtml(t('tcg.detailsWork'))}</p>
      <button type="button" data-action="retry-tcg">${escapeHtml(t('common.retry'))}</button>
    </div>
  `;
}

export {
  generateAboutHTML,
  generateBaseStatsHTML,
  generateEvolutionHTML,
  generateTradingCardsErrorHTML,
  generateTradingCardsHTML,
  generateTradingCardsLoadingHTML,
  generateTypeMatchupsHTML,
};
