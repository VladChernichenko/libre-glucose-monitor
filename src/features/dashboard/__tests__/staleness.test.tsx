import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompactGlucoseCard } from '../cards/CompactGlucoseCard';

// Regression pins, not red-green TDD: CompactGlucoseCard already implements
// stale treatment. The 15-minute rule is a safety property, and a property with
// no named test guarding it is one careless refactor from disappearing.
const staleReading = {
  value: 8.7,
  timestamp: new Date(Date.now() - 20 * 60 * 1000), // 20 min > 15 min threshold
  trend: 0,
  trendArrow: '↘',
  status: 'normal' as const,
  unit: 'mmol/L',
};

vi.mock('../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    currentReading: staleReading,
    calculations: { activeCarbsOnBoard: 25, activeInsulinOnBoard: 3.69, twoHourPrediction: 7.4 },
  }),
}));

describe('stale data safety', () => {
  it('a cached reading past the threshold renders as stale, never as current', () => {
    render(
      <MemoryRouter>
        <CompactGlucoseCard />
      </MemoryRouter>
    );
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.queryByText('Normal')).not.toBeInTheDocument();
  });

  it('still shows the value and its age so the user can judge it', () => {
    render(
      <MemoryRouter>
        <CompactGlucoseCard />
      </MemoryRouter>
    );
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByText(/Updated 20 min/)).toBeInTheDocument();
  });
});
