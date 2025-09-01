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

// Generate 10 test glucose readings for 24h chart testing
export const generateTestGlucoseData = (): GlucoseReading[] => {
  const now = new Date();
  const testData: GlucoseReading[] = [];
  
  // 10 specific test points over 24 hours with various patterns
  const testValues = [
    { hoursAgo: 23, value: 5.5, description: 'Normal start' },
    { hoursAgo: 20, value: 3.2, description: 'Low minimum' },
    { hoursAgo: 18, value: 7.8, description: 'Recovery peak' },
    { hoursAgo: 15, value: 6.2, description: 'Normal valley' },
    { hoursAgo: 12, value: 12.5, description: 'High maximum' },
    { hoursAgo: 9, value: 8.9, description: 'Normal descent' },
    { hoursAgo: 6, value: 4.1, description: 'Low valley' },
    { hoursAgo: 4, value: 9.8, description: 'Normal peak' },
    { hoursAgo: 2, value: 7.2, description: 'Current descent' },
    { hoursAgo: 0, value: 6.8, description: 'Current level' }
  ];
  
  testValues.forEach((test, index) => {
    const timestamp = new Date(now.getTime() - test.hoursAgo * 60 * 60 * 1000);
    
    // Determine trend based on previous value
    let trend = 0;
    let trendArrow = '→';
    
    if (index > 0) {
      const prevValue = testValues[index - 1].value;
      const diff = test.value - prevValue;
      
      if (diff > 1) {
        trend = 1;
        trendArrow = '↗';
      } else if (diff < -1) {
        trend = -1;
        trendArrow = '↘';
      }
    }
    
    // Determine status based on value
    let status: 'low' | 'normal' | 'high' | 'critical';
    if (test.value < 3.9) status = 'low';
    else if (test.value < 10.0) status = 'normal';
    else if (test.value < 13.9) status = 'high';
    else status = 'critical';
    
    testData.push({
      timestamp,
      value: test.value,
      trend,
      trendArrow,
      status,
      unit: 'mmol/L',
      originalTimestamp: timestamp,
    });
  });
  
  return testData.reverse(); // Reverse to get chronological order
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
