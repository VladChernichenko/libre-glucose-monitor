import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

import CombinedGlucoseChart from './CombinedGlucoseChart';
import NoteInputModal from './NoteInputModal';
import COBSettings from './COBSettings';
import VersionInfo from './VersionInfo';
import NightscoutConfigModal from './NightscoutConfigModal';
import NightscoutErrorBoundary from './NightscoutErrorBoundary';
import NightscoutDataStatus from './NightscoutDataStatus';
import NightscoutFallbackUI from './NightscoutFallbackUI';
import { EnhancedNightscoutService, NightscoutServiceResponse } from '../services/nightscout/enhancedNightscoutService';

import { GlucoseReading } from '../types/libre';
import { GlucoseNote } from '../types/notes';
import { hybridNotesApiService } from '../services/hybridNotesApi';
import { cobSettingsApi, COBSettingsData } from '../services/cobSettingsApi';
import { glucoseCalculationsApi, GlucoseCalculationsResponse } from '../services/glucoseCalculationsApi';
import { nightscoutConfigApi, NightscoutConfig } from '../services/nightscoutConfigApi';
import { getEnvironmentConfig } from '../config/environments';
import { logTimezoneInfo, getTimezoneDisplayName, getCurrentLocalTime } from '../utils/timezone';

interface DataStatus {
  source: 'nightscout' | 'stored' | 'demo' | 'error';
  healthy: boolean;
  lastUpdate?: Date;
  errorCount: number;
  fallbackUsed: boolean;
}

