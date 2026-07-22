import { afterEach, describe, expect, it, vi } from 'vitest';

function createInstallEnvironment() {
  const windowListeners = new Map();
  const buttonListeners = new Map();
  const installButton = {
    addEventListener: vi.fn((type, listener) => buttonListeners.set(type, listener)),
    disabled: false,
    hidden: true,
  };

  vi.stubGlobal('window', {
    addEventListener: vi.fn((type, listener) => windowListeners.set(type, listener)),
  });
  vi.stubGlobal('document', {
    getElementById: vi.fn(() => installButton),
  });

  return { buttonListeners, installButton, windowListeners };
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('PWA install prompt', () => {
  it('shows the install action only after the browser marks the app installable', async () => {
    const { buttonListeners, installButton, windowListeners } =
      createInstallEnvironment();
    const { initInstallPrompt } = await import('../src/pwa/register-service-worker.js');
    const installEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    initInstallPrompt();
    windowListeners.get('beforeinstallprompt')(installEvent);

    expect(installEvent.preventDefault).toHaveBeenCalledOnce();
    expect(installButton.hidden).toBe(false);

    await buttonListeners.get('click')();

    expect(installEvent.prompt).toHaveBeenCalledOnce();
    expect(installButton.disabled).toBe(false);
    expect(installButton.hidden).toBe(true);
  });

  it('initializes browser listeners only once', async () => {
    const { installButton } = createInstallEnvironment();
    const { initInstallPrompt } = await import('../src/pwa/register-service-worker.js');

    initInstallPrompt();
    initInstallPrompt();

    expect(window.addEventListener).toHaveBeenCalledTimes(2);
    expect(installButton.addEventListener).toHaveBeenCalledOnce();
  });
});
