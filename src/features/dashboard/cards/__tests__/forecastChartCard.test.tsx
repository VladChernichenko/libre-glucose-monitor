import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForecastChartCard } from '../ForecastChartCard';

// jsdom gives ResponsiveContainer a zero-size parent, so the real one never
// renders. Recharts 3 charts size themselves from explicit width/height props,
// which ResponsiveContainer normally injects — the mock has to do the same.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>
        {React.cloneElement(children as React.ReactElement<{ width: number; height: number }>, {
          width: 400,
          height: 300,
        })}
      </div>
    ),
  };
});

const base = Date.now();
vi.mock('../../../../state/GlucoseStore', () => ({
  useGlucose: () => ({
    glucoseHistory: [
      {
        value: 15.2,
        timestamp: new Date(base - 3600_000),
        trend: 0,
        trendArrow: '→',
        status: 'high',
        unit: 'mmol/L',
      },
      {
        value: 8.5,
        timestamp: new Date(base),
        trend: 0,
        trendArrow: '↘',
        status: 'normal',
        unit: 'mmol/L',
      },
    ],
    calculations: {
      predictionPath: [
        { timestamp: new Date(base + 1800_000).toISOString(), predictedGlucose: 7.4 },
        { timestamp: new Date(base + 3600_000).toISOString(), predictedGlucose: 6.2 },
      ],
    },
    notes: [],
  }),
}));

describe('ForecastChartCard', () => {
  it('renders the titled card', () => {
    render(<ForecastChartCard />);
    expect(screen.getByText('Forecast (4h)')).toBeInTheDocument();
  });

  it('renders a chart surface when history exists', () => {
    const { container } = render(<ForecastChartCard />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
