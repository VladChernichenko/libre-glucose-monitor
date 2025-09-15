import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';

export interface COBSettingsData {
  id?: string;
  userId?: string;
  carbRatio: number;
  isf: number;
  carbHalfLife: number;
  maxCOBDuration: number;
}

const config = getEnvironmentConfig();

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${config.cobApiUrl}/api/cob-settings`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  console.log('🔍 COB API Request Debug:', {
    url: (config.baseURL || '') + (config.url || ''),
    method: config.method,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'None',
    headers: config.headers
  });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ COB API Response Success:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ COB API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export const cobSettingsApi = {
  /**
   * Get COB settings for the current user
   */
  async getCOBSettings(): Promise<COBSettingsData> {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (error) {
      console.error('Error fetching COB settings:', error);
      throw error;
    }
  },

  /**
   * Create or update COB settings for the current user
   */
  async saveCOBSettings(settings: COBSettingsData): Promise<COBSettingsData> {
    try {
      const response = await apiClient.post('/', settings);
      return response.data;
    } catch (error) {
      console.error('Error saving COB settings:', error);
      throw error;
    }
  },

  /**
   * Update COB settings for the current user
   */
  async updateCOBSettings(settings: COBSettingsData): Promise<COBSettingsData> {
    try {
      const response = await apiClient.put('/', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating COB settings:', error);
      throw error;
    }
  },

  /**
   * Delete COB settings for the current user
   */
  async deleteCOBSettings(): Promise<void> {
    try {
      await apiClient.delete('/');
    } catch (error) {
      console.error('Error deleting COB settings:', error);
      throw error;
    }
  },

  /**
   * Check if COB settings exist for the current user
   */
  async hasCOBSettings(): Promise<boolean> {
    try {
      const response = await apiClient.get('/exists');
      return response.data;
    } catch (error) {
      console.error('Error checking COB settings existence:', error);
      throw error;
    }
  },
};

export default cobSettingsApi;
