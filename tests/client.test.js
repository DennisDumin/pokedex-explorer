import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, fetchJson } from '../src/api/client.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('fetchJson', () => {
  it('aborts a request that exceeds its timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              reject(new DOMException('Request timed out.', 'AbortError'));
            });
          }),
      ),
    );

    const request = fetchJson('https://pokeapi.co/api/v2/pokemon/25/', {
      timeout: 50,
    });
    const expectation = expect(request).rejects.toMatchObject({
      cause: expect.objectContaining({ name: 'AbortError' }),
      name: 'ApiError',
    });

    await vi.advanceTimersByTimeAsync(50);
    await expectation;
  });

  it('preserves HTTP status details in an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );

    const request = fetchJson('https://pokeapi.co/api/v2/pokemon/25/');

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        status: 503,
        statusText: 'Service Unavailable',
      }),
    );
  });
});
