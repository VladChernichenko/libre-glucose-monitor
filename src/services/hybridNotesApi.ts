import { GlucoseNote, NoteInputData } from '../types/notes';
import { backendNotesApi } from './backendNotesApi';
import { notesStorageService } from './notesStorage';

export interface NotesApiService {
  // Notes CRUD operations
  getNotes(): Promise<GlucoseNote[]>;
  getNotesInRange(startDate: Date, endDate: Date): Promise<GlucoseNote[]>;
  addNote(noteData: NoteInputData): Promise<GlucoseNote>;
  updateNote(id: string, updates: Partial<NoteInputData>): Promise<GlucoseNote | null>;
  deleteNote(id: string): Promise<boolean>;
  
  // COB calculations
  calculateCOB(notes?: GlucoseNote[]): any;
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
  
  // Migration utilities
  migrateFromLocalStorage(): Promise<void>;
  isBackendAvailable(): Promise<boolean>;
}

class HybridNotesApiService implements NotesApiService {
  private useBackend: boolean = false;
  private migrationCompleted: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initializeService();
  }

  private async initializeService() {
    try {
      console.log('🔄 Initializing Notes API service...');
      
      // Test backend connection
      console.log('🔍 Testing backend connection...');
      const isBackendAvailable = await backendNotesApi.testConnection();
      this.useBackend = isBackendAvailable;
      
      console.log(`📝 Notes API: Using ${this.useBackend ? 'backend' : 'localStorage'} storage`);
      
      // If backend is available and we haven't migrated yet, migrate data
      if (this.useBackend && !this.migrationCompleted) {
        console.log('🔄 Backend available, migrating localStorage data...');
        await this.migrateFromLocalStorage();
      }
      
      console.log('✅ Notes API service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Backend not available, falling back to localStorage:', error);
      this.useBackend = false;
    }
  }

  async isBackendAvailable(): Promise<boolean> {
    try {
      return await backendNotesApi.testConnection();
    } catch (error) {
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  // Method to force re-initialization (useful for testing)
  async reinitialize(): Promise<void> {
    console.log('🔄 Re-initializing Notes API service...');
    this.initializationPromise = this.initializeService();
    await this.initializationPromise;
  }

  async migrateFromLocalStorage(): Promise<void> {
    if (this.migrationCompleted) {
      return;
    }

    try {
      console.log('🔄 Starting migration from localStorage to backend...');
      
      // Get all notes from localStorage
      const localNotes = notesStorageService.getNotes();
      
      if (localNotes.length === 0) {
        console.log('📝 No local notes to migrate');
        this.migrationCompleted = true;
        return;
      }

      console.log(`📝 Migrating ${localNotes.length} notes to backend...`);

      // Migrate notes one by one
      let migratedCount = 0;
      for (const note of localNotes) {
        try {
          await backendNotesApi.createNote(note);
          migratedCount++;
        } catch (error) {
          console.error(`Failed to migrate note ${note.id}:`, error);
        }
      }

      console.log(`✅ Migration completed: ${migratedCount}/${localNotes.length} notes migrated`);
      
      // Clear localStorage after successful migration
      if (migratedCount === localNotes.length) {
        notesStorageService.clearAllNotes();
        console.log('🗑️ LocalStorage cleared after successful migration');
      }
      
      this.migrationCompleted = true;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async getNotes(): Promise<GlucoseNote[]> {
    await this.ensureInitialized();
    if (this.useBackend) {
      return await backendNotesApi.getNotes();
    } else {
      return notesStorageService.getNotes();
    }
  }

  async getNotesInRange(startDate: Date, endDate: Date): Promise<GlucoseNote[]> {
    await this.ensureInitialized();
    if (this.useBackend) {
      return await backendNotesApi.getNotesInRange(startDate, endDate);
    } else {
      return notesStorageService.getNotesInRange(startDate, endDate);
    }
  }

  async addNote(noteData: NoteInputData): Promise<GlucoseNote> {
    await this.ensureInitialized();
    console.log(`📝 Adding note via ${this.useBackend ? 'backend' : 'localStorage'}`);
    if (this.useBackend) {
      return await backendNotesApi.createNote(noteData);
    } else {
      return notesStorageService.addNote(noteData);
    }
  }

  async updateNote(id: string, updates: Partial<NoteInputData>): Promise<GlucoseNote | null> {
    await this.ensureInitialized();
    console.log(`📝 Updating note via ${this.useBackend ? 'backend' : 'localStorage'}`);
    if (this.useBackend) {
      return await backendNotesApi.updateNote(id, updates);
    } else {
      return notesStorageService.updateNote(id, updates);
    }
  }

  async deleteNote(id: string): Promise<boolean> {
    await this.ensureInitialized();
    console.log(`📝 Deleting note via ${this.useBackend ? 'backend' : 'localStorage'}`);
    if (this.useBackend) {
      return await backendNotesApi.deleteNote(id);
    } else {
      return notesStorageService.deleteNote(id);
    }
  }

  // COB calculations - these use the existing service
  calculateCOB(notes?: GlucoseNote[]): any {
    const notesToUse = notes || [];
    
    // Import COB service dynamically to avoid circular dependencies
    const { carbsOnBoardService } = require('./carbsOnBoard');
    
    // Convert notes to COB entries
    const cobEntries = notesToUse.map(note => ({
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

  getCOBProjection(notes?: GlucoseNote[], timePoints: number = 24): Array<{time: Date, cob: number, iob: number}> {
    const notesToUse = notes || [];
    
    // Import COB service dynamically to avoid circular dependencies
    const { carbsOnBoardService } = require('./carbsOnBoard');
    
    // Convert notes to COB entries
    const cobEntries = notesToUse.map(note => ({
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

  getCOBSummary(notes?: GlucoseNote[]): {
    totalCarbsToday: number;
    totalInsulinToday: number;
    averageGlucose: number;
    carbInsulinRatio: number;
  } {
    const notesToUse = notes || [];
    
    // Import COB service dynamically to avoid circular dependencies
    const { carbsOnBoardService } = require('./carbsOnBoard');
    
    // Convert notes to COB entries
    const cobEntries = notesToUse.map(note => ({
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

  getCOBConfig(): any {
    const { carbsOnBoardService } = require('./carbsOnBoard');
    return carbsOnBoardService.getConfig();
  }

  updateCOBConfig(config: any): void {
    const { carbsOnBoardService } = require('./carbsOnBoard');
    carbsOnBoardService.updateConfig(config);
  }

  // Validation method
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
    
    if (!data.meal || !['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Correction', 'Other'].includes(data.meal)) {
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

// Export singleton instance
export const hybridNotesApiService = new HybridNotesApiService();
export default hybridNotesApiService;
