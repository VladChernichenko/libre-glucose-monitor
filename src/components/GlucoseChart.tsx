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
  // Memoize chart data to prevent unnecessary re-renders
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) {
      console.log('📊 No data provided to chart');
      return [];
    }
    
    // Ensure data is properly sorted and valid
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Filter out invalid data points
    const validData = sortedData.filter(reading => 
      reading && 
      reading.timestamp && 
      !isNaN(reading.timestamp.getTime()) && 
      !isNaN(reading.value) && 
      reading.value > 0
    );
    
    if (validData.length === 0) {
      console.warn('⚠️ No valid data points found after filtering');
      return [];
    }
    
    if (validData.length !== sortedData.length) {
      console.warn(`⚠️ Filtered out ${sortedData.length - validData.length} invalid data points`);
    }
    
    // Create chart data points
    const result = validData.map((reading, index) => ({
      time: reading.timestamp.getTime(),
      glucose: reading.value,
      status: reading.status,
      color: getGlucoseColor(reading.value),
      isFirstPoint: index === 0,
    }));
    
    console.log(`📊 Chart data prepared: ${result.length} valid points, time range: ${new Date(result[0].time).toISOString()} to ${new Date(result[result.length - 1].time).toISOString()}`);
    
    return result;
  }, [data]);

  // Get sorted data for display purposes
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [data]);

  const formatXAxis = (tickItem: any) => {
    if (!tickItem) return '';
    const date = new Date(tickItem);
    switch (timeRange) {
      case '1h':
        return format(date, 'HH:mm');
      case '6h':
        return format(date, 'HH:mm');
      case '12h':
        return format(date, 'MM/dd');
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



  return (
    <div className="glucose-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Glucose Trend</h3>
      </div>

      <div className="h-80">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div>No glucose data available</div>
              <div className="text-sm">Select a different time range or check your data</div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData}
              key={`chart-${timeRange}-${chartData.length}-${chartData[0]?.time || 0}`}
            >
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
                timeRange === '24h' && chartData.length > 0
                  ? [
                      Math.min(
                        chartData[0].time, // Start of data
                        new Date().getTime() - (24 * 60 * 60 * 1000) // 24 hours ago
                      ),
                      Math.max(
                        chartData[chartData.length - 1].time, // End of data
                        new Date().getTime() // now
                      )
                    ]
                  : ['dataMin', 'dataMax']
              }
              stroke="#6b7280"
              allowDataOverflow={false}
              scale="time"
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
        )}
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
