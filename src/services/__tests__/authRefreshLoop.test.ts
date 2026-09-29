import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { authService } from '../authService';

/**
 * Regression guard for the refresh-token storm.
 *
 * `refreshAccessToken()` posts to `/api/auth/refresh` on the *same* axios
 * instance that carries the 401 response interceptor. When the refresh token
 * is itself expired, that POST returns 401, the interceptor fires again, and
 * calls `refreshAccessToken()` — on a brand new request config, so the
 * `_retry` flag never stops it. Unbounded recursion; the backend log fills
 * with hundreds of `/api/auth/refresh` per second until the server is killed.
 */

// A hard ceiling so a regression fails the assertion instead of hanging the
// suite: past this many attempts the adapter stops answering with 401.
const RUNAWAY_CEILING = 5;

type Adapter = NonNullable<AxiosInstance['defaults']['adapter']>;

function unauthorized(config: InternalAxiosRequestConfig) {
  const error = new Error('Request failed with status code 401') as Error & Record<string, unknown>;
  error.isAxiosError = true;
  error.config = config;
  error.response = {
    status: 401,
    statusText: 'Unauthorized',
    data: { error: 'Invalid refresh token' },
    headers: {},
    config,
  };
  return error;
}

describe('authService 401 handling', () => {
  const internals = authService as unknown as { api: AxiosInstance; refreshClient: AxiosInstance };
  const { api, refreshClient } = internals;
  const originalAdapters = [api.defaults.adapter, refreshClient.defaults.adapter] as const;
  let refreshAttempts = 0;
  let protectedAttempts = 0;

  beforeEach(() => {
    refreshAttempts = 0;
    protectedAttempts = 0;

    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => {
      if (key === 'accessToken') return 'expired.access.token';
      if (key === 'refreshToken') return 'expired.refresh.token';
      return null;
    });
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => undefined);

    const adapter: Adapter = async (config) => {
      const url = config.url ?? '';

      if (url.includes('/api/auth/refresh')) {
        refreshAttempts += 1;
        if (refreshAttempts > RUNAWAY_CEILING) {
          // Break the runaway so the test can assert instead of spinning.
          throw new Error('runaway refresh loop');
        }
        throw unauthorized(config);
      }

      if (url.includes('/api/auth/logout')) {
        return {
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      protectedAttempts += 1;
      throw unauthorized(config);
    };

    api.defaults.adapter = adapter;
    refreshClient.defaults.adapter = adapter;
  });

  afterEach(() => {
    [api.defaults.adapter, refreshClient.defaults.adapter] = originalAdapters;
    vi.restoreAllMocks();
  });

  it('attempts the refresh exactly once when the refresh token is expired', async () => {
    await expect(authService.refreshAccessToken()).resolves.toBeNull();

    expect(refreshAttempts).toBe(1);
  });

  it('does not retry a protected request more than once behind a dead refresh token', async () => {
    await expect(api.get('/api/glucose-calculations/')).rejects.toBeTruthy();

    expect(protectedAttempts).toBe(1);
    expect(refreshAttempts).toBe(1);
  });
});
