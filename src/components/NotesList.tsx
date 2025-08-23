import React from 'react';
import { format } from 'date-fns';
import { GlucoseNote } from '../types/notes';

interface NotesListProps {
  notes: GlucoseNote[];
  onEditNote: (note: GlucoseNote) => void;
  onDeleteNote: (noteId: string) => void;
}

const NotesList: React.FC<NotesListProps> = ({
  notes,
  onEditNote,
  onDeleteNote
}) => {
  const getMealIcon = (meal: string) => {
    switch (meal) {
      case 'Breakfast': return '🌅';
      case 'Lunch': return '🌞';
      case 'Dinner': return '🌙';
      case 'Snack': return '🍎';
      case 'Other': return '🍽️';
      default: return '🍽️';
    }
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">🍽️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No meal notes yet</h3>
        <p className="text-gray-500">Start tracking your meals, carbs, and insulin to see them here!</p>
      </div>
    );
  }

  // Sort notes by timestamp (newest first)
  const sortedNotes = [...notes].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">📋 Meal Notes</h3>
        <span className="text-sm text-gray-500">{notes.length} notes</span>
      </div>

      {sortedNotes.map((note) => (
        <div
          key={note.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {/* Note Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getMealIcon(note.meal)}</span>
              <div>
                <h4 className="font-medium text-gray-900">{note.meal}</h4>
                <p className="text-sm text-gray-500">
                  {format(note.timestamp, 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEditNote(note)}
                className="text-blue-400 hover:text-blue-600 transition-colors"
                title="Edit note"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete this ${note.meal} note?`)) {
                    onDeleteNote(note.id);
                  }
                }}
                className="text-red-400 hover:text-red-600 transition-colors"
                title="Delete note"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Note Summary */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Carbs</div>
              <div className="text-lg font-bold text-blue-700">
                {note.carbs}g
              </div>
            </div>
            
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Insulin</div>
              <div className="text-lg font-bold text-purple-700">
                {note.insulin}u
              </div>
            </div>
          </div>

          {/* Comment */}
          {note.comment && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Comment: </span>
                {note.comment}
              </div>
            </div>
          )}

          {/* Glucose Value */}
          {note.glucoseValue && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Glucose: </span>
                {note.glucoseValue} mmol/L
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotesList;
