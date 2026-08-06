import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NoteEditorSheet } from '../NoteEditorSheet';

const createNote = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({ notes: [], createNote, updateNote: vi.fn(), deleteNote: vi.fn() }),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/note/new" element={<NoteEditorSheet />} />
        <Route path="/dashboard/note/:id" element={<NoteEditorSheet />} />
      </Routes>
    </MemoryRouter>
  );

describe('NoteEditorSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens as a dialog titled for a new note', () => {
    renderAt('/dashboard/note/new');
    expect(screen.getByRole('dialog', { name: 'Add note' })).toBeInTheDocument();
  });

  it('submits carbs, insulin and meal', async () => {
    renderAt('/dashboard/note/new');
    await userEvent.type(screen.getByLabelText('Carbs (g)'), '25');
    await userEvent.type(screen.getByLabelText('Insulin (u)'), '4');
    await userEvent.selectOptions(screen.getByLabelText('Meal'), 'Lunch');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(createNote).toHaveBeenCalledWith(
        expect.objectContaining({ carbs: 25, insulin: 4, meal: 'Lunch' })
      )
    );
  });

  it('rejects a note with neither carbs nor insulin', async () => {
    renderAt('/dashboard/note/new');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter carbs, insulin, or both.')).toBeInTheDocument();
    expect(createNote).not.toHaveBeenCalled();
  });
});
