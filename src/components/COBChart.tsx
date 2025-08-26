import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface COBChartProps {
  projection: Array<{time: Date, cob: number, iob: number}>;
  timeRange: '1h' | '6h' | '12h' | '24h';
}

const COBChart: React.FC<COBChartProps> = ({ projection, timeRange }) => {
  // Format data for the chart
  const chartData = projection.map(point => ({
    time: format(point.time, 'HH:mm'),
    timestamp: point.time.getTime(),
    'Carbs (g)': Math.round(point.cob * 10) / 10,
    'Insulin (u)': Math.round(point.iob * 100) / 100,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-600 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} {entry.name.includes('Carbs') ? 'g' : 'u'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get Y-axis domain for carbs
  const getCarbsDomain = () => {
    const maxCarbs = Math.max(...chartData.map(d => d['Carbs (g)']));
    return [0, Math.max(50, Math.ceil(maxCarbs * 1.2))];
  };

  // Get Y-axis domain for insulin
  const getInsulinDomain = () => {
    const maxInsulin = Math.max(...chartData.map(d => d['Insulin (u)']));
    return [0, Math.max(10, Math.ceil(maxInsulin * 1.2))];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🍞 COB & IOB Projection</h3>
        <p className="text-sm text-gray-600">
          Projected carbs on board and insulin on board over the next {timeRange}
        </p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            
            {/* X-axis */}
            <XAxis 
              dataKey="time" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            
            {/* Y-axis for carbs */}
            <YAxis 
              yAxisId="left"
              stroke="#3b82f6"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={getCarbsDomain()}
              label={{ value: 'Carbs (g)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            
            {/* Y-axis for insulin */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#8b5cf6"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={getInsulinDomain()}
              label={{ value: 'Insulin (u)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
            />
            
            {/* Tooltip */}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Legend */}
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            
            {/* Carbs line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Carbs (g)"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name="Carbs (g)"
            />
            
            {/* Insulin line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Insulin (u)"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
              name="Insulin (u)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Info */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-gray-500">Current COB</div>
          <div className="font-semibold text-blue-600">
            {chartData[0]?.['Carbs (g)'] || 0}g
          </div>
        </div>
        <div>
          <div className="text-gray-500">Peak COB</div>
          <div className="font-semibold text-blue-600">
            {Math.max(...chartData.map(d => d['Carbs (g)']))}g
          </div>
        </div>
        <div>
          <div className="text-gray-500">Current IOB</div>
          <div className="font-semibold text-purple-600">
            {chartData[0]?.['Insulin (u)'] || 0}u
          </div>
        </div>
      </div>
    </div>
  );
};

export default COBChart;
