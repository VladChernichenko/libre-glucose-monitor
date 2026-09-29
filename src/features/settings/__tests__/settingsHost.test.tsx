import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsHost } from '../SettingsHost';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'vlad' }, isAuthenticated: true, logout: vi.fn() }),
}));

describe('SettingsHost', () => {
  it('renders the large title and the configuration entries', () => {
    render(
      <MemoryRouter>
        <SettingsHost />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.getByText('Carbs on Board')).toBeInTheDocument();
    expect(screen.getByText('Insulin Preferences')).toBeInTheDocument();
  });

  // DataSourceConfigModal carries no role="dialog" — it is rebuilt in slice D and
  // must not be edited here — so this asserts on the heading it does render.
  it('opens the data source configuration modal', async () => {
    render(
      <MemoryRouter>
        <SettingsHost />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByText('Data Source'));
    expect(
      await screen.findByRole('heading', { name: /configure data source/i })
    ).toBeInTheDocument();
  });
});
