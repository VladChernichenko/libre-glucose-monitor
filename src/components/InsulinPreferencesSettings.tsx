import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  insulinPreferencesApi,
  InsulinCatalogEntry,
  UserInsulinPreferences,
} from '../services/insulinPreferencesApi';

interface InsulinPreferencesSettingsProps {
  onClose: () => void;
  onSaved?: () => void;
}

function formatMinutes(m: number | null | undefined): string {
  if (m == null) return '—';
  return `${m} min`;
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return '—';
  if (h >= 24 && h % 24 === 0) return `${h / 24} d (${h} h)`;
  return `${h} h`;
}

const InsulinDetailCard: React.FC<{ title: string; entry: InsulinCatalogEntry | null }> = ({
  title,
  entry,
}) => (
  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
    <div className="font-medium text-gray-800">{title}</div>
    {entry ? (
      <>
        <div className="mt-1 text-gray-900">{entry.displayName}</div>
        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-600">
          <dt>DIA (app model)</dt>
          <dd className="text-right font-mono">{formatHours(entry.diaHours)}</dd>
          <dt>Peak (IOB)</dt>
          <dd className="text-right font-mono">{formatMinutes(entry.peakMinutes)}</dd>
          <dt>Half-life (ref.)</dt>
          <dd className="text-right font-mono">{formatMinutes(entry.halfLifeMinutes)}</dd>
          <dt>Onset (ref.)</dt>
          <dd className="text-right font-mono">{formatMinutes(entry.onsetMinutes)}</dd>
        </dl>
        {entry.description && (
          <p className="mt-2 text-xs leading-snug text-gray-500">{entry.description}</p>
        )}
      </>
    ) : (
      <p className="mt-1 text-xs text-gray-500">Select a type above.</p>
    )}
  </div>
);

const InsulinPreferencesSettings: React.FC<InsulinPreferencesSettingsProps> = ({
  onClose,
  onSaved,
}) => {
  const [rapidOptions, setRapidOptions] = useState<InsulinCatalogEntry[]>([]);
  const [longOptions, setLongOptions] = useState<InsulinCatalogEntry[]>([]);
  const [rapidCode, setRapidCode] = useState('');
  const [longCode, setLongCode] = useState('');
  const [baseline, setBaseline] = useState<{ rapid: string; long: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [rapidList, longList, prefs] = await Promise.all([
        insulinPreferencesApi.listCatalog('RAPID'),
        insulinPreferencesApi.listCatalog('LONG_ACTING'),
        insulinPreferencesApi.getPreferences(),
      ]);
      setRapidOptions(rapidList);
      setLongOptions(longList);
      setRapidCode(prefs.rapidInsulinCode);
      setLongCode(prefs.longActingInsulinCode);
      setBaseline({ rapid: prefs.rapidInsulinCode, long: prefs.longActingInsulinCode });
    } catch (e) {
      console.error('Insulin preferences load failed', e);
      setError('Failed to load insulin settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rapidEntry = useMemo(
    () => rapidOptions.find((e) => e.code === rapidCode) ?? null,
    [rapidOptions, rapidCode]
  );
  const longEntry = useMemo(
    () => longOptions.find((e) => e.code === longCode) ?? null,
    [longOptions, longCode]
  );

  const isDirty =
    baseline != null && (rapidCode !== baseline.rapid || longCode !== baseline.long);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      const saved: UserInsulinPreferences = await insulinPreferencesApi.savePreferences(
        rapidCode,
        longCode
      );
      setBaseline({ rapid: saved.rapidInsulinCode, long: saved.longActingInsulinCode });
      onSaved?.();
      onClose();
    } catch (e) {
      console.error('Insulin preferences save failed', e);
      setError('Failed to save. Check your selections and try again.');
    } finally {
      setIsSaving(false);
    }
  }, [rapidCode, longCode, onClose, onSaved]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'Enter' && isDirty && !isLoading && !isSaving) {
        event.preventDefault();
        void handleSave();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isDirty, isLoading, isSaving, handleSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Insulin types</h2>
            <p className="mt-1 text-xs text-gray-500">
              Rapid insulin shapes bolus IOB; basal is stored for your profile. Enter · save · Esc
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-gray-600">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <span className="ml-2">Loading…</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {!isLoading && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Rapid-acting (bolus / IOB curve)
                </label>
                <select
                  value={rapidCode}
                  onChange={(e) => setRapidCode(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {rapidOptions.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Long-acting (basal)
                </label>
                <select
                  value={longCode}
                  onChange={(e) => setLongCode(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {longOptions.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <InsulinDetailCard title="Selected rapid" entry={rapidEntry} />
              <InsulinDetailCard title="Selected basal" entry={longEntry} />
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || isLoading || isSaving}
            className={`rounded-md px-4 py-2 transition-colors ${
              isDirty && !isLoading && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            }`}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsulinPreferencesSettings;
