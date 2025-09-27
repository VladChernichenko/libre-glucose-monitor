import axios, { AxiosInstance } from 'axios';
import {
  LibreAuthResponse,
  LibrePatient,
  LibreGraphData,
  LibreConnection,
  GlucoseReading
} from '../types/libre';
import { dataSourceConfigApi } from './dataSourceConfigApi';
import { authService } from './authService';

class LibreApiService {
  private api: AxiosInstance;
  private backendUrl: string;
  private token: string | null = null;

  constructor() {
    // Use backend URL instead of direct LibreLinkUp API
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
    this.api = axios.create({
      baseURL: this.backendUrl,
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

    // Load token from localStorage
    this.token = localStorage.getItem('libre_token');
  }


  async authenticate(email?: string, password?: string): Promise<LibreAuthResponse> {
    try {
      // If credentials not provided, try to get them from configuration
      let authEmail = email;
      let authPassword = password;

      if (!authEmail || !authPassword) {
        const credentials = dataSourceConfigApi.getLibreCredentials();
        if (!credentials) {
          throw new Error('LibreLinkUp credentials not found. Please configure LibreLinkUp in settings.');
        }
        authEmail = credentials.email;
        authPassword = credentials.password;
      }

      // Call backend proxy instead of direct LibreLinkUp API
      const response = await this.api.post('/api/libre/auth/login', {
        email: authEmail,
        password: authPassword,
      });

      const authData = response.data;
      if (authData.token) {
        this.token = authData.token;
        localStorage.setItem('libre_token', authData.token);
        return {
          token: authData.token,
          expires: authData.expires || Date.now() + (24 * 60 * 60 * 1000) // Default 24 hours
        };
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error) {
      console.error('LibreLinkUp authentication failed:', error);
      throw new Error('LibreLinkUp authentication failed. Please check your credentials.');
    }
  }

  async getPatientInfo(): Promise<LibrePatient> {
    try {
      const response = await this.api.get('/api/libre/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch patient info:', error);
      throw new Error('Failed to fetch patient information.');
    }
  }

  async getConnections(): Promise<LibreConnection[]> {
    try {
      const response = await this.api.get('/api/libre/connections');
      // Backend already returns properly formatted connections
      return response.data;
    } catch (error) {
      console.error('Failed to fetch LibreLinkUp connections:', error);
      throw new Error('Failed to fetch LibreLinkUp connections.');
    }
  }

  async getGlucoseData(patientId: string, days: number = 1): Promise<LibreGraphData> {
    try {
      // Call backend proxy
      const response = await this.api.get(`/api/libre/connections/${patientId}/graph`, {
        params: { days }
      });

      // Backend already returns properly formatted data
      const graphData = response.data;
      const transformedData = graphData.data?.map((point: any) => ({
        timestamp: point.timestamp,
        value: point.value * 18, // Convert mmol/L back to mg/dL for compatibility
        trend: point.trend || 0,
        trendArrow: point.trendArrow,
        isHigh: point.value > 10.0, // mmol/L
        isLow: point.value < 3.9,
        isInRange: point.value >= 3.9 && point.value <= 10.0,
      })) || [];

      return {
        patientId,
        data: transformedData,
        startDate: graphData.startDate,
        endDate: graphData.endDate,
        unit: 'mmol/L'
      };
    } catch (error) {
      console.error('Failed to fetch LibreLinkUp glucose data:', error);
      throw new Error('Failed to fetch LibreLinkUp glucose data.');
    }
  }

  async getRealTimeData(patientId: string): Promise<GlucoseReading> {
    try {
      // Call backend proxy for current glucose
      const response = await this.api.get(`/api/libre/connections/${patientId}/current`);
      const currentReading = response.data;

      return {
        timestamp: new Date(currentReading.timestamp),
        value: currentReading.value,
        trend: currentReading.trend || 0,
        trendArrow: currentReading.trendArrow,
        status: currentReading.status,
        unit: currentReading.unit,
        originalTimestamp: new Date(currentReading.originalTimestamp)
      };
    } catch (error) {
      console.error('Failed to fetch LibreLinkUp real-time data:', error);
      throw new Error('Failed to fetch LibreLinkUp real-time glucose data.');
    }
  }


  isAuthenticated(): boolean {
    return !!this.token;
  }

  logout(): void {
    this.token = null;
    delete this.api.defaults.headers.common['Authorization'];
    localStorage.removeItem('libre_token');
  }
}

export const libreApiService = new LibreApiService();
export default libreApiService;
