const SERVICE_WORKER_START_TIMEOUT = 2000;

function waitWithTimeout(promise, timeout = SERVICE_WORKER_START_TIMEOUT) {
  let timeoutId;

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = globalThis.setTimeout(() => resolve(null), timeout);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    globalThis.clearTimeout(timeoutId);
  });
}

function waitForController() {
  if (navigator.serviceWorker.controller) return Promise.resolve();

  return waitWithTimeout(
    new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, {
        once: true,
      });
    }),
    500,
  );
}

export async function registerServiceWorker() {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    typeof document === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }

  const serviceWorkerUrl = new URL('sw.js', document.baseURI);
  const scopeUrl = new URL('./', document.baseURI);

  try {
    const registration = await waitWithTimeout(
      navigator.serviceWorker.register(serviceWorkerUrl, {
        scope: scopeUrl.href,
        updateViaCache: 'none',
      }),
    );

    if (!registration) return null;

    await waitWithTimeout(navigator.serviceWorker.ready);
    await waitForController();
    return registration;
  } catch {
    return null;
  }
}

let installPromptInitialized = false;
let deferredInstallPrompt = null;

export function initInstallPrompt() {
  if (
    installPromptInitialized ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return;
  }

  const installButton = document.getElementById('install-app-button');
  if (!installButton) return;

  // Chromium exposes this event only when the current app meets its install criteria.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;

    installButton.disabled = true;

    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch {
      // The browser may cancel the prompt when installability changes mid-interaction.
    } finally {
      deferredInstallPrompt = null;
      installButton.disabled = false;
      installButton.hidden = true;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  installPromptInitialized = true;
}
