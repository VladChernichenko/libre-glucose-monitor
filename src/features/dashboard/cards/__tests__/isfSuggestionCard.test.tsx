import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IsfSuggestionCard } from '../IsfSuggestionCard';

const fetchSuggestion = vi.fn();
const accept = vi.fn().mockResolvedValue(undefined);
const dismiss = vi.fn().mockResolvedValue(undefined);
// Every member is wrapped: vi.mock is hoisted above the const declarations,
// so the factory may only reference them lazily.
vi.mock('../../../../services/isfSuggestionApi', () => ({
  isfSuggestionApi: {
    fetch: () => fetchSuggestion(),
    accept: () => accept(),
    dismiss: () => dismiss(),
  },
}));

// Shape matches IsfMealWindowSuggestionDTO: proposals are keyed by mealWindow.
const suggestion = {
  show: true,
  windows: [{ mealWindow: 'BREAKFAST', currentIsf: 2.1, proposedIsf: 2.45, hasData: true }],
};

describe('IsfSuggestionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuggestion.mockResolvedValue(suggestion);
  });
  afterEach(() => vi.useRealTimers());

  it('renders in the morning when the server says show', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-06T08:00:00'));
    render(<IsfSuggestionCard />);
    expect(await screen.findByText('Updated ISF ready')).toBeInTheDocument();
    expect(screen.getByText(/Breakfast/)).toBeInTheDocument();
  });

  it('stays hidden outside the 05:00-11:00 window', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-06T15:00:00'));
    render(<IsfSuggestionCard />);
    await waitFor(() => expect(fetchSuggestion).toHaveBeenCalled());
    expect(screen.queryByText('Updated ISF ready')).not.toBeInTheDocument();
  });

  it('hides itself after Apply', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-06T08:00:00'));
    render(<IsfSuggestionCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(accept).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('Updated ISF ready')).not.toBeInTheDocument());
  });
});
