import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceDot } from 'recharts';
import { format } from 'date-fns';
import { GlucoseReading } from '../types/libre';
import { GlucoseNote } from '../types/notes';

interface GlucoseChartProps {
  data: GlucoseReading[];
  timeRange: '1h' | '6h' | '12h' | '24h';
  notes?: GlucoseNote[];
  onNoteClick?: (note: GlucoseNote) => void;
}

interface ChartDataPoint {
  time: number;
  glucose: number;
  status: string;
  color: string;
  isFirstPoint: boolean;
}

const GlucoseChart: React.FC<GlucoseChartProps> = ({ data, timeRange, notes = [], onNoteClick }) => {
  const formatXAxis = (tickItem: any) => {
    if (!tickItem) return '';
    const date = new Date(tickItem);
    switch (timeRange) {
      case '1h':
        return format(date, 'HH:mm');
      case '6h':
        return format(date, 'HH:mm');
      case '12h':
        return format(date, 'HH:mm');
      case '24h':
        return format(date, 'MM/dd');
      default:
        return format(date, 'HH:mm');
    }
  };

  const formatTooltip = (value: any, name: string, props: any) => {
    if (name === 'glucose') {
      return [`${value} mmol/L`, 'Glucose Level'];
    }
    return [value, name];
  };

  const getGlucoseColor = (value: number) => {
    if (value < 70) return '#ef4444'; // red for low
    if (value < 180) return '#10b981'; // green for normal
    if (value < 250) return '#f59e0b'; // yellow for high
    return '#dc2626'; // red for critical
  };

  // Ensure data is sorted by timestamp
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // For 24h view, ensure we show a full 24-hour timeline
  let chartData: ChartDataPoint[];
  
  if (timeRange === '24h' && sortedData.length > 0) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    // Create a 24-hour timeline with data points
    chartData = sortedData.map((reading, index) => ({
      time: reading.timestamp.getTime(),
      glucose: reading.value,
      status: reading.status,
      color: getGlucoseColor(reading.value),
      isFirstPoint: index === 0, // Mark the first data point
    }));
    
    // If we don't have 24 hours of data, extend the timeline
    if (sortedData[0].timestamp > twentyFourHoursAgo) {
      console.log('📊 Extending 24h chart to show full timeline');
    }
  } else {
    chartData = sortedData.map((reading, index) => ({
      time: reading.timestamp.getTime(),
      glucose: reading.value,
      status: reading.status,
      color: getGlucoseColor(reading.value),
      isFirstPoint: index === 0, // Mark the first data point
    }));
  }

  return (
    <div className="glucose-card">

      <div className="h-full w-full min-h-96">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              tickFormatter={formatXAxis}
              type="number"
              domain={
                timeRange === '24h' && data.length > 0
                  ? [
                      new Date().getTime() - (24 * 60 * 60 * 1000), // 24 hours ago
                      new Date().getTime() // now
                    ]
                  : ['dataMin', 'dataMax']
              }
              stroke="#6b7280"
              allowDataOverflow={false}
            />
            <YAxis
              stroke="#6b7280"
              domain={[0, 'dataMax + 3']}
              tickFormatter={(value) => `${value} mmol/L`}
            />
            <Tooltip
              labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy HH:mm')}
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="glucose"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#glucoseGradient)"
              dot={(props: any) => {
                // Show bold dot only for the first data point
                if (props.payload.isFirstPoint) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={8}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={3}
                    />
                  );
                }
                // Return an invisible dot for other points to satisfy TypeScript
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={0}
                    fill="transparent"
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#3b82f6' }}
            />
            
            {/* Notes as markers on the timeline */}
            {notes.map((note) => {
              const noteTime = note.timestamp.getTime();
              const noteDataPoint = chartData.find(point => 
                Math.abs(point.time - noteTime) < 5 * 60 * 1000 // Within 5 minutes
              );
              
              if (!noteDataPoint) return null;
              
              return (
                <ReferenceDot
                  key={note.id}
                  x={noteDataPoint.time}
                  y={noteDataPoint.glucose}
                  r={6}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={2}
                  onClick={() => onNoteClick?.(note)}
                  style={{ cursor: onNoteClick ? 'pointer' : 'default' }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-gray-500">Target Range</div>
          <div className="font-semibold text-gray-900">3.9-10.0 mmol/L</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-gray-500">Current Trend</div>
          <div className="font-semibold text-gray-900">
            {data.length > 0 ? data[data.length - 1].trendArrow : '--'}
          </div>
        </div>
      </div>
      
      {/* Data availability indicator */}
      {data.length > 0 && (
        <div className="mt-3 text-center p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-700">
            {timeRange === '24h' ? (
              <>
                📊 24-hour view: Showing{' '}
                <span className="font-semibold">
                  {format(new Date(new Date().getTime() - (24 * 60 * 60 * 1000)), 'MMM dd, yyyy HH:mm')}
                </span>
                {' '}to{' '}
                <span className="font-semibold">
                  {format(new Date(), 'MMM dd, yyyy HH:mm')}
                </span>
                {' '}(Data available from{' '}
                <span className="font-semibold">
                  {format(sortedData[0].timestamp, 'MMM dd, yyyy HH:mm')}
                </span>
                {' '}onward)
              </>
            ) : (
              <>
                📊 Data available from{' '}
                <span className="font-semibold">
                  {format(sortedData[0].timestamp, 'MMM dd, yyyy HH:mm')}
                </span>
                {' '}to{' '}
                <span className="font-semibold">
                  {format(sortedData[sortedData.length - 1].timestamp, 'MMM dd, yyyy HH:mm')}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlucoseChart;
