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

export interface NightscoutProfile {
  _id: string;
  startDate: string;
  defaultProfile: string;
  units: string;
  timezone: string;
  profiles: {
    [key: string]: {
      dia: number;
      target_low: number;
      target_high: number;
      sens: number;
      basal: number[];
      carbratio: number[];
      timezone: string;
    };
  };
}

export interface NightscoutStatus {
  status: string;
  name: string;
  version: string;
  serverTime: string;
  serverTimeEpoch: number;
  apiEnabled: boolean;
  careportalEnabled: boolean;
  boluscalcEnabled: boolean;
  head: string;
  settings: any;
}
