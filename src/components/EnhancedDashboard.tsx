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

  // Data status tracking - initialize as healthy to show dashboard directly
  const [, setDataStatus] = useState<DataStatus>({
    source: 'demo', // Use 'demo' as initial source to show dashboard
    healthy: true,
    errorCount: 0,
    fallbackUsed: false
  });

  // Notes management
  const [notes, setNotes] = useState<GlucoseNote[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GlucoseNote | null>(null);
  const [, setNotesBackendStatus] = useState<'checking' | 'backend' | 'local' | 'error'>('checking');

  // Settings and modals
  const [isCOBSettingsOpen, setIsCOBSettingsOpen] = useState(false);
  const [isVersionInfoOpen, setIsVersionInfoOpen] = useState(false);
  const [isDataSourceConfigOpen, setIsDataSourceConfigOpen] = useState(false);
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
      return;
    }
    
    // Removed nightscoutConfig check - using global configuration now

    try {
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
      } else {
        setError(response.error || 'No current glucose data available');
        
        // If response indicates configuration is needed, schedule the config dialog
        if (response.needsConfiguration) {
          setTimeout(() => {
            setIsDataSourceConfigOpen(true);
          }, 2000);
        }
      }
    } catch (err: any) {
      // Check if it's a 400 error (no data/configuration issue)
      if (err.response?.status === 400) {
        setTimeout(() => {
          setIsDataSourceConfigOpen(true);
        }, 2000);
        setError('No Nightscout data available. Please configure your Nightscout settings.');
      } else {
        setError(`Failed to fetch current glucose: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [isAuthenticated, nightscoutService, calculateGlucoseStatus]);

  const fetchHistoricalData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    
    // Removed nightscoutConfig check - using global configuration now

    try {
      
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
      } else {
        // Check if configuration is needed
        if (response.needsConfiguration) {
          setTimeout(() => {
            setIsDataSourceConfigOpen(true);
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
        } else {
          setError(recentResponse.error || 'No historical glucose data available');
          
          // If recent response also needs configuration, schedule the dialog
          if (recentResponse.needsConfiguration) {
            setTimeout(() => {
              setIsDataSourceConfigOpen(true);
            }, 2000);
          }
        }
      }
    } catch (err: any) {
      // Check if it's a 400 error (no data/configuration issue)
      if (err.response?.status === 400) {
        setTimeout(() => {
          setIsDataSourceConfigOpen(true);
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
      }
    } finally {
      setIsRetrying(false);
    }
  }, [fetchCurrentGlucose, fetchHistoricalData, currentReading, glucoseHistory.length]);


  // Single initialization effect - loads everything in sequence to avoid duplicate requests
  /* eslint-disable react-hooks/exhaustive-deps -- run once per auth; nightscoutService/calculateGlucoseStatus are stable */
  useEffect(() => {
    if (!isAuthenticated || isInitializing) return;

    let isMounted = true; // Flag to prevent state updates if component unmounts
    setIsInitializing(true);

    const initializeApp = async () => {
      try {
        
        // Step 1: Skip Nightscout configuration loading - using global configuration now
        
        if (!isMounted) return; // Component unmounted, stop here
        
        // Removed setNightscoutConfig - using global configuration now
        
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
            }
          } catch (err: any) {
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
            }
          } catch (err: any) {
            if (!isMounted) return;
            setError(`Failed to fetch historical data: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
          
          if (!isMounted) return;
          
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
          
      } catch (error) {
        if (!isMounted) return;
        
        // On error, assume we need configuration
        setTimeout(() => {
          if (isMounted) {
            setIsDataSourceConfigOpen(true);
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
  /* eslint-enable react-hooks/exhaustive-deps */

  // Auto-refresh every 5 minutes (only after initial load)
  /* eslint-disable react-hooks/exhaustive-deps -- interval uses latest currentReading via closure; expanding deps would reset timer every reading */
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
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
  /* eslint-enable react-hooks/exhaustive-deps */

  // Auto-update data status when we have data
  useEffect(() => {
    if (currentReading || glucoseHistory.length > 0) {
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
          const calculationsData = await glucoseCalculationsApi.getGlucoseCalculations(currentReading.value);
          setGlucoseCalculations(calculationsData);
        } catch (err) {
        }
      };

      fetchCalculations();
    }
  }, [currentReading, isAuthenticated]);

  // Only show fallback UI for critical errors, not for normal initialization
  const shouldShowFallback = false; // Always show dashboard with chart

  if (shouldShowFallback) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <NightscoutFallbackUI
            onRetry={handleRetry}
            onConfigure={() => setIsDataSourceConfigOpen(true)}
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
      <div className="h-[100dvh] overflow-hidden bg-gray-50 flex items-center justify-center">
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
      <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-gray-50 flex flex-col">
        <div className="max-w-7xl mx-auto flex flex-col flex-1 min-h-0 w-full py-2 px-4 sm:px-6 lg:px-8">
          {/* Compact Header */}
          <div className="mb-2 shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Glucose Monitor</h1>
                <p className="text-xs text-gray-600">
                  Welcome back, {user?.username} - {new Date().toLocaleTimeString()}
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
          <div className="mb-2 shrink-0">
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
            <div className="mb-2 shrink-0 max-h-28 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
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

          {/* Main Content - fills remaining viewport; no page scroll */}
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-3 flex-1 min-h-0 overflow-hidden">
            {/* Chart - Takes most of the space */}
            <div className="order-1 lg:order-none lg:col-span-3 flex flex-col min-h-0 flex-1 min-h-[140px]">
              <div className="bg-white rounded-lg shadow-sm p-2 flex flex-col flex-1 min-h-0">
                <CombinedGlucoseChart
                  glucoseData={glucoseHistory}
                  iobData={[]}
                  notes={notes}
                  onNoteClick={(note) => setEditingNote(note)}
                />
              </div>
            </div>

            {/* Compact Sidebar */}
            <div className="order-2 lg:order-none flex flex-col gap-2 min-h-0 max-h-[34vh] shrink-0 lg:max-h-none lg:h-full lg:flex-1">
              {/* Recent Notes - Compact */}
              <div className="bg-white rounded-lg shadow p-3 flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h3 className="text-sm font-medium text-gray-900">Recent Notes</h3>
                  <button
                    onClick={() => setIsNoteModalOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add
                  </button>
                </div>
                
                <div className="flex-1 min-h-0 overflow-y-auto">
                {notes.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-sm mb-2">Notes</div>
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
                            Del
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>

              {/* Compact Quick Actions */}
              <div className="bg-white rounded-lg shadow p-3 shrink-0">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Actions</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setIsCOBSettingsOpen(true)}
                    className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded"
                  >
                    COB Settings
                  </button>
                  <button
                    onClick={() => setIsDataSourceConfigOpen(true)}
                    className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded"
                  >
                    Nightscout Config
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
                
                setIsDataSourceConfigOpen(false);
                
                // Refresh data after successful configuration
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } catch (error) {
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
