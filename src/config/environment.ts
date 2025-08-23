/**
 * Environment configuration and constants
 */

// Environment variables with fallbacks
export const ENV_CONFIG = {
  // Nightscout configuration
  NIGHTSCOUT_URL: process.env.REACT_APP_NIGHTSCOUT_URL || '',
  NIGHTSCOUT_SECRET: process.env.REACT_APP_NIGHTSCOUT_SECRET || '',
  
  // Feature flags
  ENABLE_DEMO_MODE: process.env.REACT_APP_ENABLE_DEMO_MODE === 'true',
  ENABLE_DEBUG_LOGGING: process.env.REACT_APP_ENABLE_DEBUG_LOGGING === 'true',
  
  // API configuration
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT || '10000'),
  MAX_RETRIES: parseInt(process.env.REACT_APP_MAX_RETRIES || '3'),
  
  // Development settings
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test'
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  INSULIN_CALCULATOR: true,
  NIGHTSCOUT_INTEGRATION: !!ENV_CONFIG.NIGHTSCOUT_URL,
  DEMO_DATA_FALLBACK: true,
  REAL_TIME_UPDATES: true,
  KEYBOARD_SHORTCUTS: true
} as const;

// API endpoints
export const API_ENDPOINTS = {
  NIGHTSCOUT: {
    BASE: ENV_CONFIG.NIGHTSCOUT_URL,
    ENTRIES: '/api/v2/entries.json',
    DEVICE_STATUS: '/api/v2/devicestatus.json',
    PROFILE: '/api/v1/profile.json'
  }
} as const;

// Validation functions
export const validateEnvironment = (): string[] => {
  const errors: string[] = [];
  
  if (!ENV_CONFIG.NIGHTSCOUT_URL && !ENV_CONFIG.ENABLE_DEMO_MODE) {
    errors.push('Either NIGHTSCOUT_URL or ENABLE_DEMO_MODE must be configured');
  }
  
  if (ENV_CONFIG.API_TIMEOUT < 1000) {
    errors.push('API_TIMEOUT must be at least 1000ms');
  }
  
  if (ENV_CONFIG.MAX_RETRIES < 1) {
    errors.push('MAX_RETRIES must be at least 1');
  }
  
  return errors;
};

// Get configuration for a specific environment
export const getConfigForEnvironment = () => {
  const errors = validateEnvironment();
  
  if (errors.length > 0) {
    console.warn('Environment configuration issues:', errors);
  }
  
  return {
    ...ENV_CONFIG,
    ...FEATURE_FLAGS,
    ...API_ENDPOINTS,
    errors
  };
};
