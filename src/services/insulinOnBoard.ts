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

  // Predict glucose based on IOB and current glucose trend
  predictGlucose(
    currentGlucose: number,
    currentIOB: number,
    glucoseTrend: number, // mg/dL per minute
    timeHorizonMinutes: number = 60
  ): number {
    // Convert trend from mg/dL per minute to mmol/L per minute
    const trendMmolL = glucoseTrend / 18;
    
    // Estimate glucose change from IOB
    // Assuming 1 unit of insulin reduces glucose by ~3 mmol/L (54 mg/dL)
    const insulinSensitivity = 3.0; // mmol/L per unit
    const iobEffect = currentIOB * insulinSensitivity;
    
    // Predict glucose change over time horizon
    const trendEffect = trendMmolL * timeHorizonMinutes;
    const predictedGlucose = currentGlucose + trendEffect - iobEffect;
    
    return Math.max(0, predictedGlucose);
  }

  // Generate combined IOB and glucose prediction
  generateCombinedProjection(
    insulinEntries: InsulinEntry[],
    currentGlucose: number,
    glucoseTrend: number,
    startTime: Date,
    endTime: Date,
    intervalMinutes: number = 15
  ): IOBProjection[] {
    const projections = this.generateIOBProjection(insulinEntries, startTime, endTime, intervalMinutes);
    
    // Add glucose predictions
    return projections.map(projection => {
      const timeDiffMinutes = (projection.time.getTime() - startTime.getTime()) / (1000 * 60);
      const glucosePrediction = this.predictGlucose(
        currentGlucose,
        projection.iob,
        glucoseTrend,
        timeDiffMinutes
      );
      
      return {
        ...projection,
        glucosePrediction: Math.round(glucosePrediction * 10) / 10, // Round to 1 decimal
        confidence: this.calculatePredictionConfidence(timeDiffMinutes)
      };
    });
  }

  // Calculate prediction confidence based on time horizon
  private calculatePredictionConfidence(timeHorizonMinutes: number): number {
    // Confidence decreases with time horizon
    // 100% at 0 minutes, 50% at 2 hours, 0% at 6 hours
    const maxConfidenceTime = 0;
    const halfConfidenceTime = 120; // 2 hours
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
