import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types for different API responses
export interface ApiConfig {
  nightscoutUrl?: string;
  nightscoutSecret?: string;
  nightscoutToken?: string;
  libreApiUrl?: string;
  cobApiUrl?: string;
  enableCorsProxy?: boolean;
  corsProxyUrl?: string;
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

export interface NightscoutEntry {
  _id: string;
  date: string;
  sgv: number;
  direction?: string;
  trend?: number;
  type: string;
}

export interface NightscoutDeviceStatus {
  _id: string;
  date: string;
  device: string;
  uploaderBattery?: number;
}

export interface NightscoutProfile {
  _id: string;
  startDate: string;
  defaultProfile: string;
  units: string;
  store: any;
}

export interface NightscoutStatus {
  status: string;
  name: string;
  version: string;
  serverTime: string;
}

export interface COBConfig {
  carbRatio: number;
  isf: number;
  carbHalfLife: number;
  maxCOBDuration: number;
}

class ApiService {
  private nightscoutApi: AxiosInstance | null = null;
  private libreApi: AxiosInstance | null = null;
  private cobApi: AxiosInstance | null = null;
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.initializeApis();
  }

  private initializeApis() {
    // Initialize Nightscout API
    if (this.config.nightscoutUrl) {
      this.nightscoutApi = axios.create({
        baseURL: this.config.nightscoutUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Add CORS handling
        withCredentials: false,
        timeout: 10000,
      });

      if (this.config.nightscoutSecret) {
        this.nightscoutApi.defaults.headers.common['api-secret'] = this.config.nightscoutSecret;
      }
      if (this.config.nightscoutToken) {
        this.nightscoutApi.defaults.headers.common['Authorization'] = `Bearer ${this.config.nightscoutToken}`;
      }
    }

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

  // ===== NIGHTSCOUT API METHODS =====

  async getNightscoutGlucoseEntries(count: number = 100): Promise<NightscoutEntry[]> {
    if (!this.config.nightscoutUrl) {
      throw new Error('Nightscout API not configured');
    }

    // Test API connection first
    const isConnected = await this.testNightscoutConnection();
    if (!isConnected) {
      throw new Error('Nightscout API is not accessible (CORS/403 error)');
    }

    try {
      // Try direct API call first
      if (this.nightscoutApi) {
        const response: AxiosResponse<NightscoutEntry[]> = await this.nightscoutApi.get(`/api/v2/entries.json?count=${count}`);
        return response.data;
      }
    } catch (error) {
      console.warn('Direct Nightscout API call failed, trying CORS proxy:', error);
      
      // Fallback to CORS proxy if direct call fails
      try {
        const proxyUrl = `${this.config.corsProxyUrl}/${this.config.nightscoutUrl}/api/v2/entries.json?count=${count}`;
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(this.config.nightscoutSecret && { 'api-secret': this.config.nightscoutSecret }),
            ...(this.config.nightscoutToken && { 'Authorization': `Bearer ${this.config.nightscoutToken}` }),
          },
        });
        
        if (response.ok) {
          const data: NightscoutEntry[] = await response.json();
          return data;
        }
      } catch (proxyError) {
        console.error('CORS proxy also failed:', proxyError);
      }
      
