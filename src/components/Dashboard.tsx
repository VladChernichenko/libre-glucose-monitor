import React, { useState, useEffect, useCallback } from 'react';
import GlucoseDisplay from './GlucoseDisplay';
import GlucoseChart from './GlucoseChart';
import NoteInputModal from './NoteInputModal';
import { generateDemoGlucoseData } from '../services/demoData';

import { GlucoseReading } from '../types/libre';
import { GlucoseNote } from '../types/notes';
import { notesStorageService } from '../services/notesStorage';

// Custom hooks and utilities
import { useInsulinCalculations } from '../hooks/useInsulinCalculations';
import { useNightscoutData } from '../hooks/useNightscoutData';
import { calculateGlucoseStatus } from '../utils/glucoseUtils';
import { APP_CONFIG, DEFAULT_CONNECTION } from '../constants/app';

const Dashboard: React.FC = () => {
  const [currentReading, setCurrentReading] = useState<GlucoseReading | null>(null);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [timeRange, setTimeRange] = useState<typeof APP_CONFIG.TIME_RANGES[number]>(APP_CONFIG.DEFAULT_TIME_RANGE);
  
  // Notes management
  const [notes, setNotes] = useState<GlucoseNote[]>([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GlucoseNote | null>(null);
  
  // Nightscout integration
  const [nightscoutUrl] = useState(process.env.REACT_APP_NIGHTSCOUT_URL || '');

  // Extract insulin doses from notes for calculations
  const insulinDoses = notes
    .filter(note => note.insulin > 0)
    .map(note => ({
      id: note.id,
      timestamp: note.timestamp,
      units: note.insulin,
      type: (note.meal === 'Correction' ? 'correction' : 'bolus') as 'correction' | 'bolus' | 'basal',
      note: note.comment,
      mealType: note.meal
    }));

  // Custom hooks
  const { currentTime } = useInsulinCalculations(insulinDoses);
  const { 
    isLoading, 
    fetchCurrentGlucose, 
    fetchHistoricalData 
  } = useNightscoutData(
    nightscoutUrl,
    selectedConnection,
    timeRange,
    setGlucoseHistory,
    setCurrentReading
  );

  // Helper functions
  const fetchPatientInfo = useCallback(async () => {
    // Patient info is not currently used but kept for future authentication
    // setPatient(DEFAULT_PATIENT);
  }, []);

  const fetchConnections = useCallback(async () => {
    setSelectedConnection(DEFAULT_CONNECTION);
  }, []);

  // Notes management functions
  const loadNotes = useCallback(() => {
    const allNotes = notesStorageService.getNotes();
    setNotes(allNotes);
  }, []);

  const handleNoteSave = (note: GlucoseNote) => {
    setNotes(prev => [...prev, note]);
  };

  const handleNoteUpdate = (note: GlucoseNote) => {
    setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  };

  const handleNoteDelete = (noteId: string) => {
    const success = notesStorageService.deleteNote(noteId);
    if (success) {
      setNotes(prev => prev.filter(note => note.id !== noteId));
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
    handleEditNote(note);
  };

  const handleTimeRangeChange = (newRange: typeof APP_CONFIG.TIME_RANGES[number]) => {
    setTimeRange(newRange);
    
    // Fetch new data for the selected time range
    if (nightscoutUrl) {
      fetchHistoricalData();
    }
  };

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Initial data fetch
  useEffect(() => {
    fetchPatientInfo();
    fetchConnections();
    
    // Always load demo data first for immediate chart display
    const demoData = generateDemoGlucoseData(24);
    setGlucoseHistory(demoData);
    if (demoData.length > 0) {
      setCurrentReading(demoData[demoData.length - 1]);
    }
    
    // If Nightscout is configured, try to fetch real data
    if (nightscoutUrl) {
      fetchHistoricalData();
      fetchCurrentGlucose();
    }
  }, [fetchPatientInfo, fetchConnections, nightscoutUrl, fetchHistoricalData, fetchCurrentGlucose]);

  // Update glucose status when data changes
  useEffect(() => {
    if (glucoseHistory.length > 0) {
      const updatedHistory = glucoseHistory.map(reading => ({
        ...reading,
        status: calculateGlucoseStatus(reading.value)
      }));
      setGlucoseHistory(updatedHistory);
      
      if (currentReading) {
        setCurrentReading(prev => prev ? {
          ...prev,
          status: calculateGlucoseStatus(prev.value)
        } : null);
      }
    }
  }, [glucoseHistory, currentReading]);

  // Fetch new data when time range changes
  useEffect(() => {
    if (nightscoutUrl && timeRange) {
      fetchHistoricalData();
    }
  }, [timeRange, nightscoutUrl, fetchHistoricalData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Glucose Monitor</h1>
          <p className="text-gray-600">Real-time glucose monitoring with insulin tracking</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Glucose Display & Notes */}
          <div className="lg:col-span-3 space-y-6">
            {/* Current Glucose Display */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <GlucoseDisplay
                reading={currentReading}
                isLoading={isLoading}
                insulinDoses={insulinDoses}
                currentTime={currentTime}
              />
            </div>

            {/* Meal Tracking */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Meal Tracking</h3>
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notes.slice(0, APP_CONFIG.MAX_NOTES_DISPLAY).map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
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
                          handleNoteDelete(note.id);
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
                {notes.length > APP_CONFIG.MAX_NOTES_DISPLAY && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-400">+{notes.length - APP_CONFIG.MAX_NOTES_DISPLAY} more notes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Glucose Chart */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
              {/* Time Range Controls */}
              <div className="mb-3 flex justify-center">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {APP_CONFIG.TIME_RANGES.map((range) => (
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
              
              {/* Chart Container */}
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
