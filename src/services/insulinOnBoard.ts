export interface InsulinEntry {
  id: string;
  timestamp: Date;
  units: number;
  type: 'bolus' | 'basal' | 'correction';
  duration?: number; // Duration of insulin action in minutes
  comment?: string;
}

export interface IOBProjection {
  time: Date;
  iob: number;
  glucosePrediction?: number;
  confidence?: number;
}

export interface InsulinProfile {
  peakTime: number;      // Time to peak effect in minutes
  duration: number;      // Total duration of action in minutes
  decayRate: number;     // Decay rate for exponential model
}

export class InsulinOnBoardService {
  private static instance: InsulinOnBoardService;
  private insulinProfile: InsulinProfile;
  
  private constructor() {
    // Default insulin profile for rapid-acting insulin (e.g., Humalog, Novolog)
    this.insulinProfile = {
      peakTime: 60,      // Peak at 1 hour
      duration: 300,     // 5 hours total duration
      decayRate: 0.8     // Exponential decay rate
    };
  }
  
  static getInstance(): InsulinOnBoardService {
    if (!InsulinOnBoardService.instance) {
      InsulinOnBoardService.instance = new InsulinOnBoardService();
    }
    return InsulinOnBoardService.instance;
  }

  // Update insulin profile
  updateProfile(profile: Partial<InsulinProfile>): void {
    this.insulinProfile = { ...this.insulinProfile, ...profile };
  }

  // Calculate IOB at a specific time using exponential decay model
  calculateIOBAtTime(insulinEntries: InsulinEntry[], targetTime: Date): number {
    const targetTimeMs = targetTime.getTime();
    let totalIOB = 0;

    for (const entry of insulinEntries) {
      const entryTimeMs = entry.timestamp.getTime();
      const timeDiffMinutes = (targetTimeMs - entryTimeMs) / (1000 * 60);
      
      // Skip if insulin is beyond its duration
      if (timeDiffMinutes < 0 || timeDiffMinutes > this.insulinProfile.duration) {
        continue;
      }

      // Calculate IOB using exponential decay model
      const iob = this.calculateInsulinDecay(entry.units, timeDiffMinutes);
      totalIOB += iob;
    }

    return Math.max(0, totalIOB);
  }

  // Calculate insulin decay using exponential model
  private calculateInsulinDecay(units: number, timeDiffMinutes: number): number {
    const { peakTime, duration, decayRate } = this.insulinProfile;
    
    // If before peak time, use linear rise
    if (timeDiffMinutes <= peakTime) {
      return units * (timeDiffMinutes / peakTime);
    }
    
    // After peak time, use exponential decay
    const peakValue = units;
    const timeAfterPeak = timeDiffMinutes - peakTime;
    const decayFactor = Math.exp(-decayRate * timeAfterPeak / (duration - peakTime));
    
    return peakValue * decayFactor;
  }

  // Generate IOB projection over time
  generateIOBProjection(
    insulinEntries: InsulinEntry[], 
    startTime: Date, 
    endTime: Date, 
    intervalMinutes: number = 15
  ): IOBProjection[] {
    const projections: IOBProjection[] = [];
    const currentTime = new Date(startTime);
    
    while (currentTime <= endTime) {
      const iob = this.calculateIOBAtTime(insulinEntries, currentTime);
      projections.push({
        time: new Date(currentTime),
        iob: Math.round(iob * 100) / 100, // Round to 2 decimal places
      });
      
      currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
    }
    
    return projections;
  }

  // Predict glucose based on IOB, COB, and current glucose trend
  predictGlucose(
    currentGlucose: number,
    currentIOB: number,
    glucoseTrend: number, // mg/dL per minute
    timeHorizonMinutes: number = 60,
    notes?: Array<{ timestamp: Date; carbs: number; insulin: number }>,
    cobConfig?: { carbRatio: number; isf: number; carbHalfLife: number }
  ): number {
    // Use COB settings if provided, otherwise use defaults
    const carbRatio = cobConfig?.carbRatio || 2.0; // mmol/L per 10g carbs
    const isf = cobConfig?.isf || 1.0; // mmol/L per unit
    const carbHalfLife = cobConfig?.carbHalfLife || 45; // minutes
    
    // Calculate COB at the target time (current time + timeHorizon)
    const targetTime = new Date(Date.now() + timeHorizonMinutes * 60 * 1000);
    const targetCOB = this.calculateCOBAtTime(notes || [], targetTime, carbHalfLife);
    const targetIOB = this.calculateIOBAtTimeFromNotes(notes || [], targetTime, 42); // 42 min insulin half-life
    
    // Convert trend from mg/dL per minute to mmol/L per minute
    const trendMmolL = glucoseTrend / 18;
    
    // Calculate effects
    const cobEffect = (targetCOB / 10) * carbRatio; // Glucose rise from remaining carbs
    const iobEffect = targetIOB * isf; // Glucose drop from remaining insulin
    const trendEffect = trendMmolL * timeHorizonMinutes; // Glucose change from trend
    
    // Debug logging for all predictions
    console.log('🔍 Prediction Debug:', {
      currentGlucose,
      timeHorizonMinutes,
      targetCOB,
      targetIOB,
      glucoseTrend,
      trendMmolL,
      trendEffect,
      cobEffect,
      iobEffect,
      calculation: `${currentGlucose} + ${trendEffect} + ${cobEffect} - ${iobEffect}`,
      predictedGlucose: currentGlucose + trendEffect + cobEffect - iobEffect,
      carbRatio,
      isf,
      carbHalfLife
    });

    // If no COB and no IOB, predictions should be flat (no change)
    if (targetCOB === 0 && targetIOB === 0) {
      console.log('🎯 Applying flat prediction for zero COB/IOB');
      return currentGlucose;
    }
    
    // Predict glucose: current + trend + carbs - insulin
    const predictedGlucose = currentGlucose + trendEffect + cobEffect - iobEffect;
    
    // Alert for extreme predictions
    if (predictedGlucose > 20 || predictedGlucose < 2) {
      console.error('🚨 EXTREME PREDICTION DETECTED:', {
        currentGlucose,
        predictedGlucose,
        trendEffect,
        cobEffect,
        iobEffect,
        timeHorizonMinutes
      });
    }
    
    return Math.max(0, predictedGlucose);
  }

