import { afterEach, describe, expect, it, vi } from 'vitest';

function createClassList() {
  const classes = new Set();

  return {
    contains: (className) => classes.has(className),
    toggle: vi.fn((className, force) => {
      if (force) classes.add(className);
      else classes.delete(className);
    }),
  };
}

function createStatusElement() {
  const icon = { textContent: '' };
  const message = { textContent: '' };
  const statusElement = {
    classList: createClassList(),
    hidden: true,
    querySelector: vi.fn((selector) =>
      selector === '[data-connectivity-icon]' ? icon : message,
    ),
  };

  return { icon, message, statusElement };
}

function createConnectivityEnvironment({ online = true } = {}) {
  const windowListeners = new Map();
  const { icon, message, statusElement } = createStatusElement();
  const { statusElement: dialogStatusElement } = createStatusElement();
  const body = { classList: createClassList() };

  vi.stubGlobal('window', {
    addEventListener: vi.fn((type, listener) => windowListeners.set(type, listener)),
  });
  vi.stubGlobal('navigator', { onLine: online });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
  vi.stubGlobal('document', {
    body,
    getElementById: vi.fn(() => statusElement),
    querySelectorAll: vi.fn(() => [dialogStatusElement]),
  });

  return {
    body,
    dialogStatusElement,
    icon,
    message,
    statusElement,
    windowListeners,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('connectivity status', () => {
  it('shows a persistent explanation when the app starts offline', async () => {
    const { body, dialogStatusElement, icon, message, statusElement } =
      createConnectivityEnvironment({
        online: false,
      });
    const { initConnectivityStatus } = await import('../src/ui/connectivity-status.js');

    initConnectivityStatus();

    expect(statusElement.hidden).toBe(false);
    expect(statusElement.classList.contains('is-offline')).toBe(true);
    expect(dialogStatusElement.hidden).toBe(false);
    expect(body.classList.contains('has-persistent-connectivity-status')).toBe(true);
    expect(icon.textContent).toBe('!');
    expect(message.textContent).toContain("You're offline");
  });

  it('briefly confirms that the connection returned', async () => {
    vi.useFakeTimers();
    const { message, statusElement, windowListeners } = createConnectivityEnvironment();
    const { initConnectivityStatus } = await import('../src/ui/connectivity-status.js');

    initConnectivityStatus();
    windowListeners.get('online')();

    expect(statusElement.hidden).toBe(false);
    expect(statusElement.classList.contains('is-online')).toBe(true);
    expect(message.textContent).toBe('Back online.');

    vi.advanceTimersByTime(3500);

    expect(statusElement.hidden).toBe(true);
  });

  it('keeps the offline message visible after a quick connection change', async () => {
    vi.useFakeTimers();
    const { message, statusElement, windowListeners } = createConnectivityEnvironment();
    const { initConnectivityStatus } = await import('../src/ui/connectivity-status.js');

    initConnectivityStatus();
    windowListeners.get('online')();
    windowListeners.get('offline')();
    vi.advanceTimersByTime(3500);

    expect(statusElement.hidden).toBe(false);
    expect(statusElement.classList.contains('is-offline')).toBe(true);
    expect(message.textContent).toContain("You're offline");
  });

  it('updates a visible connection status when German is selected', async () => {
    const { message } = createConnectivityEnvironment({ online: false });
    const { languageStore } = await import('../src/state/language.js');
    const { initConnectivityStatus } = await import('../src/ui/connectivity-status.js');

    initConnectivityStatus();
    expect(message.textContent).toContain("You're offline");

    languageStore.setLanguage('de');

    expect(message.textContent).toBe(
      'Du bist offline. Bereits angesehene Pokémon bleiben verfügbar.',
    );
  });

  it('registers the connection listeners only once', async () => {
    createConnectivityEnvironment();
    const { initConnectivityStatus } = await import('../src/ui/connectivity-status.js');

    initConnectivityStatus();
    initConnectivityStatus();

    expect(window.addEventListener).toHaveBeenCalledTimes(2);
  });
});
