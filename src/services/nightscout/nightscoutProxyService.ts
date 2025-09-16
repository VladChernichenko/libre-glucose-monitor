import axios, { AxiosInstance } from 'axios';
import { NightscoutEntry, NightscoutDeviceStatus, NightscoutAverage } from './types';
import { authService } from '../authService';

export class NightscoutProxyService {
  private api: AxiosInstance;
  private backendUrl: string;

  constructor(backendUrl: string = 'http://localhost:8080') {
    this.backendUrl = backendUrl;
    this.api = axios.create({
      baseURL: backendUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = authService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getGlucoseEntries(count: number = 100): Promise<NightscoutEntry[]> {
    try {
      console.log(`🔗 Fetching ${count} glucose entries via backend proxy`);
      const response = await this.api.get(`/api/nightscout/entries?count=${count}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch glucose entries via proxy:', error);
      throw new Error('Failed to fetch glucose data from Nightscout via backend proxy');
    }
  }

  async getGlucoseEntriesByDate(startDate: Date, endDate: Date): Promise<NightscoutEntry[]> {
    try {
      const start = startDate.toISOString();
      const end = endDate.toISOString();
      console.log(`🔗 Fetching glucose entries from ${start} to ${end} via backend proxy`);
      
      const response = await this.api.get(
        `/api/nightscout/entries/date-range?startDate=${start}&endDate=${end}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch glucose entries by date via proxy:', error);
      throw new Error('Failed to fetch glucose data from Nightscout via backend proxy');
    }
  }

  async getCurrentGlucose(): Promise<NightscoutEntry | null> {
    try {
      console.log('🔗 Fetching current glucose via backend proxy');
      const response = await this.api.get('/api/nightscout/entries/current');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch current glucose via proxy:', error);
      throw new Error('Failed to fetch current glucose from Nightscout via backend proxy');
    }
  }

  async getDeviceStatus(count: number = 1): Promise<NightscoutDeviceStatus[]> {
    try {
      console.log(`🔗 Fetching ${count} device status entries via backend proxy`);
      const response = await this.api.get(`/api/nightscout/device-status?count=${count}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch device status via proxy:', error);
      throw new Error('Failed to fetch device status from Nightscout via backend proxy');
    }
  }

  async get24HourAverage(): Promise<NightscoutAverage> {
    try {
      console.log('🔗 Fetching 24-hour average glucose via backend proxy');
      const response = await this.api.get('/api/nightscout/average/24h');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch 24-hour average via proxy:', error);
      throw new Error('Failed to fetch 24-hour average from Nightscout via backend proxy');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/api/nightscout/health');
      return response.status === 200;
    } catch (error) {
      console.error('❌ Nightscout proxy health check failed:', error);
      return false;
    }
  }
}
