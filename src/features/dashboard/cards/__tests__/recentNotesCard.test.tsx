import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecentNotesCard } from '../RecentNotesCard';

const now = Date.now();
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    notes: [
      {
        id: '1',
        timestamp: new Date(now - 5 * 60_000),
        carbs: 25,
        insulin: 0,
        meal: 'Lunch',
        glucoseValue: 8.5,
      },
      {
        id: '2',
        timestamp: new Date(now - 8 * 60_000),
        carbs: 0,
        insulin: 1,
        meal: 'Pre-bolus',
        glucoseValue: 8.5,
      },
      {
        id: '3',
        timestamp: new Date(now - 20 * 60 * 60_000),
        carbs: 40,
        insulin: 0,
        meal: 'Old',
        glucoseValue: 7.0,
      },
    ],
  }),
}));

const renderCard = () =>
  render(
    <MemoryRouter>
      <RecentNotesCard />
    </MemoryRouter>
  );

describe('RecentNotesCard', () => {
  it('renders the header and add control', () => {
    renderCard();
    expect(screen.getByText('Recent notes (12h)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add note' })).toBeInTheDocument();
  });

  it('shows notes inside the 12 hour window and hides older ones', () => {
    renderCard();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Pre-bolus')).toBeInTheDocument();
    expect(screen.queryByText('Old')).not.toBeInTheDocument();
  });

  it('renders carb and insulin quantity pills', () => {
    renderCard();
    expect(screen.getByText('25 g')).toBeInTheDocument();
    expect(screen.getByText('1.0 u')).toBeInTheDocument();
  });
});
