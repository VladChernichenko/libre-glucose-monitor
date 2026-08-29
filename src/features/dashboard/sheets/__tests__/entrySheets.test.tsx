import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActivitySheet } from '../ActivitySheet';
import { LongActingSheet } from '../LongActingSheet';

const createNote = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({ createNote, notes: [] }),
}));

describe('entry sheets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ActivitySheet records activity as a note', async () => {
    render(
      <MemoryRouter>
        <ActivitySheet />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText('Duration (minutes)'), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith(
        expect.objectContaining({ meal: 'Other', carbs: 0, insulin: 0 })
      )
    );
  });

  it('LongActingSheet records a dose as an insulin note', async () => {
    render(
      <MemoryRouter>
        <LongActingSheet />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText('Units'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith(expect.objectContaining({ insulin: 12 }))
    );
  });
});
