import pokemonFallbackUrl from '../../img/pokeball-icon.svg';
import { renderOneCard } from '../../pokemonBigCard.js';
import { getPokemonImage, getPokemonName, getPokemonNumber } from '../../script.js';
import { getPokemonBatch } from '../api/pokemon-api.js';
import { onLanguageChange, t } from '../i18n/index.js';
import { collectionStore } from '../state/collections.js';
import { comparisonSelectionStore } from '../state/comparison-selection.js';
import { cachePokemon } from '../state/pokemon-store.js';
import { preloadPokemonMedia } from '../utils/media.js';
import { togglePokemonComparison } from './comparison.js';
import { beginRequest, clearRequestError, showRequestError } from './request-feedback.js';
import { acquireScrollLock } from './scroll-lock.js';

const EMPTY_MESSAGE_KEYS = {
  favorites: 'collection.emptyFavorites',
  recent: 'collection.emptyRecent',
};
const COLLECTION_DESCRIPTION_KEYS = {
  favorites: 'collection.favoriteDescription',
  recent: 'collection.recentDescription',
};

let activeCollectionTab = 'favorites';
let collectionInitialized = false;
let collectionRequestVersion = 0;
let collectionTrigger = null;
let pendingCollectionFocusId;
let releaseCollectionScrollLock = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getCollectionDialog() {
  return document.getElementById('collection-dialog');
}

function updateCollectionCounts(state = collectionStore.getState()) {
  const favoriteCount = state.favorites.length;
  const openCollectionButton = document.getElementById('open-collection-button');

  document.getElementById('collection-count').textContent = favoriteCount;
  openCollectionButton.setAttribute(
    'aria-label',
    t('collection.openLabel', { count: favoriteCount }),
  );
  document.querySelector('[data-collection-count="favorites"]').textContent =
    favoriteCount;
  document.querySelector('[data-collection-count="recent"]').textContent =
    state.recent.length;
}

function updateCollectionDescription() {
  const description = document.getElementById('collection-section-description');
  const translationKey = COLLECTION_DESCRIPTION_KEYS[activeCollectionTab];

  if (!translationKey) return;

  description.dataset.i18n = translationKey;
  description.textContent = t(translationKey);
}

