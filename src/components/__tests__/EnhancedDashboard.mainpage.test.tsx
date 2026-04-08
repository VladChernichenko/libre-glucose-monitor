import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedDashboard from '../EnhancedDashboard';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'vlad' },
    isAuthenticated: true,
    logout: jest.fn(),
  }),
}));

jest.mock('../CombinedGlucoseChart', () => {
  return function MockCombinedGlucoseChart() {
    return <div>Combined Glucose Chart</div>;
  };
});

jest.mock('../AIInsightPanel', () => {
  return function MockAIInsightPanel() {
    return <div>AI Analyzer</div>;
  };
});

jest.mock('../NoteInputModal', () => {
  return function MockNoteInputModal() {
    return null;
  };
});

jest.mock('../COBSettings', () => {
  return function MockCOBSettings() {
    return null;
  };
});

jest.mock('../InsulinPreferencesSettings', () => {
  return function MockInsulinPreferencesSettings() {
    return null;
  };
});

jest.mock('../VersionInfo', () => {
  return function MockVersionInfo() {
    return null;
  };
});

jest.mock('../NightscoutErrorBoundary', () => {
  return function MockNightscoutErrorBoundary({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

jest.mock('../NightscoutFallbackUI', () => {
  return function MockNightscoutFallbackUI() {
    return <div>Nightscout Fallback</div>;
  };
});

jest.mock('../DataSourceConfigModal', () => {
  return function MockDataSourceConfigModal() {
    return null;
  };
});

var mockGetCurrentGlucose = jest.fn();
var mockGetGlucoseEntries = jest.fn();
var mockGetGlucoseEntriesByDate = jest.fn();

jest.mock('../../services/nightscout/enhancedNightscoutService', () => ({
  EnhancedNightscoutService: jest.fn().mockImplementation(() => ({
    getCurrentGlucose: mockGetCurrentGlucose,
    getGlucoseEntries: mockGetGlucoseEntries,
    getGlucoseEntriesByDate: mockGetGlucoseEntriesByDate,
  })),
}));

var mockGetNotes = jest.fn();
var mockIsBackendAvailable = jest.fn();
var mockDeleteNote = jest.fn();
jest.mock('../../services/hybridNotesApi', () => ({
  hybridNotesApiService: {
    getNotes: mockGetNotes,
    isBackendAvailable: mockIsBackendAvailable,
    deleteNote: mockDeleteNote,
  },
}));

var mockGetCOBSettings = jest.fn();
var mockSaveCOBSettings = jest.fn();
jest.mock('../../services/cobSettingsApi', () => ({
  cobSettingsApi: {
    getCOBSettings: mockGetCOBSettings,
    saveCOBSettings: mockSaveCOBSettings,
  },
}));

var mockGetGlucoseCalculations = jest.fn();
jest.mock('../../services/glucoseCalculationsApi', () => ({
  glucoseCalculationsApi: {
    getGlucoseCalculations: mockGetGlucoseCalculations,
  },
}));

jest.mock('../../config/environments', () => ({
  getEnvironmentConfig: () => ({
    backendUrl: 'http://localhost:8080',
  }),
}));

jest.mock('../../services/dataSourceConfigApi', () => ({
  dataSourceConfigApi: {
    saveLibreConfig: jest.fn(),
  },
}));

describe('EnhancedDashboard main page load', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
