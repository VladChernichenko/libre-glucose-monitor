import React, { useState, useEffect, useCallback } from 'react';
import libreApiService from '../services/libreApi';
import GlucoseDisplay from './GlucoseDisplay';
import GlucoseChart from './GlucoseChart';
import NoteInputModal from './NoteInputModal';

import { GlucoseReading, LibrePatient } from '../types/libre';
import { GlucoseNote } from '../types/notes';
import { notesStorageService } from '../services/notesStorage';


const Dashboard: React.FC = () => {
  const [currentReading, setCurrentReading] = useState<GlucoseReading | null>(null);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [patient, setPatient] = useState<LibrePatient | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '12h' | '24h'>('24h');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  // Notes management
  const [notes, setNotes] = useState<GlucoseNote[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GlucoseNote | null>(null);
  
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

  const calculateGlucoseStatus = useCallback((value: number): 'low' | 'normal' | 'high' | 'critical' => {
    // Convert to mmol/L for status calculation
    const mmolL = convertToMmolL(value);
    if (mmolL < 3.9) return 'low';      // < 70 mg/dL
    if (mmolL < 10.0) return 'normal';  // 70-180 mg/dL
    if (mmolL < 13.9) return 'high';    // 180-250 mg/dL
    return 'critical';                   // > 250 mg/dL
  }, []);

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
      setError(`Failed to fetch historical data from Nightscout: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [selectedConnection, timeRange, nightscoutUrl, calculateGlucoseStatus]);

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



  // Notes management functions
  const loadNotes = useCallback(() => {
    const allNotes = notesStorageService.getNotes();
    setNotes(allNotes);
  }, []);

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

  const handleLogout = () => {
    libreApiService.logout();
    window.location.reload();
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
      <main className="max-w-full mx-auto px-3 sm:px-4 py-3">
        
        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7rem)]">
          {/* Left Column: Current Glucose + Quick Actions */}
          <div className="lg:col-span-3 space-y-4">
            {/* Current Glucose Display - Compact */}
            <div className="bg-white rounded-lg shadow-sm p-4 h-fit">
              <GlucoseDisplay 
                reading={currentReading} 
                isLoading={isLoading} 
              />
            </div>
            
            {/* Notes Quick Add & Recent Summary */}
            <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">🍽️ Meal Tracking</h3>
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  ➕ Add
                </button>
              </div>
              
              {/* Recent Notes Summary - Scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {notes.slice(0, 8).map((note) => (
                  <div 
                    key={note.id} 
                    className="flex items-center justify-between text-sm bg-gray-50 rounded p-2 hover:bg-gray-100 transition-colors"
                  >
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleEditNote(note)}
                    >
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
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-xs">
                        <div className="text-blue-600 font-medium">{note.carbs}g</div>
                        <div className="text-purple-600 font-medium">{note.insulin}u</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete this ${note.meal} note?`)) {
                            handleNoteDelete(note.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Delete note"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="text-center py-6">
                    <div className="text-gray-400 text-3xl mb-2">🍽️</div>
                    <p className="text-gray-500 text-sm">No notes yet</p>
                    <p className="text-gray-400 text-xs">Click "Add" to start tracking</p>
                  </div>
                )}
                {notes.length > 8 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-400">+{notes.length - 8} more notes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Glucose Chart - Expanded */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
              {/* Time Range Controls - Compact */}
              <div className="mb-3 flex justify-center">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {(['1h', '6h', '12h', '24h'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => handleTimeRangeChange(range)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        timeRange === range
                          ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chart Container - Takes remaining space */}
              <div className="flex-1 min-h-0">
                <GlucoseChart 
                  data={glucoseHistory} 
                  timeRange={timeRange}
                  notes={notes}
                  onNoteClick={handleNoteClick}
                />
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
      </main>
    </div>
  );
};

export default Dashboard;
