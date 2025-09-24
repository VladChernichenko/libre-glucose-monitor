# Nightscout API Integration Guide

## 🎯 **Overview**
This guide provides step-by-step instructions for integrating the Nightscout API into our Libre Glucose Monitor application.

## 🔍 **Nightscout API Structure**

### **API Versions Available**
- **API v1**: Legacy API (deprecated)
- **API v2**: Current stable API
- **API v3**: Latest API with enhanced features

### **Key API Endpoints**

#### **Authentication**
```
POST /api/v2/authorization
```

#### **Glucose Data**
```
GET /api/v2/entries.json
GET /api/v2/entries.json?count=100
GET /api/v2/entries.json?find[date][$gte]=2024-01-01
```

#### **Device Status**
```
GET /api/v2/devicestatus.json
GET /api/v2/devicestatus.json?count=1
```

#### **Profile & Settings**
```
GET /api/v2/profile.json
GET /api/v2/status.json
```

## 🚀 **Implementation Plan**

### **Phase 1: Basic Nightscout Client**

#### **1. Create Nightscout Data Source Interface**
```typescript
// src/services/nightscout/types.ts
export interface NightscoutConfig {
  baseUrl: string;
  apiSecret?: string;
  token?: string;
}

export interface NightscoutEntry {
  _id: string;
  sgv: number; // Glucose value
  date: number; // Unix timestamp
  dateString: string;
  trend: number;
  direction: string;
  device: string;
  type: string;
  utcOffset: number;
  sysTime: string;
}

export interface NightscoutDeviceStatus {
  _id: string;
  date: number;
  dateString: string;
  device: string;
  uploaderBattery: number;
  pump: {
    battery: {
      percent: number;
    };
    status: {
      status: string;
    };
  };
}
```

#### **2. Implement Nightscout Service**
```typescript
// src/services/nightscout/nightscoutApi.ts
import axios, { AxiosInstance } from 'axios';
import { NightscoutConfig, NightscoutEntry, NightscoutDeviceStatus } from './types';

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

  async getProfile(): Promise<any> {
    try {
      const response = await this.api.get('/api/v2/profile.json');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw new Error('Failed to fetch profile from Nightscout');
    }
  }

  async getStatus(): Promise<any> {
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
}
```

#### **3. Create Data Adapter**
```typescript
// src/services/nightscout/adapter.ts
import { NightscoutEntry, NightscoutDeviceStatus } from './types';
import { GlucoseReading } from '../../types/libre';

export class NightscoutDataAdapter {
  static convertEntryToGlucoseReading(entry: NightscoutEntry): GlucoseReading {
    return {
      timestamp: new Date(entry.date),
      value: entry.sgv,
      trend: entry.trend,
      trendArrow: this.convertTrendToArrow(entry.direction),
      status: this.calculateGlucoseStatus(entry.sgv),
      unit: 'mg/dL',
    };
  }

  static convertTrendToArrow(direction: string): string {
    const trendMap: { [key: string]: string } = {
      'DoubleUp': '↗↗',
      'SingleUp': '↗',
      'FortyFiveUp': '↗',
      'Flat': '→',
      'FortyFiveDown': '↘',
      'SingleDown': '↘',
      'DoubleDown': '↘↘',
      'NOT COMPUTABLE': '→',
      'RATE OUT OF RANGE': '→',
    };
    return trendMap[direction] || '→';
  }

  static calculateGlucoseStatus(value: number): 'low' | 'normal' | 'high' | 'critical' {
    if (value < 70) return 'low';
    if (value < 180) return 'normal';
    if (value < 250) return 'high';
    return 'critical';
  }

  static convertTrendToNumber(direction: string): number {
    const trendMap: { [key: string]: number } = {
      'DoubleUp': 2,
      'SingleUp': 1,
      'FortyFiveUp': 0.5,
      'Flat': 0,
      'FortyFiveDown': -0.5,
      'SingleDown': -1,
      'DoubleDown': -2,
      'NOT COMPUTABLE': 0,
      'RATE OUT OF RANGE': 0,
    };
    return trendMap[direction] || 0;
  }
}
```

