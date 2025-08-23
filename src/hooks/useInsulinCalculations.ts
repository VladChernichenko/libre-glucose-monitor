import { useState, useEffect, useCallback } from 'react';
import { InsulinCalculator } from '../services/insulinCalculator';
import { InsulinDose } from '../types/notes';
import { APP_CONFIG } from '../constants/app';

/**
 * Custom hook for managing insulin calculations and real-time updates
 */
export const useInsulinCalculations = (insulinDoses: InsulinDose[]) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [totalActiveInsulin, setTotalActiveInsulin] = useState(0);

  // Update current time and recalculate insulin every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Recalculate total active insulin
      const active = InsulinCalculator.calculateTotalActiveInsulin(insulinDoses, now);
      setTotalActiveInsulin(active);
    }, APP_CONFIG.INSULIN_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [insulinDoses]);

  // Calculate insulin for specific doses
  const calculateRemainingInsulin = useCallback((dose: InsulinDose): number => {
    return InsulinCalculator.calculateRemainingInsulin(dose, currentTime);
  }, [currentTime]);

  // Get insulin activity status
  const getInsulinActivityStatus = useCallback((): 'rising' | 'peak' | 'falling' | 'none' => {
    return InsulinCalculator.getInsulinActivityStatus(insulinDoses, currentTime);
  }, [insulinDoses, currentTime]);

  // Get insulin activity description
  const getInsulinActivityDescription = useCallback((): string => {
    return InsulinCalculator.getInsulinActivityDescription(insulinDoses, currentTime);
  }, [insulinDoses, currentTime]);

  return {
    currentTime,
    totalActiveInsulin,
    calculateRemainingInsulin,
    getInsulinActivityStatus,
    getInsulinActivityDescription
  };
};
