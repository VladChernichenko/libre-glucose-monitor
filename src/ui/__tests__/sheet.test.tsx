import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from '../Sheet';

describe('Sheet', () => {
  it('renders as a labelled dialog with its title and content', () => {
    render(
      <Sheet title="Add note" onClose={() => {}}>
        body
      </Sheet>
    );
    const dialog = screen.getByRole('dialog', { name: 'Add note' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Add note" onClose={onClose}>
        body
      </Sheet>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Sheet title="Add note" onClose={onClose}>
        body
      </Sheet>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
