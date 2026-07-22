import { acquireScrollLock } from './scroll-lock.js';
import { onLanguageChange, t } from '../i18n/index.js';

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
let retryMessage = '';
let retryMessageKey = 'errors.default';
let retryMessageParameters = {};
let releaseLoaderScrollLock = null;
let visibleLoadingDotCount = 3;

function renderLoadingText(dotCount = visibleLoadingDotCount) {
  visibleLoadingDotCount = dotCount;
  loadingDots.textContent = `${t('common.loading')}${'.'.repeat(dotCount)}`;
}

function startLoadingAnimation() {
  if (loadingIntervalId !== null) return;

  let dotCount = 1;
  renderLoadingText(dotCount);
  loadingIntervalId = window.setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    renderLoadingText(dotCount);
  }, 400);
}

function stopLoadingAnimation() {
  if (loadingIntervalId === null) return;

  window.clearInterval(loadingIntervalId);
  loadingIntervalId = null;
  renderLoadingText(3);
}

function showLoader() {
  releaseLoaderScrollLock = acquireScrollLock();
  if (!overlay.open) overlay.showModal();
  startLoadingAnimation();
}

function hideLoader() {
  stopLoadingAnimation();
  if (overlay.open) overlay.close();
  releaseLoaderScrollLock?.();
  releaseLoaderScrollLock = null;
}

function lockLoadMoreButton() {
  if (loadMoreLockCount === 0) {
    previousLoadMoreDisabledStates = loadMoreControls.map((control) => control.disabled);
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
  message,
  messageKey,
  messageParameters = {},
  onRetry = null,
} = {}) {
  const resolvedMessageKey =
    messageKey ?? (message === undefined ? 'errors.default' : null);
  const resolvedMessage = resolvedMessageKey
    ? t(resolvedMessageKey, messageParameters)
    : message;

  retryHandler = typeof onRetry === 'function' ? onRetry : null;
  retryMessageKey = resolvedMessageKey;
  retryMessageParameters = messageParameters;
  retryMessage = resolvedMessage;
  errorMessage.textContent = resolvedMessage;
  retryButton.disabled = false;
  retryButton.hidden = retryHandler === null;
  errorPanel.hidden = false;
}

overlay.addEventListener('cancel', (event) => {
  event.preventDefault();
});

retryButton.addEventListener('click', async () => {
  const currentRetryHandler = retryHandler;
  const currentRetryMessage = retryMessage;
  const currentRetryMessageKey = retryMessageKey;
  const currentRetryMessageParameters = retryMessageParameters;
  if (!currentRetryHandler || retryButton.disabled) return;

  clearRequestError();

  try {
    await currentRetryHandler();
  } catch {
    showRequestError({
      message: currentRetryMessageKey ? undefined : currentRetryMessage,
      messageKey: currentRetryMessageKey,
      messageParameters: currentRetryMessageParameters,
      onRetry: currentRetryHandler,
    });
  }
});

onLanguageChange(() => {
  renderLoadingText();
  if (!errorPanel.hidden && retryMessageKey) {
    retryMessage = t(retryMessageKey, retryMessageParameters);
    errorMessage.textContent = retryMessage;
  }
});

export { beginRequest, clearRequestError, showRequestError };
