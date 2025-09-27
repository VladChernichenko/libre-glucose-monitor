import axios, { AxiosInstance } from 'axios';
import { authService } from './authService';

export interface DataSourceConfig {
  dataSource: 'nightscout' | 'libre';
  nightscout?: {
    url: string;
    secret: string;
    token?: string;
  };
  libre?: {
    email: string;
    password: string;
  };
}

export interface NightscoutConfig {
  nightscoutUrl: string;
  apiSecret: string;
  apiToken?: string;
}

class DataSourceConfigApi {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use((config) => {
      const token = authService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Get the current data source configuration
   */
  async getDataSourceConfig(): Promise<DataSourceConfig | null> {
    try {
      // Check for Nightscout configuration first
      const nightscoutConfig = await this.getNightscoutConfig();
      if (nightscoutConfig) {
        return {
          dataSource: 'nightscout',
          nightscout: {
            url: nightscoutConfig.nightscoutUrl,
            secret: nightscoutConfig.apiSecret,
            token: nightscoutConfig.apiToken
          }
        };
      }

      // Check for LibreLinkUp configuration
      const libreConfig = this.getLibreConfig();
      if (libreConfig) {
        return {
          dataSource: 'libre',
          libre: libreConfig
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get data source configuration:', error);
      return null;
    }
  }

  /**
   * Save Nightscout configuration
   */
  async saveNightscoutConfig(config: NightscoutConfig): Promise<void> {
    const response = await this.api.post('/api/nightscout/config', {
      nightscoutUrl: config.nightscoutUrl,
      apiSecret: config.apiSecret,
      apiToken: config.apiToken || ''
    });

    if (response.status !== 200) {
      throw new Error('Failed to save Nightscout configuration');
    }
  }

  /**
   * Save LibreLinkUp configuration
   */
  saveLibreConfig(config: { email: string; password: string }): void {
    localStorage.setItem('libre_config', JSON.stringify(config));
  }

  /**
   * Get Nightscout configuration from backend
   */
  private async getNightscoutConfig(): Promise<NightscoutConfig | null> {
    try {
      const response = await this.api.get('/api/nightscout/config');
      if (response.status === 200 && response.data) {
        return {
          nightscoutUrl: response.data.nightscoutUrl,
          apiSecret: response.data.apiSecret,
          apiToken: response.data.apiToken
        };
      }
      return null;
    } catch (error) {
      // No Nightscout configuration found
      return null;
    }
  }

  /**
   * Get LibreLinkUp configuration from localStorage
   */
  private getLibreConfig(): { email: string; password: string } | null {
    try {
      const config = localStorage.getItem('libre_config');
      if (config) {
        return JSON.parse(config);
      }
      return null;
    } catch (error) {
      console.error('Failed to parse LibreLinkUp configuration:', error);
      return null;
    }
  }

  /**
   * Clear all configurations
   */
  async clearAllConfigs(): Promise<void> {
    try {
      // Clear Nightscout config from backend
      await this.api.delete('/api/nightscout/config');
    } catch (error) {
      console.warn('Failed to clear Nightscout config from backend:', error);
    }

    // Clear LibreLinkUp config from localStorage
    localStorage.removeItem('libre_config');
  }

  /**
   * Get the active data source
   */
  async getActiveDataSource(): Promise<'nightscout' | 'libre' | null> {
    const config = await this.getDataSourceConfig();
    return config?.dataSource || null;
  }

  /**
   * Check if a specific data source is configured
   */
  async isDataSourceConfigured(dataSource: 'nightscout' | 'libre'): Promise<boolean> {
    const config = await this.getDataSourceConfig();
    return config?.dataSource === dataSource;
  }

  /**
   * Get LibreLinkUp credentials for API calls
   */
  getLibreCredentials(): { email: string; password: string } | null {
    return this.getLibreConfig();
  }
}

export const dataSourceConfigApi = new DataSourceConfigApi();
export default dataSourceConfigApi;
