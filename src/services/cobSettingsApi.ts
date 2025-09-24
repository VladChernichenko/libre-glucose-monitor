import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';
import { showErrorToast } from '../utils/toast';

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

// Add request interceptor to include auth token and check authentication
apiClient.interceptors.request.use((config) => {
  // Check if user is still authenticated or logout is in progress
  if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
    console.log('🚫 Blocking COB API request - user not authenticated or logout in progress');
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  
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

// Add response interceptor for token refresh and debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ COB API Response Success:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error('❌ COB API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });

    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('🔄 Attempting token refresh for COB API...');
        const newToken = await authService.refreshAccessToken();
        if (newToken) {
          console.log('✅ Token refreshed successfully, retrying COB API request');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed for COB API:', refreshError);
        // Refresh failed, redirect to login
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden - insufficient permissions or invalid token
    if (error.response?.status === 403) {
      console.log('🚫 Access forbidden (403) in COB API, logging out user');
      authService.logout();
      showErrorToast('Access denied. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return Promise.reject(error);
    }

    // Handle 404 User Not Found - user account deleted or deactivated
    if (error.response?.status === 404 && 
        error.response?.data?.error === 'User not found') {
      console.log('👤 User not found in COB API, logging out user');
      authService.logout();
      // Show a user-friendly toast message
      showErrorToast('Your account was not found. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000); // Give user time to read the message
      return Promise.reject(error);
    }

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
