import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';

export interface InsulinCatalogEntry {
  code: string;
  category: string;
  displayName: string;
  peakMinutes: number | null;
  diaHours: number;
  halfLifeMinutes: number;
  onsetMinutes: number | null;
  description: string | null;
}

export interface UserInsulinPreferences {
  rapidInsulinCode: string;
  longActingInsulinCode: string;
  rapidInsulin: InsulinCatalogEntry;
  longActingInsulin: InsulinCatalogEntry;
}

const config = getEnvironmentConfig();

const api = axios.create({
  baseURL: config.backendUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((req) => {
  if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  const token = localStorage.getItem('accessToken');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const insulinPreferencesApi = {
  async listCatalog(category?: 'RAPID' | 'LONG_ACTING'): Promise<InsulinCatalogEntry[]> {
    const params = category ? { category } : undefined;
    const { data } = await api.get<InsulinCatalogEntry[]>('/api/insulin-catalog', { params });
    return data;
  },

  async getPreferences(): Promise<UserInsulinPreferences> {
    const { data } = await api.get<UserInsulinPreferences>('/api/user/insulin-preferences');
    return data;
  },

  async savePreferences(rapidInsulinCode: string, longActingInsulinCode: string): Promise<UserInsulinPreferences> {
    const { data } = await api.put<UserInsulinPreferences>('/api/user/insulin-preferences', {
      rapidInsulinCode,
      longActingInsulinCode,
    });
    return data;
  },
};
