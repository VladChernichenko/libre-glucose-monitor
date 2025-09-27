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
  // Add data validation and debugging
  console.log('📊 GlucoseChart received data:', {
    dataLength: data.length,
    timeRange,
    sampleData: data.slice(0, 3),
    hasValidData: data.length > 0 && data.every(item => item && item.timestamp && typeof item.value === 'number')
  });

  // Check data freshness - consider data obsolete if latest reading is over 15 minutes old
  const isDataObsolete = React.useMemo(() => {
    if (!data || data.length === 0) return true;
    
    const latestReading = data[data.length - 1];
    if (!latestReading || !latestReading.timestamp) return true;
    
    const now = new Date();
    const latestTime = new Date(latestReading.timestamp);
    const ageInMinutes = (now.getTime() - latestTime.getTime()) / (1000 * 60);
    
    return ageInMinutes > 15; // Data is obsolete if older than 15 minutes
  }, [data]);

  // Early return if no data at all
  if (!data || data.length === 0) {
    console.log('❌ No data provided to GlucoseChart');
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-lg font-medium">No glucose data available</div>
          <div className="text-sm">Please check your data source or try refreshing</div>
        </div>
      </div>
    );
  }

  // Simple validation - just check if we have basic structure
  const validData = data.filter(item => 
    item && 
    item.timestamp && 
    typeof item.value === 'number'
  );

  console.log('📊 Data validation results:', {
    originalLength: data.length,
    validLength: validData.length,
    firstValidItem: validData[0],
    sampleValidData: validData.slice(0, 3)
  });

  if (validData.length === 0) {
    console.log('❌ No valid data after filtering');
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-lg font-medium">Invalid data format</div>
          <div className="text-sm">Please check your data source</div>
        </div>
      </div>
    );
  }

  // Show warning for obsolete data
  if (isDataObsolete) {
    console.log('⏰ Data is obsolete');
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">⏰</div>
          <div className="text-lg font-medium">Data is outdated</div>
          <div className="text-sm">Latest reading is more than 15 minutes old</div>
          <div className="text-xs mt-2 text-gray-400">Please refresh or check your data source</div>
        </div>
      </div>
    );
  }

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
    if (value < 3.9) return '#ef4444'; // red for low (mmol/L)
    if (value < 10.0) return '#10b981'; // green for normal (mmol/L)
    if (value < 13.9) return '#f59e0b'; // yellow for high (mmol/L)
    return '#dc2626'; // red for critical (mmol/L)
  };

  // Ensure data is sorted by timestamp
  const sortedData = [...validData].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Find all local minimums and maximums with type information
  const findLocalExtremes = (data: GlucoseReading[]) => {
    if (data.length < 3) return []; // Need at least 3 points to find local extremes
    
    const extremes: Array<{point: GlucoseReading, type: 'max' | 'min'}> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Local maximum: current value is higher than both neighbors
      if (current.value > prev.value && current.value > next.value) {
        extremes.push({point: current, type: 'max'});
      }
      // Local minimum: current value is lower than both neighbors
      else if (current.value < prev.value && current.value < next.value) {
        extremes.push({point: current, type: 'min'});
      }
    }
    
    return extremes;
  };

  const extremePoints = findLocalExtremes(sortedData);
  
  // Get color based on glucose value
  const getValueColor = (value: number) => {
    if (value < 3.9) return '#dc2626'; // red for low
    if (value < 10.0) return '#10b981'; // green for in range
    return '#f59e0b'; // orange for high
  };
  
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
    <div className="h-full w-full">

      <div className="h-full w-full">
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
                  timeRange === '24h' && chartData.length > 0
                    ? [
                        Math.min(...chartData.map(d => d.time)), // Start from earliest data point
                        Math.max(...chartData.map(d => d.time))  // End at latest data point
                      ]
                    : ['dataMin', 'dataMax']
                }
                stroke="#6b7280"
                allowDataOverflow={false}
              />
            <YAxis
              stroke="#6b7280"
              domain={[0, 'dataMax + 3']}
              tickFormatter={(value) => `${value}`}
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
              isAnimationActive={false}
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
            
            {/* Local extremes value labels */}
            {extremePoints.map((extreme, index) => {
              const position = extreme.type === 'max' ? 'top' : 'bottom';
              
              return (
                <ReferenceDot
                  key={`extreme-${extreme.point.timestamp.getTime()}`}
                  x={extreme.point.timestamp.getTime()}
                  y={extreme.point.value}
                  r={0}
                  fill="transparent"
                  label={{ 
                    value: `${extreme.point.value} mmol/L`, 
                    position: position,
                    fontSize: 11,
                    fill: getValueColor(extreme.point.value),
                    fontWeight: 'bold',
                    offset: 8
                  }}
                />
              );
            })}

            {/* Notes as markers on the timeline - only show notes within selected time range */}
            {(() => {
              const now = new Date().getTime();
              
              // Calculate time range based on selected timeRange
              let startTime: number;
              switch (timeRange) {
                case '1h':
                  startTime = now - (1 * 60 * 60 * 1000);
                  break;
                case '6h':
                  startTime = now - (6 * 60 * 60 * 1000);
                  break;
                case '12h':
                  startTime = now - (12 * 60 * 60 * 1000);
                  break;
                case '24h':
                  startTime = now - (24 * 60 * 60 * 1000);
                  break;
                default:
                  startTime = now - (6 * 60 * 60 * 1000); // Default to 6h
              }
              
              const filteredNotes = notes.filter((note) => {
                const noteTime = note.timestamp.getTime();
                const isInRange = noteTime >= startTime && noteTime <= now;
                
                // Debug logging
                console.log(`Note: ${new Date(noteTime).toLocaleString()}, Range: ${timeRange}, InRange: ${isInRange}`);
                console.log(`Start: ${new Date(startTime).toLocaleString()}, Now: ${new Date(now).toLocaleString()}`);
                
                return isInRange;
              });
              
              console.log(`Filtered ${filteredNotes.length} notes from ${notes.length} total for ${timeRange} range`);
              
              return filteredNotes.map((note) => {
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
              });
            })()}
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
                  {format(sortedData[0].timestamp, 'MMM dd, yyyy HH:mm')}
                </span>
                {' '}to{' '}
                <span className="font-semibold">
                  {format(sortedData[sortedData.length - 1].timestamp, 'MMM dd, yyyy HH:mm')}
                </span>
                {' '}(Full data range displayed)
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
