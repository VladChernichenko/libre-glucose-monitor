import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getEnvironmentConfig } from '../config/environments';

// Types for different API responses
export interface ApiConfig {
  libreApiUrl?: string;
  cobApiUrl?: string;
}

export interface GlucoseEntry {
  timestamp: Date;
  value: number;
  trend?: number;
  trendArrow?: string;
  status: 'low' | 'normal' | 'high' | 'critical';
  unit: string;
  originalTimestamp: Date;
}

export interface COBEntry {
  id: string;
  timestamp: Date;
  carbs: number;
  insulin: number;
  meal: string;
  comment?: string;
}

export interface COBStatus {
  currentCOB: number;
  activeEntries: COBEntry[];
  estimatedGlucoseImpact: number;
  timeToZero: number;
  insulinOnBoard: number;
}

export interface COBProjection {
  time: Date;
  cob: number;
  iob: number;
}

export interface LibreAuthResponse {
  token: string;
  user: any;
}

export interface LibrePatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LibreConnection {
  id: string;
  name: string;
  type: string;
}

export interface LibreGraphData {
  data: any[];
  metadata: any;
}


export interface COBConfig {
  carbRatio: number;
  isf: number;
  carbHalfLife: number;
  maxCOBDuration: number;
}

class ApiService {
  private libreApi: AxiosInstance | null = null;
  private cobApi: AxiosInstance | null = null;
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.initializeApis();
  }

  private initializeApis() {

    // Initialize Libre API
    if (this.config.libreApiUrl) {
      this.libreApi = axios.create({
        baseURL: this.config.libreApiUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Load token from localStorage
      const token = localStorage.getItem('libre_token');
      if (token) {
        this.libreApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }

    // Initialize COB API
    if (this.config.cobApiUrl) {
      this.cobApi = axios.create({
        baseURL: this.config.cobApiUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    }
  }

  // ===== LIBRE API METHODS =====

  async authenticateLibre(email: string, password: string): Promise<LibreAuthResponse> {
    if (!this.libreApi) {
      throw new Error('Libre API not configured');
    }

    try {
      const response: AxiosResponse<LibreAuthResponse> = await this.libreApi.post('/auth/login', {
        email,
        password,
      });
      
      const authData = response.data;
      this.setLibreAuthToken(authData.token);
      return authData;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  async getLibrePatientInfo(): Promise<LibrePatient> {
    if (!this.libreApi) {
      throw new Error('Libre API not configured');
    }

    try {
      const response: AxiosResponse<LibrePatient> = await this.libreApi.get('/user/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch patient info:', error);
      throw new Error('Failed to fetch patient information.');
    }
  }

  async getLibreConnections(): Promise<LibreConnection[]> {
    if (!this.libreApi) {
      throw new Error('Libre API not configured');
    }

    try {
      const response: AxiosResponse<LibreConnection[]> = await this.libreApi.get('/connections');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      throw new Error('Failed to fetch connections.');
    }
  }

  async getLibreGlucoseData(patientId: string, days: number = 1): Promise<LibreGraphData> {
    if (!this.libreApi) {
      throw new Error('Libre API not configured');
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response: AxiosResponse<LibreGraphData> = await this.libreApi.get(`/patients/${patientId}/glucose`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch glucose data:', error);
      throw new Error('Failed to fetch glucose data.');
    }
  }

  async getLibreRealTimeData(patientId: string): Promise<GlucoseEntry> {
    if (!this.libreApi) {
      throw new Error('Libre API not configured');
    }

    try {
      const response: AxiosResponse<any> = await this.libreApi.get(`/patients/${patientId}/glucose/current`);
      const data = response.data;
      
      // Convert to mmol/L if needed
      const value = data.unit === 'mg/dL' ? data.value / 18 : data.value;
      
      return {
        timestamp: new Date(data.timestamp),
        value,
        trend: data.trend,
        trendArrow: data.trendArrow,
        status: this.getGlucoseStatus(value),
        unit: 'mmol/L',
        originalTimestamp: new Date(data.timestamp),
      };
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
      throw new Error('Failed to fetch real-time glucose data.');
    }
  }

  private setLibreAuthToken(token: string) {
    if (this.libreApi) {
      this.libreApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('libre_token', token);
    }
  }

  isLibreAuthenticated(): boolean {
    return !!localStorage.getItem('libre_token');
  }

  logoutLibre(): void {
    if (this.libreApi) {
      delete this.libreApi.defaults.headers.common['Authorization'];
    }
    localStorage.removeItem('libre_token');
  }

  // ===== COB API METHODS =====

  async calculateCOB(userId: string, mealData: any): Promise<any> {
    if (!this.cobApi) {
      throw new Error('COB API not configured');
    }

    try {
      const response: AxiosResponse<any> = await this.cobApi.get(`/api/cob/calculate?userId=${userId}`, {
        params: mealData
      });
      return response.data;
    } catch (error) {
      console.error('Failed to calculate COB:', error);
      throw new Error('Failed to calculate carbs on board');
    }
  }

  async getCOBStatus(userId: string): Promise<COBStatus> {
    if (!this.cobApi) {
      throw new Error('COB API not configured');
    }

    try {
      const response: AxiosResponse<COBStatus> = await this.cobApi.get(`/api/cob/status?userId=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch COB status:', error);
      throw new Error('Failed to fetch COB status');
    }
  }

  async getCOBTimeline(userId: string): Promise<COBProjection[]> {
    if (!this.cobApi) {
      throw new Error('COB API not configured');
    }

    try {
      const response: AxiosResponse<COBProjection[]> = await this.cobApi.get(`/api/cob/timeline?userId=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch COB timeline:', error);
      throw new Error('Failed to fetch COB timeline');
    }
  }

  // ===== UTILITY METHODS =====

  private async checkCorsIssue(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private getGlucoseStatus(value: number): 'low' | 'normal' | 'high' | 'critical' {
    // value is in mmol/L
    if (value < 3.9) return 'low';      // < 70 mg/dL
    if (value < 10.0) return 'normal';  // 70-180 mg/dL
    if (value < 13.9) return 'high';    // 180-250 mg/dL
    return 'critical';                   // > 250 mg/dL
  }

  // ===== CONFIGURATION METHODS =====


  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.initializeApis();
  }

  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

// Create and export a singleton instance using environment configuration
const config = getEnvironmentConfig();
export const apiService = new ApiService({
  libreApiUrl: config.libreApiUrl,
  cobApiUrl: config.cobApiUrl,
});

export default apiService;


