import axios, { AxiosInstance } from 'axios';
import { 
  LibreAuthResponse, 
  LibrePatient, 
  LibreGraphData, 
  LibreConnection,
  GlucoseReading 
} from '../types/libre';

class LibreApiService {
  private api: AxiosInstance;
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = process.env.REACT_APP_LIBRE_API_URL || 'https://api.libreview.com';
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('libre_token');
    if (this.token) {
      this.setAuthToken(this.token);
    }
  }

  private setAuthToken(token: string) {
    this.token = token;
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('libre_token', token);
  }

  async authenticate(email: string, password: string): Promise<LibreAuthResponse> {
    try {
      const response = await this.api.post('/auth/login', {
        email,
        password,
      });
      
      const authData = response.data;
      this.setAuthToken(authData.token);
      return authData;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  async getPatientInfo(): Promise<LibrePatient> {
    try {
      const response = await this.api.get('/user/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch patient info:', error);
      throw new Error('Failed to fetch patient information.');
    }
  }

  async getConnections(): Promise<LibreConnection[]> {
    try {
      const response = await this.api.get('/connections');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      throw new Error('Failed to fetch connections.');
    }
  }

  async getGlucoseData(patientId: string, days: number = 1): Promise<LibreGraphData> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await this.api.get(`/patients/${patientId}/glucose`, {
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

  async getRealTimeData(patientId: string): Promise<GlucoseReading> {
    try {
      const response = await this.api.get(`/patients/${patientId}/glucose/current`);
      const data = response.data;
      
      return {
        timestamp: new Date(data.timestamp),
        value: data.value,
        trend: data.trend,
        trendArrow: data.trendArrow,
        status: this.getGlucoseStatus(data.value),
        unit: data.unit || 'mg/dL',
      };
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
      throw new Error('Failed to fetch real-time glucose data.');
    }
  }

  private getGlucoseStatus(value: number): 'low' | 'normal' | 'high' | 'critical' {
    if (value < 70) return 'low';
    if (value < 180) return 'normal';
    if (value < 250) return 'high';
    return 'critical';
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
