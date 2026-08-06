import React, { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../ui/Card';
import { useGlucose } from '../../../state/GlucoseStore';

const WINDOW_MS = 4 * 60 * 60 * 1000;
const TARGET_LOW = 4;
const TARGET_HIGH = 10;
// Puts a typical 1-10 u dose in the bottom quarter of the plot. Widen it
// rather than clamping if a real dose ever renders taller than the band —
// a clipped bar misrepresents the dose.
const INSULIN_AXIS_MAX = 40;

interface Point {
  t: number;
  history?: number;
  prediction?: number;
  /** Glucose at a logged note — drawn as an orange point marker. */
  marker?: number;
  /** Units of a logged dose — drawn as a bar on the hidden insulin axis. */
  insulin?: number;
}

export const ForecastChartCard: React.FC = () => {
  const { glucoseHistory, calculations, notes } = useGlucose();

  const recentNotes = useMemo(
    () => notes.filter((n) => n.timestamp.getTime() >= Date.now() - WINDOW_MS / 2),
    [notes]
  );

  // Recharts 3 dropped the per-series `data` prop, so every series has to come
  // out of the chart-level array, merged by timestamp.
  const data = useMemo<Point[]>(() => {
    const from = Date.now() - WINDOW_MS / 2;
    const byTime = new Map<number, Point>();
    const at = (t: number): Point => {
      const existing = byTime.get(t);
      if (existing) return existing;
      const created: Point = { t };
      byTime.set(t, created);
      return created;
    };

    const past: Point[] = [];
    glucoseHistory
      .filter((r) => r.timestamp.getTime() >= from)
      .forEach((r) => {
        const point = at(r.timestamp.getTime());
        point.history = r.value;
        past.push(point);
      });

    // Join the two series so the dashed line starts exactly at the last reading.
    const last = past[past.length - 1];
    if (last) last.prediction = last.history;

    (calculations?.predictionPath ?? []).forEach((p) => {
      at(new Date(p.timestamp).getTime()).prediction = p.predictedGlucose;
    });

    recentNotes.forEach((n) => {
      const point = at(n.timestamp.getTime());
      if (n.glucoseValue !== undefined) point.marker = n.glucoseValue;
      if (n.insulin > 0) point.insulin = n.insulin;
    });

    return [...byTime.values()].sort((a, b) => a.t - b.t);
  }, [glucoseHistory, calculations, recentNotes]);

  return (
    <Card>
      <h2 className="mb-2 text-gm-card-title text-label">Forecast (4h)</h2>
      {data.length === 0 ? (
        <p className="py-8 text-center text-gm-body text-label-secondary">No readings yet.</p>
      ) : (
        <div className="h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 18, right: 6, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="var(--gm-separator)" vertical={false} />
              <ReferenceArea
                yAxisId="glucose"
                y1={TARGET_LOW}
                y2={TARGET_HIGH}
                fill="var(--gm-green)"
                fillOpacity={0.15}
              />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(t) =>
                  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                }
                tick={{ fontSize: 10, fill: 'var(--gm-label-secondary)' }}
              />
              <YAxis
                yAxisId="glucose"
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                tick={{ fontSize: 10, fill: 'var(--gm-label-tertiary)' }}
              />
              <YAxis yAxisId="insulin" hide domain={[0, INSULIN_AXIS_MAX]} />
              <ReferenceLine
                yAxisId="glucose"
                x={Date.now()}
                stroke="var(--gm-label)"
                strokeDasharray="4 3"
              />
              {recentNotes.map((n) => (
                <ReferenceLine
                  key={n.id}
                  yAxisId="glucose"
                  x={n.timestamp.getTime()}
                  stroke="var(--gm-green)"
                  strokeWidth={2}
                  label={
                    n.carbs > 0
                      ? {
                          value: `${n.carbs}g`,
                          position: 'top',
                          fontSize: 11,
                          fill: 'var(--gm-label)',
                        }
                      : undefined
                  }
                />
              ))}
              <Bar
                yAxisId="insulin"
                dataKey="insulin"
                barSize={8}
                radius={4}
                fill="#9ecdfa"
                isAnimationActive={false}
              >
                <LabelList dataKey="insulin" position="top" fontSize={9} fontWeight={700} />
              </Bar>
              <Line
                yAxisId="glucose"
                type="monotone"
                dataKey="history"
                stroke="var(--gm-blue)"
                strokeWidth={3}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId="glucose"
                type="monotone"
                dataKey="prediction"
                stroke="var(--gm-blue)"
                strokeWidth={3}
                strokeDasharray="7 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Scatter
                yAxisId="glucose"
                dataKey="marker"
                fill="var(--gm-orange)"
                shape="circle"
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="marker"
                  position="top"
                  fontSize={9}
                  fill="var(--gm-orange)"
                  fontWeight={600}
                />
              </Scatter>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
