import React from 'react';
import { Card } from '../../../ui/Card';
import { StatusPill } from '../../../ui/StatusPill';
import { useGlucose } from '../../../state/GlucoseStore';
import { isStale } from '../../../state/glucoseStaleness';
import { useNow } from './useNow';

function relativeAge(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins > 0 ? `${mins} min, ${secs} secs ago` : `${secs} secs ago`;
}

export const CompactGlucoseCard: React.FC = () => {
  const { currentReading, calculations } = useGlucose();
  const now = useNow(1000);

  if (!currentReading) {
    return (
      <Card>
        <p className="text-gm-body text-label-secondary">Waiting for a glucose reading…</p>
      </Card>
    );
  }

  const stale = isStale(currentReading.timestamp, now);
  const tint = stale ? 'text-label-tertiary' : 'text-sys-orange';

  return (
    <Card>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex gap-6 text-gm-caption text-label-secondary">
            <span>Now</span>
            <span>2h forecast</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-gm-hero ${tint}`}>{currentReading.value.toFixed(1)}</span>
            <span className={`text-2xl ${tint}`}>{currentReading.trendArrow}</span>
            <span className={`text-gm-hero ${tint}`}>
              {calculations ? calculations.twoHourPrediction.toFixed(1) : '--'}
            </span>
            <span className="text-gm-subhead text-label-tertiary">{currentReading.unit}</span>
          </div>
          <div className="my-1.5">
            {stale ? (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-gm-caption font-semibold text-sys-orange">
                Stale
              </span>
            ) : (
              <StatusPill status={currentReading.status} />
            )}
          </div>
          <p className="text-gm-label text-label-tertiary">
            Updated {relativeAge(now - currentReading.timestamp.getTime())}
          </p>
        </div>

        <div className="w-[104px] shrink-0 rounded-nested bg-surface-nested p-2.5">
          <p className="text-gm-label font-semibold text-sys-orange">COB</p>
          <p className="mb-1.5 text-lg font-bold">
            {calculations ? `${calculations.activeCarbsOnBoard.toFixed(1)} g` : '--'}
          </p>
          <p className="text-gm-label font-semibold text-sys-indigo">IOB</p>
          <p className="text-lg font-bold">
            {calculations ? `${calculations.activeInsulinOnBoard.toFixed(2)} u` : '--'}
          </p>
        </div>
      </div>
    </Card>
  );
};
