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
