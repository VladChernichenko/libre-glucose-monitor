import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

import CombinedGlucoseChart from './CombinedGlucoseChart';
import NoteInputModal from './NoteInputModal';
import COBSettings from './COBSettings';
import VersionInfo from './VersionInfo';
import NightscoutConfigModal from './NightscoutConfigModal';
import { generateDemoGlucoseData } from '../services/demoData';
import { NightscoutProxyService } from '../services/nightscout/nightscoutProxyService';

import { GlucoseReading } from '../types/libre';
import { GlucoseNote } from '../types/notes';
import { hybridNotesApiService } from '../services/hybridNotesApi';
// Removed frontend calculation services - using backend only
// import { carbsOnBoardService, COBStatus, COBEntry } from '../services/carbsOnBoard';
// import { insulinOnBoardService, IOBProjection, InsulinEntry } from '../services/insulinOnBoard';
// import { glucosePredictionService } from '../services/glucosePrediction';
import { cobSettingsApi, COBSettingsData } from '../services/cobSettingsApi';
import { glucoseCalculationsApi, GlucoseCalculationsResponse } from '../services/glucoseCalculationsApi';
import { nightscoutConfigApi, NightscoutConfig } from '../services/nightscoutConfigApi';
import { getEnvironmentConfig } from '../config/environments';
import { logTimezoneInfo, getTimezoneDisplayName, getCurrentLocalTime } from '../utils/timezone';

