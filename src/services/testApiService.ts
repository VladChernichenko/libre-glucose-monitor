import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getEnvironmentConfig } from '../config/environments';

// Types for COB API responses
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

class TestApiService {
  private cobApi: AxiosInstance;
  private config: any;

  constructor() {
    this.config = getEnvironmentConfig();
    
    // Initialize COB API (backend only)
    this.cobApi = axios.create({
      baseURL: this.config.backendUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.cobApi.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ===== COB API METHODS (Backend Only) =====

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
      throw new Error('Failed to calculate COB');
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
}

export default new TestApiService();
