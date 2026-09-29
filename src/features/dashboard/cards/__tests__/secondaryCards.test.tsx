import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickActions } from '../QuickActions';
import { SensorAlarmsCard } from '../SensorAlarmsCard';

const mockState = { dataSource: 'NIGHTSCOUT' as 'NIGHTSCOUT' | 'LIBRE_LINK_UP' };
vi.mock('../../../../state/GlucoseStore', () => ({ useGlucose: () => mockState }));

describe('secondary dashboard cards', () => {
  it('QuickActions links to the four sheet routes', () => {
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Add note' })).toHaveAttribute(
      'href',
      '/dashboard/note/new'
    );
    expect(screen.getByRole('link', { name: 'Scan food' })).toHaveAttribute(
      'href',
      '/dashboard/scan'
    );
    expect(screen.getByRole('link', { name: 'AI insights' })).toHaveAttribute(
      'href',
      '/dashboard/ai'
    );
    expect(screen.getByRole('link', { name: 'Log activity' })).toHaveAttribute(
      'href',
      '/dashboard/activity'
    );
  });

  it('SensorAlarmsCard shows for LibreLinkUp', () => {
    mockState.dataSource = 'LIBRE_LINK_UP';
    render(
      <MemoryRouter>
        <SensorAlarmsCard />
      </MemoryRouter>
    );
    expect(screen.getByText('Sensor connected')).toBeInTheDocument();
  });

  it('SensorAlarmsCard stays hidden for Nightscout, which has no sensor metadata', () => {
    mockState.dataSource = 'NIGHTSCOUT';
    const { container } = render(
      <MemoryRouter>
        <SensorAlarmsCard />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
