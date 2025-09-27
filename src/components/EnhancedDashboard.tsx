import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

import CombinedGlucoseChart from './CombinedGlucoseChart';
import NoteInputModal from './NoteInputModal';
import COBSettings from './COBSettings';
import VersionInfo from './VersionInfo';
// Removed NightscoutConfigModal import - using global configuration now
import NightscoutErrorBoundary from './NightscoutErrorBoundary';
import NightscoutFallbackUI from './NightscoutFallbackUI';
import DataSourceConfigModal from './DataSourceConfigModal';
import { EnhancedNightscoutService, NightscoutServiceResponse } from '../services/nightscout/enhancedNightscoutService';

import { GlucoseReading } from '../types/libre';
import { GlucoseNote } from '../types/notes';
import { hybridNotesApiService } from '../services/hybridNotesApi';
import { cobSettingsApi, COBSettingsData } from '../services/cobSettingsApi';
import { glucoseCalculationsApi, GlucoseCalculationsResponse } from '../services/glucoseCalculationsApi';
// Removed nightscoutConfigApi import - using global configuration now
import { dataSourceConfigApi } from '../services/dataSourceConfigApi';
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
  const [isDataSourceConfigOpen, setIsDataSourceConfigOpen] = useState(false);
  const [configTimeoutId, setConfigTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cobSettings, setCobSettings] = useState<COBSettingsData | null>(null);
  const [glucoseCalculations, setGlucoseCalculations] = useState<GlucoseCalculationsResponse | null>(null);
  // Removed nightscoutConfig state - using global configuration now

  // Removed helper functions to prevent dependency loops

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
    
    // Removed nightscoutConfig check - using global configuration now

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
        
        // If response indicates configuration is needed, schedule the config dialog
        if (response.needsConfiguration) {
          console.log('🔧 Scheduling Nightscout configuration dialog due to 400 error (2 second delay)');
          setTimeout(() => {
            console.log('🔧 Opening Nightscout configuration dialog after delay');
            setIsNightscoutConfigOpen(true);
          }, 2000);
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
        console.log('🔧 Detected 400 error - Scheduling Nightscout configuration dialog (2 second delay)');
        setTimeout(() => {
          console.log('🔧 Opening Nightscout configuration dialog after delay');
          setIsNightscoutConfigOpen(true);
        }, 2000);
        setError('No Nightscout data available. Please configure your Nightscout settings.');
      } else {
        setError(`Failed to fetch current glucose: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [isAuthenticated, nightscoutService, calculateGlucoseStatus]);

  const fetchHistoricalData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping historical data fetch - user not authenticated');
      return;
    }
    
    // Removed nightscoutConfig check - using global configuration now

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
          console.log('🔧 Scheduling Nightscout configuration dialog due to 400 error in historical data (2 second delay)');
          setTimeout(() => {
            console.log('🔧 Opening Nightscout configuration dialog after delay');
            setIsNightscoutConfigOpen(true);
          }, 2000);
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
          
          // If recent response also needs configuration, schedule the dialog
          if (recentResponse.needsConfiguration) {
            console.log('🔧 Scheduling Nightscout configuration dialog due to 400 error in recent data (2 second delay)');
            setTimeout(() => {
              console.log('🔧 Opening Nightscout configuration dialog after delay');
              setIsNightscoutConfigOpen(true);
            }, 2000);
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
        console.log('🔧 Detected 400 error in historical data - Scheduling Nightscout configuration dialog (2 second delay)');
        setTimeout(() => {
          console.log('🔧 Opening Nightscout configuration dialog after delay');
          setIsNightscoutConfigOpen(true);
        }, 2000);
        setError('No Nightscout data available. Please configure your Nightscout settings.');
      } else {
        setError(`Failed to fetch historical data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [isAuthenticated, nightscoutService, calculateGlucoseStatus]);

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


  // Single initialization effect - loads everything in sequence to avoid duplicate requests
  useEffect(() => {
    if (!isAuthenticated || isInitializing) return;

    let isMounted = true; // Flag to prevent state updates if component unmounts
    setIsInitializing(true);

    const initializeApp = async () => {
      try {
        console.log('🚀 Starting app initialization...');
        
        // Step 1: Skip Nightscout configuration loading - using global configuration now
        console.log('🔧 Step 1: Using global Nightscout configuration...');
        
        if (!isMounted) return; // Component unmounted, stop here
        
        // Removed setNightscoutConfig - using global configuration now
        
        console.log('✅ Step 2: Using global configuration, fetching glucose data...');
          // Step 2: Load glucose data - call functions directly to avoid dependency loop
          try {
            const currentResponse = await nightscoutService.getCurrentGlucose();
            if (currentResponse.success && currentResponse.data) {
              const reading = currentResponse.data;
              const glucoseReading: GlucoseReading = {
                timestamp: new Date(reading.date),
                value: convertToMmolL(reading.sgv),
                trend: reading.trend || 0,
                trendArrow: convertTrendToArrow(reading.direction),
                status: calculateGlucoseStatus(reading.sgv),
                unit: 'mmol/L',
                originalTimestamp: new Date(reading.date),
              };
              
              if (!isMounted) return;
              setCurrentReading(glucoseReading);
              setError(null);
              console.log(`✅ Current glucose fetched from ${currentResponse.source}: ${glucoseReading.value} ${glucoseReading.unit}`);
            }
          } catch (err: any) {
            console.error('❌ Current glucose fetch failed during init:', err);
            if (!isMounted) return;
            if (err.response?.status === 400) {
              setError('No Nightscout data available. Please configure your Nightscout settings.');
            } else {
              setError(`Failed to fetch current glucose: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }

          try {
            const response = await nightscoutService.getGlucoseEntries(100);
            if (response.success && response.data) {
              const allGlucoseEntries = response.data.filter((entry: any) => entry.type === 'sgv');
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
              
              if (!isMounted) return;
              setGlucoseHistory(history);
              setError(null);
              console.log(`✅ Historical data fetched from ${response.source}: ${history.length} entries`);
            }
          } catch (err: any) {
            console.error('❌ Historical data fetch failed during init:', err);
            if (!isMounted) return;
            setError(`Failed to fetch historical data: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
          
          if (!isMounted) return;
          
          console.log('✅ Step 3: Loading additional data...');
          // Step 3: Load other data in parallel
          const [cobData, notesData] = await Promise.all([
            cobSettingsApi.getCOBSettings(),
            hybridNotesApiService.getNotes()
          ]);
          
          if (!isMounted) return;
          
          setCobSettings(cobData);
          setNotes(notesData);
          setNotesBackendStatus('backend');
          
          // Load glucose calculations if we have current reading
          if (currentReading) {
            try {
              const calculationsData = await glucoseCalculationsApi.getGlucoseCalculations(currentReading.value);
              setGlucoseCalculations(calculationsData);
            } catch (err) {
              console.error('Failed to fetch glucose calculations:', err);
            }
          }
          
          console.log('✅ App initialization completed successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        if (!isMounted) return;
        
        // On error, assume we need configuration
        setTimeout(() => {
          if (isMounted) {
            console.log('🔧 Opening Nightscout configuration dialog after error');
            setIsNightscoutConfigOpen(true);
          }
        }, 2000);
        setNotesBackendStatus('error');
      } finally {
        // Always mark initialization as complete
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      isMounted = false;
      setIsInitializing(false);
    };
  }, [isAuthenticated]);

  // Auto-refresh every 5 minutes (only after initial load)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      console.log('🔄 Auto-refreshing glucose data...');
      try {
        const currentResponse = await nightscoutService.getCurrentGlucose();
        if (currentResponse.success && currentResponse.data) {
          const reading = currentResponse.data;
          const glucoseReading: GlucoseReading = {
            timestamp: new Date(reading.date),
            value: convertToMmolL(reading.sgv),
            trend: reading.trend || 0,
            trendArrow: convertTrendToArrow(reading.direction),
            status: calculateGlucoseStatus(reading.sgv),
            unit: 'mmol/L',
            originalTimestamp: new Date(reading.date),
          };
          setCurrentReading(glucoseReading);
          setError(null);
        }
      } catch (err) {
        console.error('Auto-refresh current glucose failed:', err);
      }

      try {
        const response = await nightscoutService.getGlucoseEntries(100);
        if (response.success && response.data) {
          const allGlucoseEntries = response.data.filter((entry: any) => entry.type === 'sgv');
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
        }
      } catch (err) {
        console.error('Auto-refresh historical data failed:', err);
      }

      // Refresh glucose calculations if we have current reading
      if (currentReading) {
        try {
          const calculationsData = await glucoseCalculationsApi.getGlucoseCalculations(currentReading.value);
          setGlucoseCalculations(calculationsData);
        } catch (err) {
          console.error('Auto-refresh glucose calculations failed:', err);
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
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
      
      // Data loaded successfully
    }
  }, [currentReading, glucoseHistory.length]);

  // Fetch glucose calculations when current reading changes
  useEffect(() => {
    if (currentReading && isAuthenticated) {
      const fetchCalculations = async () => {
        try {
          console.log('🔧 Fetching glucose calculations for current reading:', currentReading.value);
          const calculationsData = await glucoseCalculationsApi.getGlucoseCalculations(currentReading.value);
          setGlucoseCalculations(calculationsData);
          console.log('✅ Glucose calculations updated:', calculationsData);
        } catch (err) {
          console.error('❌ Failed to fetch glucose calculations:', err);
        }
      };

      fetchCalculations();
    }
  }, [currentReading, isAuthenticated]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (configTimeoutId) {
        clearTimeout(configTimeoutId);
      }
    };
  }, [configTimeoutId]);

  // Show fallback UI if no data is available
  console.log('🔧 EnhancedDashboard: Checking data status:', {
    healthy: dataStatus.healthy,
    isRetrying: isRetrying,
    currentReading: !!currentReading,
    glucoseHistoryLength: glucoseHistory.length,
    // Removed nightscoutConfig from debug info
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

  // Show loading indicator during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
          <p className="text-sm text-gray-500 mt-2">Loading configuration and data</p>
        </div>
      </div>
    );
  }

  return (
    <NightscoutErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
          {/* Compact Header */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Glucose Monitor</h1>
                <p className="text-xs text-gray-600">
                  Welcome back, {user?.username} • {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsDataSourceConfigOpen(true)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Data Source
                </button>
                <button
                  onClick={() => setIsVersionInfoOpen(true)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Version
                </button>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Compact Metrics Bar */}
          <div className="mb-4">
            <div className="bg-white rounded-lg shadow-sm p-3">
              <div className="grid grid-cols-4 gap-4">
                {/* Current Glucose */}
                <div className="text-center">
                  <div className="text-xs text-blue-600 mb-1">Current Glucose</div>
                  <div className="font-bold text-lg text-blue-800">
                    {currentReading ? `${currentReading.value} ${currentReading.unit}` : '--'}
                  </div>
                  <div className="text-xs text-blue-600">
                    {currentReading ? currentReading.trendArrow : ''}
                  </div>
                </div>

                {/* Active Carbs (COB) */}
                <div className="text-center">
                  <div className="text-xs text-orange-600 mb-1">Active Carbs</div>
                  <div className="font-bold text-lg text-orange-800">
                    {(() => {
                      const cobValue = glucoseCalculations?.activeCarbsOnBoard;
                      return cobValue !== undefined && cobValue !== null ? 
                        `${cobValue.toFixed(1)}g` : 
                        '--';
                    })()}
                  </div>
                </div>

                {/* Active Insulin */}
                <div className="text-center">
                  <div className="text-xs text-purple-600 mb-1">Active Insulin</div>
                  <div className="font-bold text-lg text-purple-800">
                    {(() => {
                      const insulinValue = glucoseCalculations?.activeInsulinOnBoard;
                      return insulinValue !== undefined && insulinValue !== null ? 
                        `${insulinValue.toFixed(2)}u` : 
                        '--';
                    })()}
                  </div>
                </div>

                {/* 2h Prediction */}
                <div className="text-center">
                  <div className="text-xs text-indigo-600 mb-1">2h Prediction</div>
                  <div className="font-bold text-lg text-indigo-800">
                    {(() => {
                      const predictionValue = glucoseCalculations?.twoHourPrediction;
                      return predictionValue !== undefined && predictionValue !== null ? 
                        `${predictionValue.toFixed(1)} ${currentReading?.unit || 'mmol/L'}` : 
                        '--';
                    })()}
                  </div>
                </div>
              </div>
            </div>
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

          {/* Main Content - Compact Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
            {/* Chart - Takes most of the space */}
            <div className="lg:col-span-3">
              <CombinedGlucoseChart
                glucoseData={glucoseHistory}
                iobData={[]}
                notes={notes}
                onNoteClick={(note) => setEditingNote(note)}
              />
            </div>

            {/* Compact Sidebar */}
            <div className="space-y-3">
              {/* Recent Notes - Compact */}
              <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-240px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Recent Notes</h3>
                  <button
                    onClick={() => setIsNoteModalOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add
                  </button>
                </div>
                
                {notes.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-xl mb-2">🍽️</div>
                    <p className="text-xs text-gray-500">No notes yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notes.slice(0, 8).map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => setEditingNote(note)}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-xs text-gray-900 truncate">{note.meal}</div>
                            <div className="text-xs text-gray-500">
                              {note.timestamp.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          {note.carbs > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-[10px]">
                              {note.carbs}g
                            </span>
                          )}
                          {note.insulin > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px]">
                              {note.insulin}u
                            </span>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await hybridNotesApiService.deleteNote(note.id);
                                const updatedNotes = await hybridNotesApiService.getNotes();
                                setNotes(updatedNotes);
                              } catch (error) {
                                console.error('Failed to delete note:', error);
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compact Quick Actions */}
              <div className="bg-white rounded-lg shadow p-3">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Actions</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setIsCOBSettingsOpen(true)}
                    className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded"
                  >
                    ⚙️ COB Settings
                  </button>
                  <button
                    onClick={() => setIsNightscoutConfigOpen(true)}
                    className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded"
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
            onClose={() => {
              setIsNoteModalOpen(false);
              setEditingNote(null);
            }}
            onSave={async (note) => {
              try {
                if (editingNote) {
                  await hybridNotesApiService.updateNote(editingNote.id, note);
                } else {
                  await hybridNotesApiService.addNote(note);
                }
                const updatedNotes = await hybridNotesApiService.getNotes();
                setNotes(updatedNotes);
                setIsNoteModalOpen(false);
                setEditingNote(null);
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

          <DataSourceConfigModal
            isOpen={isDataSourceConfigOpen}
            onClose={() => setIsDataSourceConfigOpen(false)}
            onSave={async (config) => {
              try {
                console.log('💾 Saving data source configuration...', config);
                
                if (config.dataSource === 'nightscout' && config.nightscout) {
                  // Note: Nightscout configuration is now handled globally via environment variables
                  console.log('Nightscout configuration should be set via environment variables');
                } else if (config.dataSource === 'libre' && config.libre) {
                  dataSourceConfigApi.saveLibreConfig(config.libre);
                }
                
                // Immediately update data status to healthy
                setDataStatus(prev => ({
                  ...prev,
                  healthy: true,
                  source: config.dataSource === 'libre' ? 'stored' : 'nightscout',
                  lastUpdate: new Date(),
                  errorCount: 0
                }));
                
                console.log('✅ Data source configuration saved successfully');
                setIsDataSourceConfigOpen(false);
                
                // Refresh data after successful configuration
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } catch (error) {
                console.error('❌ Failed to save data source configuration:', error);
                throw error; // Re-throw to show error in modal
              }
            }}
            logout={logout}
          />

          {/* NightscoutConfigModal removed - using global configuration now */}
        </div>
      </div>
    </NightscoutErrorBoundary>
  );
};

export default EnhancedDashboard;
