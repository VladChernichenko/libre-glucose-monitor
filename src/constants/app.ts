// App-wide constants and configuration
export const APP_CONFIG = {
  // Time intervals
  INSULIN_UPDATE_INTERVAL_MS: 60000, // 1 minute
  DEFAULT_TIME_RANGE: '6h' as const,
  TIME_RANGES: ['1h', '6h', '12h', '24h'] as const,
  
  // Glucose thresholds (in mmol/L)
  GLUCOSE_THRESHOLDS: {
    LOW: 3.9,      // < 70 mg/dL
    NORMAL: 10.0,  // 70-180 mg/dL
    HIGH: 13.9,    // 180-250 mg/dL
    CRITICAL: 13.9 // > 250 mg/dL
  },
  
  // Conversion factors
  MGDL_TO_MMOLL: 18,
  
  // UI limits
  MAX_NOTES_DISPLAY: 8,
  MAX_NOTES_SHOW_MORE: 8,
  
  // API endpoints
  NIGHTSCOUT_API: {
    ENTRIES: '/api/v2/entries.json',
    DEVICE_STATUS: '/api/v2/devicestatus.json'
  }
} as const;

// Trend arrow mappings
export const TREND_ARROWS = {
  'DoubleUp': '↗↗',
  'SingleUp': '↗',
  'FortyFiveUp': '↗',
  'Flat': '→',
  'FortyFiveDown': '↘',
  'SingleDown': '↘',
  'DoubleDown': '↘↘',
  'NOT COMPUTABLE': '→',
  'RATE OUT OF RANGE': '→',
} as const;

// Default patient info
export const DEFAULT_PATIENT = {
  id: 'nightscout-user',
  firstName: 'Nightscout',
  lastName: 'User',
  email: 'user@nightscout.com'
} as const;

// Default connection
export const DEFAULT_CONNECTION = 'nightscout-connection';
