export interface GlucoseNote {
  id: string;                    // Unique identifier for CRUD operations
  timestamp: Date;              // When the note was created (positioned on timeline)
  carbs: number;                // Carbs in grams
  insulin: number;              // Insulin dose in units
  meal: string;                 // Meal type
  comment?: string;             // Optional additional notes
  glucoseValue?: number;        // Optional: glucose reading when note was created
  detailedInput?: string;       // Detailed input text (e.g., "50g soup 20g bread 7u")
}

export interface NoteInputData {
  timestamp: Date;
  carbs: number;
  insulin: number;
  meal: string;
  comment?: string;
  glucoseValue?: number;
  detailedInput?: string;       // Detailed input text (e.g., "50g soup 20g bread 7u")
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
