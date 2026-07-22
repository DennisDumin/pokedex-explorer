import { onLanguageChange, t } from '../i18n/index.js';

const ONLINE_MESSAGE_DURATION = 3500;

let connectivityStatusInitialized = false;
let hideStatusTimeout = null;
let activeConnectivityState = null;

export function getConnectivityStatus(isOnline) {
  return isOnline
    ? {
        icon: '✓',
        message: t('connectivity.online'),
      }
    : {
        icon: '!',
        message: t('connectivity.offline'),
      };
}

function clearHideTimeout() {
  if (hideStatusTimeout === null) return;

  globalThis.clearTimeout(hideStatusTimeout);
  hideStatusTimeout = null;
}

function renderStatusElement(element, status, isOnline) {
  const icon = element.querySelector('[data-connectivity-icon]');
  const message = element.querySelector('[data-connectivity-message]');

  if (!icon || !message) return;

  icon.textContent = status.icon;
  message.textContent = status.message;
  element.classList.toggle('is-online', isOnline);
  element.classList.toggle('is-offline', !isOnline);
  element.hidden = false;
}

function renderConnectivityStatus(elements, isOnline) {
  const status = getConnectivityStatus(isOnline);

  activeConnectivityState = isOnline;
  elements.forEach((element) => renderStatusElement(element, status, isOnline));
  document.body?.classList.toggle('has-persistent-connectivity-status', !isOnline);
}

function hideConnectivityStatus(elements) {
  activeConnectivityState = null;
  elements.forEach((element) => {
    element.hidden = true;
  });
}

export function initConnectivityStatus() {
  if (
    connectivityStatusInitialized ||
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return;
  }

  const statusElement = document.getElementById('connectivity-status');
  if (!statusElement) return;

  const statusElements = [
    statusElement,
    ...document.querySelectorAll('[data-connectivity-dialog-status]'),
  ];

  const showOfflineStatus = () => {
    clearHideTimeout();
    renderConnectivityStatus(statusElements, false);
  };

  const showOnlineStatus = () => {
    clearHideTimeout();
    renderConnectivityStatus(statusElements, true);
    hideStatusTimeout = globalThis.setTimeout(() => {
      hideConnectivityStatus(statusElements);
      hideStatusTimeout = null;
    }, ONLINE_MESSAGE_DURATION);
  };

  window.addEventListener('offline', showOfflineStatus);
  window.addEventListener('online', showOnlineStatus);
  onLanguageChange(() => {
    if (activeConnectivityState === null) return;

    renderConnectivityStatus(statusElements, activeConnectivityState);
  });

  if (navigator.onLine === false) {
    showOfflineStatus();
  }

  connectivityStatusInitialized = true;
}
