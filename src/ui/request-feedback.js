import { acquireScrollLock } from './scroll-lock.js';

const DEFAULT_ERROR_MESSAGE =
  "We couldn't load the Pokémon data. Please check your connection and try again.";

const overlay = document.getElementById('overlay');
const loadingDots = document.getElementById('loading-dots');
const loadMoreControls = [
  document.getElementById('load-more-button'),
  document.getElementById('amountSelect'),
].filter(Boolean);
const errorPanel = document.getElementById('request-error');
const errorMessage = document.getElementById('request-error-message');
const retryButton = document.getElementById('request-retry-button');

let activeRequestCount = 0;
let loadMoreLockCount = 0;
let loadingIntervalId = null;
let previousLoadMoreDisabledStates = [];
let retryHandler = null;
let retryMessage = DEFAULT_ERROR_MESSAGE;
let releaseLoaderScrollLock = null;

function startLoadingAnimation() {
  if (loadingIntervalId !== null) return;

  let dotCount = 1;
  loadingDots.textContent = 'Loading.';
  loadingIntervalId = window.setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    loadingDots.textContent = `Loading${'.'.repeat(dotCount)}`;
  }, 400);
}

function stopLoadingAnimation() {
  if (loadingIntervalId === null) return;

  window.clearInterval(loadingIntervalId);
  loadingIntervalId = null;
  loadingDots.textContent = 'Loading...';
}

function showLoader() {
  releaseLoaderScrollLock = acquireScrollLock();
  overlay.classList.add('is-visible');
  overlay.setAttribute('aria-hidden', 'false');
  startLoadingAnimation();
}

function hideLoader() {
  stopLoadingAnimation();
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
  releaseLoaderScrollLock?.();
  releaseLoaderScrollLock = null;
}

function lockLoadMoreButton() {
  if (loadMoreLockCount === 0) {
    previousLoadMoreDisabledStates = loadMoreControls.map(
      (control) => control.disabled,
    );
  }

  loadMoreLockCount += 1;
  loadMoreControls.forEach((control) => {
    control.disabled = true;
  });
}

function unlockLoadMoreButton() {
  loadMoreLockCount = Math.max(0, loadMoreLockCount - 1);

  if (loadMoreLockCount === 0) {
    loadMoreControls.forEach((control, index) => {
      control.disabled = previousLoadMoreDisabledStates[index];
    });
  }
}

function beginRequest({ disableLoadMore = false } = {}) {
  if (activeRequestCount === 0) showLoader();
  activeRequestCount += 1;

  if (disableLoadMore) lockLoadMoreButton();

  let isFinished = false;

  return function finishRequest() {
    if (isFinished) return;
    isFinished = true;

    if (disableLoadMore) unlockLoadMoreButton();

    activeRequestCount = Math.max(0, activeRequestCount - 1);
    if (activeRequestCount === 0) hideLoader();
  };
}

function clearRequestError() {
  retryHandler = null;
  retryButton.disabled = false;
  retryButton.hidden = true;
  errorPanel.hidden = true;
}

function showRequestError({
  message = DEFAULT_ERROR_MESSAGE,
  onRetry = null,
} = {}) {
  retryHandler = typeof onRetry === 'function' ? onRetry : null;
  retryMessage = message;
  errorMessage.textContent = message;
  retryButton.disabled = false;
  retryButton.hidden = retryHandler === null;
  errorPanel.hidden = false;
}

retryButton.addEventListener('click', async () => {
  const currentRetryHandler = retryHandler;
  const currentRetryMessage = retryMessage;
  if (!currentRetryHandler || retryButton.disabled) return;

  clearRequestError();

  try {
    await currentRetryHandler();
  } catch {
    showRequestError({
      message: currentRetryMessage,
      onRetry: currentRetryHandler,
    });
  }
});

export { beginRequest, clearRequestError, showRequestError };
