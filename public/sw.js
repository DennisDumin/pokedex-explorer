const CACHE_PREFIX = 'pokedex-explorer';
const CACHE_VERSION = 'v3';
const APP_SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-${CACHE_VERSION}`;
const MEDIA_CACHE = `${CACHE_PREFIX}-media-${CACHE_VERSION}`;
const API_NETWORK_TIMEOUT = 8000;

const scopeUrl = new URL('./', self.registration.scope);
const appShellUrls = [
  scopeUrl.href,
  new URL('index.html', scopeUrl).href,
  new URL('manifest.webmanifest', scopeUrl).href,
  new URL('manifest.de.webmanifest', scopeUrl).href,
  new URL('icons/pokedex-192.png', scopeUrl).href,
  new URL('icons/pokedex-512.png', scopeUrl).href,
  new URL('icons/pokedex.svg', scopeUrl).href,
];

function isCacheable(response, { allowOpaque = false } = {}) {
  if (!response) {
    return false;
  }

  if (response.type === 'opaque') {
    return allowOpaque;
  }

  if (!response.ok || response.status !== 200 || response.type === 'error') {
    return false;
  }

  return !response.headers.get('cache-control')?.includes('no-store');
}

async function putIfCacheable(cacheName, request, response, options) {
  if (!isCacheable(response, options)) {
    return;
  }

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch {
    // A cache quota or storage error must never turn a valid response into a failure.
  }
}

async function fetchAndCache(cache, url) {
  const request = new Request(url, { cache: 'reload' });
  const response = await fetch(request);

  if (isCacheable(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

function findShellAssetUrls(html, documentUrl) {
  const assetUrls = new Set();
  const attributePattern = /(?:href|src)=["']([^"']+)["']/gi;

  for (const match of html.matchAll(attributePattern)) {
    try {
      const assetUrl = new URL(match[1], documentUrl);

      if (
        assetUrl.origin === self.location.origin &&
        assetUrl.pathname.startsWith(scopeUrl.pathname)
      ) {
        assetUrls.add(assetUrl.href);
      }
    } catch {
      // Ignore values such as inline data URLs that cannot be cached as requests.
    }
  }

  return assetUrls;
}

async function cacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  const results = await Promise.allSettled(
    appShellUrls.map((url) => fetchAndCache(cache, url)),
  );

  const assetUrls = new Set();

  for (const result of results) {
    if (
      result.status !== 'fulfilled' ||
      !isCacheable(result.value) ||
      !result.value.headers.get('content-type')?.includes('text/html')
    ) {
      continue;
    }

    const html = await result.value.text();
    const documentUrl = result.value.url || scopeUrl.href;

    for (const assetUrl of findShellAssetUrls(html, documentUrl)) {
      assetUrls.add(assetUrl);
    }
  }

  await Promise.allSettled([...assetUrls].map((url) => fetchAndCache(cache, url)));
}

async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  await putIfCacheable(cacheName, request, networkResponse);
  return networkResponse;
}

function fetchWithTimeout(request, timeout = API_NETWORK_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeout);

  return fetch(request, { signal: controller.signal }).finally(() => {
    globalThis.clearTimeout(timeoutId);
  });
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetchWithTimeout(request);

    if (!networkResponse.ok) {
      return (await caches.match(request)) || networkResponse;
    }

    await putIfCacheable(cacheName, request, networkResponse);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

async function findNavigationFallback(request) {
  const cachedPage = await caches.match(request);

  if (cachedPage) {
    return cachedPage;
  }

  for (const fallbackUrl of appShellUrls.slice(0, 2)) {
    const appShellResponse = await caches.match(fallbackUrl);

    if (appShellResponse) {
      return appShellResponse;
    }
  }

  return null;
}

async function navigateWithAppShellFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (!networkResponse.ok) {
      return (await findNavigationFallback(request)) || networkResponse;
    }

    await putIfCacheable(APP_SHELL_CACHE, scopeUrl.href, networkResponse);
    return networkResponse;
  } catch (error) {
    const cachedPage = await findNavigationFallback(request);

    if (cachedPage) {
      return cachedPage;
    }

    throw error;
  }
}

async function staleWhileRevalidate(request, event, options) {
  const cachedResponse = await caches.match(request);
  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      await putIfCacheable(MEDIA_CACHE, request, networkResponse, options);
      return networkResponse;
    })
    .catch((error) => {
      if (cachedResponse) {
        return null;
      }

      throw error;
    });

  if (cachedResponse) {
    event.waitUntil(networkPromise.then(() => undefined));
    return cachedResponse;
  }

  return networkPromise;
}

function isApiRequest(url) {
  return (
    url.hostname === 'pokeapi.co' ||
    url.hostname === 'api.pokemontcg.io' ||
    (url.origin === self.location.origin && url.pathname.includes('/api/'))
  );
}

function isMediaRequest(request, url) {
  return (
    request.destination === 'image' ||
    url.hostname === 'raw.githubusercontent.com' ||
    url.hostname.endsWith('.githubusercontent.com')
  );
}

function isTrustedOpaqueMediaHost(url) {
  return (
    url.hostname === 'raw.githubusercontent.com' ||
    url.hostname.endsWith('.githubusercontent.com') ||
    url.hostname === 'images.pokemontcg.io'
  );
}

function isAppShellRequest(request, url) {
  if (url.origin !== self.location.origin || url.pathname.endsWith('/sw.js')) {
    return false;
  }

  return ['font', 'manifest', 'script', 'style', 'worker'].includes(request.destination);
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(`${CACHE_PREFIX}-`) &&
                ![APP_SHELL_CACHE, API_CACHE, MEDIA_CACHE].includes(cacheName),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (!['http:', 'https:'].includes(url.protocol)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigateWithAppShellFallback(request));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (isMediaRequest(request, url)) {
    event.respondWith(
      staleWhileRevalidate(request, event, {
        allowOpaque: isTrustedOpaqueMediaHost(url),
      }),
    );
    return;
  }

  if (isAppShellRequest(request, url)) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
  }
});
