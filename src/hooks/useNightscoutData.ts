import { useState, useCallback } from 'react';
import { GlucoseReading } from '../types/libre';
import { generateDemoGlucoseData } from '../services/demoData';
import { APP_CONFIG } from '../constants/app';
import { convertToMmolL } from '../utils/glucoseUtils';

interface UseNightscoutDataReturn {
  isLoading: boolean;
  error: string | null;
  fetchCurrentGlucose: () => Promise<void>;
  fetchHistoricalData: () => Promise<void>;
}

/**
 * Custom hook for managing Nightscout data fetching
 */
export const useNightscoutData = (
  nightscoutUrl: string,
  selectedConnection: string,
  timeRange: string,
  onDataUpdate: (data: GlucoseReading[]) => void,
  onCurrentReadingUpdate: (reading: GlucoseReading | null) => void
): UseNightscoutDataReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentGlucose = useCallback(async () => {
    if (!selectedConnection || !nightscoutUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${nightscoutUrl}${APP_CONFIG.NIGHTSCOUT_API.ENTRIES}?count=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'libre-glucose-monitor/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const entry = data[0];
        const reading: GlucoseReading = {
          timestamp: new Date(entry.dateString || entry.date),
          value: convertToMmolL(entry.sgv || 0), // Convert mg/dL to mmol/L
          trend: entry.trend || 0,
          trendArrow: entry.direction || 'Flat',
          status: 'normal', // Will be calculated by the component
          unit: 'mmol/L',
          originalTimestamp: new Date(entry.dateString || entry.date)
        };
        
        onCurrentReadingUpdate(reading);
      }
    } catch (err) {
      console.error('❌ Nightscout fetch failed:', err);
      setError(`Failed to fetch from Nightscout: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Fallback to demo data
      const demoData = generateDemoGlucoseData(24);
      if (demoData.length > 0) {
        onCurrentReadingUpdate(demoData[demoData.length - 1]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedConnection, nightscoutUrl, onCurrentReadingUpdate]);

  const fetchHistoricalData = useCallback(async () => {
    if (!selectedConnection || !nightscoutUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '12h' ? 12 : 24;
      const count = Math.max(24, hours * 12); // At least 24 entries, more for longer ranges
      
      const response = await fetch(`${nightscoutUrl}${APP_CONFIG.NIGHTSCOUT_API.ENTRIES}?count=${count}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'libre-glucose-monitor/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        const readings: GlucoseReading[] = data
          .filter((entry: any) => entry.sgv && entry.dateString)
          .map((entry: any) => ({
            timestamp: new Date(entry.dateString),
            value: convertToMmolL(entry.sgv), // Convert mg/dL to mmol/L
            trend: entry.trend || 0,
            trendArrow: entry.direction || 'Flat',
            status: 'normal' as const, // Will be calculated by the component
            unit: 'mmol/L',
            originalTimestamp: new Date(entry.dateString)
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        onDataUpdate(readings);
      }
    } catch (err) {
      console.error('❌ Nightscout historical fetch failed:', err);
      setError(`Failed to fetch historical data from Nightscout: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Fallback to demo data
      const demoData = generateDemoGlucoseData(24);
      onDataUpdate(demoData);
    } finally {
      setIsLoading(false);
    }
  }, [selectedConnection, nightscoutUrl, timeRange, onDataUpdate]);

  return {
    isLoading,
    error,
    fetchCurrentGlucose,
    fetchHistoricalData
  };
};
