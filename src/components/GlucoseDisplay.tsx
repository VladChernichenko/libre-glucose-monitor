import React from 'react';
import { format } from 'date-fns';
import { GlucoseReading } from '../types/libre';
import { InsulinDose } from '../types/notes';
import { InsulinCalculator } from '../services/insulinCalculator';

interface GlucoseDisplayProps {
  reading: GlucoseReading | null;
  isLoading?: boolean;
  insulinDoses?: InsulinDose[];
  currentTime?: Date;
}

const GlucoseDisplay: React.FC<GlucoseDisplayProps> = React.memo(({ 
  reading, 
  isLoading = false, 
  insulinDoses = [], 
  currentTime = new Date() 
}) => {
  if (isLoading) {
    return (
      <div className="glucose-card">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="glucose-card">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No glucose data available</p>
          <p className="text-sm">Connect your sensor to see real-time readings</p>
        </div>
      </div>
    );
  }

  // Calculate active insulin if doses are available
  const activeInsulin = insulinDoses.length > 0 
    ? InsulinCalculator.calculateTotalActiveInsulin(insulinDoses, currentTime)
    : 0;

  // Get glucose status color
  const getGlucoseColor = (status: string): string => {
    switch (status) {
      case 'low': return '#ef4444';      // red-500
      case 'normal': return '#10b981';   // emerald-500
      case 'high': return '#f59e0b';     // amber-500
      case 'critical': return '#dc2626'; // red-600
      default: return '#6b7280';         // gray-500
    }
  };

  return (
    <div className="glucose-card">
      <div className="text-center">
        {/* Glucose Value */}
        <div className="mb-2">
          <span 
            className="glucose-value text-6xl" 
            style={{ color: getGlucoseColor(reading.status) }}
          >
            {reading.value}
          </span>
          <span className="text-2xl text-gray-600 ml-2">
            {reading.unit || 'mmol/L'}
          </span>
        </div>
        
        {/* Timestamp and Additional Info */}
        <div className="text-gray-600 mb-4">
          <div className="text-sm">
            Last updated: {format(reading.timestamp, 'MMM dd, yyyy HH:mm')}
          </div>
          
          {reading.originalTimestamp && (
            <div className="text-xs text-gray-500 mt-1">
              Sensor data: {format(reading.originalTimestamp, 'MMM dd, yyyy HH:mm')}
            </div>
          )}
          
          {/* Active Insulin Display */}
          {activeInsulin > 0 && (
            <div className="text-xs text-blue-600 mt-2">
              active {activeInsulin.toFixed(1)}u
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GlucoseDisplay.displayName = 'GlucoseDisplay';

export default GlucoseDisplay;
