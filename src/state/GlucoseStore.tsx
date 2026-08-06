import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useLocation } from 'react-router-dom';
import { EnhancedNightscoutService } from '../services/nightscout/enhancedNightscoutService';
import { glucoseCalculationsApi } from '../services/glucoseCalculationsApi';
import { hybridNotesApiService } from '../services/hybridNotesApi';
import { getEnvironmentConfig } from '../config/environments';
import { glucoseReducer, initialGlucoseState, type GlucoseState } from './glucoseReducer';
import { toGlucoseReading, type NightscoutSgvEntry } from './toGlucoseReading';

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const VISIBILITY_REFRESH_THRESHOLD_MS = 45 * 1000;
const HISTORY_ENTRY_LIMIT = 100;

interface GlucoseContextValue extends GlucoseState {
  refreshAll: () => Promise<void>;
  refreshGlucoseOnly: (opts?: { silent?: boolean; forceServerSync?: boolean }) => Promise<void>;
  fetchNotes: () => Promise<void>;
}

const GlucoseContext = createContext<GlucoseContextValue | null>(null);

export const GlucoseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(glucoseReducer, initialGlucoseState);
  const location = useLocation();

  const service = useMemo(() => {
    const config = getEnvironmentConfig();
    return new EnhancedNightscoutService({
      backendUrl: config.backendUrl,
      enableFallbacks: true,
      enableDemoData: import.meta.env.REACT_APP_ENABLE_DEMO_MODE === 'true',
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
    });
  }, []);

  // One in-flight promise per refresh kind. A second caller joins the first
  // rather than firing another round trip — iOS does this with task handles.
  const inFlight = useRef<{ full?: Promise<void>; glucose?: Promise<void> }>({});
  const generation = useRef(state.authGeneration);
  generation.current = state.authGeneration;

  // Nothing dispatches 'authChanged' here: App mounts this provider only in
  // the authenticated branch, so signing out unmounts it and any late
  // response resolves into a discarded reducer. The generation guard stays in
  // the reducer for a future in-place auth transition.

  const loadGlucose = useCallback(async () => {
    const gen = generation.current;
    const current = await service.getCurrentGlucose();
    if (current.success && current.data) {
      dispatch({
        type: 'readingReceived',
        generation: gen,
        reading: toGlucoseReading(current.data),
      });
    } else if (current.error) {
      dispatch({ type: 'errorRaised', generation: gen, message: current.error });
    }

    const history = await service.getGlucoseEntries(HISTORY_ENTRY_LIMIT);
    if (history.success && history.data) {
      dispatch({
        type: 'historyReceived',
        generation: gen,
        history: (history.data as NightscoutSgvEntry[])
          .filter((entry) => entry.type === undefined || entry.type === 'sgv')
          .map(toGlucoseReading)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      });
    }

    if (current.success && current.data) {
      const reading = toGlucoseReading(current.data);
      try {
        const calc = await glucoseCalculationsApi.getGlucoseCalculations(reading.value);
        if (calc) dispatch({ type: 'calculationsReceived', generation: gen, calculations: calc });
      } catch {
        // Calculations are supplementary: a failure degrades that card only.
      }
    }
    dispatch({ type: 'refreshFinished', generation: gen, at: Date.now() });
  }, [service]);

  const refreshGlucoseOnly = useCallback(
    (opts?: { silent?: boolean; forceServerSync?: boolean }) => {
      if (inFlight.current.glucose) return inFlight.current.glucose;
      if (!opts?.silent) dispatch({ type: 'refreshStarted', generation: generation.current });
      const p = loadGlucose().finally(() => {
        inFlight.current.glucose = undefined;
      });
      inFlight.current.glucose = p;
      return p;
    },
    [loadGlucose]
  );

  const fetchNotes = useCallback(async () => {
    const gen = generation.current;
    try {
      const notes = await hybridNotesApiService.getNotes();
      dispatch({ type: 'notesReceived', generation: gen, notes });
    } catch {
      // Notes failing must not take down the dashboard.
    }
  }, []);

  // Delegates the glucose half to refreshGlucoseOnly so both share one
  // in-flight slot — otherwise mounting at /dashboard fires two identical
  // fetches, one from here and one from the location effect below.
  const refreshAll = useCallback(() => {
    if (inFlight.current.full) return inFlight.current.full;
    dispatch({ type: 'refreshStarted', generation: generation.current });
    const p = Promise.all([refreshGlucoseOnly({ silent: true }), fetchNotes()])
      .then(() => undefined)
      .finally(() => {
        inFlight.current.full = undefined;
      });
    inFlight.current.full = p;
    return p;
  }, [refreshGlucoseOnly, fetchNotes]);

  // Mount
  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // 5-minute auto refresh, paused while hidden
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshGlucoseOnly({ silent: true });
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refreshGlucoseOnly]);

  // Returning to the foreground, if enough time has passed
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = state.lastGlucoseRefresh
        ? Date.now() - state.lastGlucoseRefresh
        : Number.POSITIVE_INFINITY;
      if (elapsed > VISIBILITY_REFRESH_THRESHOLD_MS) {
        void refreshGlucoseOnly({ silent: true, forceServerSync: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshGlucoseOnly, state.lastGlucoseRefresh]);

  // Navigating back to the dashboard tab
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard')) {
      void refreshGlucoseOnly({ silent: true, forceServerSync: true });
    }
  }, [location.pathname, refreshGlucoseOnly]);

  const value = useMemo(
    () => ({ ...state, refreshAll, refreshGlucoseOnly, fetchNotes }),
    [state, refreshAll, refreshGlucoseOnly, fetchNotes]
  );

  return <GlucoseContext.Provider value={value}>{children}</GlucoseContext.Provider>;
};

export function useGlucose(): GlucoseContextValue {
  const ctx = useContext(GlucoseContext);
  if (!ctx) throw new Error('useGlucose must be used inside GlucoseProvider');
  return ctx;
}