  // Calculate COB at a specific time from notes data
  private calculateCOBAtTime(
    notes: Array<{ timestamp: Date; carbs: number; insulin: number }>,
    targetTime: Date,
    carbHalfLifeMinutes: number
  ): number {
    if (!notes || notes.length === 0) return 0;
    
    let totalCOB = 0;
    const targetTimeMs = targetTime.getTime();
    
    for (const note of notes) {
      const noteTimeMs = note.timestamp.getTime();
      const timeDiffMinutes = (targetTimeMs - noteTimeMs) / (1000 * 60);
      
      // Skip if note is in the future or carbs are 0
      if (timeDiffMinutes < 0 || note.carbs <= 0) continue;
      
      // Calculate remaining carbs using exponential decay
      const halfLives = timeDiffMinutes / carbHalfLifeMinutes;
      const remainingCarbs = note.carbs * Math.pow(0.5, halfLives);
      totalCOB += Math.max(0, remainingCarbs);
    }
    
    return totalCOB;
  }

  // Calculate IOB at a specific time from notes data
  private calculateIOBAtTimeFromNotes(
    notes: Array<{ timestamp: Date; carbs: number; insulin: number }>,
    targetTime: Date,
    insulinHalfLifeMinutes: number = 42
  ): number {
    if (!notes || notes.length === 0) return 0;
    
    let totalIOB = 0;
    const targetTimeMs = targetTime.getTime();
    
    for (const note of notes) {
      const noteTimeMs = note.timestamp.getTime();
      const timeDiffMinutes = (targetTimeMs - noteTimeMs) / (1000 * 60);
      
      // Skip if note is in the future or insulin is 0
      if (timeDiffMinutes < 0 || note.insulin <= 0) continue;
      
      // Calculate remaining insulin using exponential decay
      const halfLives = timeDiffMinutes / insulinHalfLifeMinutes;
      const remainingInsulin = note.insulin * Math.pow(0.5, halfLives);
      totalIOB += Math.max(0, remainingInsulin);
    }
    
    return totalIOB;
  }

  // Generate combined IOB and glucose prediction
  generateCombinedProjection(
    insulinEntries: InsulinEntry[],
    currentGlucose: number,
    glucoseTrend: number,
    startTime: Date,
    endTime: Date,
    intervalMinutes: number = 15,
    notes?: Array<{ timestamp: Date; carbs: number; insulin: number }>,
    cobConfig?: { carbRatio: number; isf: number; carbHalfLife: number }
  ): IOBProjection[] {
    const projections = this.generateIOBProjection(insulinEntries, startTime, endTime, intervalMinutes);
    const currentTime = new Date();
    
    // Add glucose predictions only for future data points
    return projections.map(projection => {
      // Calculate time difference from current time
      const timeDiffMinutes = (projection.time.getTime() - currentTime.getTime()) / (1000 * 60);
      
      // Only generate predictions for future time points
      const glucosePrediction = timeDiffMinutes > 0 
        ? this.predictGlucose(
            currentGlucose,
            projection.iob,
            glucoseTrend,
            timeDiffMinutes,
            notes,
            cobConfig
          )
        : undefined; // No predictions for past data
      
      return {
        ...projection,
        glucosePrediction: glucosePrediction !== undefined 
          ? Math.round(glucosePrediction * 10) / 10 
          : undefined,
        confidence: glucosePrediction !== undefined 
          ? this.calculatePredictionConfidence(timeDiffMinutes)
          : undefined
      };
    });
  }

  // Calculate prediction confidence based on time horizon
  private calculatePredictionConfidence(timeHorizonMinutes: number): number {
    // Confidence decreases with time horizon
    // 100% at 0 minutes, 50% at 2 hours, 0% at 6 hours
    const maxConfidenceTime = 0;
    const zeroConfidenceTime = 360; // 6 hours
    
    if (timeHorizonMinutes <= maxConfidenceTime) return 1.0;
    if (timeHorizonMinutes >= zeroConfidenceTime) return 0.0;
    
    const confidence = 1.0 - (timeHorizonMinutes - maxConfidenceTime) / (zeroConfidenceTime - maxConfidenceTime);
    return Math.max(0, Math.min(1, confidence));
  }

  // Get current IOB from recent insulin entries
  getCurrentIOB(insulinEntries: InsulinEntry[]): number {
    return this.calculateIOBAtTime(insulinEntries, new Date());
  }

  // Get insulin entries from notes (if notes contain insulin information)
  extractInsulinFromNotes(notes: Array<{ timestamp: Date; insulin?: number; comment?: string }>): InsulinEntry[] {
    return notes
      .filter(note => note.insulin && note.insulin > 0)
      .map((note, index) => ({
        id: `insulin-${index}`,
        timestamp: note.timestamp,
        units: note.insulin!,
        type: 'bolus' as const,
        comment: note.comment
      }));
  }

  // Get insulin profile info
  getProfile(): InsulinProfile {
    return { ...this.insulinProfile };
  }
}

// Export singleton instance
export const insulinOnBoardService = InsulinOnBoardService.getInstance();
export default insulinOnBoardService;
