import {
  getMealTypeByTime,
  getSmartMealType,
  getMealOptions,
  CORRECTION_GLUCOSE_THRESHOLD_MMOL,
} from '../mealType';

const at = (hour: number) => new Date(2026, 7, 6, hour, 0, 0);

describe('meal type inference', () => {
  it('maps the time-of-day windows', () => {
    expect(getMealTypeByTime(at(7))).toBe('Breakfast');
    expect(getMealTypeByTime(at(13))).toBe('Lunch');
    expect(getMealTypeByTime(at(19))).toBe('Dinner');
    expect(getMealTypeByTime(at(2))).toBe('Dinner');
  });

  it('treats insulin-only at or above the threshold as a correction', () => {
    expect(getSmartMealType(0, 4, at(13), CORRECTION_GLUCOSE_THRESHOLD_MMOL)).toBe('Correction');
    expect(getSmartMealType(0, 4, at(13), 12)).toBe('Correction');
  });

  it('treats insulin-only below the threshold as a pre-bolus', () => {
    expect(getSmartMealType(0, 4, at(13), 8)).toBe('Pre-bolus');
  });

  it('falls back to the time window when carbs are present', () => {
    expect(getSmartMealType(30, 4, at(7), 12)).toBe('Breakfast');
  });

  it('keeps a retired category selectable when editing an old note', () => {
    expect(getMealOptions('Snack')).toContain('Snack');
    expect(getMealOptions('Lunch')).not.toContain('Snack');
  });
});
