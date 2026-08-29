import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { useGlucose } from '../../../state/GlucoseStore';

const FIELD = 'mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label';

// Long-acting doses are recorded as notes with insulin set, exactly as a bolus
// is. Distinguishing basal from bolus is a backend modelling change if the
// prediction model ever needs it — not a client-side flag invented here.
export const LongActingSheet: React.FC = () => {
  const navigate = useNavigate();
  const { createNote } = useGlucose();
  const [units, setUnits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = Number(units);
    if (!u || u <= 0) {
      setError('Enter a dose in units.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createNote({
        timestamp: new Date(),
        carbs: 0,
        insulin: u,
        meal: 'Other',
        comment: 'Long-acting insulin',
      });
      navigate(-1);
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Long-acting insulin" onClose={() => navigate(-1)}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-gm-caption text-label-secondary">
          Units
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
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
