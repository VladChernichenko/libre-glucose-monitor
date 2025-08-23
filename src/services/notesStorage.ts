import { GlucoseNote, NoteInputData, MEAL_CATEGORIES } from '../types/notes';

const STORAGE_KEY = 'glucose_notes';

export class NotesStorageService {
  private static instance: NotesStorageService;
  
  private constructor() {}
  
  static getInstance(): NotesStorageService {
    if (!NotesStorageService.instance) {
      NotesStorageService.instance = new NotesStorageService();
    }
    return NotesStorageService.instance;
  }

  // Generate unique ID for notes
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get all notes from localStorage
  getNotes(): GlucoseNote[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const notes = JSON.parse(data);
      
      // Convert string dates back to Date objects
      return notes.map((note: any) => ({
        ...note,
        timestamp: new Date(note.timestamp)
      }));
    } catch (error) {
      console.error('Error reading notes from localStorage:', error);
      return [];
    }
  }

  // Save notes to localStorage
  private saveNotes(notes: GlucoseNote[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
      throw new Error('Failed to save notes');
    }
  }

  // Add a new note
  addNote(noteData: NoteInputData): GlucoseNote {
    const notes = this.getNotes();
    
    const newNote: GlucoseNote = {
      id: this.generateId(),
      ...noteData
    };
    
    notes.push(newNote);
    this.saveNotes(notes);
    
    console.log('✅ Note added:', newNote);
    return newNote;
  }

  // Update an existing note
  updateNote(id: string, updates: Partial<NoteInputData>): GlucoseNote | null {
    const notes = this.getNotes();
    const noteIndex = notes.findIndex(note => note.id === id);
    
    if (noteIndex === -1) {
      console.warn('Note not found for update:', id);
      return null;
    }
    
    const updatedNote: GlucoseNote = {
      ...notes[noteIndex],
      ...updates
    };
    
    notes[noteIndex] = updatedNote;
    this.saveNotes(notes);
    
    console.log('✅ Note updated:', updatedNote);
    return updatedNote;
  }

  // Delete a note
  deleteNote(id: string): boolean {
    const notes = this.getNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    
    if (filteredNotes.length === notes.length) {
      console.warn('Note not found for deletion:', id);
      return false;
    }
    
    this.saveNotes(filteredNotes);
    console.log('✅ Note deleted:', id);
    return true;
  }

  // Get notes within a time range
  getNotesInRange(startDate: Date, endDate: Date): GlucoseNote[] {
    const notes = this.getNotes();
    return notes.filter(note => 
      note.timestamp >= startDate && note.timestamp <= endDate
    );
  }

  // Clear all notes (for testing/reset)
  clearAllNotes(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ All notes cleared');
  }

  // Validate note data
  validateNoteData(data: NoteInputData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.timestamp || isNaN(data.timestamp.getTime())) {
      errors.push('Invalid timestamp');
    }
    
    if (typeof data.carbs !== 'number' || data.carbs < 0 || data.carbs > 1000) {
      errors.push('Carbs must be a number between 0 and 1000');
    }
    
    if (typeof data.insulin !== 'number' || data.insulin < 0 || data.insulin > 100) {
      errors.push('Insulin must be a number between 0 and 100');
    }
    
    if (!data.meal || !MEAL_CATEGORIES.includes(data.meal as any)) {
      errors.push('Invalid meal category');
    }
    
    if (data.comment && data.comment.length > 500) {
      errors.push('Comment must be less than 500 characters');
    }
    
    if (data.glucoseValue && (typeof data.glucoseValue !== 'number' || data.glucoseValue < 0)) {
      errors.push('Glucose value must be a positive number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const notesStorageService = NotesStorageService.getInstance();
export default notesStorageService;
