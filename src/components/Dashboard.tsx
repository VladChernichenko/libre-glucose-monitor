import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

import apiService from '../services/apiService';
import GlucoseChart from './GlucoseChart';
import CombinedGlucoseChart from './CombinedGlucoseChart';
import NoteInputModal from './NoteInputModal';
import COBDisplay from './COBDisplay';
import COBChart from './COBChart';
import COBSettings from './COBSettings';
import { generateDemoGlucoseData, generateTestGlucoseData } from '../services/demoData';

import { GlucoseReading, LibrePatient } from '../types/libre';
import { GlucoseNote } from '../types/notes';
import { notesStorageService } from '../services/notesStorage';
import { carbsOnBoardService, COBStatus, COBEntry } from '../services/carbsOnBoard';
import { insulinOnBoardService, IOBProjection, InsulinEntry } from '../services/insulinOnBoard';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentReading, setCurrentReading] = useState<GlucoseReading | null>(null);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [patient, setPatient] = useState<LibrePatient | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h'>('6h');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notes management
  const [notes, setNotes] = useState<GlucoseNote[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GlucoseNote | null>(null);

  // COB management
  const [cobStatus, setCobStatus] = useState<COBStatus>({
    currentCOB: 0,
    activeEntries: [],
    estimatedGlucoseImpact: 0,
    timeToZero: 0,
    insulinOnBoard: 0
  });
  const [isCOBSettingsOpen, setIsCOBSettingsOpen] = useState(false);
  const [cobProjection, setCobProjection] = useState<Array<{time: Date, cob: number, iob: number}>>([]);

  // IOB and prediction management
  const [iobData, setIobData] = useState<IOBProjection[]>([]);
  const [chartMode, setChartMode] = useState<'glucose' | 'combined'>('combined');
  const [insulinEntries, setInsulinEntries] = useState<InsulinEntry[]>([]);

  // Nightscout integration enabled - using real data
  // In production, always use the hardcoded URL if env var is not set
  const [nightscoutUrl] = useState(() => {
    const envUrl = process.env.REACT_APP_NIGHTSCOUT_URL;
    if (envUrl) {
      console.log('Using Nightscout URL from environment:', envUrl);
      return envUrl;
    }
    console.log('Using hardcoded Nightscout URL for production');
    return 'https://vladchernichenko.eu.nightscoutpro.com';
  });

  // Debug: Log environment variables
  console.log('Environment variables:', {
    NIGHTSCOUT_URL: process.env.REACT_APP_NIGHTSCOUT_URL,
    NIGHTSCOUT_SECRET: process.env.REACT_APP_NIGHTSCOUT_SECRET,
    ENABLE_DEMO: process.env.REACT_APP_ENABLE_DEMO_MODE
  });
  console.log('Nightscout URL state:', nightscoutUrl);
  
  // Debug: Log API service configuration
  console.log('API Service config:', apiService.getConfig());

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

  // Calculate IOB and generate predictions
  const calculateIOBAndPredictions = useCallback(() => {
    if (insulinEntries.length === 0) {
      setIobData([]);
      return;
    }

    const now = new Date();
    
    // Calculate centered time range (same as fetchHistoricalData)
    let startTime: Date;
    let endTime: Date;
    
    if (timeRange === '1h') {
      // Show 30 minutes past + 30 minutes future
      startTime = new Date(now.getTime() - (30 * 60 * 1000));
      endTime = new Date(now.getTime() + (30 * 60 * 1000));
    } else if (timeRange === '6h') {
      // Show 2 hours past + 4 hours future (centered on current moment)
      startTime = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    } else if (timeRange === '12h') {
      // Show 4 hours past + 8 hours future
      startTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    } else if (timeRange === '24h') {
      // Show 8 hours past + 16 hours future
      startTime = new Date(now.getTime() - (8 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (16 * 60 * 60 * 1000));
    } else {
      // Default: 2 hours past + 4 hours future
      startTime = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    }
    
    // Generate IOB projection for the entire time range (past + future)
    const projection = insulinOnBoardService.generateCombinedProjection(
      insulinEntries,
      currentReading?.value || 0,
      0, // glucose trend - could be calculated from recent readings
      startTime, // Start from past time
      endTime,   // End at future time
      15 // 15-minute intervals
    );

    setIobData(projection);
  }, [insulinEntries, currentReading, timeRange]);

  // Create centered glucose data for chart display
  const createCenteredGlucoseData = useCallback(() => {
    if (!glucoseHistory || glucoseHistory.length === 0) {
      return [];
    }

    const now = new Date();
    
    // Calculate centered time range
    let startTime: Date;
    let endTime: Date;
    
    if (timeRange === '1h') {
      startTime = new Date(now.getTime() - (30 * 60 * 1000));
      endTime = new Date(now.getTime() + (30 * 60 * 1000));
    } else if (timeRange === '6h') {
      startTime = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    } else if (timeRange === '12h') {
      startTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    } else if (timeRange === '24h') {
      startTime = new Date(now.getTime() - (8 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (16 * 60 * 60 * 1000));
    } else {
      startTime = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      endTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    }

    // Filter glucose data to the centered time range
    return glucoseHistory.filter(reading => {
      const readingTime = reading.timestamp.getTime();
      return readingTime >= startTime.getTime() && readingTime <= endTime.getTime();
    });
  }, [glucoseHistory, timeRange]);

  // Extract insulin entries from notes
  const extractInsulinFromNotes = useCallback(() => {
    const insulinNotes = notes.filter(note => note.insulin && note.insulin > 0);
    const entries: InsulinEntry[] = insulinNotes.map((note, index) => ({
      id: `insulin-${note.id}`,
      timestamp: note.timestamp,
      units: note.insulin!,
      type: 'bolus' as const,
      comment: note.comment
    }));
    
    setInsulinEntries(entries);
  }, [notes]);

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

      // In development, use proxy to avoid CORS issues
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? '/ns' : nightscoutUrl;
      console.log('🔍 Using base URL:', baseUrl, 'isDev:', isDev);
      
      const response = await fetch(`${baseUrl}/api/v2/entries.json?count=1`, {
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
            timestamp: new Date(), // Use current time when we fetch the data
            value: convertToMmolL(entry.sgv),
            trend: entry.trend || 0,
            trendArrow: convertTrendToArrow(entry.direction),
            status: calculateGlucoseStatus(entry.sgv),
            unit: 'mmol/L',
            originalTimestamp: new Date(entry.date), // Keep original sensor timestamp for reference
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
      
      // Fallback to demo data if Nightscout fails
      console.log('🔄 Falling back to demo data due to Nightscout failure');

      const demoData = generateDemoGlucoseData(24);
      setGlucoseHistory(demoData);
      if (demoData.length > 0) {
        setCurrentReading(demoData[demoData.length - 1]);
      }
    }
    
    setIsLoading(false);
  }, [selectedConnection, nightscoutUrl, calculateGlucoseStatus]);

  const fetchHistoricalData = useCallback(async () => {
    if (!selectedConnection) return;
    
    // ONLY use Nightscout data - no demo fallback
    if (!nightscoutUrl) {
      setError('Nightscout URL not configured. Please check your environment variables.');
      return;
    }
    
    try {
      console.log('🔍 Fetching historical data from Nightscout:', nightscoutUrl);

      // Calculate date range based on time range - centered approach
      const now = new Date();
      const endDate = new Date();
      const startDate = new Date();
      
      // For centered timeline: show past data + current moment + future predictions
      if (timeRange === '1h') {
        // Show 30 minutes past + 30 minutes future
        startDate.setTime(now.getTime() - (30 * 60 * 1000));
        endDate.setTime(now.getTime() + (30 * 60 * 1000));
      } else if (timeRange === '6h') {
        // Show 2 hours past + 4 hours future (centered on current moment)
        startDate.setTime(now.getTime() - (2 * 60 * 60 * 1000));
        endDate.setTime(now.getTime() + (4 * 60 * 60 * 1000));
      } else if (timeRange === '12h') {
        // Show 4 hours past + 8 hours future
        startDate.setTime(now.getTime() - (4 * 60 * 60 * 1000));
        endDate.setTime(now.getTime() + (8 * 60 * 60 * 1000));
      } else if (timeRange === '24h') {
        // Show 8 hours past + 16 hours future
        startDate.setTime(now.getTime() - (8 * 60 * 60 * 1000));
        endDate.setTime(now.getTime() + (16 * 60 * 60 * 1000));
      }
      
      console.log(`📊 Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()} (${timeRange})`);

      // In development, use proxy to avoid CORS issues
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? '/ns' : nightscoutUrl;
      console.log('🔍 Using base URL for historical data:', baseUrl, 'isDev:', isDev);
      
      const response = await fetch(
        `${baseUrl}/api/v2/entries.json?count=500`,
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
            value: convertToMmolL(entry.sgv),
            trend: entry.trend || 0,
            trendArrow: convertTrendToArrow(entry.direction),
            status: calculateGlucoseStatus(entry.sgv),
            unit: 'mmol/L',
            originalTimestamp: new Date(entry.date),
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
          originalTimestamp: new Date(entry.date),
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch historical data from Nightscout: ${errorMessage}`);
      
      // Only fallback to demo data if we're in development or if explicitly enabled
      const isDemoMode = process.env.REACT_APP_ENABLE_DEMO_MODE === 'true';
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDemoMode || isDevelopment) {
        console.log('🔄 Falling back to demo data due to Nightscout historical fetch failure');
        const demoData = generateDemoGlucoseData(24);
        setGlucoseHistory(demoData);
      } else {
        console.log('❌ Production mode: Not falling back to demo data. Please check Nightscout configuration.');
        // In production, show an empty chart with error message
        setGlucoseHistory([]);
      }
    }
  }, [selectedConnection, timeRange, nightscoutUrl, calculateGlucoseStatus]);

  // Initial data fetch
  useEffect(() => {
    console.log('🚀 Dashboard useEffect triggered');
    console.log('🚀 Current state:', { 
      nightscoutUrl, 
      glucoseHistoryLength: glucoseHistory.length,
      currentReading: !!currentReading 
    });
    
    fetchPatientInfo();
    fetchConnections();
    
    // If Nightscout is configured, try to fetch real data first
    if (nightscoutUrl) {
      console.log('🚀 Nightscout configured, attempting to fetch real data first');
      fetchHistoricalData();
      fetchCurrentGlucose();
    } else {
      console.log('🚀 Nightscout not configured, using demo data only');
      // Only load demo data if Nightscout is not configured
      const demoData = generateDemoGlucoseData(24);
      console.log('📊 Demo data generated:', demoData.length, 'entries');
      setGlucoseHistory(demoData);
      if (demoData.length > 0) {
        setCurrentReading(demoData[demoData.length - 1]);
      }
    }
  }, [fetchPatientInfo, fetchConnections, nightscoutUrl, fetchHistoricalData, fetchCurrentGlucose]);

  // Monitor glucoseHistory changes
  useEffect(() => {
    console.log('🔄 glucoseHistory state changed:', {
      length: glucoseHistory.length,
      hasData: glucoseHistory.length > 0,
      firstEntry: glucoseHistory[0],
      lastEntry: glucoseHistory[glucoseHistory.length - 1]
    });
  }, [glucoseHistory]);

  // Real-time insulin calculations update
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Extract insulin entries when notes change
  useEffect(() => {
    extractInsulinFromNotes();
  }, [extractInsulinFromNotes]);

  // Calculate IOB when insulin entries or current reading changes
  useEffect(() => {
    calculateIOBAndPredictions();
  }, [calculateIOBAndPredictions]);

  // Notes management functions
  const loadNotes = useCallback(() => {
    const allNotes = notesStorageService.getNotes();
    setNotes(allNotes);
  }, []);

  // COB management functions
  const calculateCOB = useCallback(() => {
    // Convert notes to COB entries
    const cobEntries: COBEntry[] = notes.map(note => ({
      id: note.id,
      timestamp: note.timestamp,
      carbs: note.carbs,
      insulin: note.insulin,
      mealType: note.meal,
      comment: note.comment,
      glucoseValue: note.glucoseValue
    }));

    // Calculate current COB status
    const status = carbsOnBoardService.calculateCOB(cobEntries);
    setCobStatus(status);

    // Calculate COB projection for chart
    const projection = carbsOnBoardService.getCOBProjection(cobEntries, 24); // 6 hours in 15-min intervals 
    setCobProjection(projection);
  }, [notes]);

  const handleCOBConfigChange = useCallback((newConfig: any) => {
    carbsOnBoardService.updateConfig(newConfig);
    calculateCOB(); // Recalculate with new settings
  }, [calculateCOB]);

  const handleNoteSave = (note: GlucoseNote) => {
    setNotes(prev => [...prev, note]);
    console.log('✅ Note saved:', note);
  };

  const handleNoteUpdate = (note: GlucoseNote) => {
    setNotes(prev => prev.map(n => n.id === note.id ? note : n));
    console.log('✏️ Note updated:', note);
  };

  const handleNoteDelete = (noteId: string) => {
    const success = notesStorageService.deleteNote(noteId);
    if (success) {
      setNotes(prev => prev.filter(note => note.id !== noteId));
      console.log('🗑️ Note deleted:', noteId);
    } else {
      console.error('❌ Failed to delete note from localStorage:', noteId);
    }
  };

  const handleEditNote = (note: GlucoseNote) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
    setEditingNote(null);
  };

  const handleNoteClick = (note: GlucoseNote) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Calculate COB whenever notes change
  useEffect(() => {
    calculateCOB();
  }, [calculateCOB]);

  // Refresh COB calculations every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      calculateCOB();
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [calculateCOB]);

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
  }, [notes]);

  const handleLogout = () => {
    logout();
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
          
          {/* Top Row: Quick Actions + COB + COB Projection - Ultra Compact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 flex-shrink-0 h-[15vh]">
            
            {/* Quick Actions - Ultra Compact */}
            <div className="bg-white rounded-lg shadow-sm p-1 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-900">⚡ Quick Actions</h3>
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="btn-primary text-xs px-2 py-1"
                  title="Add new note (⌘+⇧+O)"
                >
                  ➕ Add
                </button>
              </div>
              <div className="text-xs text-gray-600">
                <div>⌘+⇧+O: Add note</div>
                <div>⌘+Z: Undo last</div>
                <button
                  onClick={async () => {
                    try {
                      console.log('🧪 Testing API connection...');
                      const status = await apiService.getDetailedConnectionStatus();
                      console.log('🧪 API Connection Status:', status);
                      alert(`API Status:\nDirect: ${status.direct}\nProxy: ${status.proxy}\nErrors: ${status.errors.join(', ')}`);
                    } catch (error) {
                      console.error('🧪 API test failed:', error);
                      alert(`API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-1 py-0.5 rounded text-xs mt-1 w-full mb-1"
                >
                  🧪 Test API
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('🔍 Testing Nightscout connection...');
                      // In development, use proxy to avoid CORS issues
                      const isDev = process.env.NODE_ENV === 'development';
                      const baseUrl = isDev ? '/ns' : nightscoutUrl;
                      console.log('🔍 Using base URL for test:', baseUrl, 'isDev:', isDev);
                      
                      const response = await fetch(`${baseUrl}/api/v2/status.json`);
                      const data = await response.json();
                      console.log('✅ Nightscout status:', data);
                      alert(`Nightscout Status: ${data.status}\nName: ${data.name}\nVersion: ${data.version}`);
                    } catch (error) {
                      console.error('❌ Nightscout test failed:', error);
                      alert(`Nightscout test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-1 py-0.5 rounded text-xs w-full mb-1"
                >
                  🔍 Test Nightscout
                </button>
                <button
                  onClick={() => {
                    console.log('🧪 Loading test glucose data...');
                    const testData = generateTestGlucoseData();
                    setGlucoseHistory(testData);
                    if (testData.length > 0) {
                      setCurrentReading(testData[testData.length - 1]);
                    }
                    console.log('✅ Test data loaded:', testData.length, 'points');
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-1 py-0.5 rounded text-xs w-full mb-1"
                >
                  📊 Load Test Data
                </button>
                <button
                  onClick={() => {
                    console.log('🧪 Creating test insulin entries...');
                    const now = new Date();
                    const testInsulinEntries: InsulinEntry[] = [
                      {
                        id: 'test-insulin-1',
                        timestamp: new Date(now.getTime() - (30 * 60 * 1000)), // 30 minutes ago
                        units: 2.0,
                        type: 'bolus',
                        comment: 'Test bolus 1'
                      },
                      {
                        id: 'test-insulin-2',
                        timestamp: new Date(now.getTime() - (90 * 60 * 1000)), // 90 minutes ago
                        units: 1.5,
                        type: 'bolus',
                        comment: 'Test bolus 2'
                      }
                    ];
                    setInsulinEntries(testInsulinEntries);
                    console.log('✅ Test insulin entries created:', testInsulinEntries);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-1 py-0.5 rounded text-xs w-full"
                >
                  💉 Test Insulin
                </button>
              </div>
            </div>

            {/* COB Display - Ultra Compact */}
            <div className="bg-white rounded-lg shadow-sm p-1 flex-shrink-0">
              <COBDisplay 
                cobStatus={cobStatus}
                onEditEntry={(entry) => {
                  const note = notes.find(n => n.id === entry.id);
                  if (note) {
                    handleEditNote(note);
                  }
                }}
                onDeleteEntry={(entryId) => {
                  handleNoteDelete(entryId);
                }}
              />
            </div>

            {/* COB Projection - Ultra Compact */}
            <div className="bg-white rounded-lg shadow-sm p-1 flex-shrink-0">
              <h3 className="text-xs font-semibold text-gray-900 mb-1">📊 COB Projection</h3>
              <div className="h-12">
                <COBChart 
                  projection={cobProjection}
                  timeRange={timeRange}
                />
              </div>
            </div>
          </div>

          {/* Main Chart Area - Exactly 50% of screen height */}
          <div className="h-[50vh] flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-1 h-full flex flex-col">
              {/* Current Glucose Level at Top - Ultra Compact */}
              <div className="mb-1 flex justify-center flex-shrink-0">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                  <div className="text-center">
                    <div className="text-xs text-blue-600 font-medium">Current Glucose</div>
                    <div className="text-lg font-bold text-blue-800">
                      {currentReading ? `${currentReading.value} ${currentReading.unit}` : '--'}
                    </div>
                    {currentReading && (
                      <div className="text-xs text-blue-600">
                        {currentReading.trendArrow} {currentReading.trend}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              
              {/* Time Range Controls - Ultra Compact */}
              <div className="mb-1 flex justify-center flex-shrink-0">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {(['1h', '6h', '12h', '24h'] as const).map((range) => {
                    const labels = {
                      '1h': '30m+30m',
                      '6h': '2h+4h',
                      '12h': '4h+8h',
                      '24h': '8h+16h'
                    };
                    return (
                      <button
                        key={range}
                        onClick={() => handleTimeRangeChange(range)}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                          timeRange === range
                            ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                        }`}
                        title={`Past + Future: ${labels[range]}`}
                      >
                        {range}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chart Mode Controls - Ultra Compact */}
              <div className="mb-1 flex justify-center flex-shrink-0">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <button
                    onClick={() => setChartMode('glucose')}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      chartMode === 'glucose'
                        ? 'bg-white text-green-700 shadow-sm border border-green-200'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  >
                    📊 Glucose Only
                  </button>
                  <button
                    onClick={() => setChartMode('combined')}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      chartMode === 'combined'
                        ? 'bg-white text-purple-700 shadow-sm border border-purple-200'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  >
                    🔮 Glucose + IOB + Prediction
                  </button>
                </div>
              </div>
              
              {/* Chart Container - Takes remaining space */}
              <div className="flex-1 min-h-0">
                {chartMode === 'glucose' ? (
                  <GlucoseChart 
                    data={createCenteredGlucoseData()} 
                    timeRange={timeRange}
                    notes={notes}
                    onNoteClick={handleNoteClick}
                  />
                ) : (
                  <CombinedGlucoseChart 
                    glucoseData={createCenteredGlucoseData()}
                    iobData={iobData}
                    timeRange={timeRange}
                    notes={notes}
                    onNoteClick={handleNoteClick}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Notes Summary - Full width since COB Projection moved to top */}
          <div className="flex-shrink-0 h-[20vh]">
            
            {/* Notes Summary - Full Width */}
            <div className="bg-white rounded-lg shadow-sm p-1 h-full">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-900">🍽️ Recent Notes</h3>
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
                    
                    // Calculate time range based on selected timeRange
                    let startTime: number;
                    switch (timeRange) {
                      case '1h':
                        startTime = now - (1 * 60 * 60 * 1000);
                        break;
                      case '6h':
                        startTime = now - (6 * 60 * 60 * 1000);
                        break;
                      case '12h':
                        startTime = now - (12 * 60 * 60 * 1000);
                        break;
                      case '24h':
                        startTime = now - (24 * 60 * 60 * 1000);
                        break;
                      default:
                        startTime = now - (6 * 60 * 60 * 1000); // Default to 6h
                    }
                    
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
                        {new Date(note.timestamp).toLocaleString('en-US', {
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
                  let startTime: number;
                  switch (timeRange) {
                    case '1h':
                      startTime = now - (1 * 60 * 60 * 1000);
                      break;
                    case '6h':
                      startTime = now - (6 * 60 * 60 * 1000);
                      break;
                    case '12h':
                      startTime = now - (12 * 60 * 60 * 1000);
                      break;
                    case '24h':
                      startTime = now - (24 * 60 * 60 * 1000);
                      break;
                    default:
                      startTime = now - (6 * 60 * 60 * 1000);
                  }
                  
                  const filteredNotes = notes.filter((note) => {
                    const noteTime = note.timestamp.getTime();
                    return noteTime >= startTime && noteTime <= now;
                  });
                  
                  if (filteredNotes.length === 0) {
                    return (
                      <div className="text-center py-1">
                        <div className="text-gray-400 text-sm mb-1">🍽️</div>
                        <p className="text-gray-500 text-xs">No notes in {timeRange} range</p>
                      </div>
                    );
                  }
                  
                  if (filteredNotes.length > 4) {
                    return (
                      <div className="text-center py-1">
                        <span className="text-xs text-gray-400">+{filteredNotes.length - 4} more in {timeRange}</span>
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
            config={carbsOnBoardService.getConfig()}
            onConfigChange={handleCOBConfigChange}
            onClose={() => setIsCOBSettingsOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