### **Phase 2: Integration with Main Application**

#### **1. Update Data Source Interface**
```typescript
// src/types/glucoseSources.ts
export interface GlucoseDataSource {
  id: string;
  name: string;
  type: 'libre' | 'nightscout' | 'dexcom' | 'demo';
  isAvailable(): boolean;
  isAuthenticated(): boolean;
  authenticate(): Promise<boolean>;
  getCurrentReading(): Promise<GlucoseReading>;
  getHistoricalData(start: Date, end: Date): Promise<GlucoseReading[]>;
  getStatus(): Promise<any>;
}

export interface DataSourceConfig {
  libre?: {
    apiUrl: string;
    email: string;
    password: string;
  };
  nightscout?: {
    baseUrl: string;
    apiSecret?: string;
    token?: string;
  };
  dexcom?: {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
  };
}
```

#### **2. Create Data Source Manager**
```typescript
// src/services/dataSourceManager.ts
import { GlucoseDataSource, DataSourceConfig } from '../types/glucoseSources';
import { LibreApiService } from './libreApi';
import { NightscoutApiService } from './nightscout/nightscoutApi';
import { NightscoutDataAdapter } from './nightscout/adapter';

export class DataSourceManager {
  private sources: Map<string, GlucoseDataSource> = new Map();
  private config: DataSourceConfig;

  constructor(config: DataSourceConfig) {
    this.config = config;
    this.initializeSources();
  }

  private initializeSources() {
    // Add Libre source
    if (this.config.libre) {
      this.sources.set('libre', new LibreDataSource(this.config.libre));
    }

    // Add Nightscout source
    if (this.config.nightscout) {
      this.sources.set('nightscout', new NightscoutDataSource(this.config.nightscout));
    }

    // Add demo source (always available)
    this.sources.set('demo', new DemoDataSource());
  }

  getAvailableSources(): GlucoseDataSource[] {
    return Array.from(this.sources.values()).filter(source => source.isAvailable());
  }

  getSource(id: string): GlucoseDataSource | undefined {
    return this.sources.get(id);
  }

  async getCurrentReadingFromAllSources(): Promise<GlucoseReading[]> {
    const readings: GlucoseReading[] = [];
    
    for (const source of this.sources.values()) {
      if (source.isAvailable() && source.isAuthenticated()) {
        try {
          const reading = await source.getCurrentReading();
          readings.push(reading);
        } catch (error) {
          console.error(`Failed to get reading from ${source.name}:`, error);
        }
      }
    }
    
    return readings;
  }
}

// Nightscout Data Source Implementation
class NightscoutDataSource implements GlucoseDataSource {
  private api: NightscoutApiService;
  private authenticated: boolean = false;

  constructor(config: any) {
    this.api = new NightscoutApiService(config);
  }

  get id(): string { return 'nightscout'; }
  get name(): string { return 'Nightscout'; }
  get type() { return 'nightscout' as const; }

  isAvailable(): boolean {
    return true; // Always available if configured
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async authenticate(): Promise<boolean> {
    try {
      this.authenticated = await this.api.testConnection();
      return this.authenticated;
    } catch (error) {
      this.authenticated = false;
      return false;
    }
  }

  async getCurrentReading(): Promise<GlucoseReading> {
    const entry = await this.api.getCurrentGlucose();
    if (!entry) {
      throw new Error('No current glucose reading available');
    }
    return NightscoutDataAdapter.convertEntryToGlucoseReading(entry);
  }

  async getHistoricalData(start: Date, end: Date): Promise<GlucoseReading[]> {
    const entries = await this.api.getGlucoseEntriesByDate(start, end);
    return entries.map(entry => 
      NightscoutDataAdapter.convertEntryToGlucoseReading(entry)
    );
  }

  async getStatus(): Promise<any> {
    return this.api.getStatus();
  }
}
```

