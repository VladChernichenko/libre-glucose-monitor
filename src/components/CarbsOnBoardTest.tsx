import React, { useState } from 'react';

export const CarbsOnBoardTest: React.FC = () => {
  const [userId, setUserId] = useState<string>('test-user-1');
  const [carbs, setCarbs] = useState<number>(60);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString().slice(0, 16));
  const [durationHours, setDurationHours] = useState<number>(4);
  
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [cobStatus, setCobStatus] = useState<any>(null);
  const [timelineResult, setTimelineResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sample COB entries for testing
  const sampleEntries = [
    {
      carbs: 45,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      mealType: 'Lunch',
      comment: 'Sandwich and chips'
    },
    {
      carbs: 30,
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      mealType: 'Snack',
      comment: 'Apple and nuts'
    }
  ];

  // Test COB calculation
  const handleCalculate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8080/api/cob/calculate?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carbs,
          timestamp: new Date(timestamp).toISOString(),
          userId
        }),
      });

      const result = await response.json();
      setCalculationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Test COB status
  const handleGetStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8080/api/cob/status?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: sampleEntries }),
      });

      const result = await response.json();
      setCobStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Test COB timeline
  const handleGetTimeline = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const entry = {
        carbs,
        timestamp: new Date(timestamp).toISOString(),
        mealType: 'Test Meal'
      };
      
      const response = await fetch(`http://localhost:8080/api/cob/timeline?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entry, durationHours }),
      });

      const result = await response.json();
      setTimelineResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Test different users to see migration pattern
  const testDifferentUsers = () => {
    const users = ['test-user-1', 'test-user-20', 'test-user-25', 'test-user-30'];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    setUserId(randomUser);
  };

  // Get status badge color based on user ID
  const getStatusBadge = () => {
    const userNum = parseInt(userId.replace('test-user-', ''));
    if (userNum >= 20 && userNum <= 27) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        🚀 Backend (25% migration)
      </span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        💻 Frontend (75% fallback)
      </span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🍞 Carbs on Board (COB) Service Test
        </h1>
        <p className="text-gray-600">
          Testing the backend-frontend integration for COB calculations with feature toggles
        </p>
      </div>

      {/* Feature Toggle Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Feature Toggle Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">User ID:</span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
                placeholder="Enter user ID"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Migration Status:</span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Migration %:</span>
              <span className="text-sm text-gray-600">25%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Backend Mode:</span>
              <span className="text-sm text-green-600">✅ Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Should Migrate:</span>
              <span className={`text-sm ${parseInt(userId.replace('test-user-', '')) >= 20 && parseInt(userId.replace('test-user-', '')) <= 27 ? 'text-green-600' : 'text-blue-600'}`}>
                {parseInt(userId.replace('test-user-', '')) >= 20 && parseInt(userId.replace('test-user-', '')) <= 27 ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <button
              onClick={testDifferentUsers}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
            >
              🎲 Test Random User
            </button>
          </div>
        </div>
      </div>

      {/* COB Calculation Test */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🧮 COB Calculation Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={isLoading}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '⏳ Calculating...' : '🧮 Calculate COB'}
            </button>
          </div>
        </div>

        {calculationResult && (
          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-medium mb-2">Calculation Result:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Backend Mode:</span>
                <span className={`ml-2 ${calculationResult.backendMode ? 'text-green-600' : 'text-blue-600'}`}>
                  {calculationResult.backendMode ? '✅ Backend' : '💻 Frontend'}
                </span>
              </div>
              <div>
                <span className="font-medium">Message:</span>
                <span className="ml-2">{calculationResult.message}</span>
              </div>
              {calculationResult.data && (
                <>
                  <div>
                    <span className="font-medium">Carbs on Board:</span>
                    <span className="ml-2 text-lg font-bold text-green-600">
                      {calculationResult.data.carbsOnBoard?.toFixed(1)}g
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2">{calculationResult.data.status}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* COB Status Test */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📊 COB Status Test</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Sample entries: {sampleEntries.length} meals with {sampleEntries.reduce((sum, e) => sum + e.carbs, 0)}g total carbs
          </p>
          <button
            onClick={handleGetStatus}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '⏳ Loading...' : '📊 Get COB Status'}
          </button>
        </div>

        {cobStatus && (
          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-medium mb-2">Status Result:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Backend Mode:</span>
                <span className={`ml-2 ${cobStatus.backendMode ? 'text-green-600' : 'text-blue-600'}`}>
                  {cobStatus.backendMode ? '✅ Backend' : '💻 Frontend'}
                </span>
              </div>
              <div>
                <span className="font-medium">Message:</span>
                <span className="ml-2">{cobStatus.message}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COB Timeline Test */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">⏰ COB Timeline Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
            <input
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
              min="1"
              max="24"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGetTimeline}
              disabled={isLoading}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '⏳ Loading...' : '⏰ Get Timeline'}
            </button>
          </div>
        </div>

        {timelineResult && (
          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-medium mb-2">Timeline Result:</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Backend Mode:</span>
                <span className={`ml-2 ${timelineResult.backendMode ? 'text-green-600' : 'text-blue-600'}`}>
                  {timelineResult.backendMode ? '✅ Backend' : '💻 Frontend'}
                </span>
              </div>
              <div>
                <span className="font-medium">Message:</span>
                <span className="ml-2">{timelineResult.message}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">🧪 Testing Instructions:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Change the User ID to test different migration scenarios</li>
          <li>• Users 20-27 will use the backend (25% migration)</li>
          <li>• Users 1-19, 28-30 will use frontend fallback</li>
          <li>• Test all three endpoints: Calculate, Status, and Timeline</li>
          <li>• All buttons should now be clickable!</li>
        </ul>
      </div>
    </div>
  );
};

export default CarbsOnBoardTest;
