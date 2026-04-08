import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
  LibreAuthResponse,
  LibrePatient,
  LibreGraphData,
  LibreConnection,
  GlucoseReading
} from '../types/libre';
import { getEnvironmentConfig } from '../config/environments';
import { dataSourceConfigApi } from './dataSourceConfigApi';
import { authService } from './authService';

class LibreApiService {
  private api: AxiosInstance;
  private backendUrl: string;
  private token: string | null = null;

  constructor() {
    // Use backend URL instead of direct LibreLinkUp API
    this.backendUrl = getEnvironmentConfig().backendUrl || 'http://localhost:8080';
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

  /** Resolves patient id from argument or Libre data-source config (localStorage). */
  private resolvePatientId(explicit?: string): string {
    const fromArg = explicit?.trim();
    if (fromArg) return fromArg;
    const fromConfig = dataSourceConfigApi.getLibrePatientId();
    if (fromConfig) return fromConfig;
    throw new Error(
      'LibreLinkUp patient ID is required. Add it in data source settings or pass it to this method.'
    );
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
      throw new Error(this.formatHttpError(error, 'Failed to fetch LibreLinkUp connections.'));
    }
  }

  /**
   * Verify Libre Link Up email/password (and optional patient ID) against the backend proxy.
   * On success, stores the Libre token like authenticate() so follow-up calls work.
   */
  async testConnection(
    email: string,
    password: string,
    patientId?: string
  ): Promise<{ ok: boolean; message: string }> {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !password) {
      return { ok: false, message: 'Email and password are required to test the connection.' };
    }

    try {
      const response = await this.api.post('/api/libre/auth/login', {
        email: trimmedEmail,
        password,
      });
      const authData = response.data;
      if (!authData?.token) {
        return { ok: false, message: 'No authentication token received from the server.' };
      }
      this.token = authData.token;
      localStorage.setItem('libre_token', authData.token);

      let connections: LibreConnection[];
      try {
        connections = await this.getConnections();
      } catch (connErr) {
        return {
          ok: false,
          message: this.formatHttpError(connErr, 'Login worked but loading connections failed.'),
        };
      }

      if (!connections?.length) {
        return {
          ok: false,
          message: 'Login succeeded but no Libre Link Up connections were returned.',
        };
      }

      const pid = patientId?.trim();
      if (pid) {
        const found = connections.some((c) => c.patientId === pid);
        if (!found) {
          return {
            ok: false,
            message: `Patient ID was not found among your ${connections.length} connection(s).`,
          };
        }
      }

      return {
        ok: true,
        message: pid
          ? `Success: credentials are valid and the patient ID matches a connection (${connections.length} total).`
          : `Success: credentials are valid (${connections.length} connection(s)).`,
      };
    } catch (err: unknown) {
      return { ok: false, message: this.formatLibreLoginError(err) };
    }
  }

  private formatLibreLoginError(err: unknown): string {
    if (isAxiosError(err)) {
      const data = err.response?.data;
      if (typeof data === 'string' && data.trim()) {
        return data.replace(/^Authentication failed:\s*/i, '').trim();
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return 'Libre Link Up connection test failed.';
  }

  private formatHttpError(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
      const data = err.response?.data;
      if (typeof data === 'string' && data.trim()) {
        return data.trim();
      }
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }

  async getGlucoseData(patientId?: string, days: number = 1): Promise<LibreGraphData> {
    try {
      const id = this.resolvePatientId(patientId);
      // Call backend proxy
      const response = await this.api.get(`/api/libre/connections/${id}/graph`, {
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
        patientId: id,
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

  async getRealTimeData(patientId?: string): Promise<GlucoseReading> {
    try {
      const id = this.resolvePatientId(patientId);
      // Call backend proxy for current glucose
      const response = await this.api.get(`/api/libre/connections/${id}/current`);
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

  /**
   * Get historical glucose data for a specific patient
   */
  async getGlucoseHistory(patientId?: string, days: number = 7, startDate?: string, endDate?: string): Promise<LibreGraphData> {
    try {
      const id = this.resolvePatientId(patientId);
      const params: any = { days };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await this.api.get(`/api/libre/connections/${id}/history`, { params });
      const historyData = response.data;

      const transformedData = historyData.data?.map((point: any) => ({
        timestamp: point.timestamp,
        value: point.value * 18, // Convert mmol/L back to mg/dL for compatibility
        trend: point.trend || 0,
        trendArrow: point.trendArrow,
        isHigh: point.value > 10.0, // mmol/L
        isLow: point.value < 3.9,
        isInRange: point.value >= 3.9 && point.value <= 10.0,
      })) || [];

      return {
        patientId: id,
        data: transformedData,
        startDate: historyData.startDate,
        endDate: historyData.endDate,
        unit: 'mmol/L'
      };
    } catch (error) {
      console.error('Failed to fetch LibreLinkUp glucose history:', error);
      throw new Error('Failed to fetch LibreLinkUp glucose history.');
    }
  }

  /**
   * Get raw glucose reading (unprocessed) from LibreLinkUp API
   */
  async getRawGlucoseReading(patientId?: string): Promise<any> {
    try {
      const id = this.resolvePatientId(patientId);
      const response = await this.api.get(`/api/libre/connections/${id}/raw`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch raw LibreLinkUp glucose reading:', error);
      throw new Error('Failed to fetch raw LibreLinkUp glucose reading.');
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
