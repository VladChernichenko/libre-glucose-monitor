import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';
import { GlucoseNote, NoteInputData } from '../types/notes';
import { formatDateForBackend } from '../utils/timezone';

// Use the centralized timezone utility function

export interface BackendNote {
  id: string;
  userId: string;
  timestamp: string; // ISO string from backend
  carbs: number;
  insulin: number;
  meal: string;
  comment?: string;
  glucoseValue?: number;
  detailedInput?: string;
  insulinDose?: any; // Will be serialized JSON
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  timestamp: string; // ISO string
  carbs: number;
  insulin: number;
  meal: string;
  comment?: string;
  glucoseValue?: number;
  detailedInput?: string;
  insulinDose?: any;
}

export interface UpdateNoteRequest {
  timestamp?: string;
  carbs?: number;
  insulin?: number;
  meal?: string;
  comment?: string;
  glucoseValue?: number;
  detailedInput?: string;
  insulinDose?: any;
}

const config = getEnvironmentConfig();

// Create axios instance for notes API
const notesApiClient = axios.create({
  baseURL: `${config.backendUrl}/api/notes`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token and check authentication
notesApiClient.interceptors.request.use((config) => {
  // Check if user is still authenticated or logout is in progress
  if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
    console.log('🚫 Blocking notes API request - user not authenticated or logout in progress');
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  
  const token = localStorage.getItem('accessToken');
  console.log('🔍 Notes API Request Debug:', {
    url: (config.baseURL || '') + (config.url || ''),
    method: config.method,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
  });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for token refresh and debugging
notesApiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Notes API Response Success:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error('❌ Notes API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });

    // Handle token refresh for 401 and 403 errors
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('🔄 Attempting token refresh for Notes API...');
        const newToken = await authService.refreshAccessToken();
        if (newToken) {
          console.log('✅ Token refreshed successfully, retrying Notes API request');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return notesApiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed for Notes API:', refreshError);
        // Refresh failed, redirect to login
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to convert backend note to frontend note
const convertBackendNoteToFrontend = (backendNote: BackendNote): GlucoseNote => {
  return {
    id: backendNote.id,
    timestamp: new Date(backendNote.timestamp),
    carbs: backendNote.carbs,
    insulin: backendNote.insulin,
    meal: backendNote.meal,
    comment: backendNote.comment,
    glucoseValue: backendNote.glucoseValue,
    detailedInput: backendNote.detailedInput,
    insulinDose: backendNote.insulinDose ? JSON.parse(backendNote.insulinDose) : undefined,
  };
};

// Helper function to convert frontend note to backend request
const convertFrontendNoteToBackend = (note: NoteInputData): CreateNoteRequest => {
  return {
    timestamp: formatDateForBackend(note.timestamp),
    carbs: note.carbs,
    insulin: note.insulin,
    meal: note.meal,
    comment: note.comment,
    glucoseValue: note.glucoseValue,
    detailedInput: note.detailedInput,
    insulinDose: note.insulinDose ? JSON.stringify(note.insulinDose) : undefined,
  };
};

export const backendNotesApi = {
  /**
   * Get all notes for the current user
   */
  async getNotes(): Promise<GlucoseNote[]> {
    try {
      const response = await notesApiClient.get<BackendNote[]>('/');
      return response.data.map(convertBackendNoteToFrontend);
    } catch (error) {
      console.error('Error fetching notes from backend:', error);
      throw error;
    }
  },

  /**
   * Get notes within a date range
   */
  async getNotesInRange(startDate: Date, endDate: Date): Promise<GlucoseNote[]> {
    try {
      const response = await notesApiClient.get<BackendNote[]>('/range', {
        params: {
          startDate: formatDateForBackend(startDate),
          endDate: formatDateForBackend(endDate),
        }
      });
      return response.data.map(convertBackendNoteToFrontend);
    } catch (error) {
      console.error('Error fetching notes in range from backend:', error);
      throw error;
    }
  },

  /**
   * Get a specific note by ID
   */
  async getNoteById(id: string): Promise<GlucoseNote | null> {
    try {
      const response = await notesApiClient.get<BackendNote>(`/${id}`);
      return convertBackendNoteToFrontend(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching note by ID from backend:', error);
      throw error;
    }
  },

  /**
   * Create a new note
   */
  async createNote(noteData: NoteInputData): Promise<GlucoseNote> {
    try {
      const backendData = convertFrontendNoteToBackend(noteData);
      const response = await notesApiClient.post<BackendNote>('/', backendData);
      return convertBackendNoteToFrontend(response.data);
    } catch (error) {
      console.error('Error creating note in backend:', error);
      throw error;
    }
  },

  /**
   * Update an existing note
   */
  async updateNote(id: string, updates: Partial<NoteInputData>): Promise<GlucoseNote | null> {
    try {
      const backendData: UpdateNoteRequest = {};
      
      if (updates.timestamp) backendData.timestamp = formatDateForBackend(updates.timestamp);
      if (updates.carbs !== undefined) backendData.carbs = updates.carbs;
      if (updates.insulin !== undefined) backendData.insulin = updates.insulin;
      if (updates.meal) backendData.meal = updates.meal;
      if (updates.comment !== undefined) backendData.comment = updates.comment;
      if (updates.glucoseValue !== undefined) backendData.glucoseValue = updates.glucoseValue;
      if (updates.detailedInput !== undefined) backendData.detailedInput = updates.detailedInput;
      if (updates.insulinDose !== undefined) backendData.insulinDose = updates.insulinDose ? JSON.stringify(updates.insulinDose) : undefined;

      const response = await notesApiClient.put<BackendNote>(`/${id}`, backendData);
      return convertBackendNoteToFrontend(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error updating note in backend:', error);
      throw error;
    }
  },

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<boolean> {
    try {
      await notesApiClient.delete(`/${id}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      console.error('Error deleting note from backend:', error);
      throw error;
    }
  },

  /**
   * Get notes summary for the current user
   */
  async getNotesSummary(): Promise<{
    totalNotes: number;
    totalCarbsToday: number;
    totalInsulinToday: number;
    averageGlucose: number;
    carbInsulinRatio: number;
  }> {
    try {
      const response = await notesApiClient.get('/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching notes summary from backend:', error);
      throw error;
    }
  },

  /**
   * Test connection to notes API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing notes API connection...');
      // Try to get notes first (this will test authentication too)
      const response = await notesApiClient.get('/');
      console.log('✅ Notes API connection test successful:', response.status);
      return response.status === 200;
    } catch (error) {
      console.error('❌ Notes API connection test failed:', error);
      // Try a simpler health check as fallback
      try {
        const healthResponse = await notesApiClient.get('/health');
        console.log('✅ Notes API health check successful:', healthResponse.status);
        return healthResponse.status === 200;
      } catch (healthError) {
        console.error('❌ Notes API health check also failed:', healthError);
        return false;
      }
    }
  }
};

export default backendNotesApi;
