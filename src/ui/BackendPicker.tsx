import React, { useState } from 'react';
import {
  BACKEND_PRESETS,
  getBackendOverride,
  isBackendUrlAllowed,
  normalizeBaseURL,
  setBackendOverride,
} from '../config/backendOverride';
import { getEnvironmentConfig } from '../config/environments';

/**
 * Backend selector for the sign-in screen, mirroring the iOS SignInView.
 *
 * Applying reloads the page: every axios client captures its baseURL at module
 * load, so switching in place would leave half the app talking to the old host.
 */
export const BackendPicker: React.FC = () => {
  const current = getBackendOverride();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ?? '');
  const [error, setError] = useState<string | null>(null);

  const effective = getEnvironmentConfig().backendUrl || 'same origin (dev proxy)';
  const activeLabel =
    BACKEND_PRESETS.find((p) => p.url && current && p.url === current)?.label ??
    (current ? 'Custom' : 'Default for this build');

  const apply = (url: string | null) => {
    if (url !== null) {
      const normalized = normalizeBaseURL(url);
      if (!normalized) {
        setError('Enter a backend URL.');
        return;
      }
      if (!isBackendUrlAllowed(normalized, window.location.protocol)) {
        setError('This page is served over HTTPS, so it cannot use an http:// backend.');
        return;
      }
      setBackendOverride(normalized);
    } else {
      setBackendOverride(null);
    }
    window.location.reload();
  };

  // Pinned to the viewport bottom: JwtLoginForm is min-h-screen, so anything
  // rendered after it would sit below the fold.
  if (!open) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[420px] px-4 pb-3 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-gm-caption text-sys-blue underline"
        >
          Backend: {activeLabel}
        </button>
        <p className="mt-1 text-gm-label text-label-tertiary break-all">{effective}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[85dvh] max-w-[420px] overflow-y-auto rounded-t-card bg-surface p-3.5 shadow-capsule">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-gm-body font-semibold text-label">Choose backend</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gm-caption text-sys-blue"
        >
          Done
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {BACKEND_PRESETS.map((preset) => {
          const isActive = preset.url === null ? current === null : preset.url === current;
          return (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => apply(preset.url)}
                className={`w-full rounded-nested px-3 py-2 text-left ${
                  isActive ? 'bg-[var(--gm-tab-selected-bg)]' : 'bg-surface-nested'
                }`}
              >
                <span className="block text-gm-body text-label">
                  {preset.label}
                  {isActive && ' ✓'}
                </span>
                <span className="block text-gm-label text-label-secondary">{preset.hint}</span>
                {preset.url && (
                  <span className="block text-gm-label text-label-tertiary break-all">
                    {preset.url}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <label className="mt-3 block text-gm-caption text-label-secondary">
        Custom URL
        <input
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label"
        />
      </label>

      {error && (
        <p role="alert" className="mt-2 text-gm-caption text-sys-red">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => apply(value)}
        className="mt-2 w-full rounded-nested bg-sys-blue py-2 text-gm-body font-semibold text-white"
      >
        Use custom URL
      </button>

      <p className="mt-2 text-gm-label text-label-tertiary">
        Switching signs you out — a session from one backend is not valid on another.
      </p>
    </div>
  );
};
