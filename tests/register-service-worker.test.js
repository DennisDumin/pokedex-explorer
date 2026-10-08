import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('PWA without an in-page install action', () => {
  it('does not render or initialize an install button', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

    expect(html).not.toContain('install-app-button');
    expect(html).not.toContain('actions.install');
    expect(main).not.toContain('initInstallPrompt');
  });

  it('still registers offline support for the deployed app scope', async () => {
    vi.stubEnv('PROD', true);
    const registration = {};
    const register = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal('document', {
      baseURI: 'https://example.com/projects/pokedex/',
    });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register,
        ready: Promise.resolve(registration),
        controller: {},
      },
    });
    const { registerServiceWorker } =
      await import('../src/pwa/register-service-worker.js');

    expect(await registerServiceWorker()).toBe(registration);
    expect(register).toHaveBeenCalledWith(
      new URL('https://example.com/projects/pokedex/sw.js'),
      { scope: 'https://example.com/projects/pokedex/', updateViaCache: 'none' },
    );
  });

  it('skips registration in unsupported browsers', async () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('document', {});
    vi.stubGlobal('navigator', {});
    const { registerServiceWorker } =
      await import('../src/pwa/register-service-worker.js');

    expect(await registerServiceWorker()).toBeNull();
  });
});
