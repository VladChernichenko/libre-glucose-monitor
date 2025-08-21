import { GlucoseReading } from './libre';

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

export interface DataSourceStatus {
  id: string;
  name: string;
  type: string;
  isAvailable: boolean;
  isAuthenticated: boolean;
  lastSync?: Date;
  error?: string;
}
