import React, { useState, useEffect, useCallback } from 'react';
import libreApiService from '../services/libreApi';
import GlucoseDisplay from './GlucoseDisplay';
import GlucoseChart from './GlucoseChart';
import { GlucoseReading, LibrePatient, LibreConnection } from '../types/libre';


const Dashboard: React.FC = () => {
  const [currentReading, setCurrentReading] = useState<GlucoseReading | null>(null);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [patient, setPatient] = useState<LibrePatient | null>(null);
  const [connections, setConnections] = useState<LibreConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h'>('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Nightscout integration enabled - using real data
  const [nightscoutUrl] = useState(process.env.REACT_APP_NIGHTSCOUT_URL || '');
  
  // Debug: Log environment variables
  console.log('Environment variables:', {
    NIGHTSCOUT_URL: process.env.REACT_APP_NIGHTSCOUT_URL,
    NIGHTSCOUT_SECRET: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    ENABLE_DEMO: process.env.REACT_APP_ENABLE_DEMO_MODE
  });
  console.log('Nightscout URL state:', nightscoutUrl);

  // Helper functions for Nightscout data conversion
  const convertTrendToArrow = (direction: string): string => {
    const trendMap: { [key: string]: string } = {
      'DoubleUp': '↗↗',
      'SingleUp': '↗',
      'FortyFiveUp': '↗',
      'Flat': '→',
      'FortyFiveDown': '↘',
      'SingleDown': '↘',
      'DoubleDown': '↘↘',
      'NOT COMPUTABLE': '→',
      'RATE OUT OF RANGE': '→',
    };
    return trendMap[direction] || '→';
  };

  // Convert mg/dL to mmol/L (divide by 18)
  const convertToMmolL = (mgdL: number): number => {
    return Math.round((mgdL / 18) * 10) / 10; // Round to 1 decimal place
  };

  const calculateGlucoseStatus = (value: number): 'low' | 'normal' | 'high' | 'critical' => {
    // Convert to mmol/L for status calculation
    const mmolL = convertToMmolL(value);
    if (mmolL < 3.9) return 'low';      // < 70 mg/dL
    if (mmolL < 10.0) return 'normal';  // 70-180 mg/dL
    if (mmolL < 13.9) return 'high';    // 180-250 mg/dL
    return 'critical';                   // > 250 mg/dL
  };

  const fetchPatientInfo = useCallback(async () => {
    // Set empty patient info since we're using Nightscout
    setPatient({
      id: 'nightscout-user',
      firstName: 'Nightscout',
      lastName: 'User',
      email: 'user@nightscout.com'
    });
  }, []);

  const fetchConnections = useCallback(async () => {
    // Set default connection for Nightscout
    const defaultConnection = {
      id: 'nightscout-connection',
      patientId: 'nightscout-user',
      status: 'active' as const,
      lastSync: new Date().toISOString()
    };
    setConnections([defaultConnection]);
    setSelectedConnection('nightscout-connection');
  }, []);

    const fetchCurrentGlucose = useCallback(async () => {
    if (!selectedConnection) return;
    
    setIsLoading(true);
    setError(null);
    
    // ONLY use Nightscout data - no demo fallback
    if (!nightscoutUrl) {
      setError('Nightscout URL not configured. Please check your environment variables.');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('🔍 Fetching current glucose from Nightscout:', nightscoutUrl);
      const response = await fetch(`${nightscoutUrl}/api/v2/entries.json?count=1`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Nightscout response:', data);
        
        if (data.length > 0) {
          const entry = data[0];
          const reading = {
            timestamp: new Date(entry.date),
            value: convertToMmolL(entry.sgv),
            trend: entry.trend || 0,
            trendArrow: convertTrendToArrow(entry.direction),
            status: calculateGlucoseStatus(entry.sgv),
            unit: 'mmol/L',
          };
          
          console.log('✅ Processed reading:', reading);
          setCurrentReading(reading);
          setGlucoseHistory(prev => {
            const newHistory = [...prev, reading];
            return newHistory.slice(-100);
          });
        } else {
          setError('No glucose data available from Nightscout');
        }
      } else {
        throw new Error(`Nightscout API error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('❌ Nightscout fetch failed:', err);
      setError(`Failed to fetch from Nightscout: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    setIsLoading(false);
  }, [selectedConnection, nightscoutUrl]);

  const fetchHistoricalData = useCallback(async () => {
    if (!selectedConnection) return;
    
    // ONLY use Nightscout data - no demo fallback
    if (!nightscoutUrl) {
      setError('Nightscout URL not configured. Please check your environment variables.');
      return;
    }
    
    try {
      console.log('🔍 Fetching historical data from Nightscout:', nightscoutUrl);
      
      // Calculate date range based on time range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '1h') {
        startDate.setTime(endDate.getTime() - (1 * 60 * 60 * 1000)); // 1 hour in milliseconds
      } else if (timeRange === '6h') {
        startDate.setTime(endDate.getTime() - (6 * 60 * 60 * 1000)); // 6 hours in milliseconds
      } else if (timeRange === '12h') {
        startDate.setTime(endDate.getTime() - (12 * 60 * 60 * 1000)); // 12 hours in milliseconds
      } else if (timeRange === '24h') {
        startDate.setTime(endDate.getTime() - (24 * 60 * 60 * 1000)); // 24 hours in milliseconds
      }
      
      console.log(`📊 Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()} (${timeRange})`);
      
      // Use a large count to ensure we get enough data, then filter by date
      const response = await fetch(
        `${nightscoutUrl}/api/v2/entries.json?count=500`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Historical data response:', data.length, 'entries');
        
        // Filter data to only include glucose readings (type: 'sgv') within the time range
        const glucoseEntries = data.filter((entry: any) => {
          if (entry.type !== 'sgv') return false;
          
          const entryDate = new Date(entry.date);
          return entryDate >= startDate && entryDate <= endDate;
        });
        
        console.log(`📊 Filtered glucose entries for ${timeRange}:`, glucoseEntries.length);
        console.log(`📊 Time range: ${startDate.toLocaleString()} to ${endDate.toLocaleString()}`);
        
        // If no data in the time range, show available data with a warning
        if (glucoseEntries.length === 0) {
          console.log('⚠️ No data in selected time range, showing all available data');
          const allGlucoseEntries = data.filter((entry: any) => entry.type === 'sgv');
          console.log(`📊 Showing all available glucose entries: ${allGlucoseEntries.length}`);
          
          const history = allGlucoseEntries.map((entry: any) => ({
            timestamp: new Date(entry.date),
            value: entry.sgv,
            trend: entry.trend || 0,
            trendArrow: convertTrendToArrow(entry.direction),
            status: calculateGlucoseStatus(entry.sgv),
            unit: 'mg/dL',
          }));
          
          // Sort by timestamp
          history.sort((a: GlucoseReading, b: GlucoseReading) => a.timestamp.getTime() - b.timestamp.getTime());
          
          console.log('⚠️ Processed all available data:', history.length, 'entries');
          console.log('⚠️ Available data span: ', history[0]?.timestamp.toLocaleString(), 'to', history[history.length - 1]?.timestamp.toLocaleString());
          setGlucoseHistory(history);
          return;
        }
        
        const history = glucoseEntries.map((entry: any) => ({
          timestamp: new Date(entry.date),
          value: convertToMmolL(entry.sgv),
          trend: entry.trend || 0,
          trendArrow: convertTrendToArrow(entry.direction),
          status: calculateGlucoseStatus(entry.sgv),
          unit: 'mmol/L',
        }));
        
        // Sort by timestamp to ensure chronological order
        history.sort((a: GlucoseReading, b: GlucoseReading) => a.timestamp.getTime() - b.timestamp.getTime());
        
        console.log('✅ Processed historical data:', history.length, 'entries');
        console.log('✅ First entry:', history[0]?.timestamp.toLocaleString());
        console.log('✅ Last entry:', history[history.length - 1]?.timestamp.toLocaleString());
        
        setGlucoseHistory(history);
      } else {
        throw new Error(`Nightscout API error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('❌ Nightscout historical fetch failed:', err);
      setError(`Failed to fetch historical data from Nightscout: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [selectedConnection, timeRange, nightscoutUrl]);

  // Initial data fetch
  useEffect(() => {
    fetchPatientInfo();
    fetchConnections();
    
    // ONLY load data from Nightscout - no demo fallback
    if (!nightscoutUrl) {
      setError('Nightscout URL not configured. Please check your environment variables.');
      return;
    }
    
    console.log('🚀 Loading initial data from Nightscout');
    // Fetch initial data from Nightscout
    fetchHistoricalData();
    fetchCurrentGlucose();
  }, [fetchPatientInfo, fetchConnections, nightscoutUrl, fetchHistoricalData, fetchCurrentGlucose]);

  // Fetch current glucose data
  useEffect(() => {
    if (selectedConnection) {
      fetchCurrentGlucose();
      fetchHistoricalData();
    }
  }, [selectedConnection, fetchCurrentGlucose, fetchHistoricalData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh || !selectedConnection) return;
    
    const interval = setInterval(() => {
      fetchCurrentGlucose();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedConnection, fetchCurrentGlucose]);



  const handleLogout = () => {
    libreApiService.logout();
    window.location.reload();
  };

  const handleConnectionChange = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setGlucoseHistory([]);
  };

  const handleTimeRangeChange = (range: '1h' | '6h' | '12h' | '24h') => {
    console.log('🕐 handleTimeRangeChange called with:', range);
    console.log('🕐 Previous timeRange was:', timeRange);
    setTimeRange(range);
    console.log('🕐 Calling fetchHistoricalData for new range:', range);
    fetchHistoricalData();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchCurrentGlucose}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Libre Glucose Monitor</h1>
              {patient && (
                <span className="ml-4 text-sm text-gray-600">
                  Welcome, {patient.firstName} {patient.lastName}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {nightscoutUrl ? (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  🩸 Nightscout Connected
                </div>
              ) : (
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  ❌ Nightscout Not Configured
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Auto-refresh</label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              
              {connections.length > 0 && (
                <select
                  value={selectedConnection}
                  onChange={(e) => handleConnectionChange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {connections.map(connection => (
                    <option key={connection.id} value={connection.id}>
                      Sensor {connection.id.slice(-4)}
                    </option>
                  ))}
                </select>
              )}
              
              <button
                onClick={handleLogout}
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {nightscoutUrl ? (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  🩸 Nightscout Connected - Real Data Active
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your app is now connected to Nightscout and displaying real-time glucose data from your Libre 2 Plus sensor. Data updates automatically every 5 minutes.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  ❌ Nightscout Not Configured
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Nightscout URL is not configured. Please check your .env file and restart the app.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Glucose Display */}
          <div>
            <GlucoseDisplay 
              reading={currentReading} 
              isLoading={isLoading} 
            />
          </div>

          {/* Glucose Chart */}
          <div>
            <GlucoseChart 
              data={glucoseHistory} 
              timeRange={timeRange}
            />
          </div>
        </div>

        {/* Time Range Controls */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {(['1h', '6h', '12h', '24h'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  console.log('🕐 Button clicked:', range);
                  handleTimeRangeChange(range);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                  timeRange === range
                    ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-inner'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 active:bg-gray-200'
                }`}
                style={{ minWidth: '60px' }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Status Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sensor Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <span className="font-medium text-gray-900">
                  {selectedConnection ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Sync:</span>
                <span className="font-medium text-gray-900">
                  {currentReading ? currentReading.timestamp.toLocaleTimeString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Auto-refresh:</span>
                <span className="font-medium text-gray-900">
                  {autoRefresh ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Glucose Ranges</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Low:</span>
                <span className="font-medium text-red-600">&lt; 3.9 mmol/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Normal:</span>
                <span className="font-medium text-green-600">3.9-10.0 mmol/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High:</span>
                <span className="font-medium text-yellow-600">10.0-13.9 mmol/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Critical:</span>
                <span className="font-medium text-red-600">&gt; 13.9 mmol/L</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={fetchCurrentGlucose}
                disabled={isLoading}
                className="w-full btn-primary"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Now'}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-full ${autoRefresh ? 'btn-secondary' : 'btn-primary'}`}
              >
                {autoRefresh ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
