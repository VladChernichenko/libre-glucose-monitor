/**
 * Timezone and locale utilities for client-side time handling
 */

export interface ClientTimeInfo {
  timestamp: string; // Local time in YYYY-MM-DDTHH:mm:ss format (NOT UTC)
  timezone: string; // e.g., "Asia/Tbilisi"
  locale: string; // e.g., "en-GB"
  timezoneOffset: number; // minutes offset from UTC (positive = behind UTC)
}

/**
 * Get comprehensive client time information
 */
export const getClientTimeInfo = (date?: Date): ClientTimeInfo => {
  const now = date || new Date();
  
  // Format timestamp in local time (not UTC)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const localTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  
  return {
    timestamp: localTimestamp, // Local time, not UTC
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language || 'en-US',
    timezoneOffset: now.getTimezoneOffset()
  };
};

/**
 * Get current time in user's timezone (not UTC)
 * This preserves the user's local time context
 */
export const getCurrentLocalTime = (): Date => {
  return new Date();
};

/**
 * Format date for backend API while preserving timezone context
 * This sends the local time as-is, letting the backend know it's in user's timezone
 */
export const formatDateForBackend = (date: Date): string => {
  // Format as ISO string but indicate it's local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Create a request payload that includes both the data and client time context
 */
export const createTimestampedRequest = <T>(data: T, timestamp?: Date): T & { clientTimeInfo: ClientTimeInfo } => {
  return {
    ...data,
    clientTimeInfo: getClientTimeInfo(timestamp)
  };
};

/**
 * Get user's timezone display name
 */
export const getTimezoneDisplayName = (): string => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'long',
      timeZone: timezone
    });
    
    const parts = formatter.formatToParts(new Date());
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;
    
    return timeZoneName || timezone;
  } catch (error) {
    console.warn('Could not get timezone display name:', error);
    return 'Local Time';
  }
};

/**
 * Check if two dates are in the same day in user's timezone
 */
export const isSameLocalDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Get start of day in user's timezone
 */
export const getStartOfLocalDay = (date?: Date): Date => {
  const target = date || new Date();
  const startOfDay = new Date(target);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

/**
 * Get end of day in user's timezone
 */
export const getEndOfLocalDay = (date?: Date): Date => {
  const target = date || new Date();
  const endOfDay = new Date(target);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};

/**
 * Convert a UTC timestamp from backend to local date
 */
export const convertBackendTimestampToLocal = (timestamp: string): Date => {
  return new Date(timestamp);
};

/**
 * Debug utility to log timezone information
 */
export const logTimezoneInfo = (): void => {
  const now = new Date();
  const info = getClientTimeInfo();
  console.log('🌍 Client Timezone Info:', {
    timezone: info.timezone,
    locale: info.locale,
    offset: info.timezoneOffset,
    displayName: getTimezoneDisplayName(),
    localTimestamp: info.timestamp,
    utcTimestamp: now.toISOString(),
    localTimeString: now.toLocaleString(),
    comparison: `Local: ${info.timestamp} vs UTC: ${now.toISOString()}`
  });
};
