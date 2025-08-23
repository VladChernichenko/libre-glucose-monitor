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
      <div className="text-center py-6">
        <div className="text-gray-400 text-4xl mb-3">🍽️</div>
        <h3 className="text-md font-medium text-gray-900 mb-1">No meal notes yet</h3>
        <p className="text-sm text-gray-500">Start tracking your meals!</p>
      </div>
    );
  }

  // Sort notes by timestamp (newest first)
  const sortedNotes = [...notes].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-2">
      {sortedNotes.map((note) => (
        <div
          key={note.id}
          className="border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer"
          onClick={() => onEditNote(note)}
        >
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="text-lg">{getMealIcon(note.meal)}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm truncate">{note.meal}</h4>
                <p className="text-xs text-gray-500">
                  {format(note.timestamp, 'MMM dd HH:mm')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditNote(note);
                }}
                className="text-blue-400 hover:text-blue-600 transition-colors p-1"
                title="Edit"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete this ${note.meal} note?`)) {
                    onDeleteNote(note.id);
                  }
                }}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
                title="Delete"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Compact Data Summary */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-blue-600 font-medium">{note.carbs}g carbs</span>
              <span className="text-purple-600 font-medium">{note.insulin}u insulin</span>
            </div>
            {note.glucoseValue && (
              <span className="text-gray-500">{note.glucoseValue} mmol/L</span>
            )}
          </div>

          {/* Comment Preview */}
          {note.comment && (
            <div className="mt-2 text-xs text-gray-600 line-clamp-2">
              {note.comment}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotesList;
