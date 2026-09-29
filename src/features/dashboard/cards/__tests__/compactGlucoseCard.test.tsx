import { render, screen } from '@testing-library/react';
import { CompactGlucoseCard } from '../CompactGlucoseCard';

const state = {
  currentReading: {
    value: 8.7,
    timestamp: new Date(),
    trend: 0,
    trendArrow: '↘',
    status: 'normal' as const,
    unit: 'mmol/L',
  },
  calculations: {
    activeCarbsOnBoard: 25,
    activeCarbsUnit: 'g',
    activeInsulinOnBoard: 3.69,
    activeInsulinUnit: 'u',
    twoHourPrediction: 7.4,
    predictionUnit: 'mmol/L',
  },
};

vi.mock('../../../../state/GlucoseStore', () => ({ useGlucose: () => state }));

describe('CompactGlucoseCard', () => {
  it('shows current value, forecast, unit and status', () => {
    render(<CompactGlucoseCard />);
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByText('7.4')).toBeInTheDocument();
    expect(screen.getByText('mmol/L')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('2h forecast')).toBeInTheDocument();
  });

  it('shows COB and IOB in the nested panel', () => {
    render(<CompactGlucoseCard />);
    expect(screen.getByText('25.0 g')).toBeInTheDocument();
    expect(screen.getByText('3.69 u')).toBeInTheDocument();
  });
});
