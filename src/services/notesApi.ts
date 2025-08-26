import { GlucoseNote, NoteInputData } from '../types/notes';
import { COBStatus, COBEntry, carbsOnBoardService } from './carbsOnBoard';

export interface NotesApiService {
  // Notes CRUD operations
  getNotes(): GlucoseNote[];
  getNotesInRange(startDate: Date, endDate: Date): GlucoseNote[];
  addNote(noteData: NoteInputData): GlucoseNote;
  updateNote(id: string, updates: Partial<NoteInputData>): GlucoseNote | null;
  deleteNote(id: string): boolean;
  
  // COB calculations
  calculateCOB(notes?: GlucoseNote[]): COBStatus;
  getCOBProjection(notes?: GlucoseNote[], timePoints?: number): Array<{time: Date, cob: number, iob: number}>;
  getCOBSummary(notes?: GlucoseNote[]): {
    totalCarbsToday: number;
    totalInsulinToday: number;
    averageGlucose: number;
    carbInsulinRatio: number;
  };
  
  // Configuration
  getCOBConfig(): any;
  updateCOBConfig(config: any): void;
}

class LocalNotesApiService implements NotesApiService {
  private storageKey = 'glucose_notes';
  
  // Generate unique ID for notes
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // Get all notes from localStorage
  getNotes(): GlucoseNote[] {
    try {
      const data = localStorage.getItem(this.storageKey);
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
  
  // Get notes within a time range
  getNotesInRange(startDate: Date, endDate: Date): GlucoseNote[] {
    const notes = this.getNotes();
    return notes.filter(note => 
      note.timestamp >= startDate && note.timestamp <= endDate
    );
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
    
    console.log('✅ Note added via API service:', newNote);
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
    
    console.log('✅ Note updated via API service:', updatedNote);
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
    console.log('✅ Note deleted via API service:', id);
    return true;
  }
  
  // Save notes to localStorage
  private saveNotes(notes: GlucoseNote[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
      throw new Error('Failed to save notes');
    }
  }
  
  // Calculate COB using the existing service
  calculateCOB(notes?: GlucoseNote[]): COBStatus {
    const notesToUse = notes || this.getNotes();
    
    // Convert notes to COB entries
    const cobEntries: COBEntry[] = notesToUse.map(note => ({
      id: note.id,
      timestamp: note.timestamp,
      carbs: note.carbs,
      insulin: note.insulin,
      mealType: note.meal,
      comment: note.comment,
      glucoseValue: note.glucoseValue
    }));
    
    return carbsOnBoardService.calculateCOB(cobEntries);
  }
  
  // Get COB projection
  getCOBProjection(notes?: GlucoseNote[], timePoints: number = 24): Array<{time: Date, cob: number, iob: number}> {
    const notesToUse = notes || this.getNotes();
    
    // Convert notes to COB entries
    const cobEntries: COBEntry[] = notesToUse.map(note => ({
      id: note.id,
      timestamp: note.timestamp,
      carbs: note.carbs,
      insulin: note.insulin,
      mealType: note.meal,
      comment: note.comment,
      glucoseValue: note.glucoseValue
    }));
    
    return carbsOnBoardService.getCOBProjection(cobEntries, timePoints);
  }
  
  // Get COB summary
  getCOBSummary(notes?: GlucoseNote[]): {
    totalCarbsToday: number;
    totalInsulinToday: number;
    averageGlucose: number;
    carbInsulinRatio: number;
  } {
    const notesToUse = notes || this.getNotes();
    
    // Convert notes to COB entries
    const cobEntries: COBEntry[] = notesToUse.map(note => ({
      id: note.id,
      timestamp: note.timestamp,
      carbs: note.carbs,
      insulin: note.insulin,
      mealType: note.meal,
      comment: note.comment,
      glucoseValue: note.glucoseValue
    }));
    
    return carbsOnBoardService.getCOBSummary(cobEntries);
  }
  
  // Get COB configuration
  getCOBConfig(): any {
    return carbsOnBoardService.getConfig();
  }
  
  // Update COB configuration
  updateCOBConfig(config: any): void {
    carbsOnBoardService.updateConfig(config);
  }
}

// Export singleton instance
export const notesApiService = new LocalNotesApiService();
export default notesApiService;
