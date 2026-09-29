import {
  BACKEND_URL_STORAGE_KEY,
  IOS_PRODUCTION_BACKEND_URL,
  getBackendOverride,
  isBackendUrlAllowed,
  normalizeBaseURL,
  setBackendOverride,
} from '../backendOverride';

// setupTests replaces localStorage with spies, so back it with a real map here.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.mocked(window.localStorage.getItem).mockImplementation((k: string) => store.get(k) ?? null);
  vi.mocked(window.localStorage.setItem).mockImplementation((k: string, v: string) => {
    store.set(k, v);
  });
  vi.mocked(window.localStorage.removeItem).mockImplementation((k: string) => {
    store.delete(k);
  });
});

describe('backend override', () => {
  it('normalises whitespace and trailing slashes like iOS does', () => {
    expect(normalizeBaseURL('  https://example.com//  ')).toBe('https://example.com');
  });

  it('is unset by default', () => {
    expect(getBackendOverride()).toBeNull();
  });

  it('round-trips the production preset under the iOS storage key', () => {
    setBackendOverride(IOS_PRODUCTION_BACKEND_URL);
    expect(store.get(BACKEND_URL_STORAGE_KEY)).toBe(IOS_PRODUCTION_BACKEND_URL);
    expect(getBackendOverride()).toBe(IOS_PRODUCTION_BACKEND_URL);
  });

  it('clears the stored session when the backend changes', () => {
    store.set('accessToken', 'a');
    store.set('refreshToken', 'r');
    store.set('user', '{}');
    setBackendOverride(IOS_PRODUCTION_BACKEND_URL);
    expect(store.has('accessToken')).toBe(false);
    expect(store.has('refreshToken')).toBe(false);
    expect(store.has('user')).toBe(false);
  });

  it('clears back to the build default', () => {
    setBackendOverride(IOS_PRODUCTION_BACKEND_URL);
    setBackendOverride(null);
    expect(getBackendOverride()).toBeNull();
  });

  it('refuses a cleartext backend from an HTTPS page, and allows it from HTTP', () => {
    expect(isBackendUrlAllowed('http://localhost:8080', 'https:')).toBe(false);
    expect(isBackendUrlAllowed('http://localhost:8080', 'http:')).toBe(true);
    expect(isBackendUrlAllowed('https://example.com', 'https:')).toBe(true);
  });

  it('ignores a stored cleartext URL when the page is HTTPS', () => {
    store.set(BACKEND_URL_STORAGE_KEY, 'http://192.168.1.10:8080');
    const original = window.location.protocol;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, protocol: 'https:' },
    });
    expect(getBackendOverride()).toBeNull();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, protocol: original },
    });
  });
});