const EnhancedDashboard: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [currentReading, setCurrentReading] = useState<GlucoseReading | null>(null);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Enhanced Nightscout service
  const [nightscoutService] = useState(() => {
    const config = getEnvironmentConfig();
    return new EnhancedNightscoutService({
      backendUrl: config.backendUrl,
      enableFallbacks: true,
      enableDemoData: true,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000
    });
  });

  // Data status tracking
  const [dataStatus, setDataStatus] = useState<DataStatus>({
    source: 'error',
    healthy: false,
    errorCount: 0,
    fallbackUsed: false
  });

  // Notes management
  const [notes, setNotes] = useState<GlucoseNote[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GlucoseNote | null>(null);
  const [notesBackendStatus, setNotesBackendStatus] = useState<'checking' | 'backend' | 'local' | 'error'>('checking');

  // Settings and modals
  const [isCOBSettingsOpen, setIsCOBSettingsOpen] = useState(false);
  const [isVersionInfoOpen, setIsVersionInfoOpen] = useState(false);
  const [isNightscoutConfigOpen, setIsNightscoutConfigOpen] = useState(false);
  const [cobSettings, setCobSettings] = useState<COBSettingsData | null>(null);
  const [glucoseCalculations, setGlucoseCalculations] = useState<GlucoseCalculationsResponse | null>(null);
  const [nightscoutConfig, setNightscoutConfig] = useState<NightscoutConfig | null>(null);

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

  const convertToMmolL = (mgdL: number): number => {
    return Math.round((mgdL / 18) * 10) / 10;
  };

  const calculateGlucoseStatus = useCallback((value: number): 'low' | 'normal' | 'high' | 'critical' => {
    const mmolL = convertToMmolL(value);
    if (mmolL < 3.9) return 'low';
    if (mmolL < 10.0) return 'normal';
    if (mmolL < 13.9) return 'high';
    return 'critical';
  }, []);

  // Enhanced data fetching with comprehensive error handling
  const fetchCurrentGlucose = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping current glucose fetch - user not authenticated');
      return;
    }
    
    if (!nightscoutConfig) {
      console.log('🔍 Skipping current glucose fetch - no Nightscout credentials configured');
      return;
    }

    try {
      console.log('🔗 Fetching current glucose with enhanced error handling...');
      const response: NightscoutServiceResponse<any> = await nightscoutService.getCurrentGlucose();

      if (response.success && response.data) {
        const entry = response.data;
        const reading: GlucoseReading = {
          timestamp: new Date(entry.date),
          value: convertToMmolL(entry.sgv),
          trend: entry.trend || 0,
          trendArrow: convertTrendToArrow(entry.direction),
          status: calculateGlucoseStatus(entry.sgv),
          unit: 'mmol/L',
          originalTimestamp: new Date(entry.date),
        };
        setCurrentReading(reading);
        setError(null);
        console.log(`✅ Current glucose fetched from ${response.source}: ${reading.value} ${reading.unit}`);
      } else {
        setError(response.error || 'No current glucose data available');
        console.warn('⚠️ No current glucose data available');
        
        // If response indicates configuration is needed, open the config dialog
        if (response.needsConfiguration) {
          console.log('🔧 Opening Nightscout configuration dialog due to 400 error');
          setIsNightscoutConfigOpen(true);
        }
      }
    } catch (err: any) {
      console.error('❌ Current glucose fetch failed:', err);
      console.log('🔍 Error details:', {
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        errorObject: err
      });
      
      // Check if it's a 400 error (no data/configuration issue)
      if (err.response?.status === 400) {
        console.log('🔧 Detected 400 error - Opening Nightscout configuration dialog');
        setIsNightscoutConfigOpen(true);
        setError('No Nightscout data available. Please configure your Nightscout settings.');
      } else {
        setError(`Failed to fetch current glucose: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [isAuthenticated, nightscoutService, calculateGlucoseStatus, nightscoutConfig]);

  const fetchHistoricalData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping historical data fetch - user not authenticated');
      return;
    }
    
    if (!nightscoutConfig) {
      console.log('🔍 Skipping historical data fetch - no Nightscout credentials configured');
      return;
    }

    try {
      console.log('🔗 Fetching historical glucose data with enhanced error handling...');
      
      const now = new Date();
      const endDate = new Date();
      const startDate = new Date();
      
      startDate.setTime(now.getTime() - (2 * 60 * 60 * 1000));
      endDate.setTime(now.getTime() + (4 * 60 * 60 * 1000));
      
      const response: NightscoutServiceResponse<any[]> = await nightscoutService.getGlucoseEntriesByDate(startDate, endDate);

      if (response.success && response.data && response.data.length > 0) {
        const glucoseEntries = response.data.filter((entry: any) => entry.type === 'sgv');
        
        const history = glucoseEntries.map((entry: any) => ({
          timestamp: new Date(entry.date),
          value: convertToMmolL(entry.sgv),
          trend: entry.trend || 0,
          trendArrow: convertTrendToArrow(entry.direction),
          status: calculateGlucoseStatus(entry.sgv),
          unit: 'mmol/L',
          originalTimestamp: new Date(entry.date),
        }));
        
        history.sort((a: GlucoseReading, b: GlucoseReading) => a.timestamp.getTime() - b.timestamp.getTime());
        setGlucoseHistory(history);
        setError(null);
        console.log(`✅ Historical data fetched from ${response.source}: ${history.length} entries`);
      } else {
        // Check if configuration is needed
        if (response.needsConfiguration) {
          console.log('🔧 Opening Nightscout configuration dialog due to 400 error in historical data');
          setIsNightscoutConfigOpen(true);
          setError(response.error || 'No historical glucose data available');
          return;
        }
        
        // Fallback to recent entries
        const recentResponse = await nightscoutService.getGlucoseEntries(100);
        if (recentResponse.success && recentResponse.data) {
          const allGlucoseEntries = recentResponse.data.filter((entry: any) => entry.type === 'sgv');
          
          const history = allGlucoseEntries.map((entry: any) => ({
            timestamp: new Date(entry.date),
            value: convertToMmolL(entry.sgv),
            trend: entry.trend || 0,
            trendArrow: convertTrendToArrow(entry.direction),
            status: calculateGlucoseStatus(entry.sgv),
            unit: 'mmol/L',
            originalTimestamp: new Date(entry.date),
          }));
          
          history.sort((a: GlucoseReading, b: GlucoseReading) => a.timestamp.getTime() - b.timestamp.getTime());
          setGlucoseHistory(history);
          console.log(`✅ Recent data fetched from ${recentResponse.source}: ${history.length} entries`);
        } else {
          setError(recentResponse.error || 'No historical glucose data available');
          console.warn('⚠️ No historical glucose data available');
          
          // If recent response also needs configuration, open the dialog
          if (recentResponse.needsConfiguration) {
            console.log('🔧 Opening Nightscout configuration dialog due to 400 error in recent data');
            setIsNightscoutConfigOpen(true);
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Historical data fetch failed:', err);
      console.log('🔍 Historical error details:', {
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        errorObject: err
      });
      
      // Check if it's a 400 error (no data/configuration issue)
      if (err.response?.status === 400) {
        console.log('🔧 Detected 400 error in historical data - Opening Nightscout configuration dialog');
        setIsNightscoutConfigOpen(true);
        setError('No Nightscout data available. Please configure your Nightscout settings.');
      } else {
        setError(`Failed to fetch historical data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [isAuthenticated, nightscoutService, calculateGlucoseStatus, nightscoutConfig]);

  // Retry mechanism
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchCurrentGlucose(),
        fetchHistoricalData()
      ]);
      
      // Update data status to healthy if we have data
      if (currentReading || glucoseHistory.length > 0) {
        setDataStatus(prev => ({
          ...prev,
          healthy: true,
          source: 'nightscout',
          lastUpdate: new Date(),
          errorCount: 0,
          fallbackUsed: false
        }));
        console.log('🔧 Data status updated to healthy after retry');
      }
    } finally {
      setIsRetrying(false);
    }
  }, [fetchCurrentGlucose, fetchHistoricalData, currentReading, glucoseHistory.length]);

  // Status change handler
  const handleStatusChange = useCallback((status: DataStatus) => {
    setDataStatus(status);
    if (status.healthy) {
      setError(null);
    }
  }, []);

  // Load data on component mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      // Only fetch data if Nightscout credentials are configured
      if (nightscoutConfig) {
        fetchCurrentGlucose();
        fetchHistoricalData();
      }
    }
  }, [isAuthenticated, nightscoutConfig, fetchCurrentGlucose, fetchHistoricalData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!isAuthenticated || !nightscoutConfig) return;

    const interval = setInterval(() => {
      fetchCurrentGlucose();
      fetchHistoricalData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, nightscoutConfig, fetchCurrentGlucose, fetchHistoricalData]);

  // Load other data
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        // Load COB settings
        const cobData = await cobSettingsApi.getCOBSettings();
        setCobSettings(cobData);

        // Load glucose calculations (only if we have current reading)
        if (currentReading) {
          const calcData = await glucoseCalculationsApi.getGlucoseCalculations(currentReading.value);
          setGlucoseCalculations(calcData);
        }

        // Load Nightscout config
        const nsConfig = await nightscoutConfigApi.getConfig();
        setNightscoutConfig(nsConfig);

        // Only load notes if Nightscout credentials are configured
        if (nsConfig) {
          const notesData = await hybridNotesApiService.getNotes();
          setNotes(notesData);
          setNotesBackendStatus('backend');
        } else {
          console.log('🔍 Skipping notes load - no Nightscout credentials configured');
          setNotes([]);
          setNotesBackendStatus('backend');
        }
      } catch (error) {
        console.error('Failed to load additional data:', error);
        setNotesBackendStatus('error');
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Auto-update data status when we have data
  useEffect(() => {
    if (currentReading || glucoseHistory.length > 0) {
      console.log('🔧 EnhancedDashboard: Auto-updating data status - data detected');
      setDataStatus(prev => ({
        ...prev,
        healthy: true,
        source: 'nightscout',
        lastUpdate: new Date(),
        errorCount: 0,
        fallbackUsed: false
      }));
    }
  }, [currentReading, glucoseHistory.length]);

  // Show fallback UI if no data is available
  console.log('🔧 EnhancedDashboard: Checking data status:', {
    healthy: dataStatus.healthy,
    isRetrying: isRetrying,
    currentReading: !!currentReading,
    glucoseHistoryLength: glucoseHistory.length,
    nightscoutConfig: !!nightscoutConfig
  });
  
  // Check if we have data or if we're retrying
  const hasData = currentReading || glucoseHistory.length > 0;
  const shouldShowFallback = !dataStatus.healthy && !isRetrying && !hasData;
  
  console.log('🔧 EnhancedDashboard: Fallback decision:', {
    shouldShowFallback,
    hasData,
    dataStatusHealthy: dataStatus.healthy,
    isRetrying
  });
  
  if (shouldShowFallback) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <NightscoutFallbackUI
            onRetry={handleRetry}
            onConfigure={() => setIsNightscoutConfigOpen(true)}
            error={error || undefined}
            isRetrying={isRetrying}
            needsConfiguration={error?.includes('configure') || false}
          />
        </div>
      </div>
    );
  }

  return (
    <NightscoutErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Glucose Monitor</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user?.username} • {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsNightscoutConfigOpen(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Nightscout Config
                </button>
                <button
                  onClick={() => setIsVersionInfoOpen(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Version Info
                </button>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Data Status */}
          <div className="mb-6">
            <NightscoutDataStatus
              service={nightscoutService}
              onStatusChange={handleStatusChange}
              hasCredentials={!!nightscoutConfig}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Data Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={handleRetry}
                      disabled={isRetrying}
                      className="text-sm font-medium text-red-800 hover:text-red-900 underline disabled:opacity-50"
                    >
                      {isRetrying ? 'Retrying...' : 'Try Again'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2">
              <CombinedGlucoseChart
                glucoseData={glucoseHistory}
                iobData={[]}
                notes={notes}
                onNoteClick={(note) => setEditingNote(note)}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Current Reading */}
              {currentReading && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Current Reading</h3>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      currentReading.status === 'low' ? 'text-red-600' :
                      currentReading.status === 'high' ? 'text-yellow-600' :
                      currentReading.status === 'critical' ? 'text-red-800' :
                      'text-green-600'
                    }`}>
                      {currentReading.value} {currentReading.unit}
                    </div>
                    <div className="text-2xl mt-2">{currentReading.trendArrow}</div>
                    <div className="text-sm text-gray-500 mt-2">
                      {currentReading.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setIsNoteModalOpen(true)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    📝 Add Note
                  </button>
                  <button
                    onClick={() => setIsCOBSettingsOpen(true)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    ⚙️ COB Settings
                  </button>
                  <button
                    onClick={() => setIsNightscoutConfigOpen(true)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    🔗 Nightscout Config
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modals */}
          <NoteInputModal
            isOpen={isNoteModalOpen}
            onClose={() => setIsNoteModalOpen(false)}
            onSave={async (note) => {
              try {
                await hybridNotesApiService.addNote(note);
                const updatedNotes = await hybridNotesApiService.getNotes();
                setNotes(updatedNotes);
                setIsNoteModalOpen(false);
              } catch (error) {
                console.error('Failed to save note:', error);
              }
            }}
            initialData={editingNote || undefined}
            currentGlucose={currentReading?.value}
            mode={editingNote ? 'edit' : 'add'}
          />

          {isCOBSettingsOpen && cobSettings && (
            <COBSettings
              config={{
                carbRatio: cobSettings.carbRatio,
                isf: cobSettings.isf,
                carbHalfLife: cobSettings.carbHalfLife,
                maxCOBDuration: cobSettings.maxCOBDuration
              }}
              onConfigChange={async (config) => {
                try {
                  const settings: COBSettingsData = {
                    carbRatio: config.carbRatio,
                    isf: config.isf,
                    carbHalfLife: config.carbHalfLife,
                    maxCOBDuration: config.maxCOBDuration
                  };
                  await cobSettingsApi.saveCOBSettings(settings);
                  setCobSettings(settings);
                  setIsCOBSettingsOpen(false);
                } catch (error) {
                  console.error('Failed to save COB settings:', error);
                }
              }}
              onClose={() => setIsCOBSettingsOpen(false)}
            />
          )}

          <VersionInfo
            isOpen={isVersionInfoOpen}
            onClose={() => setIsVersionInfoOpen(false)}
          />

          <NightscoutConfigModal
            isOpen={isNightscoutConfigOpen}
            onClose={() => setIsNightscoutConfigOpen(false)}
            onSave={async (config) => {
              try {
                console.log('🔧 EnhancedDashboard: onSave called with config:', config);
                console.log('🔧 EnhancedDashboard: Calling nightscoutConfigApi.saveConfig...');
                const result = await nightscoutConfigApi.saveConfig(config);
                console.log('🔧 EnhancedDashboard: Save result:', result);
                setNightscoutConfig(config);
                console.log('🔧 EnhancedDashboard: Closing modal...');
                setIsNightscoutConfigOpen(false);
                
                // Immediately update data status since we now have credentials
                setDataStatus(prev => ({
                  ...prev,
                  healthy: true,
                  source: 'nightscout',
                  lastUpdate: new Date(),
                  errorCount: 0,
                  fallbackUsed: false
                }));
                console.log('🔧 EnhancedDashboard: Data status updated to healthy after config save');
                
                console.log('🔧 EnhancedDashboard: Calling handleRetry...');
                // Retry data fetch after config update
                handleRetry();
                console.log('🔧 EnhancedDashboard: onSave completed successfully');
              } catch (error) {
                console.error('🔧 EnhancedDashboard: Failed to save Nightscout config:', error);
                console.error('🔧 EnhancedDashboard: Error details:', {
                  message: error instanceof Error ? error.message : 'Unknown error',
                  stack: error instanceof Error ? error.stack : undefined
                });
                throw error; // Re-throw to let the modal handle the error
              }
            }}
            existingConfig={nightscoutConfig}
          />
        </div>
      </div>
    </NightscoutErrorBoundary>
  );
};

export default EnhancedDashboard;
