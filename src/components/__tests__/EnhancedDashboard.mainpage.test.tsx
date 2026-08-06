import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import EnhancedDashboard from '../EnhancedDashboard';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'vlad' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock('../CombinedGlucoseChart', () => ({
  default: function MockCombinedGlucoseChart() {
    return <div>Combined Glucose Chart</div>;
  },
}));

vi.mock('../AIInsightPanel', () => ({
  default: function MockAIInsightPanel() {
    return <div>AI Analyzer</div>;
  },
}));

vi.mock('../NoteInputModal', () => ({
  default: function MockNoteInputModal() {
    return null;
  },
}));

vi.mock('../COBSettings', () => ({
  default: function MockCOBSettings() {
    return null;
  },
}));

vi.mock('../InsulinPreferencesSettings', () => ({
  default: function MockInsulinPreferencesSettings() {
    return null;
  },
}));

vi.mock('../VersionInfo', () => ({
  default: function MockVersionInfo() {
    return null;
  },
}));

vi.mock('../NightscoutErrorBoundary', () => ({
  default: function MockNightscoutErrorBoundary({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  },
}));

vi.mock('../NightscoutFallbackUI', () => ({
  default: function MockNightscoutFallbackUI() {
    return <div>Nightscout Fallback</div>;
  },
}));

vi.mock('../DataSourceConfigModal', () => ({
  default: function MockDataSourceConfigModal() {
    return null;
  },
}));

var mockGetCurrentGlucose = vi.fn();
var mockGetGlucoseEntries = vi.fn();
var mockGetGlucoseEntriesByDate = vi.fn();

// Vitest constructs mocks with Reflect.construct, so the implementation has to be
// newable — an arrow factory is not.
vi.mock('../../services/nightscout/enhancedNightscoutService', () => ({
  EnhancedNightscoutService: class {
    getCurrentGlucose = mockGetCurrentGlucose;
    getGlucoseEntries = mockGetGlucoseEntries;
    getGlucoseEntriesByDate = mockGetGlucoseEntriesByDate;
  },
}));

var mockGetNotes = vi.fn();
var mockIsBackendAvailable = vi.fn();
var mockDeleteNote = vi.fn();
vi.mock('../../services/hybridNotesApi', () => ({
  hybridNotesApiService: {
    getNotes: mockGetNotes,
    isBackendAvailable: mockIsBackendAvailable,
    deleteNote: mockDeleteNote,
  },
}));

var mockGetCOBSettings = vi.fn();
var mockSaveCOBSettings = vi.fn();
vi.mock('../../services/cobSettingsApi', () => ({
  cobSettingsApi: {
    getCOBSettings: mockGetCOBSettings,
    saveCOBSettings: mockSaveCOBSettings,
  },
}));

var mockGetGlucoseCalculations = vi.fn();
vi.mock('../../services/glucoseCalculationsApi', () => ({
  glucoseCalculationsApi: {
    getGlucoseCalculations: mockGetGlucoseCalculations,
  },
}));

vi.mock('../../config/environments', () => ({
  getEnvironmentConfig: () => ({
    backendUrl: 'http://localhost:8080',
  }),
}));

vi.mock('../../services/dataSourceConfigApi', () => ({
  dataSourceConfigApi: {
    saveLibreConfig: vi.fn(),
  },
}));

describe('EnhancedDashboard main page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const now = Date.now();

    mockGetCurrentGlucose.mockResolvedValue({
      success: true,
      data: {
        date: now,
        sgv: 126,
        trend: 4,
        direction: 'Flat',
      },
    });

    mockGetGlucoseEntries.mockResolvedValue({
      success: true,
      data: [
        { date: now - 10 * 60 * 1000, sgv: 120, trend: 4, direction: 'Flat', type: 'sgv' },
        { date: now - 5 * 60 * 1000, sgv: 124, trend: 4, direction: 'Flat', type: 'sgv' },
      ],
    });

    mockGetGlucoseEntriesByDate.mockResolvedValue({
      success: true,
      data: [
        { date: now - 10 * 60 * 1000, sgv: 120, trend: 4, direction: 'Flat', type: 'sgv' },
        { date: now - 5 * 60 * 1000, sgv: 124, trend: 4, direction: 'Flat', type: 'sgv' },
      ],
    });

    mockGetCOBSettings.mockResolvedValue({
      carbRatio: 10,
      isf: 2,
      carbHalfLife: 90,
      maxCOBDuration: 240,
    });

    mockGetNotes.mockResolvedValue([
      {
        id: 'n1',
        timestamp: new Date(now - 60 * 60 * 1000),
        carbs: 30,
        insulin: 2,
        meal: 'Snack',
        comment: 'first load note',
      },
    ]);
    mockIsBackendAvailable.mockResolvedValue(true);
    mockDeleteNote.mockResolvedValue(true);

    mockGetGlucoseCalculations.mockResolvedValue({
      activeCarbsOnBoard: 10.5,
      activeInsulinOnBoard: 0.7,
      twoHourPrediction: 6.8,
      factors: {},
      predictionPath: [],
    });
  });

  it('loads main sections and recent notes on first page load', async () => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Initializing application...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Glucose Monitor')).toBeInTheDocument();
    expect(screen.getByText('Current Glucose')).toBeInTheDocument();
    expect(screen.getByText('Active Carbs')).toBeInTheDocument();
    expect(screen.getByText('Active Insulin')).toBeInTheDocument();
    expect(screen.getByText('2h Prediction')).toBeInTheDocument();
    expect(screen.getByText('Recent Notes')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('AI Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Combined Glucose Chart')).toBeInTheDocument();

  });
});
