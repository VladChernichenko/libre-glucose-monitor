import type { GlucoseReading } from '../types/libre';
import { NightscoutDataAdapter } from '../services/nightscout/adapter';
import { nightscoutDirectionToArrow } from '../utils/nightscoutTrend';

export interface NightscoutSgvEntry {
  sgv: number;
  date: number;
  direction?: string;
  trend?: number;
  type?: string;
}

/** mg/dL to mmol/L, rounded the way the dashboard has always displayed it. */
export const toMmolL = (mgdL: number): number => Math.round((mgdL / 18) * 10) / 10;

/**
 * Status boundaries come from NightscoutDataAdapter rather than being restated
 * here — there must be exactly one definition of "normal". Rounding happens
 * before classification, matching the old dashboard.
 */
export function toGlucoseReading(entry: NightscoutSgvEntry): GlucoseReading {
  const value = toMmolL(entry.sgv);
  return {
    timestamp: new Date(entry.date),
    value,
    trend: entry.trend || 0,
    trendArrow: nightscoutDirectionToArrow(entry.direction),
    status: NightscoutDataAdapter.calculateGlucoseStatus(value),
    unit: 'mmol/L',
    originalTimestamp: new Date(entry.date),
  };
}
