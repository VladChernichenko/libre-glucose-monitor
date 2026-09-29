/**
 * A CGM reports roughly every 5 minutes, so three missed readings means the
 * displayed value can no longer be trusted as current. Showing a stale glucose
 * value as if it were live is a safety problem, not a cosmetic one.
 */
export const STALE_THRESHOLD_MS = 15 * 60 * 1000;

export function isStale(timestamp: Date, now: number = Date.now()): boolean {
  return now - timestamp.getTime() > STALE_THRESHOLD_MS;
}
