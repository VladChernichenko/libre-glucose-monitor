import { glucoseReducer, initialGlucoseState } from '../glucoseReducer';
import { isStale, STALE_THRESHOLD_MS } from '../glucoseStaleness';

const reading = (value: number, timestamp = new Date()) => ({
  value,
  timestamp,
  trend: 0,
  trendArrow: '→',
  status: 'normal' as const,
  unit: 'mmol/L',
});

describe('glucoseReducer', () => {
  it('stores a reading received for the current auth generation', () => {
    const s = glucoseReducer(initialGlucoseState, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    expect(s.currentReading?.value).toBe(6.2);
  });

  it('ignores a reading from a stale auth generation', () => {
    const loggedOut = glucoseReducer(initialGlucoseState, { type: 'authChanged' });
    expect(loggedOut.authGeneration).toBe(1);

    const after = glucoseReducer(loggedOut, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    expect(after.currentReading).toBeNull();
  });

  it('clears data on auth change', () => {
    const withData = glucoseReducer(initialGlucoseState, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    const cleared = glucoseReducer(withData, { type: 'authChanged' });
    expect(cleared.currentReading).toBeNull();
    expect(cleared.notes).toEqual([]);
    expect(cleared.calculations).toBeNull();
  });

  it('records the refresh timestamp when a refresh finishes', () => {
    const s = glucoseReducer(initialGlucoseState, {
      type: 'refreshFinished',
      generation: 0,
      at: 1_700_000_000_000,
    });
    expect(s.lastGlucoseRefresh).toBe(1_700_000_000_000);
    expect(s.isLoading).toBe(false);
  });

  it('sets and clears the error message', () => {
    const errored = glucoseReducer(initialGlucoseState, {
      type: 'errorRaised',
      generation: 0,
      message: 'Network unreachable',
    });
    expect(errored.errorMessage).toBe('Network unreachable');
    const recovered = glucoseReducer(errored, {
      type: 'readingReceived',
      generation: 0,
      reading: reading(6.2),
    });
    expect(recovered.errorMessage).toBeNull();
  });
});

describe('staleness', () => {
  it('uses a 15 minute threshold', () => {
    expect(STALE_THRESHOLD_MS).toBe(15 * 60 * 1000);
  });

  it('treats a reading older than the threshold as stale', () => {
    const now = Date.now();
    expect(isStale(new Date(now - 16 * 60 * 1000), now)).toBe(true);
  });

  it('treats a recent reading as fresh', () => {
    const now = Date.now();
    expect(isStale(new Date(now - 4 * 60 * 1000), now)).toBe(false);
  });
});
