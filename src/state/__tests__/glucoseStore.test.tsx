import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlucoseProvider, useGlucose } from '../GlucoseStore';

const getCurrentGlucose = vi.fn();
const getGlucoseEntries = vi.fn();

vi.mock('../../services/nightscout/enhancedNightscoutService', () => ({
  EnhancedNightscoutService: class {
    getCurrentGlucose = getCurrentGlucose;
    getGlucoseEntries = getGlucoseEntries;
  },
}));
vi.mock('../../services/glucoseCalculationsApi', () => ({
  glucoseCalculationsApi: { getGlucoseCalculations: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../services/hybridNotesApi', () => ({
  hybridNotesApiService: { getNotes: vi.fn().mockResolvedValue([]) },
}));

const Probe: React.FC = () => {
  const { currentReading, refreshGlucoseOnly } = useGlucose();
  return (
    <>
      <span data-testid="value">{currentReading?.value ?? 'none'}</span>
      <button onClick={() => refreshGlucoseOnly()}>refresh</button>
    </>
  );
};

const renderStore = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <GlucoseProvider>
        <Probe />
      </GlucoseProvider>
    </MemoryRouter>
  );

describe('GlucoseStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentGlucose.mockResolvedValue({
      success: true,
      source: 'nightscout',
      data: { sgv: 112, date: Date.now(), direction: 'Flat' },
    });
    getGlucoseEntries.mockResolvedValue({ success: true, source: 'nightscout', data: [] });
  });

  it('loads a reading on mount', async () => {
    renderStore();
    await waitFor(() => expect(screen.getByTestId('value').textContent).not.toBe('none'));
  });

  it('coalesces concurrent refreshes into one network call', async () => {
    renderStore();
    await waitFor(() => expect(getCurrentGlucose).toHaveBeenCalled());
    const callsAfterMount = getCurrentGlucose.mock.calls.length;

    const button = screen.getByText('refresh');
    button.click();
    button.click();
    button.click();

    await waitFor(() => expect(getCurrentGlucose.mock.calls.length).toBe(callsAfterMount + 1));
  });
});
