import React, { useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  ReferenceDot,
  ReferenceLine,
  ComposedChart,
  Line
} from 'recharts';
import { format } from 'date-fns';
import { GlucoseReading } from '../types/libre';
import { GlucoseNote } from '../types/notes';

interface CombinedGlucoseChartProps {
  glucoseData: GlucoseReading[];
  iobData: Array<{ time: Date; iob: number; prediction?: number }>;
  timeRange: '1h' | '6h' | '12h' | '24h';
  notes?: GlucoseNote[];
  onNoteClick?: (note: GlucoseNote) => void;
}

interface ChartDataPoint {
  time: number;
  glucose: number;
  prediction?: number;
  status: string;
  color: string;
  isFirstPoint: boolean;
  isPrediction?: boolean;
}

const CombinedGlucoseChart: React.FC<CombinedGlucoseChartProps> = ({ 
  glucoseData, 
  iobData, 
  timeRange, 
  notes = [], 
  onNoteClick 
}) => {
  // Helper function for glucose color coding
  const getGlucoseColor = (value: number): string => {
    if (value < 3.9) return '#EF4444';      // Red for low
    if (value < 10.0) return '#10B981';     // Green for normal
    if (value < 13.9) return '#F59E0B';     // Orange for high
    return '#DC2626';                       // Dark red for critical
  };

  // Combine and process data
  const chartData = useMemo(() => {
    if (!glucoseData || glucoseData.length === 0) {
      return [];
    }

    // Create a map of IOB data by time for easy lookup (for predictions only)
    const predictionMap = new Map<number, number>();
    iobData.forEach(item => {
      if (item.prediction !== undefined) {
        predictionMap.set(item.time.getTime(), item.prediction);
      }
    });

    // Process glucose data
    const processedData: ChartDataPoint[] = glucoseData.map((reading, index) => {
      const time = reading.timestamp.getTime();
      const prediction = predictionMap.get(time);
      
      return {
        time,
        glucose: reading.value,
        prediction,
        status: reading.status,
        color: getGlucoseColor(reading.value),
        isFirstPoint: index === 0,
        isPrediction: false
      };
    });

    // Add prediction points for future data
    const futurePredictions = iobData
      .filter(item => item.prediction !== undefined)
      .map(item => ({
        time: item.time.getTime(),
        glucose: item.prediction!,
        prediction: item.prediction,
        status: 'prediction',
        color: '#9CA3AF', // Gray for predictions
        isFirstPoint: false,
        isPrediction: true
      }));

    return [...processedData, ...futurePredictions].sort((a, b) => a.time - b.time);
  }, [glucoseData, iobData]);

  // Find local extremes for glucose values
  const findLocalExtremes = (data: ChartDataPoint[]) => {
    if (data.length < 3) return [];
    const extremes: Array<{point: ChartDataPoint, type: 'max' | 'min'}> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Only consider non-prediction points for extremes
      if (current.isPrediction) continue;
      
      if (current.glucose > prev.glucose && current.glucose > next.glucose) {
        extremes.push({point: current, type: 'max'});
      } else if (current.glucose < prev.glucose && current.glucose < next.glucose) {
        extremes.push({point: current, type: 'min'});
      }
    }
    return extremes;
  };

  const extremePoints = findLocalExtremes(chartData);

  const getValueColor = (value: number): string => {
    return getGlucoseColor(value);
  };

  // Early return if no data
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-lg font-medium">No data available</div>
          <div className="text-sm">Please check your data source</div>
        </div>
      </div>
    );
  }

  // Calculate domains
  const glucoseValues = chartData.map(d => d.glucose).filter(v => !isNaN(v));
  
  const glucoseMin = Math.min(...glucoseValues);
  const glucoseMax = Math.max(...glucoseValues);

  // Current time for reference line
  const currentTime = new Date().getTime();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const time = new Date(label);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="text-sm font-medium text-gray-900">
            {format(time, 'HH:mm')}
          </div>
          <div className="text-xs text-gray-600 mb-2">
            {format(time, 'MMM dd, yyyy')}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">
                Glucose: <span className="font-medium">{data.glucose?.toFixed(1)} mmol/L</span>
              </span>
            </div>
            
            
            {data.prediction && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-sm">
                  Prediction: <span className="font-medium">{data.prediction.toFixed(1)} mmol/L</span>
                </span>
              </div>
            )}
            
            {data.isPrediction && (
              <div className="text-xs text-gray-500 italic">Predicted</div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => format(new Date(value), 'HH:mm')}
            stroke="#6b7280"
            fontSize={10}
          />
          
          {/* Glucose Y-Axis (Left) */}
          <YAxis
            yAxisId="glucose"
            orientation="left"
            stroke="#3B82F6"
            domain={[Math.max(0, glucoseMin - 2), glucoseMax + 3]}
            tickFormatter={(value) => `${value}`}
            fontSize={10}
          />
          
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Glucose Area */}
          <Area
            yAxisId="glucose"
            type="monotone"
            dataKey="glucose"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          
          
          {/* Prediction Line */}
          <Line
            yAxisId="glucose"
            type="monotone"
            dataKey="prediction"
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          
          {/* Reference lines for glucose ranges */}
          <ReferenceLine yAxisId="glucose" y={3.9} stroke="#EF4444" strokeDasharray="2 2" strokeOpacity={0.7} />
          <ReferenceLine yAxisId="glucose" y={10.0} stroke="#10B981" strokeDasharray="2 2" strokeOpacity={0.7} />
          <ReferenceLine yAxisId="glucose" y={13.9} stroke="#F59E0B" strokeDasharray="2 2" strokeOpacity={0.7} />
          
          {/* Current moment reference line */}
          <ReferenceLine 
            yAxisId="glucose"
            x={currentTime} 
            stroke="#374151" 
            strokeWidth={2} 
            strokeDasharray="4 4"
            label={{ value: "NOW", position: "top", fontSize: 10, fill: "#374151" }}
          />
          
          {/* Local extremes labels */}
          {extremePoints.map((extreme, index) => {
            const position = extreme.type === 'max' ? 'top' : 'bottom';
            return (
              <ReferenceDot
                key={`extreme-${extreme.point.time}`}
                yAxisId="glucose"
                x={extreme.point.time}
                y={extreme.point.glucose}
                r={0}
                fill="transparent"
                label={{
                  value: `${extreme.point.glucose} mmol/L`,
                  position: position,
                  fontSize: 11,
                  fill: getValueColor(extreme.point.glucose),
                  fontWeight: 'bold',
                  offset: 8
                }}
              />
            );
          })}
          
          {/* Notes markers */}
          {notes.map((note) => {
            const noteTime = new Date(note.timestamp).getTime();
            const chartPoint = chartData.find(d => Math.abs(d.time - noteTime) < 300000); // 5 minutes tolerance
            
            if (chartPoint) {
              return (
                <ReferenceDot
                  key={`note-${note.id}`}
                  yAxisId="glucose"
                  x={noteTime}
                  y={chartPoint.glucose}
                  r={4}
                  fill="#F59E0B"
                  stroke="#D97706"
                  strokeWidth={2}
                  onClick={() => onNoteClick?.(note)}
                  style={{ cursor: 'pointer' }}
                />
              );
            }
            return null;
          })}
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex justify-center space-x-4 mt-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Glucose (mmol/L)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span>IOB (units)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span>Prediction</span>
        </div>
      </div>
    </div>
  );
};

export default CombinedGlucoseChart;
