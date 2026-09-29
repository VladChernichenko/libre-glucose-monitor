import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { useGlucose } from '../../../state/GlucoseStore';

const FIELD = 'mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label';

export const ActivitySheet: React.FC = () => {
  const navigate = useNavigate();
  const { createNote } = useGlucose();
  const [minutes, setMinutes] = useState('');
  const [kind, setKind] = useState('Walk');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(minutes);
    if (!m || m <= 0) {
      setError('Enter a duration in minutes.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createNote({
        timestamp: new Date(),
        carbs: 0,
        insulin: 0,
        meal: 'Other',
        comment: `Activity: ${kind}, ${m} min`,
      });
      navigate(-1);
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Log activity" onClose={() => navigate(-1)}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-gm-caption text-label-secondary">
          Activity
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={FIELD}>
            {['Walk', 'Run', 'Cycle', 'Gym', 'Other'].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="text-gm-caption text-label-secondary">
          Duration (minutes)
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={FIELD}
          />
        </label>
        {error && (
          <p role="alert" className="text-gm-caption text-sys-red">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-nested bg-sys-blue py-2.5 text-gm-body font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </Sheet>
  );
};
