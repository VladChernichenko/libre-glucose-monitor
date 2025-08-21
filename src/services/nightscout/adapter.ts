import { NightscoutEntry, NightscoutDeviceStatus } from './types';
import { GlucoseReading } from '../../types/libre';

export class NightscoutDataAdapter {
  static convertEntryToGlucoseReading(entry: NightscoutEntry): GlucoseReading {
    return {
      timestamp: new Date(entry.date),
      value: entry.sgv,
      trend: this.convertTrendToNumber(entry.direction),
      trendArrow: this.convertTrendToArrow(entry.direction),
      status: this.calculateGlucoseStatus(entry.sgv),
      unit: 'mg/dL',
    };
  }

  static convertTrendToArrow(direction: string): string {
    const trendMap: { [key: string]: string } = {
      'DoubleUp': '↗↗',
      'SingleUp': '↗',
      'FortyFiveUp': '↗',
      'Flat': '→',
      'FortyFiveDown': '↘',
      'SingleDown': '↘',
      'DoubleDown': '↘↘',
      'NOT COMPUTABLE': '→',
      'RATE OUT OF RANGE': '→',
    };
    return trendMap[direction] || '→';
  }

  static calculateGlucoseStatus(value: number): 'low' | 'normal' | 'high' | 'critical' {
    if (value < 70) return 'low';
    if (value < 180) return 'normal';
    if (value < 250) return 'high';
    return 'critical';
  }

  static convertTrendToNumber(direction: string): number {
    const trendMap: { [key: string]: number } = {
      'DoubleUp': 2,
      'SingleUp': 1,
      'FortyFiveUp': 0.5,
      'Flat': 0,
      'FortyFiveDown': -0.5,
      'SingleDown': -1,
      'DoubleDown': -2,
      'NOT COMPUTABLE': 0,
      'RATE OUT OF RANGE': 0,
    };
    return trendMap[direction] || 0;
  }

  static convertDeviceStatusToReadable(status: NightscoutDeviceStatus): any {
    return {
      id: status._id,
      timestamp: new Date(status.date),
      device: status.device,
      uploaderBattery: status.uploaderBattery,
      pumpBattery: status.pump?.battery?.percent,
      pumpStatus: status.pump?.status?.status,
    };
  }

  static convertMultipleEntries(entries: NightscoutEntry[]): GlucoseReading[] {
    return entries
      .filter(entry => entry.sgv && entry.sgv > 0) // Filter out invalid readings
      .map(entry => this.convertEntryToGlucoseReading(entry))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Sort by timestamp
  }
}
