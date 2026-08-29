import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { useGlucose } from '../../../state/GlucoseStore';
import { getMealOptions, getSmartMealType } from '../../../domain/mealType';

const FIELD =
  'mt-1 w-full rounded-nested bg-surface-nested px-3 py-2 text-gm-body text-label';

export const NoteEditorSheet: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, createNote, updateNote, deleteNote, currentReading } = useGlucose();
  const existing = id ? notes.find((n) => n.id === id) : undefined;

  const [carbs, setCarbs] = useState(existing ? String(existing.carbs) : '');
  const [insulin, setInsulin] = useState(existing ? String(existing.insulin) : '');
  const [mealTouched, setMealTouched] = useState(false);
  const [mealOverride, setMealOverride] = useState(existing?.meal ?? '');

  // Inference tracks the inputs until the user picks a category themselves.
  const inferredMeal = useMemo(
    () =>
      getSmartMealType(
        Number(carbs) || 0,
        Number(insulin) || 0,
        existing?.timestamp ?? new Date(),
        existing?.glucoseValue ?? currentReading?.value
      ),
    [carbs, insulin, existing, currentReading]
  );
  const meal = mealTouched || existing ? mealOverride || inferredMeal : inferredMeal;
  const setMeal = (value: string) => {
    setMealTouched(true);
    setMealOverride(value);
  };
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => navigate(-1);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = Number(carbs) || 0;
    const i = Number(insulin) || 0;
    if (c <= 0 && i <= 0) {
      setError('Enter carbs, insulin, or both.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const payload = {
        timestamp: existing?.timestamp ?? new Date(),
        carbs: c,
        insulin: i,
        meal,
        comment,
      };
      if (existing) await updateNote(existing.id, payload);
      else await createNote(payload);
      close();
    } catch {
      setError('Could not save the note. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={existing ? 'Edit note' : 'Add note'} onClose={close}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-gm-caption text-label-secondary">
          Carbs (g)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-gm-caption text-label-secondary">
          Insulin (u)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={insulin}
            onChange={(e) => setInsulin(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-gm-caption text-label-secondary">
          Meal
          <select value={meal} onChange={(e) => setMeal(e.target.value)} className={FIELD}>
            {getMealOptions(meal).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-gm-caption text-label-secondary">
          Comment
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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

        {existing && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm('Delete this note?')) return;
              await deleteNote(existing.id);
              close();
            }}
            className="py-2 text-gm-body font-semibold text-sys-red disabled:opacity-50"
          >
            Delete note
          </button>
        )}
      </form>
    </Sheet>
  );
};
