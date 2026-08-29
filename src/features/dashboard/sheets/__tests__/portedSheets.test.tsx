import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AiSheet } from '../AiSheet';
import { VersionSheet } from '../VersionSheet';

vi.mock('../../../../components/AIInsightPanel', () => ({
  default: () => <div>AI Analyzer</div>,
}));
vi.mock('../../../../components/VersionInfo', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Version details</div> : null),
}));

describe('ported sheets', () => {
  it('AiSheet wraps the insight panel in a dialog', () => {
    render(
      <MemoryRouter>
        <AiSheet />
      </MemoryRouter>
    );
    expect(screen.getByRole('dialog', { name: 'AI insights' })).toBeInTheDocument();
    expect(screen.getByText('AI Analyzer')).toBeInTheDocument();
  });

  // VersionInfo renders its own overlay and header, so VersionSheet is a route
  // wrapper rather than a Sheet — nesting the two would stack dialogs.
  it('VersionSheet mounts version info opened', () => {
    render(
      <MemoryRouter>
        <VersionSheet />
      </MemoryRouter>
    );
    expect(screen.getByText('Version details')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Version' })).not.toBeInTheDocument();
  });
});
