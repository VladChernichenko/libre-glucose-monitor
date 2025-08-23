import { APP_CONFIG, TREND_ARROWS } from '../constants/app';

/**
 * Convert mg/dL to mmol/L
 */
export const convertToMmolL = (mgdL: number): number => {
  return Math.round((mgdL / APP_CONFIG.MGDL_TO_MMOLL) * 10) / 10;
};

/**
 * Convert mmol/L to mg/dL
 */
export const convertToMgdL = (mmolL: number): number => {
  return Math.round(mmolL * APP_CONFIG.MGDL_TO_MMOLL);
};

/**
 * Convert trend direction to arrow symbol
 */
export const convertTrendToArrow = (direction: string): string => {
  return TREND_ARROWS[direction as keyof typeof TREND_ARROWS] || '→';
};

/**
 * Calculate glucose status based on mmol/L value
 */
export const calculateGlucoseStatus = (value: number): 'low' | 'normal' | 'high' | 'critical' => {
  // Value is already in mmol/L format, no need to convert
  const { GLUCOSE_THRESHOLDS } = APP_CONFIG;
  
  if (value < GLUCOSE_THRESHOLDS.LOW) return 'low';
  if (value < GLUCOSE_THRESHOLDS.NORMAL) return 'normal';
  if (value < GLUCOSE_THRESHOLDS.HIGH) return 'high';
  return 'critical';
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Check if a value is within a valid range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};
