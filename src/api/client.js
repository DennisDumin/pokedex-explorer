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

async function fetchJson(url, { signal } = {}) {
  const requestUrl = String(url);
  let response;

  try {
    response = await fetch(requestUrl, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (cause) {
    throw new ApiError('The PokéAPI is currently unavailable.', {
      cause,
      url: requestUrl,
    });
  }

  if (!response.ok) {
    throw new ApiError(
      `The PokéAPI request failed with status ${response.status}.`,
      {
        status: response.status,
        statusText: response.statusText,
        url: requestUrl,
      },
    );
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
}

export { ApiError, fetchJson };
