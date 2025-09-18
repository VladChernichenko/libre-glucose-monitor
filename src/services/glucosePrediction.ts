import { GlucoseNote } from '../types/notes';
import { COBEntry } from './carbsOnBoard';
import { InsulinEntry } from './insulinOnBoard';

export interface GlucosePredictionPoint {
  time: Date;
  predictedGlucose: number;
  carbContribution: number;
  insulinContribution: number;
  baselineGlucose: number;
  confidence: number; // 0-1, how confident we are in this prediction
}

export interface PredictionConfig {
  // Carbohydrate absorption parameters
  carbAbsorptionRate: number; // g/hour (default: 30g/hour for fast carbs)
  carbGlucoseRatio: number; // mmol/L per gram of carbs (default: 0.28 for average person)
  
  // Insulin action parameters
  insulinSensitivityFactor: number; // mmol/L per unit of insulin (default: 2.8)
  insulinActionDuration: number; // hours (default: 4 hours)
  insulinPeakTime: number; // hours (default: 1.5 hours for rapid-acting)
  
  // Glucose metabolism parameters
  basalGlucoseDecline: number; // mmol/L per hour without food/insulin (default: 0.1)
  glucoseVolatility: number; // natural glucose fluctuation (default: 0.5 mmol/L)
  
  // Prediction parameters
  maxPredictionHours: number; // maximum hours to predict (default: 6)
  predictionInterval: number; // minutes between prediction points (default: 15)
}

export class GlucosePredictionService {
  private config: PredictionConfig = {
    // Default values aligned with InsulinOnBoardService for consistency
    carbAbsorptionRate: 30, // 30g/hour
    carbGlucoseRatio: 0.2, // 0.2 mmol/L per gram (matches 2.0 mmol/L per 10g from IOB service)
    insulinSensitivityFactor: 1.0, // 1.0 mmol/L per unit (matches ISF from IOB service)
    insulinActionDuration: 5, // 5 hours (matches 300 minutes from IOB service)
    insulinPeakTime: 1.0, // 1.0 hours (matches 60 minutes from IOB service)
    basalGlucoseDecline: 0.0, // 0.0 mmol/L per hour (no baseline trend without data)
    glucoseVolatility: 0.5, // 0.5 mmol/L
    maxPredictionHours: 6,
    predictionInterval: 15
  };

  updateConfig(newConfig: Partial<PredictionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): PredictionConfig {
    return { ...this.config };
  }

