import React, { useState, useEffect } from 'react';
import { 
  getClientTimeInfo, 
  getCurrentLocalTime, 
  getTimezoneDisplayName,
  formatDateForBackend,
  logTimezoneInfo 
} from '../utils/timezone';

/**
 * Test component to demonstrate timezone handling functionality
 * This can be temporarily added to Dashboard to verify timezone behavior
 */
const TimezoneTest: React.FC = () => {
  const [timeInfo, setTimeInfo] = useState(getClientTimeInfo());
  const [currentTime, setCurrentTime] = useState(getCurrentLocalTime());

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setTimeInfo(getClientTimeInfo());
      setCurrentTime(getCurrentLocalTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogTimezone = () => {
    logTimezoneInfo();
  };

  const testBackendFormat = () => {
    const now = getCurrentLocalTime();
    const formatted = formatDateForBackend(now);
    console.log('🕐 Backend format test:', {
      original: now.toISOString(),
      formatted: formatted,
      difference: 'Formatted preserves local timezone context'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">🌍 Timezone Test Panel</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Client Information</h4>
          <div className="text-sm space-y-1">
            <div><strong>Timezone:</strong> {timeInfo.timezone}</div>
            <div><strong>Locale:</strong> {timeInfo.locale}</div>
            <div><strong>Display Name:</strong> {getTimezoneDisplayName()}</div>
            <div><strong>UTC Offset:</strong> {timeInfo.timezoneOffset} minutes</div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Current Time</h4>
          <div className="text-sm space-y-1">
            <div><strong>Local Time:</strong> {currentTime.toLocaleString()}</div>
            <div><strong>ISO String:</strong> {timeInfo.timestamp}</div>
            <div><strong>Backend Format:</strong> {formatDateForBackend(currentTime)}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 space-x-2">
        <button
          onClick={handleLogTimezone}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Log Timezone Info
        </button>
        <button
          onClick={testBackendFormat}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          Test Backend Format
        </button>
      </div>
      
      <div className="mt-3 text-xs text-gray-600">
        <p>This panel shows how the application now captures and uses your local timezone instead of server time.</p>
        <p>Check the browser console for detailed timezone information when you click the buttons above.</p>
      </div>
    </div>
  );
};

export default TimezoneTest;
