import pokemonFallbackUrl from '../../img/pokeball-icon.svg';
import { getPokemonBatch } from '../api/pokemon-api.js';
import { getLanguage, onLanguageChange, t } from '../i18n/index.js';
import { comparisonSelectionStore } from '../state/comparison-selection.js';
import { cachePokemon, getPokemonById } from '../state/pokemon-store.js';
import { comparePokemonStats } from '../utils/comparison.js';
import { formatPokemonName, normalizeBaseStat } from '../utils/formatters.js';
import { preloadPokemonMedia } from '../utils/media.js';
import { getPokemonImage, getPokemonName, getPokemonNumber } from './pokemon-catalog.js';
import { beginRequest, clearRequestError, showRequestError } from './request-feedback.js';
import { acquireScrollLock } from './scroll-lock.js';

let comparisonInitialized = false;
let comparisonRequestVersion = 0;
let comparisonTrigger = null;
let activeComparisonPokemon = null;
let releaseComparisonScrollLock = null;

const COMPARISON_STAT_KEYS = Object.freeze({
  hp: 'stats.hp',
  attack: 'stats.attack',
  defense: 'stats.defense',
  'special-attack': 'stats.specialAttack',
  'special-defense': 'stats.specialDefense',
  speed: 'stats.speed',
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getComparisonDialog() {
  return document.getElementById('comparison-dialog');
}

function updateComparisonSelectionBar(
  { selectedIds } = comparisonSelectionStore.getState(),
) {
  const selectionBar = document.getElementById('comparison-selection-bar');
  const message = document.getElementById('comparison-selection-message');
  const selectionCount = selectedIds.length;
  const selectedPokemon = getPokemonById(selectedIds[0]);
  const selectedPokemonName = selectedPokemon
    ? getPokemonName(selectedPokemon)
    : t('comparison.onePokemon');

  selectionBar.hidden = selectionCount !== 1;
  message.textContent =
    selectionCount === 1 ? t('comparison.selection', { name: selectedPokemonName }) : '';
}

function getComparisonWinnerText(comparison, leftPokemon, rightPokemon) {
  if (comparison.summary.winner === 'left') {
    return t('comparison.leftWins', { name: getPokemonName(leftPokemon) });
  }
  if (comparison.summary.winner === 'right') {
    return t('comparison.rightWins', { name: getPokemonName(rightPokemon) });
  }
  if (comparison.summary.winner === 'tie') return t('comparison.tie');
  return t('comparison.unavailable');
}

function getComparisonStatName(statName) {
  const translationKey = COMPARISON_STAT_KEYS[statName];

  return translationKey ? t(translationKey) : formatPokemonName(statName, getLanguage());
}

function generateComparisonStatRow(stat) {
  const leftWidth = stat.leftValue === null ? 0 : normalizeBaseStat(stat.leftValue);
  const rightWidth = stat.rightValue === null ? 0 : normalizeBaseStat(stat.rightValue);

  return /* html */ `
    <div class="comparison-stat-row">
      <span class="comparison-stat-name">${escapeHtml(getComparisonStatName(stat.name))}</span>
      <div class="comparison-stat-values">
        <div class="comparison-stat-value${stat.outcome === 'left' ? ' is-winner' : ''}">
          <strong>${stat.leftValue ?? '—'}</strong>
          <span class="comparison-stat-track"><span style="width:${leftWidth}%"></span></span>
        </div>
        <div class="comparison-stat-value${stat.outcome === 'right' ? ' is-winner' : ''}">
          <strong>${stat.rightValue ?? '—'}</strong>
          <span class="comparison-stat-track"><span style="width:${rightWidth}%"></span></span>
        </div>
      </div>
    </div>
  `;
}

function renderComparison(leftPokemon, rightPokemon) {
  const comparison = comparePokemonStats(leftPokemon, rightPokemon);
  const winnerText = getComparisonWinnerText(comparison, leftPokemon, rightPokemon);

  document.getElementById('comparison-content').innerHTML = /* html */ `
    <div class="comparison-pokemon">
      <article>
        <img src="${getPokemonImage(leftPokemon)}" data-image-fallback="${pokemonFallbackUrl}" alt="${escapeHtml(getPokemonName(leftPokemon))}">
        <strong>${escapeHtml(getPokemonName(leftPokemon))}</strong>
        <span>${getPokemonNumber(leftPokemon)}</span>
      </article>
      <span class="comparison-versus" aria-hidden="true">VS</span>
      <article>
        <img src="${getPokemonImage(rightPokemon)}" data-image-fallback="${pokemonFallbackUrl}" alt="${escapeHtml(getPokemonName(rightPokemon))}">
        <strong>${escapeHtml(getPokemonName(rightPokemon))}</strong>
        <span>${getPokemonNumber(rightPokemon)}</span>
      </article>
    </div>
    <p class="comparison-result">${escapeHtml(winnerText)}</p>
    <div class="comparison-stats">
      ${comparison.stats.map(generateComparisonStatRow).join('')}
    </div>
  `;
}

function isSameSelection(expectedIds) {
  const { selectedIds } = comparisonSelectionStore.getState();
  return (
    selectedIds.length === expectedIds.length &&
    selectedIds.every((id, index) => id === expectedIds[index])
  );
}

async function openSelectedComparison(triggerElement = comparisonTrigger) {
  const { selectedIds } = comparisonSelectionStore.getState();

  if (selectedIds.length !== 2) return;

  const requestVersion = ++comparisonRequestVersion;
  comparisonTrigger = triggerElement ?? document.activeElement;
  const finishRequest = beginRequest();
  clearRequestError();

  try {
    const pokemon = await getPokemonBatch(selectedIds);
    await preloadPokemonMedia(pokemon);

    if (requestVersion !== comparisonRequestVersion || !isSameSelection(selectedIds)) {
      return;
    }

    cachePokemon(pokemon);
    activeComparisonPokemon = [pokemon[0], pokemon[1]];
    renderComparison(pokemon[0], pokemon[1]);

    const dialog = getComparisonDialog();
    releaseComparisonScrollLock = acquireScrollLock();
    dialog.showModal();
    dialog.querySelector('[data-comparison-action="close"]')?.focus();
  } catch {
    if (requestVersion !== comparisonRequestVersion) return;

    showRequestError({
      messageKey: 'errors.comparison',
      onRetry: () => openSelectedComparison(triggerElement),
    });
  } finally {
    finishRequest();
  }
}

function togglePokemonComparison(pokemonId, triggerElement) {
  const isSelected = comparisonSelectionStore.toggle(pokemonId);
  const { selectedIds } = comparisonSelectionStore.getState();

  if (isSelected && selectedIds.length === 2) {
    void openSelectedComparison(triggerElement);
  }

  return isSelected;
}

function closeComparison() {
  const dialog = getComparisonDialog();
  if (dialog.open) dialog.close();
}

function handleComparisonClosed() {
  comparisonRequestVersion += 1;
  activeComparisonPokemon = null;
  releaseComparisonScrollLock?.();
  releaseComparisonScrollLock = null;
  comparisonSelectionStore.clear();

  if (comparisonTrigger?.isConnected) {
    comparisonTrigger.focus({ preventScroll: true });
  }

  comparisonTrigger = null;
}

function handleComparisonLanguageChange() {
  updateComparisonSelectionBar();

  const comparisonDialog = getComparisonDialog();
  if (!comparisonDialog?.open || activeComparisonPokemon?.length !== 2) return;

  renderComparison(activeComparisonPokemon[0], activeComparisonPokemon[1]);
}

function clearComparisonSelection() {
  comparisonRequestVersion += 1;
  comparisonSelectionStore.clear();
  document.getElementById('open-collection-button')?.focus({ preventScroll: true });
}

function initComparisonUi() {
  if (comparisonInitialized) return;

  const comparisonDialog = getComparisonDialog();

  updateComparisonSelectionBar();
  document
    .getElementById('clear-comparison-button')
    .addEventListener('click', clearComparisonSelection);
  comparisonDialog.addEventListener('click', (event) => {
    if (
      event.target === comparisonDialog ||
      event.target.closest('[data-comparison-action]')
    ) {
      closeComparison();
    }
  });
  comparisonDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeComparison();
  });
  comparisonDialog.addEventListener('close', handleComparisonClosed);
  comparisonSelectionStore.subscribe(updateComparisonSelectionBar);
  onLanguageChange(handleComparisonLanguageChange);
  comparisonInitialized = true;
}

export { initComparisonUi, togglePokemonComparison };
