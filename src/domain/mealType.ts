import { MEAL_CATEGORIES } from '../types/notes';

/** At or above this glucose an insulin-only entry is a correction, not a pre-bolus. */
export const CORRECTION_GLUCOSE_THRESHOLD_MMOL = 10;

/**
 * Meal windows: Breakfast 05:00-11:00, Lunch 11:00-16:00, Dinner 16:00-05:00.
 * Dinner covers the night so every carb entry lands on a named meal.
 */
export const getMealTypeByTime = (timestamp: Date): string => {
  const hour = timestamp.getHours();

  if (hour >= 5 && hour < 11) {
    return 'Breakfast';
  } else if (hour >= 11 && hour < 16) {
    return 'Lunch';
  } else {
    return 'Dinner';
  }
};

/**
 * Smart meal type selection based on inputs and time. Insulin with no carbs is a
 * pre-bolus below the correction threshold and a correction at or above it;
 * anything else falls back to the time-of-day window.
 */
export const getSmartMealType = (
  carbs: number,
  insulin: number,
  timestamp: Date,
  glucoseValue?: number
): string => {
  if (carbs === 0 && insulin > 0) {
    return (glucoseValue ?? 0) >= CORRECTION_GLUCOSE_THRESHOLD_MMOL ? 'Correction' : 'Pre-bolus';
  }
  return getMealTypeByTime(timestamp);
};

/**
 * Selectable types: the current set, plus the note's own type when it is a
 * retired category (e.g. "Snack") so editing an old note never retags it.
 */
export const getMealOptions = (currentMeal: string): string[] =>
  (MEAL_CATEGORIES as readonly string[]).includes(currentMeal)
    ? [...MEAL_CATEGORIES]
    : [...MEAL_CATEGORIES, currentMeal];
