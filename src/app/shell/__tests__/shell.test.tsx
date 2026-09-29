import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CapsuleTabBar } from '../CapsuleTabBar';
import { CapsuleToolbar } from '../CapsuleToolbar';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CapsuleTabBar />
    </MemoryRouter>
  );

describe('shell chrome', () => {
  it('renders all four tabs', () => {
    renderAt('/dashboard');
    ['Dashboard', 'Notes', 'Experiments', 'Settings'].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument()
    );
  });

  it('marks the active tab as current', () => {
    renderAt('/experiments');
    expect(screen.getByRole('link', { name: /Experiments/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: /Dashboard/ })).not.toHaveAttribute('aria-current');
  });

  it('toolbar invokes an action on click', async () => {
    const onClick = vi.fn();
    render(
      <CapsuleToolbar
        actions={[{ key: 'refresh', label: 'Refresh', icon: <span>R</span>, onClick }]}
      />
    );
    screen.getByRole('button', { name: 'Refresh' }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
