import type { GlucoseReading } from '../types/libre';
import type { GlucoseNote } from '../types/notes';
import type { GlucoseCalculationsResponse } from '../services/glucoseCalculationsApi';

export interface GlucoseState {
  currentReading: GlucoseReading | null;
  glucoseHistory: GlucoseReading[];
  calculations: GlucoseCalculationsResponse | null;
  notes: GlucoseNote[];
  isLoading: boolean;
  errorMessage: string | null;
  lastGlucoseRefresh: number | null;
  /** The configured source; only LibreLinkUp carries sensor metadata. */
  dataSource: 'NIGHTSCOUT' | 'LIBRE_LINK_UP';
  /** Bumped on every auth transition; responses from an older generation are discarded. */
  authGeneration: number;
}

export type GlucoseAction =
  | { type: 'authChanged' }
  | { type: 'refreshStarted'; generation: number }
  | { type: 'refreshFinished'; generation: number; at: number }
  | { type: 'readingReceived'; generation: number; reading: GlucoseReading }
  | { type: 'historyReceived'; generation: number; history: GlucoseReading[] }
  | { type: 'calculationsReceived'; generation: number; calculations: GlucoseCalculationsResponse }
  | { type: 'notesReceived'; generation: number; notes: GlucoseNote[] }
  | {
      type: 'dataSourceReceived';
      generation: number;
      dataSource: GlucoseState['dataSource'];
    }
  | { type: 'errorRaised'; generation: number; message: string };

export const initialGlucoseState: GlucoseState = {
  currentReading: null,
  glucoseHistory: [],
  calculations: null,
  notes: [],
  isLoading: false,
  errorMessage: null,
  lastGlucoseRefresh: null,
  dataSource: 'NIGHTSCOUT',
  authGeneration: 0,
};

export function glucoseReducer(state: GlucoseState, action: GlucoseAction): GlucoseState {
  if (action.type === 'authChanged') {
    return {
      ...initialGlucoseState,
      authGeneration: state.authGeneration + 1,
    };
  }

  // Any response that left before the last auth transition is discarded.
  if (action.generation !== state.authGeneration) return state;

  switch (action.type) {
    case 'refreshStarted':
      return { ...state, isLoading: true };
    case 'refreshFinished':
      return { ...state, isLoading: false, lastGlucoseRefresh: action.at };
    case 'readingReceived':
      return { ...state, currentReading: action.reading, errorMessage: null };
    case 'historyReceived':
      return { ...state, glucoseHistory: action.history, errorMessage: null };
    case 'calculationsReceived':
      return { ...state, calculations: action.calculations, errorMessage: null };
    case 'notesReceived':
      return { ...state, notes: action.notes };
    case 'dataSourceReceived':
      return { ...state, dataSource: action.dataSource };
    case 'errorRaised':
      return { ...state, isLoading: false, errorMessage: action.message };
    default:
      return state;
  }
}