  /**
   * Predict glucose levels for the next N hours
   */
  predictGlucose(
    currentGlucose: number,
    currentTime: Date,
    notes: GlucoseNote[],
    targetHours: number = 2
  ): GlucosePredictionPoint[] {
    const predictions: GlucosePredictionPoint[] = [];
    const intervalMs = this.config.predictionInterval * 60 * 1000;
    const maxTime = new Date(currentTime.getTime() + (targetHours * 60 * 60 * 1000));

    // Convert notes to COB and IOB entries
    const cobEntries = this.convertNotesToCOBEntries(notes);
    const iobEntries = this.convertNotesToIOBEntries(notes);

    for (let time = new Date(currentTime); time <= maxTime; time = new Date(time.getTime() + intervalMs)) {
      const hoursFromNow = (time.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      
      const prediction = this.calculateGlucoseAtTime(
        currentGlucose,
        currentTime,
        time,
        cobEntries,
        iobEntries
      );

      predictions.push({
        time: new Date(time),
        ...prediction,
        confidence: this.calculateConfidence(hoursFromNow)
      });
    }

    return predictions;
  }

  /**
   * Calculate glucose level at a specific future time
   */
  private calculateGlucoseAtTime(
    baselineGlucose: number,
    currentTime: Date,
    targetTime: Date,
    cobEntries: COBEntry[],
    iobEntries: InsulinEntry[]
  ): Omit<GlucosePredictionPoint, 'time' | 'confidence'> {
    const hoursElapsed = (targetTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

    // Calculate baseline glucose (natural decline/rise)
    const baselineAtTime = this.calculateBaselineGlucose(baselineGlucose, hoursElapsed);

    // Calculate carbohydrate contribution
    const carbContribution = this.calculateCarbContribution(cobEntries, currentTime, targetTime);

    // Calculate insulin contribution (negative = lowers glucose)
    const insulinContribution = this.calculateInsulinContribution(iobEntries, currentTime, targetTime);

    // Combine all factors
    const predictedGlucose = Math.max(
      2.0, // Minimum glucose level (safety limit)
      baselineAtTime + carbContribution + insulinContribution
    );

    console.log('🔍 GlucosePrediction Final Calculation:', {
      baselineGlucose: baselineAtTime,
      carbContribution,
      insulinContribution,
      calculation: `${baselineAtTime} + ${carbContribution} + ${insulinContribution}`,
      predictedGlucose,
      hoursElapsed
    });

    return {
      predictedGlucose,
      carbContribution,
      insulinContribution,
      baselineGlucose: baselineAtTime
    };
  }

  /**
   * Calculate baseline glucose trend (without food/insulin effects)
   */
  private calculateBaselineGlucose(currentGlucose: number, hoursElapsed: number): number {
    // Simple linear decline model - could be enhanced with more sophisticated models
    return currentGlucose - (this.config.basalGlucoseDecline * hoursElapsed);
  }

  /**
   * Calculate glucose contribution from carbohydrates
   */
  private calculateCarbContribution(
    cobEntries: COBEntry[],
    currentTime: Date,
    targetTime: Date
  ): number {
    let totalContribution = 0;

    console.log('🔍 GlucosePrediction COB Debug:', {
      entriesCount: cobEntries.length,
      currentTime: currentTime.toISOString(),
      targetTime: targetTime.toISOString()
    });

    for (const entry of cobEntries) {
      if (entry.carbs && entry.carbs > 0) {
        const contribution = this.calculateSingleCarbContribution(
          entry,
          currentTime,
          targetTime
        );
        totalContribution += contribution;
        
        console.log('🔍 GlucosePrediction COB Entry:', {
          timestamp: entry.timestamp.toISOString(),
          carbs: entry.carbs,
          contribution,
          runningTotal: totalContribution
        });
      }
    }

    console.log('🔍 GlucosePrediction Final COB contribution:', totalContribution);
    return totalContribution;
  }

  /**
   * Calculate glucose contribution from a single carb entry
   */
  private calculateSingleCarbContribution(
    entry: COBEntry,
    currentTime: Date,
    targetTime: Date
  ): number {
    const carbTime = new Date(entry.timestamp);
    const hoursFromCarbIntake = (targetTime.getTime() - carbTime.getTime()) / (1000 * 60 * 60);
    const hoursFromCurrentTime = (targetTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

    // Only consider carbs that haven't been fully absorbed yet
    if (hoursFromCarbIntake <= 0) return 0;

    // Use exponential decay model similar to IOB service for consistency
    // Carbs are absorbed with a half-life of 45 minutes (0.75 hours)
    const carbHalfLifeHours = 0.75; // 45 minutes
    const halfLives = hoursFromCarbIntake / carbHalfLifeHours;
    const remainingCarbs = entry.carbs! * Math.pow(0.5, halfLives);
    
    // Only consider remaining carbs (not yet absorbed)
    if (remainingCarbs < 0.1) return 0; // Less than 0.1g remaining

    // Calculate current glucose impact from remaining carbs
    // This represents the glucose rise that will happen as these carbs are absorbed
    const glucoseImpact = remainingCarbs * this.config.carbGlucoseRatio;
    
    return Math.max(0, glucoseImpact);
  }

  /**
   * Calculate glucose contribution from insulin (negative values lower glucose)
   */
  private calculateInsulinContribution(
    iobEntries: InsulinEntry[],
    currentTime: Date,
    targetTime: Date
  ): number {
    let totalContribution = 0;

    for (const entry of iobEntries) {
      if (entry.units && entry.units > 0) {
        const contribution = this.calculateSingleInsulinContribution(
          entry,
          currentTime,
          targetTime
        );
        totalContribution += contribution;
      }
    }

    return totalContribution;
  }

  /**
   * Calculate glucose contribution from a single insulin entry
   */
  private calculateSingleInsulinContribution(
    entry: InsulinEntry,
    currentTime: Date,
    targetTime: Date
  ): number {
    const insulinTime = new Date(entry.timestamp);
    const hoursFromInsulin = (targetTime.getTime() - insulinTime.getTime()) / (1000 * 60 * 60);

    // Only consider insulin that's still active
    if (hoursFromInsulin <= 0 || hoursFromInsulin > this.config.insulinActionDuration) {
      return 0;
    }

    // Calculate insulin activity using a biexponential model
    // This models the absorption and elimination phases of rapid-acting insulin
    const peakTime = this.config.insulinPeakTime;
    const duration = this.config.insulinActionDuration;

    let activityFactor: number;
    if (hoursFromInsulin <= peakTime) {
      // Rising phase (absorption)
      activityFactor = hoursFromInsulin / peakTime;
    } else {
      // Declining phase (elimination)
      const declinePhase = (hoursFromInsulin - peakTime) / (duration - peakTime);
      activityFactor = 1 - declinePhase;
    }

    // Ensure activity factor is between 0 and 1
    activityFactor = Math.max(0, Math.min(1, activityFactor));

    // Calculate glucose lowering effect (negative contribution)
    const glucoseLoweringEffect = -entry.units * this.config.insulinSensitivityFactor * activityFactor;

    return glucoseLoweringEffect;
  }

  /**
   * Calculate confidence level for predictions (decreases over time)
   */
  private calculateConfidence(hoursFromNow: number): number {
    // Confidence decreases exponentially over time
    const baseConfidence = 0.9; // Start with 90% confidence
    const decayRate = 0.3; // How quickly confidence decreases
    
    return Math.max(0.1, baseConfidence * Math.exp(-decayRate * hoursFromNow));
  }

  /**
   * Convert notes to COB entries
   */
  private convertNotesToCOBEntries(notes: GlucoseNote[]): COBEntry[] {
    return notes.map(note => ({
      id: note.id,
      timestamp: note.timestamp,
      carbs: note.carbs,
      insulin: note.insulin,
      mealType: note.meal,
      comment: note.comment,
      glucoseValue: note.glucoseValue
    }));
  }

  /**
   * Convert notes to insulin entries
   */
  private convertNotesToIOBEntries(notes: GlucoseNote[]): InsulinEntry[] {
    return notes
      .filter(note => note.insulin && note.insulin > 0)
      .map(note => ({
        id: `insulin-${note.id}`,
        timestamp: note.timestamp,
        units: note.insulin!,
        type: 'bolus' as const,
        comment: note.comment || ''
      }));
  }

  /**
   * Get a simple 2-hour prediction summary
   */
  getTwoHourPrediction(
    currentGlucose: number,
    currentTime: Date,
    notes: GlucoseNote[]
  ): {
    predictedGlucose: number;
    trend: 'rising' | 'stable' | 'falling';
    confidence: number;
    factors: {
      carbs: number;
      insulin: number;
      baseline: number;
    };
  } {
    const predictions = this.predictGlucose(currentGlucose, currentTime, notes, 2);
    const finalPrediction = predictions[predictions.length - 1];

    if (!finalPrediction) {
      return {
        predictedGlucose: currentGlucose,
        trend: 'stable',
        confidence: 0.5,
        factors: { carbs: 0, insulin: 0, baseline: currentGlucose }
      };
    }

    // Determine trend
    const glucoseChange = finalPrediction.predictedGlucose - currentGlucose;
    let trend: 'rising' | 'stable' | 'falling';
    if (glucoseChange > 1.0) trend = 'rising';
    else if (glucoseChange < -1.0) trend = 'falling';
    else trend = 'stable';

    return {
      predictedGlucose: Math.round(finalPrediction.predictedGlucose * 10) / 10,
      trend,
      confidence: finalPrediction.confidence,
      factors: {
        carbs: Math.round(finalPrediction.carbContribution * 10) / 10,
        insulin: Math.round(finalPrediction.insulinContribution * 10) / 10,
        baseline: Math.round(finalPrediction.baselineGlucose * 10) / 10
      }
    };
  }
}

// Export singleton instance
export const glucosePredictionService = new GlucosePredictionService();
export default glucosePredictionService;
