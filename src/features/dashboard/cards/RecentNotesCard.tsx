import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../ui/Card';
import { Pill } from '../../../ui/Pill';
import { useGlucose } from '../../../state/GlucoseStore';

const WINDOW_MS = 12 * 60 * 60 * 1000;

export const RecentNotesCard: React.FC = () => {
  const { notes } = useGlucose();

  const recent = useMemo(() => {
    const cutoff = Date.now() - WINDOW_MS;
    return notes
      .filter((n) => n.timestamp.getTime() >= cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [notes]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-gm-card-title text-label">Recent notes (12h)</h2>
        <div className="flex items-center gap-2.5">
          <Link to="/dashboard/scan" aria-label="Scan food" className="text-lg text-label">
            ⛶
          </Link>
          <Link
            to="/dashboard/note/new"
            aria-label="Add note"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sys-blue text-white"
          >
            +
          </Link>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="py-6 text-center text-gm-body text-label-secondary">
          No notes in the last 12 hours.
        </p>
      ) : (
        <ul className="mt-2">
          {recent.map((n, i) => (
            <li key={n.id} className={i > 0 ? 'mt-2 border-t border-separator pt-2' : ''}>
              <div className="flex items-center">
                <span className="mr-2.5 h-2 w-2 rounded-full bg-sys-green" />
                <span className="flex-1 text-gm-body font-semibold text-label">{n.meal}</span>
                {/* Links to the note rather than deleting inline — a destructive
                    action must not be one stray tap on a phone. */}
                <Link to={`/dashboard/note/${n.id}`} className="text-gm-caption text-sys-blue">
                  Del
                </Link>
              </div>
              <p className="ml-[18px] text-gm-label text-label-secondary">
                {n.timestamp.toLocaleString([], {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <div className="ml-[18px] mt-1 flex items-center gap-2.5">
                {n.carbs > 0 && <Pill tone="carb">{n.carbs} g</Pill>}
                {n.insulin > 0 && <Pill tone="insulin">{n.insulin.toFixed(1)} u</Pill>}
                {n.glucoseValue !== undefined && (
                  <span className="text-gm-caption text-label-secondary">💧 {n.glucoseValue}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
