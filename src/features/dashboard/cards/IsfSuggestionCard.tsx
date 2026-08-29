import React, { useCallback, useEffect, useState } from 'react';
import { isfSuggestionApi, type IsfSuggestion } from '../../../services/isfSuggestionApi';

// ContentView.swift:277-282 — the server's show flag AND local morning AND a
// non-empty proposal list. All three, not any.
const isLocalMorning = (d = new Date()) => d.getHours() >= 5 && d.getHours() < 11;

/** BREAKFAST -> Breakfast, POST_LUNCH -> Post lunch. */
function displayName(mealWindow: string): string {
  const words = mealWindow.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const IsfSuggestionCard: React.FC = () => {
  const [suggestion, setSuggestion] = useState<IsfSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isfSuggestionApi
      .fetch()
      .then((s) => {
        if (!cancelled) setSuggestion(s);
      })
      .catch(() => {
        // A missing suggestion is not an error worth showing the user.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolve = useCallback(async (action: 'accept' | 'dismiss') => {
    setBusy(true);
    try {
      await isfSuggestionApi[action]();
      setHidden(true);
    } finally {
      setBusy(false);
    }
  }, []);

  const windows = suggestion?.windows ?? [];
  const visible = !hidden && suggestion?.show === true && isLocalMorning() && windows.length > 0;
  if (!visible) return null;

  return (
    <div className="rounded-card border border-sys-purple/40 bg-sys-purple/10 p-3">
      <p className="text-gm-body font-bold text-label">Updated ISF ready</p>
      <p className="mt-0.5 text-gm-label text-label-secondary">
        Based on your recent data, we suggest refining meal-window ISF.
      </p>
      <ul className="my-2">
        {windows.map((w) => (
          <li key={w.mealWindow} className="flex justify-between text-gm-caption">
            <span className="font-medium">{displayName(w.mealWindow)}</span>
            {w.currentIsf != null && w.proposedIsf != null && (
              <span className="tabular-nums text-label-secondary">
                {w.currentIsf.toFixed(2)} → {w.proposedIsf.toFixed(2)}
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve('dismiss')}
          className="flex-1 rounded-lg bg-sys-purple/10 py-1.5 text-gm-caption font-semibold text-sys-purple disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve('accept')}
          className="flex-1 rounded-lg bg-sys-purple py-1.5 text-gm-caption font-semibold text-white disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
};
