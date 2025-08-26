import React from 'react';
import { format } from 'date-fns';
import { COBStatus, COBEntry } from '../services/carbsOnBoard';

interface COBDisplayProps {
  cobStatus: COBStatus;
  onEditEntry?: (entry: COBEntry) => void;
  onDeleteEntry?: (entryId: string) => void;
}

const COBDisplay: React.FC<COBDisplayProps> = ({
  cobStatus,
  onEditEntry,
  onDeleteEntry
}) => {
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getCOBColor = (cob: number): string => {
    if (cob === 0) return 'text-gray-500';
    if (cob < 10) return 'text-green-600';
    if (cob < 30) return 'text-yellow-600';
    if (cob < 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGlucoseImpactColor = (impact: number): string => {
    if (Math.abs(impact) < 0.5) return 'text-gray-500';
    if (impact > 0) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">🍞 Carbs on Board</h3>
        <div className="text-sm text-gray-500">
          Last updated: {format(new Date(), 'HH:mm')}
        </div>
      </div>

      {/* Main COB Status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current COB */}
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className={`text-2xl font-bold ${getCOBColor(cobStatus.currentCOB)}`}>
            {cobStatus.currentCOB}g
          </div>
          <div className="text-sm text-gray-600">Active Carbs</div>
        </div>

        {/* Insulin on Board */}
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {cobStatus.insulinOnBoard}u
          </div>
          <div className="text-sm text-gray-600">Active Insulin</div>
        </div>
      </div>

      {/* Glucose Impact & Time to Zero */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={`text-lg font-semibold ${getGlucoseImpactColor(cobStatus.estimatedGlucoseImpact)}`}>
            {cobStatus.estimatedGlucoseImpact > 0 ? '+' : ''}{cobStatus.estimatedGlucoseImpact} mmol/L
          </div>
          <div className="text-sm text-gray-600">Net Glucose Impact</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-700">
            {cobStatus.timeToZero > 0 ? formatTime(cobStatus.timeToZero) : '0m'}
          </div>
          <div className="text-sm text-gray-600">Time to Zero</div>
        </div>
      </div>

      {/* Active Entries */}
      {cobStatus.activeEntries.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 text-sm">Active Meals</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {cobStatus.activeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{entry.mealType}</span>
                    <span className="text-xs text-gray-500">
                      {format(entry.timestamp, 'HH:mm')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {entry.originalCarbs || entry.carbs}g carbs • {entry.insulin}u insulin
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Remaining</div>
                    <div className="font-medium text-blue-600">{entry.carbs}g</div>
                    {entry.originalCarbs && entry.originalCarbs !== entry.carbs && (
                      <div className="text-xs text-gray-400">
                        of {entry.originalCarbs}g
                      </div>
                    )}
                  </div>
                  
                  {onEditEntry && (
                    <button
                      onClick={() => onEditEntry(entry)}
                      className="text-blue-400 hover:text-blue-600 transition-colors p-1"
                      title="Edit entry"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  
                  {onDeleteEntry && (
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      title="Delete entry"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-gray-400 text-2xl mb-2">🍽️</div>
          <p className="text-gray-500 text-sm">No active carbs</p>
          <p className="text-gray-400 text-xs">All meals have been processed</p>
        </div>
      )}

      {/* COB Progress Bar */}
      {cobStatus.currentCOB > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">COB Progress</span>
            <span className="text-gray-500">
              {cobStatus.timeToZero > 0 ? formatTime(cobStatus.timeToZero) : 'Complete'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (cobStatus.currentCOB / 50) * 100)}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default COBDisplay;