const Dashboard: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [currentReading, setCurrentReading] = useState<GlucoseReading | null>(null);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Notes management
  const [notes, setNotes] = useState<GlucoseNote[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GlucoseNote | null>(null);
  const [notesBackendStatus, setNotesBackendStatus] = useState<'checking' | 'backend' | 'local' | 'error'>('checking');

  // Backend calculations only - no local COB state needed
  // const [cobStatus, setCobStatus] = useState<COBStatus>({
  //   currentCOB: 0,
  //   activeEntries: [],
  //   estimatedGlucoseImpact: 0,
  //   timeToZero: 0,
  //   insulinOnBoard: 0
  // });
  const [isCOBSettingsOpen, setIsCOBSettingsOpen] = useState(false);
  const [isVersionInfoOpen, setIsVersionInfoOpen] = useState(false);
  const [isNightscoutConfigOpen, setIsNightscoutConfigOpen] = useState(false);
  const [cobSettings, setCobSettings] = useState<COBSettingsData | null>(null);
  const [glucoseCalculations, setGlucoseCalculations] = useState<GlucoseCalculationsResponse | null>(null);
  const [nightscoutConfig, setNightscoutConfig] = useState<NightscoutConfig | null>(null);

  // Backend predictions only - no local IOB calculation needed
  // const [iobData, setIobData] = useState<IOBProjection[]>([]);
  // const [insulinEntries, setInsulinEntries] = useState<InsulinEntry[]>([]);


  // Backend proxy service for Nightscout integration
  const [nightscoutProxy] = useState(() => {
    const config = getEnvironmentConfig();
    console.log('🔧 Dashboard using backend URL:', config.backendUrl);
    return new NightscoutProxyService(config.backendUrl);
  });


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

  const calculateGlucoseStatus = useCallback((value: number): 'low' | 'normal' | 'high' | 'critical' => {
    // Convert to mmol/L for status calculation
    const mmolL = convertToMmolL(value);
    if (mmolL < 3.9) return 'low';      // < 70 mg/dL
    if (mmolL < 10.0) return 'normal';  // 70-180 mg/dL
    if (mmolL < 13.9) return 'high';    // 180-250 mg/dL
    return 'critical';                   // > 250 mg/dL
  }, []);


  // All calculations now done on backend via fetchGlucoseCalculations
  // No frontend IOB/COB calculations needed

  // Insulin extraction no longer needed - backend handles all calculations

  const fetchPatientInfo = useCallback(async () => {
    // Patient info is not needed for Nightscout integration
  }, []);

  const fetchConnections = useCallback(async () => {
    // Set default connection for Nightscout
    setSelectedConnection('nightscout-connection');
  }, []);

  const fetchCOBSettings = useCallback(async () => {
    try {
      console.log('🔗 Fetching COB settings from database...');
      const settings = await cobSettingsApi.getCOBSettings();
      console.log('✅ COB settings loaded:', settings);
      setCobSettings(settings);
      
      // Settings are now handled entirely by backend calculations
      console.log('✅ COB settings loaded for backend calculations:', settings);
    } catch (error) {
      console.error('❌ Error fetching COB settings:', error);
      // Use default settings if database fetch fails
      setCobSettings({
        carbRatio: 2.0,
        isf: 1.0,
        carbHalfLife: 45,
        maxCOBDuration: 240
      });
    }
  }, []);

  const fetchGlucoseCalculations = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping glucose calculations - user not authenticated');
      return;
    }
    
    if (!currentReading?.value) {
      console.log('🔍 Skipping glucose calculations - no current reading');
      return;
    }
    
    try {
      console.log('🔗 Fetching glucose calculations from backend...', {
        currentGlucose: currentReading.value,
        timestamp: new Date().toISOString()
      });
      const calculations = await glucoseCalculationsApi.getGlucoseCalculations(currentReading.value);
      console.log('✅ Glucose calculations response:', calculations);
      
      console.log('✅ Glucose calculations loaded:', {
        activeCOB: calculations?.activeCarbsOnBoard,
        activeIOB: calculations?.activeInsulinOnBoard,
        prediction: calculations?.twoHourPrediction,
        trend: calculations?.predictionTrend,
        calculatedAt: calculations?.calculatedAt
      });
      
      // Only set if we have valid calculations data
      if (calculations && 
          typeof calculations.activeCarbsOnBoard === 'number' && 
          typeof calculations.activeInsulinOnBoard === 'number') {
        setGlucoseCalculations(calculations);
        console.log('✅ Glucose calculations state updated:', {
          activeCOB: calculations.activeCarbsOnBoard,
          activeIOB: calculations.activeInsulinOnBoard,
          prediction: calculations.twoHourPrediction
        });
      } else {
        console.warn('⚠️ Invalid glucose calculations data received:', calculations);
      }
    } catch (error) {
      console.error('❌ Error fetching glucose calculations:', error);
      // Keep existing local calculations as fallback
    }
  }, [currentReading, isAuthenticated]);

  const fetchCurrentGlucose = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping glucose fetch - user not authenticated');
      return;
    }
    
    if (!selectedConnection) return;
    
    if (!nightscoutConfig) {
      console.log('🔍 Skipping glucose fetch - no Nightscout credentials configured');
      return;
    }
    
    setError(null);
    
    try {
      console.log('🔗 Fetching current glucose via backend proxy...');
      const entry = await nightscoutProxy.getCurrentGlucose();
      
      if (entry) {
        const reading = {
          timestamp: new Date(), // Use current time when we fetch the data
          value: convertToMmolL(entry.sgv),
          trend: entry.trend || 0,
          trendArrow: convertTrendToArrow(entry.direction),
          status: calculateGlucoseStatus(entry.sgv),
          unit: 'mmol/L',
          originalTimestamp: new Date(entry.date), // Keep original sensor timestamp for reference
        };
        setCurrentReading(reading);
        setGlucoseHistory(prev => {
          const newHistory = [...prev, reading];
          return newHistory.slice(-100);
        });
      } else {
        setError('No glucose data available from Nightscout');
      }
    } catch (err) {
      console.error('❌ Nightscout proxy fetch failed:', err);
      setError(`Failed to fetch from Nightscout via backend proxy: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Fallback to demo data if Nightscout fails
      const demoData = generateDemoGlucoseData(24);
      setGlucoseHistory(demoData);
      if (demoData.length > 0) {
        setCurrentReading(demoData[demoData.length - 1]);
      }
    }
  }, [selectedConnection, nightscoutProxy, calculateGlucoseStatus, isAuthenticated, nightscoutConfig]);

  const fetchHistoricalData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping historical data fetch - user not authenticated');
      return;
    }
    
    if (!selectedConnection) return;
    
    if (!nightscoutConfig) {
      console.log('🔍 Skipping historical data fetch - no Nightscout credentials configured');
      return;
    }
    
    try {
      console.log('🔗 Fetching historical glucose data via backend proxy...');
      
      // Calculate date range based on time range - centered approach
      const now = new Date();
      const endDate = new Date();
      const startDate = new Date();
      
      // For centered timeline: show 2 hours past + 4 hours future (6h total)
      startDate.setTime(now.getTime() - (2 * 60 * 60 * 1000));
      endDate.setTime(now.getTime() + (4 * 60 * 60 * 1000));
      
      // Fetch data using backend proxy
      const data = await nightscoutProxy.getGlucoseEntriesByDate(startDate, endDate);

      // Filter data to only include glucose readings (type: 'sgv') within the time range
      const glucoseEntries = data.filter((entry: any) => {
        if (entry.type !== 'sgv') return false;
        
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });

      // If no data in the time range, try to get recent data
      if (glucoseEntries.length === 0) {
        console.log('No data in time range, fetching recent entries...');
        const recentData = await nightscoutProxy.getGlucoseEntries(100);
        const allGlucoseEntries = recentData.filter((entry: any) => entry.type === 'sgv');

        const history = allGlucoseEntries.map((entry: any) => ({
          timestamp: new Date(entry.date),
          value: convertToMmolL(entry.sgv),
          trend: entry.trend || 0,
          trendArrow: convertTrendToArrow(entry.direction),
          status: calculateGlucoseStatus(entry.sgv),
          unit: 'mmol/L',
          originalTimestamp: new Date(entry.date),
        }));
        
        // Sort by timestamp
        history.sort((a: GlucoseReading, b: GlucoseReading) => a.timestamp.getTime() - b.timestamp.getTime());
 
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
        originalTimestamp: new Date(entry.date),
      }));
      
      // Sort by timestamp to ensure chronological order
      history.sort((a: GlucoseReading, b: GlucoseReading) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setGlucoseHistory(history);
    } catch (err) {
      console.error('❌ Nightscout proxy historical fetch failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch historical data from Nightscout via backend proxy: ${errorMessage}`);
      
      // Only fallback to demo data if we're in development or if explicitly enabled
      const isDemoMode = process.env.REACT_APP_ENABLE_DEMO_MODE === 'true';
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDemoMode || isDevelopment) {
        const demoData = generateDemoGlucoseData(24);
        setGlucoseHistory(demoData);
      } else {
        // In production, show an empty chart with error message
        setGlucoseHistory([]);
      }
    }
  }, [selectedConnection, nightscoutProxy, calculateGlucoseStatus, isAuthenticated, nightscoutConfig]);


  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      if (!isAuthenticated) {
        console.log('🔍 Skipping initial data fetch - user not authenticated');
        return;
      }
      
      // Log timezone information for debugging
      logTimezoneInfo();
      console.log('🕐 User timezone:', getTimezoneDisplayName());
      console.log('🕐 Current local time:', getCurrentLocalTime().toLocaleString());
      
      fetchPatientInfo();
      fetchConnections();
      fetchCOBSettings(); // Load COB settings from database
      const config = await loadNightscoutConfig(); // Load Nightscout configuration
      
      // Only try to fetch real data if Nightscout credentials are configured
      if (config) {
        fetchHistoricalData();
        fetchCurrentGlucose();
      }
    };
    
    initializeData();
  }, [fetchPatientInfo, fetchConnections, fetchCOBSettings, fetchHistoricalData, fetchCurrentGlucose, isAuthenticated]);

  // Monitor glucoseHistory changes
  useEffect(() => {
    // Trigger re-calculations when glucose history changes
  }, [glucoseHistory, currentReading]);

  // Real-time insulin calculations update
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping real-time updates - user not authenticated');
      return;
    }
    
    const interval = setInterval(() => {
      // Only update if still authenticated
      if (isAuthenticated) {
        // Force re-render for real-time calculations
        setGlucoseHistory(prev => [...prev]);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // All calculations now handled by backend - no frontend processing needed

  // Fetch glucose calculations when current reading or notes change
  useEffect(() => {
    if (isAuthenticated) {
      fetchGlucoseCalculations();
    }
  }, [fetchGlucoseCalculations, isAuthenticated]);

  // Refresh glucose calculations when notes change (affects COB/IOB)
  useEffect(() => {
    if (isAuthenticated && currentReading?.value) {
      fetchGlucoseCalculations();
    }
  }, [notes, fetchGlucoseCalculations, isAuthenticated, currentReading]);

  // Notes management functions
  const loadNotes = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping notes load - user not authenticated');
      return;
    }
    
    if (!nightscoutConfig) {
      console.log('🔍 Skipping notes load - no Nightscout credentials configured');
      setNotes([]);
      setNotesBackendStatus('backend');
      return;
    }
    
    try {
      // Check if backend is available
      const isBackendAvailable = await hybridNotesApiService.isBackendAvailable();
      setNotesBackendStatus(isBackendAvailable ? 'backend' : 'local');
      
      const allNotes = await hybridNotesApiService.getNotes();
      setNotes(allNotes);
    } catch (error) {
      console.error('❌ Error loading notes:', error);
      setNotesBackendStatus('error');
      // Show user-friendly error message
      setError('Failed to load notes. Please check your connection and try again.');
      setNotes([]);
    }
  }, [isAuthenticated, nightscoutConfig]);

  // COB calculations now handled entirely by backend via fetchGlucoseCalculations

  const handleCOBConfigChange = useCallback(async (newConfig: any) => {
    try {
      // Save to database
      const updatedSettings = await cobSettingsApi.saveCOBSettings(newConfig);
      console.log('✅ COB settings saved to database:', updatedSettings);
      
      // Update local state
      setCobSettings(updatedSettings);
      
      // Settings will be used by backend calculations automatically
      // Trigger refresh of backend calculations
      if (currentReading?.value) {
        fetchGlucoseCalculations();
      }
    } catch (error) {
      console.error('❌ Error saving COB settings:', error);
      // Settings save failed - backend will use default values
      console.warn('⚠️ COB settings save failed, backend will use defaults');
    }
  }, [currentReading, fetchGlucoseCalculations]);


  const handleNoteSave = async (note: GlucoseNote) => {
    try {
      // Note is already saved by the modal, just update local state
      setNotes(prev => [...prev, note]);
      
      // Refresh notes from backend to ensure consistency
      setTimeout(() => {
        loadNotes();
      }, 1000);
    } catch (error) {
      console.error('Error updating local state after note save:', error);
    }
  };

  const handleNoteUpdate = async (note: GlucoseNote) => {
    try {
      // Note is already updated by the modal, just update local state
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
      
      // Refresh notes from backend to ensure consistency
      setTimeout(() => {
        loadNotes();
      }, 1000);
    } catch (error) {
      console.error('Error updating local state after note update:', error);
    }
  };

  const handleNoteDelete = useCallback(async (noteId: string) => {
    try {
      const success = await hybridNotesApiService.deleteNote(noteId);
      if (success) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
        
        // Refresh notes from backend to ensure consistency
        setTimeout(() => {
          loadNotes();
        }, 1000);
      } else {
        setError('Failed to delete note. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error deleting note:', error);
      setError('Failed to delete note. Please check your connection and try again.');
    }
  }, [loadNotes]);

  const handleEditNote = (note: GlucoseNote) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
    setEditingNote(null);
  };

  // Nightscout configuration handlers
  const handleNightscoutConfigOpen = () => {
    setIsNightscoutConfigOpen(true);
  };

  const handleNightscoutConfigClose = () => {
    setIsNightscoutConfigOpen(false);
  };

  const handleNightscoutConfigSave = async (config: NightscoutConfig): Promise<void> => {
    console.log('🔧 Dashboard: handleNightscoutConfigSave called with config:', config);
    try {
      console.log('🔧 Dashboard: Calling nightscoutConfigApi.saveConfig...');
      const savedConfig = await nightscoutConfigApi.saveConfig(config);
      console.log('🔧 Dashboard: Save successful, received config:', savedConfig);
      setNightscoutConfig(savedConfig);
      console.log('✅ Nightscout configuration saved successfully');
    } catch (error) {
      console.error('❌ Failed to save Nightscout configuration:', error);
      setError('Failed to save Nightscout configuration');
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const loadNightscoutConfig = async (): Promise<NightscoutConfig | null> => {
    try {
      const config = await nightscoutConfigApi.getConfig();
      setNightscoutConfig(config);
      return config;
    } catch (error) {
      console.error('Failed to load Nightscout configuration:', error);
      return null;
    }
  };

  const handleNoteClick = (note: GlucoseNote) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };


  // Load notes on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadNotes();
    }
  }, [loadNotes, isAuthenticated]);

  // Backend calculations refresh automatically when notes change
  // Additional periodic refresh every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔍 Skipping periodic refresh - user not authenticated');
      return;
    }
    
    const interval = setInterval(() => {
      // Only fetch if still authenticated
      if (isAuthenticated && currentReading?.value) {
        fetchGlucoseCalculations();
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [currentReading, fetchGlucoseCalculations, isAuthenticated]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command+Shift+O (Mac) or Ctrl+Shift+O (Windows/Linux) to open note modal
      // Use event.code for language-independent key detection
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyO') {
        event.preventDefault();
        setIsNoteModalOpen(true);
      }
      
      // Command+Z (Mac) or Ctrl+Z (Windows/Linux) to delete last note
      if ((event.metaKey || event.ctrlKey) && event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault();
        if (notes.length > 0) {
          const lastNote = notes[notes.length - 1];
          handleNoteDelete(lastNote.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notes, handleNoteDelete]);

  const handleLogout = async () => {
    console.log('🔴 DASHBOARD: Logout button clicked!');
    try {
      console.log('🔓 DASHBOARD: Calling AuthContext logout...');
      await logout();
      console.log('✅ DASHBOARD: Logout completed successfully');
    } catch (error) {
      console.error('❌ DASHBOARD: Logout failed:', error);
      // Still attempt to logout locally even if backend fails
      console.log('🔄 DASHBOARD: Attempting fallback logout...');
      await logout();
    }
  };

  // Clear data when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔄 Clearing dashboard data - user logged out');
      setCurrentReading(null);
      setGlucoseHistory([]);
      setNotes([]);
      setGlucoseCalculations(null);
      setCobSettings(null);
      setError(null);
      setNotesBackendStatus('checking');
    }
  }, [isAuthenticated]);


  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
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
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Compact Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-full mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Glucose Monitor</h1>
              {user && (
                <span className="ml-2 sm:ml-4 text-xs sm:text-sm text-gray-600">
                  Welcome, {user.fullName}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setIsCOBSettingsOpen(true)}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 flex items-center space-x-1 sm:space-x-2"
                title="Configure COB settings"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">COB Settings</span>
                <span className="sm:hidden">COB</span>
              </button>

              <button
                onClick={handleNightscoutConfigOpen}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 flex items-center space-x-1 sm:space-x-2"
                title="Configure Nightscout connection"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="hidden sm:inline">Nightscout</span>
                <span className="sm:hidden">NS</span>
              </button>
              
              <button
                onClick={() => setIsVersionInfoOpen(true)}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 flex items-center space-x-1 sm:space-x-2"
                title="Version information"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Version</span>
                <span className="sm:hidden">v</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Takes remaining space */}
              <main className="flex-1 overflow-hidden p-1">
        {/* Ultra-compact layout: Top info + Chart (50%) + Bottom info */}
        <div className="h-full flex flex-col gap-1">
          

          {/* Main Chart Area - Maximum space for visualization */}
          <div className="h-[70vh] flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-1 h-full flex flex-col">
              {/* Active Status Bar - One Line Display */}
              <div className="mb-1 flex justify-center flex-shrink-0">
                <div className="bg-gradient-to-r from-blue-50 via-orange-50 to-purple-50 border border-gray-200 rounded-lg px-4 py-2">
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    {/* Current Glucose */}
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 font-medium">📊</span>
                      <div className="text-center">
                        <div className="font-bold text-blue-800">
                          {currentReading ? `${currentReading.value} ${currentReading.unit}` : '--'}
                        </div>
                        {currentReading && (
                          <div className="text-xs text-blue-600">
                            {currentReading.trendArrow}
                          </div>
                        )}
                      </div>
                    </div>


                    {/* Separator */}
                    <div className="w-px h-8 bg-gray-300"></div>

                    {/* Active Carbs */}
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-600 font-medium">🍞</span>
                      <div className="text-center">
                        <div className="font-bold text-orange-800">
                          {(() => {
                            const carbsValue = glucoseCalculations?.activeCarbsOnBoard;
                            console.log('🔍 Active Carbs Display Debug:', {
                              hasGlucoseCalculations: !!glucoseCalculations,
                              carbsValue,
                              carbsValueType: typeof carbsValue,
                              isUndefined: carbsValue === undefined,
                              isNull: carbsValue === null
                            });
                            
                            return carbsValue !== undefined && carbsValue !== null ? 
                              `${carbsValue.toFixed(1)}g` : 
                              '--';
                          })()}
                        </div>
                        <div className="text-xs text-orange-600">
                          Active Carbs
                        </div>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="w-px h-8 bg-gray-300"></div>

                    {/* Active Insulin */}
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-600 font-medium">💉</span>
                      <div className="text-center">
                        <div className="font-bold text-purple-800">
                          {(() => {
                            const insulinValue = glucoseCalculations?.activeInsulinOnBoard;
                            console.log('🔍 Active Insulin Display Debug:', {
                              hasGlucoseCalculations: !!glucoseCalculations,
                              insulinValue,
                              insulinValueType: typeof insulinValue,
                              isUndefined: insulinValue === undefined,
                              isNull: insulinValue === null,
                              fullCalculations: glucoseCalculations
                            });
                            
                            return insulinValue !== undefined && insulinValue !== null ? 
                              `${insulinValue.toFixed(2)}u` : 
                              '--';
                          })()}
                        </div>
                        <div className="text-xs text-purple-600">
                          Active Insulin
                        </div>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="w-px h-8 bg-gray-300"></div>

                    {/* 2-Hour Prediction */}
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 font-medium">🔮</span>
                      <div className="text-center">
                        {(() => {
                          if (!currentReading?.value) {
                            return (
                              <>
                                <div className="font-bold text-gray-400">--</div>
                                <div className="text-xs text-gray-500">2h Prediction</div>
                              </>
                            );
                          }
                          
                          // Use only backend calculations for predictions
                          const prediction = glucoseCalculations?.twoHourPrediction !== undefined ? {
                            predictedGlucose: glucoseCalculations.twoHourPrediction,
                            trend: glucoseCalculations.predictionTrend || 'stable'
                          } : null;
                          
                          const getTrendIcon = (trend: string) => {
                            switch (trend) {
                              case 'rising': return '↗';
                              case 'falling': return '↘';
                              default: return '→';
                            }
                          };
                          
                          const getGlucoseColor = (glucose: number) => {
                            if (glucose < 3.9) return 'text-red-600';
                            if (glucose > 10.0) return 'text-orange-600';
                            return 'text-green-600';
                          };
                          
                          if (!prediction) {
                            return (
                              <>
                                <div className="font-bold text-gray-400">--</div>
                                <div className="text-xs text-gray-500">2h Prediction</div>
                              </>
                            );
                          }
                          
                          return (
                            <>
                              <div className={`font-bold ${getGlucoseColor(prediction.predictedGlucose)}`}>
                                {prediction.predictedGlucose?.toFixed(1) || 'N/A'} {getTrendIcon(prediction.trend)}
                              </div>
                              <div className="text-xs text-green-600">
                                2h Prediction
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              

              {/* Chart Container - Takes remaining space */}
              <div className="flex-1 min-h-0">
                <CombinedGlucoseChart 
                  glucoseData={glucoseHistory}
                  iobData={[]} // No frontend IOB data - backend handles predictions
                  notes={notes}
                  onNoteClick={handleNoteClick}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Notes Summary - Compact */}
          <div className="flex-shrink-0 h-[25vh]">
            
            {/* Notes Summary - Full Width */}
            <div className="bg-white rounded-lg shadow-sm p-1 h-full">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-semibold text-gray-900">🍽️ Recent Notes</h3>
                  <div className="flex items-center space-x-1">
                    {notesBackendStatus === 'checking' && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Checking backend connection..."></div>
                    )}
                    {notesBackendStatus === 'backend' && (
                      <div className="w-2 h-2 bg-green-400 rounded-full" title="Using backend storage"></div>
                    )}
                    {notesBackendStatus === 'local' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full" title="Using local storage"></div>
                    )}
                    {notesBackendStatus === 'error' && (
                      <div className="w-2 h-2 bg-red-400 rounded-full" title="Backend connection error"></div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="btn-primary text-xs px-2 py-1"
                >
                  ➕ Add
                </button>
              </div>
              
              {/* Recent Notes List - Ultra Compact - Filtered by time range */}
              <div className="space-y-0.5 max-h-16 overflow-y-auto">
                {notes
                  .filter((note) => {
                    const noteTime = note.timestamp.getTime();
                    const now = new Date().getTime();
                    
                    // Calculate time range for 6h view
                    const startTime = now - (6 * 60 * 60 * 1000);
                    
                    return noteTime >= startTime && noteTime <= now;
                  })
                  .slice(0, 4)
                  .map((note) => (
                  <div 
                    key={note.id} 
                    className="flex items-center justify-between text-xs bg-gray-50 rounded p-1 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleEditNote(note)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{note.meal}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(note.timestamp).toLocaleString(navigator.language, {
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="text-right text-xs">
                        <div className="text-blue-600 font-medium">{note.carbs}g</div>
                        <div className="text-purple-600 font-medium">{note.insulin}u</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNoteDelete(note.id);
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                        title="Delete note"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {(() => {
                  const now = new Date().getTime();
                  const startTime = now - (6 * 60 * 60 * 1000);
                  
                  const filteredNotes = notes.filter((note) => {
                    const noteTime = note.timestamp.getTime();
                    return noteTime >= startTime && noteTime <= now;
                  });
                  
                  if (filteredNotes.length === 0) {
                    return (
                      <div className="text-center py-1">
                        <div className="text-gray-400 text-sm mb-1">🍽️</div>
                        <p className="text-gray-500 text-xs">No notes in 6h range</p>
                      </div>
                    );
                  }
                  
                  if (filteredNotes.length > 4) {
                    return (
                      <div className="text-center py-1">
                        <span className="text-xs text-gray-400">+{filteredNotes.length - 4} more in 6h</span>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Note Input Modal */}
        <NoteInputModal
          isOpen={isNoteModalOpen}
          onClose={handleNoteModalClose}
          onSave={editingNote ? handleNoteUpdate : handleNoteSave}
          initialData={editingNote || undefined}
          currentGlucose={currentReading?.value}
          mode={editingNote ? 'edit' : 'add'}
        />

        {/* COB Settings Modal */}
        {isCOBSettingsOpen && (
          <COBSettings
            config={cobSettings || {
              carbRatio: 2.0,
              isf: 1.0,
              carbHalfLife: 45,
              maxCOBDuration: 240
            }}
            onConfigChange={handleCOBConfigChange}
            onClose={() => setIsCOBSettingsOpen(false)}
          />
        )}

        {/* Version Info Modal */}
        <VersionInfo
          isOpen={isVersionInfoOpen}
          onClose={() => setIsVersionInfoOpen(false)}
        />

        {/* Nightscout Configuration Modal */}
        <NightscoutConfigModal
          isOpen={isNightscoutConfigOpen}
          onClose={handleNightscoutConfigClose}
          onSave={handleNightscoutConfigSave}
          existingConfig={nightscoutConfig}
        />

      </main>
    </div>
  );
};

export default Dashboard;
