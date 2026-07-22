class ApiError extends Error {
  constructor(message, { url, status = null, statusText = '', cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.url = url;
    this.status = status;
    this.statusText = statusText;

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

const DEFAULT_REQUEST_TIMEOUT = 12000;

function createRequestSignal(signal, timeout) {
  if (signal) return { cancel: () => {}, signal };

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeout);

  return {
    cancel: () => globalThis.clearTimeout(timeoutId),
    signal: controller.signal,
  };
}

async function fetchJson(url, { signal, timeout = DEFAULT_REQUEST_TIMEOUT } = {}) {
  const requestUrl = String(url);
  const request = createRequestSignal(signal, timeout);
  let response;

  try {
    try {
      response = await fetch(requestUrl, {
        headers: { Accept: 'application/json' },
        signal: request.signal,
      });
    } catch (cause) {
      throw new ApiError('The PokéAPI is currently unavailable.', {
        cause,
        url: requestUrl,
      });
    }

    if (!response.ok) {
      throw new ApiError(`The PokéAPI request failed with status ${response.status}.`, {
        status: response.status,
        statusText: response.statusText,
        url: requestUrl,
      });
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new ApiError('The PokéAPI returned an invalid response.', {
        cause,
        status: response.status,
        statusText: response.statusText,
        url: requestUrl,
      });
    }
  } finally {
    request.cancel();
  }
}

export { ApiError, fetchJson };
