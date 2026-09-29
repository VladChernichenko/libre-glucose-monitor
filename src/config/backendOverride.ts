/**
 * Runtime backend selection, mirroring the iOS app.
 *
 * iOS stores a chosen base URL under `gm_backend_url` in UserDefaults and
 * resolves it in `GlucoseMonitorAPI.effectiveBackendBaseURL()`, falling back to
 * `defaultBackendBaseURL`. The web app uses the same key and the same
 * precedence so the two stay recognisably the same product.
 */

/** Same key iOS uses, so the concept is greppable across both repos. */
export const BACKEND_URL_STORAGE_KEY = 'gm_backend_url';

/** iOS `GlucoseMonitorAPI.defaultBackendBaseURL`. */
export const IOS_PRODUCTION_BACKEND_URL = 'https://glucose-monitor-be-production.up.railway.app';

/** What `environments.production` has always pointed at on the web. */
export const RENDER_PRODUCTION_BACKEND_URL = 'https://libre-glucose-monitor-be.onrender.com';

export const LOCAL_BACKEND_URL = 'http://localhost:8080';

export interface BackendPreset {
  id: string;
  label: string;
  /** null means "use the build-time environment config". */
  url: string | null;
  hint: string;
}

export const BACKEND_PRESETS: BackendPreset[] = [
  { id: 'default', label: 'Default for this build', url: null, hint: 'Whatever REACT_APP_ENVIRONMENT selects' },
  { id: 'production', label: 'Production', url: IOS_PRODUCTION_BACKEND_URL, hint: 'Railway — the same backend the iOS app uses' },
  { id: 'render', label: 'Production (Render)', url: RENDER_PRODUCTION_BACKEND_URL, hint: "The web app's own deployed backend" },
  { id: 'local', label: 'Local', url: LOCAL_BACKEND_URL, hint: 'A backend running on this machine' },
];

/** Trim and drop any trailing slashes, matching iOS `normalizeBaseURL`. */
export function normalizeBaseURL(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/**
 * A cleartext backend is refused whenever the page itself is served over
 * HTTPS. This is the web counterpart of the iOS `#if !DEBUG` guard: sending
 * credentials and JWTs to `http://` from an HTTPS origin would leak them (and
 * the browser would block it as mixed content anyway).
 */
export function isBackendUrlAllowed(url: string, pageProtocol: string): boolean {
  if (!url.toLowerCase().startsWith('http://')) return true;
  return pageProtocol !== 'https:';
}

/** The stored override, or null when unset or not permitted. */
export function getBackendOverride(): string | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(BACKEND_URL_STORAGE_KEY);
  } catch {
    return null; // Storage blocked; fall back to the build config.
  }
  if (!raw) return null;

  const normalized = normalizeBaseURL(raw);
  if (!normalized) return null;
  if (!isBackendUrlAllowed(normalized, window.location.protocol)) return null;
  return normalized;
}

/**
 * Persists the choice. Tokens are dropped because a session issued by one
 * backend is meaningless to another, and leaving them behind produces a
 * confusing 401 loop rather than a login screen.
 */
export function setBackendOverride(url: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (url === null) {
      window.localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
    } else {
      window.localStorage.setItem(BACKEND_URL_STORAGE_KEY, normalizeBaseURL(url));
    }
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('user');
  } catch {
    // Storage blocked; the caller's reload will simply keep the old backend.
  }
}
