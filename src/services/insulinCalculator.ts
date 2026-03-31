// Insulin Half-Life Calculator for Fiasp
// Based on Fiasp pharmacokinetics: onset 1-3min, peak 60-90min, duration 3-5h, half-life ~42min

export interface InsulinDose {
  id: string;
  timestamp: Date;
  units: number;
  type: 'bolus' | 'correction' | 'basal';
  note?: string;
  mealType?: string; // Associated meal type
}

export interface ActiveInsulin {
  timestamp: Date;
  remainingUnits: number;
  percentageRemaining: number;
  isPeak: boolean;
}

export class InsulinCalculator {
  /** DIA (hours); bolus IOB is 0 after this. */
  private static readonly DURATION_HOURS = 4;
  /** OpenAPS "ultra-rapid" peak (Fiasp-class), minutes. */
  private static readonly PEAK_TIME_MINUTES = 55;
  /** Legacy: timeline "near peak" band width. */
  private static readonly HALF_LIFE_MINUTES = 42;

  /**
   * OpenAPS oref0 exponential IOB (Loop #388), ported from lib/iob/calculate.js.
   * Matches backend InsulinCalculatorService.iobOpenApsExponential.
   */
  static iobOpenApsExponential(
    insulinUnits: number,
    minsAgo: number,
    diaHours: number,
    peakMinutes: number
  ): number {
    const end = diaHours * 60;
    const peak = peakMinutes;
    if (minsAgo < 0 || minsAgo >= end || insulinUnits <= 0) {
      return 0;
    }
    const denom = 1 - (2 * peak) / end;
    if (Math.abs(denom) < 1e-5) {
      return insulinUnits * Math.max(0, 1 - minsAgo / end);
    }
    const tau = (peak * (1 - peak / end)) / denom;
    const a = (2 * tau) / end;
    const expNegEndOverTau = Math.exp(-end / tau);
    const s = 1 / (1 - a + (1 + a) * expNegEndOverTau);
    const expNegTOverTau = Math.exp(-minsAgo / tau);
    const bracket =
      ((minsAgo * minsAgo) / (tau * end * (1 - a)) - minsAgo / tau - 1) * expNegTOverTau + 1;
    let iobContrib = insulinUnits * (1 - s * (1 - a) * bracket);
    if (!Number.isFinite(iobContrib)) {
      iobContrib = insulinUnits * Math.max(0, 1 - minsAgo / end);
    }
    return Math.max(0, Math.min(insulinUnits, iobContrib));
  }

  /**
   * IOB for one bolus at currentTime (future doses contribute 0; OpenAPS exponential curve).
   */
  static calculateRemainingInsulin(dose: InsulinDose, currentTime: Date): number {
    const u = dose.units;
    if (u <= 0 || !dose.timestamp) {
      return 0;
    }
    const minsAgo = (currentTime.getTime() - dose.timestamp.getTime()) / (1000 * 60);
    if (minsAgo < 0) {
      return 0;
    }
    if (minsAgo >= this.DURATION_HOURS * 60) {
      return 0;
    }
    return this.iobOpenApsExponential(u, minsAgo, this.DURATION_HOURS, this.PEAK_TIME_MINUTES);
  }
  
  /**
   * Calculate total active insulin from multiple doses
   */
  static calculateTotalActiveInsulin(
    doses: InsulinDose[], 
    currentTime: Date
  ): number {
    return doses.reduce((total, dose) => {
      return total + this.calculateRemainingInsulin(dose, currentTime);
    }, 0);
  }
  
  /**
   * Get insulin activity timeline for a dose
   */
  static getInsulinActivityTimeline(
    dose: InsulinDose, 
    durationHours: number = 4
  ): ActiveInsulin[] {
    const timeline: ActiveInsulin[] = [];
    const startTime = dose.timestamp;
    
    // Generate timeline every 15 minutes for 4 hours
    for (let hour = 0; hour <= durationHours; hour += 0.25) {
      const currentTime = new Date(startTime.getTime() + hour * 60 * 60 * 1000);
      const remainingUnits = this.calculateRemainingInsulin(dose, currentTime);
      const percentageRemaining = (remainingUnits / dose.units) * 100;
      
      // Check if this is peak time
      const minutesSinceDose = hour * 60;
      const isPeak = Math.abs(minutesSinceDose - InsulinCalculator.PEAK_TIME_MINUTES) <= 15;
      
      timeline.push({
        timestamp: currentTime,
        remainingUnits,
        percentageRemaining,
        isPeak
      });
    }
    
    return timeline;
  }
  
  /**
   * Get total insulin activity timeline for multiple doses
   */
  static getTotalInsulinTimeline(
    doses: InsulinDose[], 
    durationHours: number = 4
  ): ActiveInsulin[] {
    if (doses.length === 0) return [];
    
    // Find the earliest dose time
    const earliestDose = doses.reduce((earliest, dose) => 
      dose.timestamp < earliest.timestamp ? dose : earliest
    );
    
    const timeline: ActiveInsulin[] = [];
    const startTime = earliestDose.timestamp;
    
    // Generate timeline every 15 minutes
    for (let hour = 0; hour <= durationHours; hour += 0.25) {
      const currentTime = new Date(startTime.getTime() + hour * 60 * 60 * 1000);
      const totalRemaining = this.calculateTotalActiveInsulin(doses, currentTime);
      
      // Calculate percentage based on total initial units
      const totalInitialUnits = doses.reduce((sum, dose) => sum + dose.units, 0);
      const percentageRemaining = totalInitialUnits > 0 ? (totalRemaining / totalInitialUnits) * 100 : 0;
      
      // Check if any dose is at peak
      const isPeak = doses.some(dose => {
        const minutesSinceDose = (currentTime.getTime() - dose.timestamp.getTime()) / (1000 * 60);
        return Math.abs(minutesSinceDose - InsulinCalculator.PEAK_TIME_MINUTES) <= 15;
      });
      
      timeline.push({
        timestamp: currentTime,
        remainingUnits: totalRemaining,
        percentageRemaining,
        isPeak
      });
    }
    
    return timeline;
  }
  
  /**
   * Get insulin activity status (rising, peak, falling)
   */
  static getInsulinActivityStatus(
    doses: InsulinDose[], 
    currentTime: Date
  ): 'rising' | 'peak' | 'falling' | 'none' {
    if (doses.length === 0) return 'none';
    
    // Find the most recent dose
    const mostRecentDose = doses.reduce((mostRecent, dose) => 
      dose.timestamp > mostRecent.timestamp ? dose : mostRecent
    );
    
    const minutesSinceDose = (currentTime.getTime() - mostRecentDose.timestamp.getTime()) / (1000 * 60);
    
    if (minutesSinceDose < 0) return 'none';
    if (minutesSinceDose < this.PEAK_TIME_MINUTES - 15) return 'rising';
    if (minutesSinceDose < this.PEAK_TIME_MINUTES + 15) return 'peak';
    return 'falling';
  }
  
  /**
   * Get insulin activity description
   */
  static getInsulinActivityDescription(
    doses: InsulinDose[], 
    currentTime: Date
  ): string {
    const status = this.getInsulinActivityStatus(doses, currentTime);
    const totalActive = this.calculateTotalActiveInsulin(doses, currentTime);
    
    if (status === 'none') return 'No active insulin';
    if (totalActive === 0) return 'No active insulin';
    
    const statusText = {
      'rising': 'Insulin rising',
      'peak': 'Insulin at peak',
      'falling': 'Insulin falling'
    }[status];
    
    return `${statusText} - ${totalActive.toFixed(1)}u active`;
  }
}
