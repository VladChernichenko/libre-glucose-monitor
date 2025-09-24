import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';

const config = getEnvironmentConfig();

// Create axios instance with default config
const baseURL = `${config.backendUrl}/api/nightscout/config`;
console.log('🔧 nightscoutConfigApi: Creating API client with baseURL:', baseURL);
console.log('🔧 nightscoutConfigApi: Environment config:', config);

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token and check authentication
apiClient.interceptors.request.use((config) => {
  // Check if user is still authenticated or logout is in progress
  if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
    console.log('🚫 Blocking Nightscout config API request - user not authenticated or logout in progress');
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  
  const token = localStorage.getItem('accessToken');
  console.log('🔍 Nightscout Config API Request:', {
    url: (config.baseURL || '') + (config.url || ''),
    method: config.method,
    hasToken: !!token,
    params: config.params
  });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Nightscout Config API Success:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Nightscout Config API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('🔐 Authentication error - redirecting to login');
      authService.logout();
    }
    
    return Promise.reject(error);
  }
);

export interface NightscoutConfig {
  id?: string;
  nightscoutUrl: string;
  apiSecret?: string;
  apiToken?: string;
  isActive?: boolean;
  lastUsed?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NightscoutConfigRequest {
  nightscoutUrl: string;
  apiSecret?: string;
  apiToken?: string;
  isActive?: boolean;
}

export interface NightscoutConfigStatus {
  hasConfig: boolean;
  isActive: boolean;
  nightscoutUrl?: string;
  lastUsed?: string;
}

export const nightscoutConfigApi = {
  /**
   * Save or update Nightscout configuration
   */
  async saveConfig(config: NightscoutConfigRequest): Promise<NightscoutConfig> {
    console.log('🔧 nightscoutConfigApi: saveConfig called with:', config);
    try {
      console.log('🔧 nightscoutConfigApi: Making POST request to base URL:', apiClient.defaults.baseURL);
      const response = await apiClient.post('', config);
      console.log('🔧 nightscoutConfigApi: Response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔧 nightscoutConfigApi: Error saving configuration:', error);
      console.error('🔧 nightscoutConfigApi: Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      throw new Error('Failed to save Nightscout configuration');
    }
  },

  /**
   * Get current Nightscout configuration
   */
  async getConfig(): Promise<NightscoutConfig | null> {
    try {
      const response = await apiClient.get('');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Failed to get Nightscout configuration:', error);
      throw new Error('Failed to get Nightscout configuration');
    }
  },

  /**
   * Get active Nightscout configuration
   */
  async getActiveConfig(): Promise<NightscoutConfig | null> {
    try {
      const response = await apiClient.get('/active');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Failed to get active Nightscout configuration:', error);
      throw new Error('Failed to get active Nightscout configuration');
    }
  },

  /**
   * Test Nightscout configuration
   */
  async testConfig(): Promise<string> {
    try {
      const response = await apiClient.post('/test');
      return response.data;
    } catch (error: any) {
      console.error('Failed to test Nightscout configuration:', error);
      throw new Error('Failed to test Nightscout configuration');
    }
  },

  /**
   * Deactivate Nightscout configuration
   */
  async deactivateConfig(): Promise<string> {
    try {
      const response = await apiClient.post('/deactivate');
      return response.data;
    } catch (error: any) {
      console.error('Failed to deactivate Nightscout configuration:', error);
      throw new Error('Failed to deactivate Nightscout configuration');
    }
  },

  /**
   * Delete Nightscout configuration
   */
  async deleteConfig(): Promise<string> {
    try {
      const response = await apiClient.delete('');
      return response.data;
    } catch (error: any) {
      console.error('Failed to delete Nightscout configuration:', error);
      throw new Error('Failed to delete Nightscout configuration');
    }
  },

  /**
   * Check if user has a Nightscout configuration
   */
  async hasConfig(): Promise<boolean> {
    try {
      const response = await apiClient.get('/exists');
      return response.data;
    } catch (error: any) {
      console.error('Failed to check Nightscout configuration existence:', error);
      return false;
    }
  },

  /**
   * Get configuration status
   */
  async getConfigStatus(): Promise<NightscoutConfigStatus> {
    try {
      const response = await apiClient.get('/status');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get Nightscout configuration status:', error);
      return {
        hasConfig: false,
        isActive: false
      };
    }
  }
};
