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
    insulin: '',
    glucoseValue: currentGlucose ? currentGlucose.toString() : ''
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          insulin: initialData.insulin.toString(),
          glucoseValue: initialData.glucoseValue ? initialData.glucoseValue.toString() : ''
        });
      } else {
        // For add mode, use defaults
        setFormData({
          timestamp: new Date(),
          carbs: 0,
          insulin: 0,
          meal: 'Breakfast',
          comment: '',
          glucoseValue: currentGlucose
        });
        // Set display values for adding (empty for carbs/insulin)
        setDisplayValues({
          carbs: '',
          insulin: '',
          glucoseValue: currentGlucose ? currentGlucose.toString() : ''
        });
      }
      setErrors([]);
    }
  }, [isOpen, initialData, currentGlucose, mode]);

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
    setDisplayValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Convert display value to actual form data
    let numericValue: number;
    if (field === 'carbs' || field === 'insulin') {
      numericValue = parseInt(value) || 0;
    } else if (field === 'glucoseValue') {
      numericValue = parseFloat(value) || 0;
    } else {
      return;
    }
    
    // Update form data with numeric value
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'add' ? '🍽️ Add Meal Note' : '✏️ Edit Meal Note'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Timestamp */}
          <div>
            <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-2">
              📅 When did you eat?
            </label>
            <input
              id="timestamp"
              type="datetime-local"
              value={format(formData.timestamp, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleInputChange('timestamp', new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Carbs */}
          <div>
            <label htmlFor="carbs" className="block text-sm font-medium text-gray-700 mb-2">
              🍞 Carbs (grams)
            </label>
            <input
              id="carbs"
              type="text"
              inputMode="numeric"
              value={displayValues.carbs}
              onChange={(e) => handleDisplayValueChange('carbs', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              required
            />
          </div>

          {/* Insulin */}
          <div>
            <label htmlFor="insulin" className="block text-sm font-medium text-gray-700 mb-2">
              💉 Insulin (units)
            </label>
            <input
              id="insulin"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.insulin}
              onChange={(e) => handleInputChange('insulin', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Meal Type */}
          <div>
            <label htmlFor="meal" className="block text-sm font-medium text-gray-700 mb-2">
              🍽️ Meal Type
            </label>
            <select
              id="meal"
              value={formData.meal}
              onChange={(e) => handleInputChange('meal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {MEAL_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              💬 Comment (optional)
            </label>
            <textarea
              id="comment"
              value={formData.comment || ''}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What did you eat? Any special notes?"
            />
          </div>

          {/* Current Glucose (optional) */}
          {currentGlucose && (
            <div>
              <label htmlFor="glucose" className="block text-sm font-medium text-gray-700 mb-2">
                📊 Current Glucose (optional)
              </label>
              <input
                id="glucose"
                type="text"
                inputMode="decimal"
                value={displayValues.glucoseValue}
                onChange={(e) => handleDisplayValueChange('glucoseValue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Current: ${currentGlucose} mmol/L`}
              />
            </div>
          )}

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
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
