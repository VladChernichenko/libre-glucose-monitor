import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';

const config = getEnvironmentConfig();

// Create axios instance with default config
const baseURL = `${config.backendUrl}/api/user/data-source-config`;
console.log('СЂСџвЂќВ§ userDataSourceConfigApi: Creating API client with baseURL:', baseURL);

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
    console.log('СЂСџС™В« Blocking User Data Source Config API request - user not authenticated or logout in progress');
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  
  const token = localStorage.getItem('accessToken');
  console.log('СЂСџвЂќРЊ User Data Source Config API Request:', {
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
    console.log('РІСљвЂ¦ User Data Source Config API Success:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('РІСњРЉ User Data Source Config API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('СЂСџвЂќС’ Authentication error - redirecting to login');
      authService.logout();
    }
    
    return Promise.reject(error);
  }
);

export interface UserDataSourceConfig {
  id: string;
  userId: string;
  dataSource: 'NIGHTSCOUT' | 'LIBRE_LINK_UP';
  
  // Nightscout configuration
  nightscoutUrl?: string;
  nightscoutApiSecret?: string;
  nightscoutApiToken?: string;
  
  // LibreLinkUp configuration
  libreEmail?: string;
  librePassword?: string;
  librePatientId?: string;
  
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataSourceConfigRequest {
  dataSource: 'NIGHTSCOUT' | 'LIBRE_LINK_UP';
  
  // Nightscout configuration
  nightscoutUrl?: string;
  nightscoutApiSecret?: string;
  nightscoutApiToken?: string;
  
  // LibreLinkUp configuration
  libreEmail?: string;
  librePassword?: string;
  librePatientId?: string;
  
  isActive?: boolean;
}

export interface NightscoutTestResponse {
  ok: boolean;
  message: string;
}

export interface DataSourceConfigStatus {
  hasNightscoutConfig: boolean;
  hasLibreConfig: boolean;
  hasAnyConfig: boolean;
  activeNightscoutConfig?: UserDataSourceConfig;
  activeLibreConfig?: UserDataSourceConfig;
  mostRecentlyUsedConfig?: UserDataSourceConfig;
  allConfigs: UserDataSourceConfig[];
  lastUpdate?: string;
}

export const userDataSourceConfigApi = {
  /**
   * Save or update a data source configuration
   */
  async saveConfig(config: DataSourceConfigRequest): Promise<UserDataSourceConfig> {
    console.log('СЂСџвЂќВ§ userDataSourceConfigApi: saveConfig called with:', config);
    try {
      console.log('СЂСџвЂќВ§ userDataSourceConfigApi: Making POST request to base URL:', apiClient.defaults.baseURL);
      const response = await apiClient.post('', config);
      console.log('СЂСџвЂќВ§ userDataSourceConfigApi: Response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('СЂСџвЂќВ§ userDataSourceConfigApi: Error saving configuration:', error);
      console.error('СЂСџвЂќВ§ userDataSourceConfigApi: Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      throw new Error('Failed to save data source configuration');
    }
  },

  /**
   * Get all configurations for the current user
   */
  async getAllConfigs(): Promise<UserDataSourceConfig[]> {
    try {
      const response = await apiClient.get('');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get data source configurations:', error);
      throw new Error('Failed to get data source configurations');
    }
  },

  /**
   * Get active configuration for a specific data source type
   */
  async getActiveConfig(dataSource: 'NIGHTSCOUT' | 'LIBRE_LINK_UP'): Promise<UserDataSourceConfig | null> {
    try {
      const response = await apiClient.get(`/active/${dataSource}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error(`Failed to get active ${dataSource} configuration:`, error);
      throw new Error(`Failed to get active ${dataSource} configuration`);
    }
  },

  /**
   * Get configuration status for the current user
   */
  async getConfigStatus(): Promise<DataSourceConfigStatus> {
    try {
      const response = await apiClient.get('/status');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get configuration status:', error);
      throw new Error('Failed to get configuration status');
    }
  },

  /**
   * Activate a specific configuration
   */
  async activateConfig(configId: string): Promise<UserDataSourceConfig> {
    try {
      const response = await apiClient.post(`/${configId}/activate`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to activate configuration:', error);
      throw new Error('Failed to activate configuration');
    }
  },

  /**
   * Deactivate a specific configuration
   */
  async deactivateConfig(configId: string): Promise<string> {
    try {
      const response = await apiClient.post(`/${configId}/deactivate`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to deactivate configuration:', error);
      throw new Error('Failed to deactivate configuration');
    }
  },

  /**
   * Delete a configuration
   */
  async deleteConfig(configId: string): Promise<string> {
    try {
      const response = await apiClient.delete(`/${configId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to delete configuration:', error);
      throw new Error('Failed to delete configuration');
    }
  },

  /**
   * Test Nightscout URL and credentials without saving (server-side probe).
   */
  async testNightscoutConnection(params: {
    nightscoutUrl: string;
    nightscoutApiSecret?: string;
    nightscoutApiToken?: string;
  }): Promise<NightscoutTestResponse> {
    try {
      const response = await apiClient.post<NightscoutTestResponse>('/test-nightscout', {
        nightscoutUrl: params.nightscoutUrl.trim(),
        nightscoutApiSecret: params.nightscoutApiSecret?.trim() ?? '',
        nightscoutApiToken: params.nightscoutApiToken?.trim() ?? '',
      });
      return {
        ok: !!response.data?.ok,
        message: response.data?.message ?? 'Unknown response from server.',
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Nightscout connection test failed.';
      return { ok: false, message };
    }
  },

  /**
   * Test a configuration
   */
  async testConfig(configId: string): Promise<string> {
    try {
      const response = await apiClient.post(`/${configId}/test`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to test configuration:', error);
      throw new Error('Failed to test configuration');
    }
  },

  /**
   * Update last used timestamp for a configuration
   */
  async updateLastUsed(configId: string): Promise<string> {
    try {
      const response = await apiClient.post(`/${configId}/last-used`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update last used timestamp:', error);
      throw new Error('Failed to update last used timestamp');
    }
  }
};

