import axios, { AxiosInstance } from 'axios';
import { NightscoutConfig, NightscoutEntry, NightscoutDeviceStatus, NightscoutProfile, NightscoutStatus } from './types';

export class NightscoutApiService {
  private api: AxiosInstance;
  private config: NightscoutConfig;

  constructor(config: NightscoutConfig) {
    this.config = config;
    this.api = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add authentication if available
    if (config.apiSecret) {
      this.api.defaults.headers.common['api-secret'] = config.apiSecret;
    }
    if (config.token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${config.token}`;
    }
  }

  async getGlucoseEntries(count: number = 100): Promise<NightscoutEntry[]> {
    try {
      const response = await this.api.get(`/api/v2/entries.json?count=${count}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch glucose entries:', error);
      throw new Error('Failed to fetch glucose data from Nightscout');
    }
  }

  async getGlucoseEntriesByDate(startDate: Date, endDate: Date): Promise<NightscoutEntry[]> {
    try {
      const start = startDate.toISOString();
      const end = endDate.toISOString();
      const response = await this.api.get(
        `/api/v2/entries.json?find[date][$gte]=${start}&find[date][$lte]=${end}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch glucose entries by date:', error);
      throw new Error('Failed to fetch glucose data from Nightscout');
    }
  }

  async getCurrentGlucose(): Promise<NightscoutEntry | null> {
    try {
      const response = await this.api.get('/api/v2/entries.json?count=1');
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Failed to fetch current glucose:', error);
      throw new Error('Failed to fetch current glucose from Nightscout');
    }
  }

  async getDeviceStatus(): Promise<NightscoutDeviceStatus[]> {
    try {
      const response = await this.api.get('/api/v2/devicestatus.json?count=10');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch device status:', error);
      throw new Error('Failed to fetch device status from Nightscout');
    }
  }

  async getProfile(): Promise<NightscoutProfile> {
    try {
      const response = await this.api.get('/api/v2/profile.json');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw new Error('Failed to fetch profile from Nightscout');
    }
  }

  async getStatus(): Promise<NightscoutStatus> {
    try {
      const response = await this.api.get('/api/v2/status.json');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch status:', error);
      throw new Error('Failed to fetch status from Nightscout');
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.api.get('/api/v2/status.json');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get recent glucose entries for charting
  async getRecentGlucoseData(hours: number = 24): Promise<NightscoutEntry[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
      return await this.getGlucoseEntriesByDate(startDate, endDate);
    } catch (error) {
      console.error('Failed to fetch recent glucose data:', error);
      throw new Error('Failed to fetch recent glucose data from Nightscout');
    }
  }
}
