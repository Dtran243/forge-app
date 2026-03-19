/**
 * exercises.ts — shared data for Supabase Edge Functions
 *
 * Exercise metadata: timed hold detection.
 */

export const TIMED_HOLD_MOVEMENTS = new Set([
  'Hollow body hold',
  'Tuck L-sit (floor)',
  'L-sit (floor)',
  'L-sit (parallettes)',
  'Tuck V-sit',
  'V-sit',
  'Manna progression',
]);

export function isTimedHold(movementName: string): boolean {
  return TIMED_HOLD_MOVEMENTS.has(movementName);
}
