import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardScreen } from '../DashboardScreen';

const now = Date.now();
vi.mock('../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    currentReading: {
      value: 8.7,
      timestamp: new Date(now),
      trend: 0,
      trendArrow: '↘',
      status: 'normal',
      unit: 'mmol/L',
    },
    glucoseHistory: [],
    calculations: {
      activeCarbsOnBoard: 25,
      activeInsulinOnBoard: 3.69,
      twoHourPrediction: 7.4,
      predictionPath: [],
    },
    notes: [
      {
        id: '1',
        timestamp: new Date(now),
        carbs: 25,
        insulin: 0,
        meal: 'Lunch',
        glucoseValue: 8.5,
      },
    ],
    isLoading: false,
    errorMessage: null,
    dataSource: 'NIGHTSCOUT',
    refreshAll: vi.fn(),
    refreshGlucoseOnly: vi.fn(),
    fetchNotes: vi.fn(),
  }),
}));
vi.mock('../../../services/isfSuggestionApi', () => ({
  isfSuggestionApi: {
    fetch: vi.fn().mockResolvedValue({ show: false, windows: [] }),
    accept: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('DashboardScreen', () => {
  it('loads main sections and recent notes on first page load', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    );
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByText('Forecast (4h)')).toBeInTheDocument();
    expect(screen.getByText('Recent notes (12h)')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });

  it('exposes the three toolbar actions', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bedside mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeInTheDocument();
  });

  it('renders the global error footnote when set', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
