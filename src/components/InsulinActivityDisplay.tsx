import React from 'react';
import { InsulinCalculator, InsulinDose } from '../services/insulinCalculator';

interface InsulinActivityDisplayProps {
  notes: any[]; // GlucoseNote[] with insulin doses
  currentTime?: Date;
}

const InsulinActivityDisplay: React.FC<InsulinActivityDisplayProps> = ({ 
  notes, 
  currentTime = new Date() 
}) => {
  // Extract insulin doses from notes
  const insulinDoses: InsulinDose[] = notes
    .filter(note => note.insulin > 0)
    .map(note => ({
      id: note.id,
      timestamp: note.timestamp,
      units: note.insulin,
      type: (note.meal === 'Correction' ? 'correction' : 'bolus') as 'correction' | 'bolus' | 'basal',
      note: note.comment,
      mealType: note.meal
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Most recent first

  // Calculate current active insulin
  const totalActiveInsulin = InsulinCalculator.calculateTotalActiveInsulin(insulinDoses, currentTime);
  const activityStatus = InsulinCalculator.getInsulinActivityStatus(insulinDoses, currentTime);
  const activityDescription = InsulinCalculator.getInsulinActivityDescription(insulinDoses, currentTime);

  if (insulinDoses.length === 0) {
    return (
      <div className="insulin-activity-card">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Insulin Activity</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">💉</div>
          <div>No insulin doses recorded</div>
          <div className="text-sm">Add notes with insulin to see activity</div>
        </div>
      </div>
    );
  }

  return (
    <div className="insulin-activity-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Insulin Activity</h3>
      </div>
      
      {/* Current Status */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-500 text-sm">Active Insulin</div>
            <div className="text-2xl font-bold text-blue-700">
              {totalActiveInsulin.toFixed(1)}u
            </div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-purple-500 text-sm">Status</div>
            <div className="text-lg font-semibold text-purple-700">
              {activityStatus === 'rising' && '↗️ Rising'}
              {activityStatus === 'peak' && '🔺 Peak'}
              {activityStatus === 'falling' && '↘️ Falling'}
              {activityStatus === 'none' && '➖ None'}
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">{activityDescription}</div>
        </div>
      </div>

      {/* Fiasp Information */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-1">💉 Fiasp Insulin Profile:</div>
          <div>• Onset: 1-3 min • Peak: 60-90 min • Duration: 3-5h • Half-life: 42 min</div>
        </div>
      </div>
    </div>
  );
};

export default InsulinActivityDisplay;
