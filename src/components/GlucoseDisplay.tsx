import React from 'react';
import { format } from 'date-fns';
import { GlucoseReading } from '../types/libre';

interface GlucoseDisplayProps {
  reading: GlucoseReading | null;
  isLoading?: boolean;
}

const GlucoseDisplay: React.FC<GlucoseDisplayProps> = ({ reading, isLoading = false }) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'bg-glucose-low text-white';
      case 'normal':
        return 'bg-glucose-normal text-white';
      case 'high':
        return 'bg-glucose-high text-white';
      case 'critical':
        return 'bg-glucose-critical text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'low':
        return 'Low';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'High';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const getTrendIcon = (trendArrow: string) => {
    switch (trendArrow) {
      case '↗':
        return '↗️ Rising';
      case '↘':
        return '↘️ Falling';
      case '→':
        return '→ Stable';
      case '↗↗':
        return '↗️↗️ Rapidly Rising';
      case '↘↘':
        return '↘️↘️ Rapidly Falling';
      default:
        return '→ Stable';
    }
  };

  return (
    <div className="glucose-card">
      <div className="text-center">
        <div className="mb-4">
          <span className={`glucose-status ${getStatusColor(reading.status)}`}>
            {getStatusText(reading.status)}
          </span>
        </div>
        
        <div className="mb-2">
          <span className="glucose-value text-6xl" style={{ color: getStatusColor(reading.status).includes('low') ? '#ef4444' : getStatusColor(reading.status).includes('normal') ? '#10b981' : getStatusColor(reading.status).includes('high') ? '#f59e0b' : '#dc2626' }}>
            {reading.value}
          </span>
          <span className="text-2xl text-gray-600 ml-2">{reading.unit}</span>
        </div>
        
        <div className="text-gray-600 mb-4">
          <div className="text-lg font-medium">{getTrendIcon(reading.trendArrow)}</div>
          <div className="text-sm">Last updated: {format(reading.timestamp, 'MMM dd, yyyy HH:mm')}</div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500">Target</div>
            <div className="font-semibold text-gray-900">70-180</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500">Trend</div>
            <div className="font-semibold text-gray-900">{reading.trend}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-500">Status</div>
            <div className="font-semibold text-gray-900">{reading.status}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlucoseDisplay;
