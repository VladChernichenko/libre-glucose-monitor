export interface COBConfig {
  carbRatio: number;        // mmol/L increase per 10g carbs - default: 2.0
  isf: number;              // insulin sensitivity factor (mmol/L per unit) - default: 1.0
  carbHalfLife: number;     // half-life in minutes - default: 45 (medium-acting carbs)
  maxCOBDuration: number;   // maximum duration to track COB in minutes - default: 240 (4 hours)
}

export interface COBEntry {
  id: string;
  timestamp: Date;
  carbs: number;            // grams of carbs consumed (or remaining for active entries)
  insulin: number;          // units of insulin taken
  mealType: string;         // type of meal for categorization
  comment?: string;
  glucoseValue?: number;    // glucose reading at time of meal
  originalCarbs?: number;   // original carbs amount (for active entries display)
}

export interface COBStatus {
  currentCOB: number;       // current carbs on board in grams
  activeEntries: COBEntry[]; // entries still contributing to COB
  estimatedGlucoseImpact: number; // estimated glucose rise from active carbs
  timeToZero: number;       // minutes until COB reaches zero
  insulinOnBoard: number;   // active insulin units
}

export class CarbsOnBoardService {
  private static instance: CarbsOnBoardService;
  private config: COBConfig;
  
  private constructor() {
    // Default configuration based on your ratios
    this.config = {
      carbRatio: 2.0,       // 2.0 mmol/L per 10g carbs
      isf: 1.0,             // 1.0 mmol/L/u
      carbHalfLife: 45,     // 45 minutes (medium-acting carbs)
      maxCOBDuration: 240   // 4 hours maximum tracking
    };
  }
  
  static getInstance(): CarbsOnBoardService {
    if (!CarbsOnBoardService.instance) {
      CarbsOnBoardService.instance = new CarbsOnBoardService();
    }
    return CarbsOnBoardService.instance;
  }

  // Update configuration
  updateConfig(newConfig: Partial<COBConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('✅ COB configuration updated:', this.config);
  }

  // Get current configuration
  getConfig(): COBConfig {
    return { ...this.config };
  }

  // Calculate carbs on board at a specific time
  calculateCOB(entries: COBEntry[], targetTime: Date = new Date()): COBStatus {
    const now = targetTime.getTime();
    const maxAge = this.config.maxCOBDuration * 60 * 1000; // convert to milliseconds
    
    // Filter entries within tracking window
    const relevantEntries = entries.filter(entry => {
      const age = now - entry.timestamp.getTime();
      return age <= maxAge;
    });

    let totalCOB = 0;
    let totalIOB = 0;
    const activeEntries: COBEntry[] = [];

    relevantEntries.forEach(entry => {
      const ageMinutes = (now - entry.timestamp.getTime()) / (60 * 1000);
      
      // Calculate remaining carbs using exponential decay (half-life formula)
      const remainingCarbs = this.calculateRemainingCarbs(entry.carbs, ageMinutes);
      
      if (remainingCarbs > 0.1) { // Only count if more than 0.1g remaining
        totalCOB += remainingCarbs;
        activeEntries.push({
          ...entry,
          carbs: remainingCarbs, // Update with remaining amount
          originalCarbs: entry.carbs // Preserve original amount for display
        });
      }

      // Calculate insulin on board (IOB) - insulin has its own half-life
      const remainingInsulin = this.calculateRemainingInsulin(entry.insulin, ageMinutes);
      if (remainingInsulin > 0.01) { // Only count if more than 0.01u remaining
        totalIOB += remainingInsulin;
      }
    });

    // Calculate estimated glucose impact from active carbs
    const estimatedGlucoseImpact = this.estimateGlucoseImpact(totalCOB, totalIOB);
    
    // Estimate time until COB reaches zero (simplified calculation)
    const timeToZero = this.estimateTimeToZero(totalCOB);

    return {
      currentCOB: Math.round(totalCOB * 10) / 10, // Round to 1 decimal place
      activeEntries: activeEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      estimatedGlucoseImpact: Math.round(estimatedGlucoseImpact * 10) / 10,
      timeToZero: Math.round(timeToZero),
      insulinOnBoard: Math.round(totalIOB * 100) / 100 // Round to 2 decimal places
    };
  }

  // Calculate remaining carbs using half-life formula
  private calculateRemainingCarbs(initialCarbs: number, ageMinutes: number): number {
    if (ageMinutes <= 0) return initialCarbs;
    
    // Half-life formula: remaining = initial * (0.5)^(age/halfLife)
    const halfLifeMinutes = this.config.carbHalfLife;
    const remaining = initialCarbs * Math.pow(0.5, ageMinutes / halfLifeMinutes);
    
    return Math.max(0, remaining);
  }