      throw new Error('Failed to fetch glucose data from Nightscout (CORS issue)');
    }
    
    return [];
  }

  async getNightscoutGlucoseEntriesByDate(startDate: Date, endDate: Date): Promise<NightscoutEntry[]> {
    if (!this.nightscoutApi) {
      throw new Error('Nightscout API not configured');
    }

    try {
      const start = startDate.toISOString();
      const end = endDate.toISOString();
      const response: AxiosResponse<NightscoutEntry[]> = await this.nightscoutApi.get(
        `/api/v2/entries.json?find[date][$gte]=${start}&find[date][$lte]=${end}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch glucose entries by date:', error);
      throw new Error('Failed to fetch glucose data from Nightscout');
    }
  }

  async getNightscoutCurrentGlucose(): Promise<NightscoutEntry | null> {
    if (!this.config.nightscoutUrl) {
      throw new Error('Nightscout API not configured');
    }

    // Test API connection first
    const isConnected = await this.testNightscoutConnection();
    if (!isConnected) {
      throw new Error('Nightscout API is not accessible (CORS/403 error)');
    }

    try {
      // Try direct API call first
      if (this.nightscoutApi) {
        const response: AxiosResponse<NightscoutEntry[]> = await this.nightscoutApi.get('/api/v2/entries.json?count=1');
        return response.data.length > 0 ? response.data[0] : null;
      }
    } catch (error) {
      console.warn('Direct Nightscout API call failed, trying CORS proxy:', error);
      
      // Fallback to CORS proxy if direct call fails
      try {
        const proxyUrl = `${this.config.corsProxyUrl}/${this.config.nightscoutUrl}/api/v2/entries.json?count=1`;
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(this.config.nightscoutSecret && { 'api-secret': this.config.nightscoutSecret }),
            ...(this.config.nightscoutToken && { 'Authorization': `Bearer ${this.config.nightscoutToken}` }),
          },
        });
        
        if (response.ok) {
          const data: NightscoutEntry[] = await response.json();
          return data.length > 0 ? data[0] : null;
        }
      } catch (proxyError) {
        console.error('CORS proxy also failed:', proxyError);
      }
      
      throw new Error('Failed to fetch current glucose from Nightscout (CORS issue)');
    }
    
    return null;
  }

  async getNightscoutDeviceStatus(): Promise<NightscoutDeviceStatus[]> {
    if (!this.nightscoutApi) {
      throw new Error('Nightscout API not configured');
    }

    try {
      const response: AxiosResponse<NightscoutDeviceStatus[]> = await this.nightscoutApi.get('/api/v2/devicestatus.json?count=10');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch device status:', error);
      throw new Error('Failed to fetch device status from Nightscout');
    }
  }

  async getNightscoutProfile(): Promise<NightscoutProfile> {
    if (!this.nightscoutApi) {
      throw new Error('Nightscout API not configured');
    }

    try {
      const response: AxiosResponse<NightscoutProfile> = await this.nightscoutApi.get('/api/v2/profile.json');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw new Error('Failed to fetch profile from Nightscout');
    }
  }

  async getNightscoutStatus(): Promise<NightscoutStatus> {
    if (!this.nightscoutApi) {
      throw new Error('Nightscout API not configured');
    }

    try {
      const response: AxiosResponse<NightscoutStatus> = await this.nightscoutApi.get('/api/v2/status.json');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch status:', error);
      throw new Error('Failed to fetch status from Nightscout');
    }
  }

  async testNightscoutConnection(): Promise<boolean> {
    if (!this.config.nightscoutUrl) {
      return false;
    }

    console.log('🔍 Testing Nightscout connection...');

    // Test multiple endpoints to ensure API is working
    const testEndpoints = [
      '/api/v2/status.json',
      '/api/v2/entries.json?count=1'
    ];

    for (const endpoint of testEndpoints) {
      try {
        // Try direct API call first
        if (this.nightscoutApi) {
          console.log(`🔍 Testing direct API call to: ${endpoint}`);
          const response = await this.nightscoutApi.get(endpoint);
          if (response.status === 200) {
            console.log('✅ Direct API call successful');
            return true;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Direct API call to ${endpoint} failed:`, error);
      }

      // Try CORS proxy if direct call fails
      try {
        console.log(`🔍 Testing CORS proxy for: ${endpoint}`);
        const proxyUrl = `${this.config.corsProxyUrl}/${this.config.nightscoutUrl}${endpoint}`;
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(this.config.nightscoutSecret && { 'api-secret': this.config.nightscoutSecret }),
            ...(this.config.nightscoutToken && { 'Authorization': `Bearer ${this.config.nightscoutToken}` }),
          },
        });
        
        if (response.status === 200) {
          console.log('✅ CORS proxy call successful');
          return true;
        } else {
          console.warn(`⚠️ CORS proxy returned status: ${response.status}`);
        }
      } catch (proxyError) {
        console.error(`❌ CORS proxy call to ${endpoint} failed:`, proxyError);
      }
    }
    
    console.error('❌ All Nightscout connection tests failed');
    return false;
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

  async getDetailedConnectionStatus(): Promise<{
    direct: boolean;
    proxy: boolean;
    errors: string[];
    nightscoutUrl: string;
    hasSecret: boolean;
    hasToken: boolean;
  }> {
    const result = {
      direct: false,
      proxy: false,
      errors: [] as string[],
      nightscoutUrl: this.config.nightscoutUrl || 'Not configured',
      hasSecret: !!this.config.nightscoutSecret,
      hasToken: !!this.config.nightscoutToken,
    };

    if (!this.config.nightscoutUrl) {
      result.errors.push('Nightscout URL not configured');
      return result;
    }

    // Test direct connection
    try {
      if (this.nightscoutApi) {
        const response = await this.nightscoutApi.get('/api/v2/status.json');
        if (response.status === 200) {
          result.direct = true;
        }
      }
    } catch (error) {
      result.errors.push(`Direct connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test proxy connection
    try {
      const proxyUrl = `${this.config.corsProxyUrl}/${this.config.nightscoutUrl}/api/v2/status.json`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.config.nightscoutSecret && { 'api-secret': this.config.nightscoutSecret }),
          ...(this.config.nightscoutToken && { 'Authorization': `Bearer ${this.config.nightscoutToken}` }),
        },
      });
      
      if (response.status === 200) {
        result.proxy = true;
      } else {
        result.errors.push(`Proxy connection returned status: ${response.status}`);
      }
    } catch (error) {
      result.errors.push(`Proxy connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.initializeApis();
  }

  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

// Create and export a singleton instance
export const apiService = new ApiService({
  nightscoutUrl: process.env.REACT_APP_NIGHTSCOUT_URL,
  nightscoutSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET,
  nightscoutToken: process.env.REACT_APP_NIGHTSCOUT_TOKEN,
  libreApiUrl: process.env.REACT_APP_LIBRE_API_URL || 'https://api.libreview.com',
  cobApiUrl: process.env.REACT_APP_COB_API_URL || 'http://localhost:8080',
  enableCorsProxy: true,
  corsProxyUrl: process.env.REACT_APP_CORS_PROXY_URL || 'https://cors-anywhere.herokuapp.com',
});

export default apiService;
