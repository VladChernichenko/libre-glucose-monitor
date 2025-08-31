import { GlucoseReading } from '../types/libre';

// Generate demo glucose data for development
export const generateDemoGlucoseData = (hours: number = 24): GlucoseReading[] => {
  const data: GlucoseReading[] = [];
  const now = new Date();
  
  // Generate data points every 15 minutes
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    // Generate realistic glucose values with some variation
    let baseValue = 120; // Base glucose level
    let variation = Math.sin(i * 0.5) * 40; // Sinusoidal variation
    let randomNoise = (Math.random() - 0.5) * 20; // Random noise
    
    let value = Math.round(baseValue + variation + randomNoise);
    
    // Ensure values stay within realistic bounds
    value = Math.max(60, Math.min(300, value));
    
    // Determine trend based on value changes
    let trend = 0;
    let trendArrow = '→';
    
    if (i > 0) {
      const prevValue = data[data.length - 1]?.value || value;
      const diff = value - prevValue;
      
      if (Math.abs(diff) > 10) {
        trend = diff > 0 ? 1 : -1;
        trendArrow = diff > 0 ? '↗' : '↘';
      } else if (Math.abs(diff) > 5) {
        trend = diff > 0 ? 0.5 : -0.5;
        trendArrow = diff > 0 ? '↗' : '↘';
      }
    }
    
    // Convert to mmol/L and determine status
    const mmolL = value / 18;
    let status: 'low' | 'normal' | 'high' | 'critical';
    if (mmolL < 3.9) status = 'low';
    else if (mmolL < 10.0) status = 'normal';
    else if (mmolL < 13.9) status = 'high';
    else status = 'critical';
    
    data.push({
      timestamp,
      value: mmolL,
      trend,
      trendArrow,
      status,
      unit: 'mmol/L',
      originalTimestamp: timestamp,
    });
  }
  
  return data;
};

// Generate current demo reading
export const generateCurrentDemoReading = (): GlucoseReading => {
  const now = new Date();
  const baseValue = 120;
  const variation = Math.sin(now.getHours() * 0.5) * 30;
  const randomNoise = (Math.random() - 0.5) * 15;
  
  let value = Math.round(baseValue + variation + randomNoise);
  value = Math.max(60, Math.min(300, value));
  
  // Convert to mmol/L and determine status
  const mmolL = value / 18;
  let status: 'low' | 'normal' | 'high' | 'critical';
  if (mmolL < 3.9) status = 'low';
  else if (mmolL < 10.0) status = 'normal';
  else if (mmolL < 13.9) status = 'high';
  else status = 'critical';
  
  return {
    timestamp: now,
    value: mmolL,
    trend: Math.random() > 0.5 ? 1 : -1,
    trendArrow: Math.random() > 0.5 ? '↗' : '↘',
    status,
    unit: 'mmol/L',
    originalTimestamp: now, // Add missing property
  };
};

// Demo patient data
export const demoPatient = {
  id: 'demo-patient-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
};

// Demo connections
export const demoConnections = [
  {
    id: 'demo-sensor-001',
    patientId: 'demo-patient-123',
    status: 'active' as const,
    lastSync: new Date().toISOString(),
  },
  {
    id: 'demo-sensor-002',
    patientId: 'demo-patient-123',
    status: 'inactive' as const,
    lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];
