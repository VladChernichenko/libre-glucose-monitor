import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { GlucoseNote, NoteInputData, MEAL_CATEGORIES } from '../types/notes';
import { notesStorageService } from '../services/notesStorage';

interface NoteInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: GlucoseNote) => void;
  initialData?: GlucoseNote;
  currentGlucose?: number;
  mode: 'add' | 'edit';
}

const NoteInputModal: React.FC<NoteInputModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentGlucose,
  mode
}) => {
  const [formData, setFormData] = useState<NoteInputData>({
    timestamp: new Date(),
    carbs: 0,
    insulin: 0,
    meal: 'Breakfast',
    comment: '',
    glucoseValue: currentGlucose
  });

  // Display values for inputs (empty string instead of 0 for better UX)
  const [displayValues, setDisplayValues] = useState({
    carbs: '',
    insulin: ''
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Escape key to close modal
      if (event.key === 'Escape') {
        onClose();
      }
      
      // Command+Return (Mac) or Ctrl+Return (Windows/Linux) to save note
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isSubmitting) {
          // Trigger form submission programmatically
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isSubmitting]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        // For edit mode, use existing data
        setFormData({
          timestamp: initialData.timestamp,
          carbs: initialData.carbs,
          insulin: initialData.insulin,
          meal: initialData.meal,
          comment: initialData.comment || '',
          glucoseValue: initialData.glucoseValue
        });
        // Set display values for editing
        setDisplayValues({
          carbs: initialData.carbs.toString(),
          insulin: initialData.insulin.toString()
        });
      } else {
        // For add mode, start completely fresh
        setFormData({
          timestamp: new Date(),
          carbs: 0,
          insulin: 0,
          meal: 'Breakfast',
          comment: '',
          glucoseValue: currentGlucose
        });
        // Set display values for adding (completely empty)
        setDisplayValues({
          carbs: '',
          insulin: ''
        });
      }
      setErrors([]);
    }
  }, [isOpen, initialData, currentGlucose, mode]);

  // Clean up form data when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all form data when modal closes
      setFormData({
        timestamp: new Date(),
        carbs: 0,
        insulin: 0,
        meal: 'Breakfast',
        comment: '',
        glucoseValue: 0
      });
      setDisplayValues({
        carbs: '',
        insulin: ''
      });
      setErrors([]);
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof NoteInputData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleDisplayValueChange = (field: keyof typeof displayValues, value: string) => {
    // For carbs and insulin, only allow digits
    if (field === 'carbs' || field === 'insulin') {
      // Filter out non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      setDisplayValues(prev => ({
        ...prev,
        [field]: digitsOnly
      }));
      
      // Convert to numeric value
      const numericValue = parseInt(digitsOnly) || 0;
      setFormData(prev => ({
        ...prev,
        [field]: numericValue
      }));
      
      // Auto-update meal type based on new values
      const newCarbs = field === 'carbs' ? numericValue : formData.carbs;
      const newInsulin = field === 'insulin' ? numericValue : formData.insulin;
      const smartMealType = getSmartMealType(newCarbs, newInsulin);
      
      if (smartMealType !== formData.meal) {
        setFormData(prev => ({ ...prev, meal: smartMealType }));
      }
    } else {
      // For other fields, allow normal input
      setDisplayValues(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Smart meal type selection based on inputs
  const getSmartMealType = (carbs: number, insulin: number): string => {
    if (carbs > 0 && insulin > 0) {
      // Both filled - keep current selection or default to Breakfast
      return formData.meal;
    } else if (carbs > 0 && insulin === 0) {
      // Only carbs filled - likely a meal
      return formData.meal === 'Correction' ? 'Breakfast' : formData.meal;
    } else if (carbs === 0 && insulin > 0) {
      // Only insulin filled - likely a correction dose
      return 'Correction';
    } else {
      // Neither filled - keep current selection
      return formData.meal;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-select meal type based on inputs
    const smartMealType = getSmartMealType(formData.carbs, formData.insulin);
    if (smartMealType !== formData.meal) {
      setFormData(prev => ({ ...prev, meal: smartMealType }));
    }
    
    // Validate form data
    const validation = notesStorageService.validateNoteData(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      let note: GlucoseNote;
      
      if (mode === 'add') {
        note = notesStorageService.addNote(formData);
      } else {
        if (!initialData?.id) {
          throw new Error('Note ID is required for edit mode');
        }
        const updatedNote = notesStorageService.updateNote(initialData.id, formData);
        if (!updatedNote) {
          throw new Error('Failed to update note');
        }
        note = updatedNote;
      }
      
      onSave(note);
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      setErrors(['Failed to save note. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'add' ? '🍽️ Add Meal Note' : '✏️ Edit Meal Note'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form - Scrollable if needed */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 flex-1 overflow-y-auto" autoComplete="off">
          {/* Top Row: Timestamp and Meal Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="timestamp" className="block text-xs font-medium text-gray-700 mb-1">
                📅 When
              </label>
              <input
                id="timestamp"
                type="datetime-local"
                value={format(formData.timestamp, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => handleInputChange('timestamp', new Date(e.target.value))}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label htmlFor="meal" className="block text-sm font-medium text-gray-700 mb-2">
                🍽️ Meal Type
              </label>
              <select
                id="meal"
                value={formData.meal}
                onChange={(e) => handleInputChange('meal', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {MEAL_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Second Row: Carbs and Insulin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="carbs" className="block text-xs font-medium text-gray-700 mb-1">
                🍞 Carbs (g) <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                id="carbs"
                type="text"
                inputMode="numeric"
                value={displayValues.carbs}
                onChange={(e) => handleDisplayValueChange('carbs', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0 (digits only)"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="insulin" className="block text-xs font-medium text-gray-700 mb-1">
                💉 Insulin (u) <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <input
                id="insulin"
                type="text"
                inputMode="numeric"
                value={displayValues.insulin}
                onChange={(e) => handleDisplayValueChange('insulin', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0 (digits only)"
                autoComplete="off"
              />
            </div>
          </div>



          {/* Current Glucose (always read-only) */}
          {currentGlucose && (
            <div>
              <label htmlFor="glucose" className="block text-xs font-medium text-gray-700 mb-1">
                📊 Current Glucose (mmol/L) <span className="text-gray-500 text-xs">(read-only)</span>
              </label>
              <input
                id="glucose"
                type="text"
                value={formData.glucoseValue ? formData.glucoseValue.toString() : ''}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed rounded-md"
                placeholder={`Current: ${currentGlucose}`}
                readOnly
                disabled
              />
            </div>
          )}

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-xs font-medium text-gray-700 mb-1">
              💬 Comment (optional)
            </label>
            <textarea
              id="comment"
              value={formData.comment || ''}
              rows={2}
              maxLength={200}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What did you eat? Any special notes?"
              autoComplete="off"
            />
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-700">
                {errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Save note (⌘+Return)"
            >
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteInputModal;