### **Phase 3: UI Integration**

#### **1. Add Data Source Selection**
```typescript
// src/components/DataSourceSelector.tsx
import React from 'react';
import { GlucoseDataSource } from '../types/glucoseSources';

interface DataSourceSelectorProps {
  sources: GlucoseDataSource[];
  selectedSource: string;
  onSourceChange: (sourceId: string) => void;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  sources,
  selectedSource,
  onSourceChange,
}) => {
  return (
    <div className="flex items-center space-x-4">
      <label className="text-sm font-medium text-gray-700">Data Source:</label>
      <select
        value={selectedSource}
        onChange={(e) => onSourceChange(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {sources.map(source => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
    </div>
  );
};
```

#### **2. Update Dashboard Component**
```typescript
// In Dashboard.tsx, add data source management
const [selectedDataSource, setSelectedDataSource] = useState<string>('demo');
const [dataSources, setDataSources] = useState<GlucoseDataSource[]>([]);

useEffect(() => {
  // Initialize data sources
  const manager = new DataSourceManager({
    nightscout: {
      baseUrl: process.env.REACT_APP_NIGHTSCOUT_URL || '',
      apiSecret: process.env.REACT_APP_NIGHTSCOUT_SECRET || '',
    },
    libre: {
      apiUrl: process.env.REACT_APP_LIBRE_API_URL || '',
      email: '',
      password: '',
    },
  });
  
  setDataSources(manager.getAvailableSources());
}, []);

const handleDataSourceChange = async (sourceId: string) => {
  setSelectedDataSource(sourceId);
  const source = dataSources.find(s => s.id === sourceId);
  
  if (source && !source.isAuthenticated()) {
    await source.authenticate();
  }
  
  // Refresh data from new source
  if (source) {
    try {
      const reading = await source.getCurrentReading();
      setCurrentReading(reading);
    } catch (error) {
      console.error('Failed to get reading from new source:', error);
    }
  }
};
```

## 🔧 **Configuration**

### **Environment Variables**
```env
# Nightscout Configuration
REACT_APP_NIGHTSCOUT_URL=
REACT_APP_NIGHTSCOUT_SECRET=k:4KuxU25Ok04qv

# Libre LinkUp Configuration
REACT_APP_LIBRE_API_URL=https://api.libreview.com

# Demo Mode
REACT_APP_ENABLE_DEMO_MODE=true
```

### **Nightscout Instance Setup**
1. **Deploy to Heroku** (easiest option)
2. **Set environment variables**
3. **Configure CGM data source**
4. **Get API secret from settings**

## 📱 **Testing & Validation**

### **Test Nightscout Connection**
```typescript
// Test script
const testNightscout = async () => {
  const config = {
    baseUrl: 'https://your-instance.herokuapp.com',
    apiSecret: 'your-secret',
  };
  
  const api = new NightscoutApiService(config);
  
  try {
    const isConnected = await api.testConnection();
    console.log('Connection successful:', isConnected);
    
    if (isConnected) {
      const entries = await api.getGlucoseEntries(10);
      console.log('Recent entries:', entries);
    }
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

## 🚀 **Deployment Steps**

1. **Set up Nightscout instance**
2. **Configure environment variables**
3. **Test API connection**
4. **Deploy updated application**
5. **Monitor data flow**
6. **User testing and feedback**

## 📊 **Benefits of Nightscout Integration**

- **Open source** and free to use
- **Active community** support
- **Multiple device support**
- **Real-time data** access
- **Historical data** analysis
- **Device status** monitoring
- **Profile management**
- **Webhook support** for real-time updates

## 🔮 **Future Enhancements**

- **Real-time webhook integration**
- **Multiple Nightscout instances**
- **Data synchronization** between sources
- **Advanced analytics** using Nightscout data
- **Community features** integration
