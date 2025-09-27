import axios, { AxiosInstance, AxiosError } from 'axios';
import { NightscoutEntry, NightscoutDeviceStatus } from './types';
import { authService } from '../authService';
import { getClientTimeInfo } from '../../utils/timezone';
import { libreApiService } from '../libreApi';
import { dataSourceConfigApi } from '../dataSourceConfigApi';

export interface NightscoutServiceResponse<T> {
  data: T | null;
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
  source: 'nightscout' | 'stored' | 'demo' | 'error';
  needsConfiguration?: boolean;
}

export interface NightscoutServiceConfig {
  backendUrl: string;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableFallbacks: boolean;
  enableDemoData: boolean;
}

export class EnhancedNightscoutService {
  private api: AxiosInstance;
  private config: NightscoutServiceConfig;

  constructor(config: Partial<NightscoutServiceConfig> = {}) {
    this.config = {
      backendUrl: config.backendUrl || 'http://localhost:8080',
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 10000,
      enableFallbacks: config.enableFallbacks !== false,
      enableDemoData: config.enableDemoData !== false,
      ...config
    };

    this.api = axios.create({
      baseURL: this.config.backendUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication and timezone
    this.api.interceptors.request.use((config) => {
      const token = authService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add timezone information to all requests
      const timeInfo = getClientTimeInfo();
      config.headers['X-Timezone-Offset'] = timeInfo.timezoneOffset.toString();
      config.headers['X-Timezone'] = timeInfo.timezone;
      
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('🌐 API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Enhanced glucose entries fetch with multiple fallback strategies
   */
  async getGlucoseEntries(count: number = 100): Promise<NightscoutServiceResponse<NightscoutEntry[]>> {
    console.log(`🔗 Fetching ${count} glucose entries with enhanced error handling`);

    // Strategy 1: Try fresh Nightscout data
    try {
      const response = await this.retryRequest(() => 
        this.api.get(`/api/nightscout/entries?count=${count}&useStored=false`)
      );
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ Successfully fetched ${response.data.length} fresh entries from Nightscout`);
        return {
          data: response.data,
          success: true,
          source: 'nightscout'
        };
      }
    } catch (error) {
      console.warn('⚠️ Fresh Nightscout data fetch failed, trying stored data...', error);
    }

    // Strategy 2: Try stored data
    if (this.config.enableFallbacks) {
      try {
        const response = await this.retryRequest(() => 
          this.api.get(`/api/nightscout/entries?count=${count}&useStored=true`)
        );
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`✅ Successfully fetched ${response.data.length} stored entries`);
          return {
            data: response.data,
            success: true,
            fallbackUsed: true,
            source: 'stored'
          };
        }
      } catch (error) {
        console.warn('⚠️ Stored data fetch failed, trying chart data...', error);
      }

      // Strategy 3: Try chart data endpoint
      try {
        const response = await this.retryRequest(() => 
          this.api.get(`/api/nightscout/chart-data?count=${count}`)
        );
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`✅ Successfully fetched ${response.data.length} chart data entries`);
          return {
            data: response.data,
            success: true,
            fallbackUsed: true,
            source: 'stored'
          };
        }
      } catch (error) {
        console.warn('⚠️ Chart data fetch failed, trying demo data...', error);
      }
    }

    // Strategy 4: LibreLinkUp fallback
    if (this.config.enableFallbacks) {
      try {
        console.log('🩸 Trying LibreLinkUp as fallback...');
        const libreData = await this.getLibreLinkUpData(count);
        if (libreData && libreData.length > 0) {
          console.log(`✅ Successfully fetched ${libreData.length} entries from LibreLinkUp`);
          return {
            data: libreData,
            success: true,
            fallbackUsed: true,
            source: 'stored'
          };
        }
      } catch (error) {
        console.warn('⚠️ LibreLinkUp fallback failed, trying demo data...', error);
      }
    }

    // Strategy 5: Demo data fallback
    if (this.config.enableDemoData) {
      console.log('📊 Using demo data as final fallback');
      const demoData = this.generateDemoGlucoseData(count);
      return {
        data: demoData,
        success: true,
        fallbackUsed: true,
        source: 'demo'
      };
    }

    // Strategy 5: Complete failure
    return {
      data: null,
      success: false,
      error: 'Unable to fetch glucose data from any source',
      source: 'error'
    };
  }

  /**
   * Enhanced current glucose fetch with fallbacks
   */
  async getCurrentGlucose(): Promise<NightscoutServiceResponse<NightscoutEntry | null>> {
    console.log('🔗 Fetching current glucose with enhanced error handling');

    try {
      const response = await this.retryRequest(() => 
        this.api.get('/api/nightscout/entries/current')
      );
      
      if (response.data) {
        console.log('✅ Successfully fetched current glucose from Nightscout');
        return {
          data: response.data,
          success: true,
          source: 'nightscout'
        };
      }
    } catch (error: any) {
      // Check if it's a 400 error (no data/configuration issue)
      if (error.response?.status === 400) {
        console.warn('⚠️ 400 error - likely no Nightscout configuration or data available');
        return {
          data: null,
          success: false,
          error: 'No Nightscout data available. Please configure your Nightscout settings.',
          source: 'error',
          needsConfiguration: true
        };
      }
      console.warn('⚠️ Current glucose fetch failed, trying recent entries...', error);
    }

    // Fallback: Get most recent entry from entries endpoint
    if (this.config.enableFallbacks) {
      const entriesResponse = await this.getGlucoseEntries(1);
      if (entriesResponse.success && entriesResponse.data && entriesResponse.data.length > 0) {
        return {
          data: entriesResponse.data[0],
          success: true,
          fallbackUsed: true,
          source: entriesResponse.source
        };
      }

      // LibreLinkUp fallback for current glucose
      try {
        console.log('🩸 Trying LibreLinkUp for current glucose...');
        const libreCurrent = await this.getLibreLinkUpCurrentGlucose();
        if (libreCurrent) {
          console.log('✅ Successfully fetched current glucose from LibreLinkUp');
          return {
            data: libreCurrent,
            success: true,
            fallbackUsed: true,
            source: 'stored'
          };
        }
      } catch (error) {
        console.warn('⚠️ LibreLinkUp current glucose fallback failed:', error);
      }
    }

    return {
      data: null,
      success: false,
      error: 'Unable to fetch current glucose data',
      source: 'error'
    };
  }

  /**
   * Enhanced date range fetch with fallbacks
   */
  async getGlucoseEntriesByDate(
    startDate: Date, 
    endDate: Date
  ): Promise<NightscoutServiceResponse<NightscoutEntry[]>> {
    console.log(`🔗 Fetching glucose entries from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      const start = startDate.toISOString();
      const end = endDate.toISOString();
      
      const response = await this.retryRequest(() => 
        this.api.get(`/api/nightscout/entries/date-range?startDate=${start}&endDate=${end}&useStored=false`)
      );
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ Successfully fetched ${response.data.length} entries for date range`);
        return {
          data: response.data,
          success: true,
          source: 'nightscout'
        };
      }
    } catch (error: any) {
      // Check if it's a 400 error (no data/configuration issue)
      if (error.response?.status === 400) {
        console.warn('⚠️ 400 error - likely no Nightscout configuration or data available');
        return {
          data: [],
          success: false,
          error: 'No Nightscout data available for the specified date range. Please configure your Nightscout settings.',
          source: 'error',
          needsConfiguration: true
        };
      }
      console.warn('⚠️ Date range fetch failed, trying stored data...', error);
    }

    // Fallback to stored data
    if (this.config.enableFallbacks) {
      try {
        const start = startDate.toISOString();
        const end = endDate.toISOString();
        
        const response = await this.retryRequest(() => 
          this.api.get(`/api/nightscout/entries/date-range?startDate=${start}&endDate=${end}&useStored=true`)
        );
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`✅ Successfully fetched ${response.data.length} stored entries for date range`);
          return {
            data: response.data,
            success: true,
            fallbackUsed: true,
            source: 'stored'
          };
        }
      } catch (error) {
        console.warn('⚠️ Stored date range fetch failed, trying all stored data...', error);
      }

      // Final fallback: get all stored data and filter
      const allStoredResponse = await this.getGlucoseEntries(100);
      if (allStoredResponse.success && allStoredResponse.data) {
        const filteredData = allStoredResponse.data.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= startDate && entryDate <= endDate;
        });

        if (filteredData.length > 0) {
          console.log(`✅ Successfully filtered ${filteredData.length} entries for date range`);
          return {
            data: filteredData,
            success: true,
            fallbackUsed: true,
            source: allStoredResponse.source
          };
        }
      }
    }

    return {
      data: [],
      success: false,
      error: 'Unable to fetch glucose data for the specified date range',
      source: 'error'
    };
  }

  /**
   * Enhanced device status fetch
   */
  async getDeviceStatus(count: number = 1): Promise<NightscoutServiceResponse<NightscoutDeviceStatus[]>> {
    console.log(`🔗 Fetching ${count} device status entries`);

    try {
      const response = await this.retryRequest(() => 
        this.api.get(`/api/nightscout/device-status?count=${count}`)
      );
      
      return {
        data: response.data || [],
        success: true,
        source: 'nightscout'
      };
    } catch (error) {
      console.warn('⚠️ Device status fetch failed', error);
      return {
        data: [],
        success: false,
        error: 'Unable to fetch device status',
        source: 'error'
      };
    }
  }

  /**
   * Health check with detailed status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      backend: boolean;
      nightscout: boolean;
      stored: boolean;
      error?: string;
    };
  }> {
    const details = {
      backend: false,
      nightscout: false,
      stored: false,
      error: undefined as string | undefined
    };

    try {
      // Test backend connectivity
      const response = await this.api.get('/api/nightscout/health');
      details.backend = response.status === 200;
    } catch (error) {
      details.error = 'Backend not accessible';
      return { healthy: false, details };
    }

    try {
      // Test Nightscout connectivity
      const response = await this.api.get('/api/nightscout/entries?count=1&useStored=false');
      details.nightscout = response.status === 200 && response.data && Array.isArray(response.data);
    } catch (error) {
      console.warn('Nightscout not accessible, checking stored data...');
    }

    try {
      // Test stored data availability
      const response = await this.api.get('/api/nightscout/entries?count=1&useStored=true');
      details.stored = response.status === 200 && response.data && Array.isArray(response.data) && response.data.length > 0;
    } catch (error) {
      console.warn('Stored data not available');
    }

    const healthy = details.backend && (details.nightscout || details.stored);
    return { healthy, details };
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async retryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt}/${this.config.retryAttempts} failed:`, error);

        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Generate demo glucose data for fallback
   */
  private generateDemoGlucoseData(count: number): NightscoutEntry[] {
    const now = new Date();
    const data: NightscoutEntry[] = [];
    const timeInfo = getClientTimeInfo();
    const utcOffset = -timeInfo.timezoneOffset; // Convert from JavaScript offset to standard offset

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now.getTime() - (count - i) * 5 * 60 * 1000); // 5 minutes apart
      const baseValue = 100 + Math.sin(i * 0.1) * 30 + Math.random() * 20; // Simulate realistic glucose values
      
      data.push({
        _id: `demo_${i}`,
        sgv: Math.round(baseValue),
        date: timestamp.getTime(),
        dateString: timestamp.toISOString(),
        trend: Math.floor(Math.random() * 8) + 1,
        direction: ['DoubleUp', 'SingleUp', 'FortyFiveUp', 'Flat', 'FortyFiveDown', 'SingleDown', 'DoubleDown'][Math.floor(Math.random() * 7)],
        device: 'Demo Device',
        type: 'sgv',
        utcOffset: utcOffset, // Use actual user timezone offset
        sysTime: timestamp.toISOString()
      });
    }

    return data;
  }

  /**
   * Get LibreLinkUp data as fallback
   */
  private async getLibreLinkUpData(count: number): Promise<NightscoutEntry[]> {
    try {
      // Check if LibreLinkUp is configured
      const isLibreConfigured = await dataSourceConfigApi.isDataSourceConfigured('libre');
      if (!isLibreConfigured) {
        throw new Error('LibreLinkUp not configured');
      }

      // Authenticate with LibreLinkUp using stored credentials
      if (!libreApiService.isAuthenticated()) {
        await libreApiService.authenticate();
      }

      // Get connections
      const connections = await libreApiService.getConnections();
      if (!connections || connections.length === 0) {
        throw new Error('No LibreLinkUp connections available');
      }

      // Get glucose data from first connection
      const patientId = connections[0].patientId;
      const graphData = await libreApiService.getGlucoseData(patientId, 1);
      
      // Convert to NightscoutEntry format
      const entries: NightscoutEntry[] = graphData.data.slice(0, count).map((point: any) => ({
        _id: `libre_${point.timestamp}`,
        sgv: Math.round(point.value), // Convert back to mg/dL
        date: new Date(point.timestamp).getTime(),
        dateString: new Date(point.timestamp).toISOString(),
        trend: point.trend,
        direction: point.trendArrow,
        device: 'LibreLinkUp',
        type: 'sgv',
        utcOffset: 0, // Will be set by frontend timezone logic
        sysTime: new Date(point.timestamp).toISOString()
      }));

      return entries;
    } catch (error) {
      console.error('LibreLinkUp data fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get LibreLinkUp current glucose as fallback
   */
  private async getLibreLinkUpCurrentGlucose(): Promise<NightscoutEntry | null> {
    try {
      // Check if LibreLinkUp is configured
      const isLibreConfigured = await dataSourceConfigApi.isDataSourceConfigured('libre');
      if (!isLibreConfigured) {
        throw new Error('LibreLinkUp not configured');
      }

      // Authenticate with LibreLinkUp using stored credentials
      if (!libreApiService.isAuthenticated()) {
        await libreApiService.authenticate();
      }

      // Get connections
      const connections = await libreApiService.getConnections();
      if (!connections || connections.length === 0) {
        throw new Error('No LibreLinkUp connections available');
      }

      // Get current glucose from first connection
      const patientId = connections[0].patientId;
      const currentReading = await libreApiService.getRealTimeData(patientId);
      
      // Convert to NightscoutEntry format
      const entry: NightscoutEntry = {
        _id: `libre_current_${currentReading.timestamp.getTime()}`,
        sgv: Math.round(currentReading.value * 18), // Convert mmol/L to mg/dL
        date: currentReading.timestamp.getTime(),
        dateString: currentReading.timestamp.toISOString(),
        trend: currentReading.trend,
        direction: currentReading.trendArrow,
        device: 'LibreLinkUp',
        type: 'sgv',
        utcOffset: 0, // Will be set by frontend timezone logic
        sysTime: currentReading.timestamp.toISOString()
      };

      return entry;
    } catch (error) {
      console.error('LibreLinkUp current glucose fetch failed:', error);
      throw error;
    }
  }
}

export default EnhancedNightscoutService;
