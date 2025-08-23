export interface GlucoseNote {
  id: string;
  timestamp: Date;
  carbs: number;
  insulin: number;
  meal: string;
  comment?: string;
  glucoseValue?: number;
  detailedInput?: string; // Detailed input text (e.g., "50g soup 20g bread 7u")
  insulinDose?: InsulinDose; // Insulin dose information for tracking
}

export interface NoteInputData {
  timestamp: Date;
  carbs: number;
  insulin: number;
  meal: string;
  comment?: string;
  glucoseValue?: number;
  detailedInput?: string; // Detailed input text (e.g., "50g soup 20g bread 7u")
  insulinDose?: InsulinDose; // Insulin dose information for tracking
}

// Insulin dose tracking
export interface InsulinDose {
  id: string;
  timestamp: Date;
  units: number;
  type: 'bolus' | 'correction' | 'basal';
  note?: string;
  mealType?: string; // Associated meal type
}

export const MEAL_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Correction',
  'Other'
] as const;

export type MealCategory = typeof MEAL_CATEGORIES[number];