function revealActiveCollectionTab() {
  const activeTab = document.querySelector('.collection-tab[aria-selected="true"]');

  globalThis.requestAnimationFrame(() => {
    activeTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function changeCollectionTab(tabName) {
  activeCollectionTab = tabName;

  for (const tab of document.querySelectorAll('[data-collection-tab]')) {
    const isActive = tab.dataset.collectionTab === tabName;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  }

  const activeTab = document.querySelector(`[data-collection-tab="${tabName}"]`);
  document
    .getElementById('collection-content')
    .setAttribute('aria-labelledby', activeTab?.id ?? '');
  updateCollectionDescription();
  revealActiveCollectionTab();
}

function getActiveCollectionIds(state = collectionStore.getState()) {
  return state[activeCollectionTab] ?? [];
}

function generateComparisonButton(pokemon) {
  const isSelected = comparisonSelectionStore.isSelected(pokemon.id);
  const name = getPokemonName(pokemon);

  return /* html */ `
    <button
      class="collection-compare-button"
      type="button"
      data-collection-action="compare"
      data-pokemon-id="${pokemon.id}"
      aria-label="${escapeHtml(
        t(isSelected ? 'comparison.remove' : 'comparison.select', { name }),
      )}"
      aria-pressed="${isSelected}"
    >
      <span aria-hidden="true">${isSelected ? '✓' : '⇄'}</span>
      <span>${t(isSelected ? 'comparison.selected' : 'comparison.compare')}</span>
    </button>
  `;
}

function generateCollectionCard(pokemon, section) {
  const name = getPokemonName(pokemon);
  const removeControl =
    section === 'recent'
      ? ''
      : /* html */ `
          <button
            class="collection-remove-button"
            type="button"
            data-collection-action="remove"
            data-pokemon-id="${pokemon.id}"
            aria-label="${escapeHtml(t('collection.removeFavorite', { name }))}"
          >
            ${t('common.remove')}
          </button>
        `;

  return /* html */ `
    <article class="collection-card" data-collection-pokemon-id="${pokemon.id}">
      <button
        class="collection-pokemon-button"
        type="button"
        data-collection-action="open-pokemon"
        data-pokemon-id="${pokemon.id}"
        aria-label="${escapeHtml(t('collection.openPokemon', { name }))}"
      >
        <img src="${getPokemonImage(pokemon)}" data-image-fallback="${pokemonFallbackUrl}" alt="${escapeHtml(name)}">
        <span>
          <strong>${escapeHtml(name)}</strong>
          <small>${getPokemonNumber(pokemon)}</small>
        </span>
      </button>
      <div class="collection-card-actions">
        ${generateComparisonButton(pokemon)}
        ${removeControl}
      </div>
    </article>
  `;
}

function updateCollectionComparisonButtons() {
  for (const button of document.querySelectorAll('[data-collection-action="compare"]')) {
    const pokemonId = Number(button.dataset.pokemonId);
    const isSelected = comparisonSelectionStore.isSelected(pokemonId);
    const pokemonName =
      button
        .closest('.collection-card')
        ?.querySelector('.collection-pokemon-button strong')?.textContent ??
      t('common.pokemon');

    button.setAttribute('aria-pressed', String(isSelected));
    button.setAttribute(
      'aria-label',
      t(isSelected ? 'comparison.remove' : 'comparison.select', {
        name: pokemonName,
      }),
    );
    button.querySelector('span:first-child').textContent = isSelected ? '✓' : '⇄';
    button.querySelector('span:last-child').textContent = t(
      isSelected ? 'comparison.selected' : 'comparison.compare',
    );
  }
}

function updateCollectionCardTranslations() {
  for (const card of document.querySelectorAll('#collection-content .collection-card')) {
    const pokemonName =
      card.querySelector('.collection-pokemon-button strong')?.textContent ??
      t('common.pokemon');
    const pokemonButton = card.querySelector('.collection-pokemon-button');
    const removeButton = card.querySelector('[data-collection-action="remove"]');

    pokemonButton?.setAttribute(
      'aria-label',
      t('collection.openPokemon', { name: pokemonName }),
    );

    if (removeButton) {
      removeButton.textContent = t('common.remove');
      removeButton.setAttribute(
        'aria-label',
        t('collection.removeFavorite', { name: pokemonName }),
      );
    }
  }

  updateCollectionComparisonButtons();
}

function updateCollectionLanguage() {
  updateCollectionCounts();
  updateCollectionDescription();
  updateCollectionCardTranslations();

  const collectionMessage = document.querySelector(
    '#collection-content [data-collection-message]',
  );
  const messageKey = collectionMessage?.dataset.collectionMessage;

  if (!messageKey) return;

  collectionMessage.textContent = t(messageKey);

  if (messageKey === 'collection.failed' && getCollectionDialog().open) {
    showRequestError({
      messageKey: 'errors.collection',
      onRetry: renderCollectionTab,
    });
  }
}

function restorePendingCollectionFocus() {
  if (pendingCollectionFocusId === undefined) return;

  const pokemonId = pendingCollectionFocusId;
  pendingCollectionFocusId = undefined;
  const focusTarget =
    (pokemonId === null
      ? null
      : document.querySelector(
          `[data-collection-pokemon-id="${pokemonId}"] .collection-pokemon-button`,
        )) ?? document.querySelector(`[data-collection-tab="${activeCollectionTab}"]`);

  focusTarget?.focus({ preventScroll: true });
}

async function renderCollectionTab() {
  const requestVersion = ++collectionRequestVersion;
  const state = collectionStore.getState();
  const ids = getActiveCollectionIds(state);
  const content = document.getElementById('collection-content');
  const finishRequest = ids.length > 0 ? beginRequest() : () => {};

  clearRequestError();

  if (ids.length === 0) {
    const messageKey = EMPTY_MESSAGE_KEYS[activeCollectionTab];
    content.innerHTML = `<p class="collection-empty" data-collection-message="${messageKey}">${t(messageKey)}</p>`;
    restorePendingCollectionFocus();
    return [];
  }

  try {
    const pokemon = await getPokemonBatch(ids);
    await preloadPokemonMedia(pokemon);

    if (requestVersion !== collectionRequestVersion) return [];

    cachePokemon(pokemon);
    content.innerHTML = pokemon
      .map((entry) => generateCollectionCard(entry, activeCollectionTab))
      .join('');
    restorePendingCollectionFocus();
    return pokemon;
  } catch {
    if (requestVersion === collectionRequestVersion) {
      content.innerHTML = `<p class="collection-empty" data-collection-message="collection.failed">${t('collection.failed')}</p>`;
      showRequestError({
        messageKey: 'errors.collection',
        onRetry: renderCollectionTab,
      });
      restorePendingCollectionFocus();
    }
    return [];
  } finally {
    finishRequest();
  }
}

async function openCollection(triggerElement) {
  collectionTrigger = triggerElement ?? document.activeElement;
  changeCollectionTab(activeCollectionTab);
  await renderCollectionTab();

  const dialog = getCollectionDialog();
  if (dialog.open) return;

  releaseCollectionScrollLock = acquireScrollLock();
  dialog.showModal();
  revealActiveCollectionTab();
  dialog.querySelector('[data-collection-action="close"]')?.focus();
}

function closeCollection({ restoreFocus = true } = {}) {
  const dialog = getCollectionDialog();

  if (!dialog.open) return;
  dialog.close(restoreFocus ? 'close' : 'continue');
}

function handleCollectionClosed() {
  releaseCollectionScrollLock?.();
  releaseCollectionScrollLock = null;

  if (getCollectionDialog().returnValue === 'close' && collectionTrigger?.isConnected) {
    collectionTrigger.focus({ preventScroll: true });
  }

  collectionTrigger = null;
}

function removeFavorite(pokemonId, triggerElement) {
  const cards = Array.from(
    document.querySelectorAll('#collection-content .collection-card'),
  );
  const currentCard = triggerElement?.closest('.collection-card');
  const currentIndex = cards.indexOf(currentCard);
  const nextCard = cards[currentIndex + 1] ?? cards[currentIndex - 1] ?? null;
  pendingCollectionFocusId = nextCard
    ? Number(nextCard.dataset.collectionPokemonId)
    : null;

  collectionStore.toggleFavorite(pokemonId);
}

async function openPokemonFromCollection(pokemonId) {
  closeCollection({ restoreFocus: false });
  await renderOneCard(pokemonId, document.getElementById('open-collection-button'));
}

function handleCollectionClick(event) {
  const tab = event.target.closest('[data-collection-tab]');
  const actionButton = event.target.closest('[data-collection-action]');

  if (tab) {
    changeCollectionTab(tab.dataset.collectionTab);
    void renderCollectionTab();
    return;
  }

  if (!actionButton) return;

  const action = actionButton.dataset.collectionAction;
  const pokemonId = Number(actionButton.dataset.pokemonId);

  if (action === 'close') closeCollection();
  if (action === 'remove') removeFavorite(pokemonId, actionButton);
  if (action === 'open-pokemon') void openPokemonFromCollection(pokemonId);
  if (action === 'compare') togglePokemonComparison(pokemonId, actionButton);
}

function handleCollectionKeydown(event) {
  const currentTab = event.target.closest('[data-collection-tab]');
  if (!currentTab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return;
  }

  const tabs = Array.from(document.querySelectorAll('[data-collection-tab]'));
  const currentIndex = tabs.indexOf(currentTab);
  let nextIndex = currentIndex;

  if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  }
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = tabs.length - 1;

  event.preventDefault();
  tabs[nextIndex].focus();
  changeCollectionTab(tabs[nextIndex].dataset.collectionTab);
  void renderCollectionTab();
}

function initCollectionUi() {
  if (collectionInitialized) return;

  const collectionDialog = getCollectionDialog();

  updateCollectionCounts();
  document.getElementById('open-collection-button').addEventListener('click', (event) => {
    void openCollection(event.currentTarget);
  });
  collectionDialog.addEventListener('click', (event) => {
    if (event.target === collectionDialog) closeCollection();
    else handleCollectionClick(event);
  });
  collectionDialog.addEventListener('keydown', handleCollectionKeydown);
  collectionDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCollection();
  });
  collectionDialog.addEventListener('close', handleCollectionClosed);
  globalThis.addEventListener('resize', () => {
    if (collectionDialog.open) revealActiveCollectionTab();
  });
  collectionStore.subscribe((state) => {
    updateCollectionCounts(state);
    if (collectionDialog.open) void renderCollectionTab();
  });
  comparisonSelectionStore.subscribe(updateCollectionComparisonButtons);
  onLanguageChange(updateCollectionLanguage);
  collectionInitialized = true;
}

export { initCollectionUi };
