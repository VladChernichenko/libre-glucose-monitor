import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BedsideScreen } from '../BedsideScreen';

vi.mock('../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    currentReading: {
      value: 8.7,
      timestamp: new Date(),
      trend: 0,
      trendArrow: '↘',
      status: 'normal',
      unit: 'mmol/L',
    },
  }),
}));

describe('BedsideScreen', () => {
  it('shows the reading at large size with an exit control', () => {
    render(
      <MemoryRouter>
        <BedsideScreen />
      </MemoryRouter>
    );
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit bedside mode' })).toBeInTheDocument();
  });
});
