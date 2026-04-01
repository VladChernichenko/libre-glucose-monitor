/**
 * Maps Nightscout `direction` strings to compact Unicode trend arrows.
 * (Avoid duplicating this map — bad encodings produce mojibake in the UI.)
 */
const NIGHTSCOUT_DIRECTION_ARROWS: Record<string, string> = {
  DoubleUp: '↗↗',
  SingleUp: '↗',
  FortyFiveUp: '↗',
  Flat: '→',
  FortyFiveDown: '↘',
  SingleDown: '↘',
  DoubleDown: '↘↘',
  'NOT COMPUTABLE': '→',
  'RATE OUT OF RANGE': '→',
};

export function nightscoutDirectionToArrow(direction: string | undefined | null): string {
  if (direction == null) return '→';
  const key = String(direction).trim();
  return NIGHTSCOUT_DIRECTION_ARROWS[key] ?? '→';
}

export function predictionTrendToArrow(trend: string | undefined | null): string {
  switch (trend) {
    case 'rising':
      return '↗';
    case 'falling':
      return '↘';
    default:
      return '→';
  }
}
