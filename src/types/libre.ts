export interface LibreAuthResponse {
  token: string;
  expires: number;
}

export interface LibrePatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LibreGlucoseData {
  timestamp: string;
  value: number;
  trend: number;
  trendArrow: string;
  isHigh: boolean;
  isLow: boolean;
  isInRange: boolean;
}

export interface LibreGraphData {
  patientId: string;
  data: LibreGlucoseData[];
  startDate: string;
  endDate: string;
  unit: string;
}

export interface LibreConnection {
  id: string;
  patientId: string;
  status: 'active' | 'inactive' | 'pending';
  lastSync: string;
}

export interface GlucoseReading {
  timestamp: Date;
  value: number;
  trend: number;
  trendArrow: string;
  status: 'low' | 'normal' | 'high' | 'critical';
  unit: string;
  originalTimestamp?: Date; // Optional: original timestamp from sensor data
}

export interface GlucoseStats {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: string;
  lastUpdated: Date;
}