  // Calculate remaining insulin using insulin half-life (typically 3-4 hours)
  private calculateRemainingInsulin(initialInsulin: number, ageMinutes: number): number {
    if (ageMinutes <= 0) return initialInsulin;
    
    // Insulin typically has a half-life of about 3-4 hours (180-240 minutes)
    // Using 3.5 hours (210 minutes) as a reasonable default
    const insulinHalfLife = 210; // minutes
    const remaining = initialInsulin * Math.pow(0.5, ageMinutes / insulinHalfLife);
    
    return Math.max(0, remaining);
  }

  // Estimate glucose impact considering both carbs and insulin
  private estimateGlucoseImpact(carbs: number, insulin: number): number {
    // Carbs raise glucose: (carbs / 10) * carbRatio
    const glucoseRise = (carbs / 10) * this.config.carbRatio;
    
    // Insulin lowers glucose: insulin * ISF
    const glucoseDrop = insulin * this.config.isf;
    
    // Net effect
    return glucoseRise - glucoseDrop;
  }

  // Estimate time until COB reaches zero
  private estimateTimeToZero(currentCOB: number): number {
    if (currentCOB <= 0) return 0;
    
    // Using the half-life formula to estimate time
    // If we want to find when remaining = 0.1g (effectively zero)
    const targetRemaining = 0.1;
    const timeMinutes = this.config.carbHalfLife * Math.log2(currentCOB / targetRemaining);
    
    return Math.max(0, timeMinutes);
  }

  // Get COB projection over time (for charts)
  getCOBProjection(entries: COBEntry[], timePoints: number = 24): Array<{time: Date, cob: number, iob: number}> {
    const now = new Date();
    const projection: Array<{time: Date, cob: number, iob: number}> = [];
    
    for (let i = 0; i <= timePoints; i++) {
      const futureTime = new Date(now.getTime() + (i * 15 * 60 * 1000)); // 15-minute intervals
      const cobStatus = this.calculateCOB(entries, futureTime);
      
      projection.push({
        time: futureTime,
        cob: cobStatus.currentCOB,
        iob: cobStatus.insulinOnBoard
      });
    }
    
    return projection;
  }

  // Calculate recommended insulin dose for a meal
  calculateRecommendedInsulin(carbs: number, currentGlucose?: number, targetGlucose: number = 7.0): number {
    // Calculate glucose rise from carbs: (carbs / 10) * carbRatio
    const glucoseRiseFromCarbs = (carbs / 10) * this.config.carbRatio;
    
    // Calculate insulin needed to cover carbs: glucoseRise / ISF
    let recommendedInsulin = glucoseRiseFromCarbs / this.config.isf;
    
    // Add correction dose if glucose is above target
    if (currentGlucose && currentGlucose > targetGlucose) {
      const correctionDose = (currentGlucose - targetGlucose) / this.config.isf;
      recommendedInsulin += correctionDose;
    }
    
    // Subtract any active insulin on board
    // Note: This would need to be calculated separately with actual entries
    
    return Math.max(0, Math.round(recommendedInsulin * 100) / 100);
  }

  // Get COB summary for display
  getCOBSummary(entries: COBEntry[]): {
    totalCarbsToday: number;
    totalInsulinToday: number;
    averageGlucose: number;
    carbInsulinRatio: number;
  } {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayEntries = entries.filter(entry => entry.timestamp >= startOfDay);
    
    const totalCarbs = todayEntries.reduce((sum, entry) => sum + entry.carbs, 0);
    const totalInsulin = todayEntries.reduce((sum, entry) => sum + entry.insulin, 0);
    
    const glucoseReadings = todayEntries
      .filter(entry => entry.glucoseValue)
      .map(entry => entry.glucoseValue!);
    
    const averageGlucose = glucoseReadings.length > 0 
      ? glucoseReadings.reduce((sum, value) => sum + value, 0) / glucoseReadings.length
      : 0;
    
    const carbInsulinRatio = totalInsulin > 0 ? totalCarbs / totalInsulin : 0;
    
    return {
      totalCarbsToday: Math.round(totalCarbs),
      totalInsulinToday: Math.round(totalInsulin * 100) / 100,
      averageGlucose: Math.round(averageGlucose * 10) / 10,
      carbInsulinRatio: Math.round(carbInsulinRatio * 10) / 10
    };
  }
}

export const carbsOnBoardService = CarbsOnBoardService.getInstance();
export default carbsOnBoardService;
