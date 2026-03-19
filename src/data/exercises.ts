/**
 * exercises.ts
 *
 * Exercise metadata: timed hold detection.
 * Used by the session generator and active session UI to distinguish timed
 * hold exercises (L-sit progressions, hollow body) from rep-based movements.
 */

/**
 * Exercises covered by forge-exercise-technique.md.
 * Only these exercises show the "Cue" button in the active session.
 */
export const EXERCISES_WITH_CUES = new Set([
  // Primary compounds
  'Deadlift',
  'Romanian deadlift',
  'Barbell squat',
  'Barbell bench press',
  'Barbell overhead press',
  'Barbell row',
  'Weighted pull-up',
  // Pull ladder
  'Band-assisted pull-up',
  'Pull-up',
  'L-sit pull-up',
  'Archer pull-up',
  'One-arm negative',
  // Push ladder
  'Incline push-up',
  'Push-up',
  'Diamond push-up',
  'Archer push-up',
  'Pseudo planche push-up',
  'Ring push-up',
  'Ring dip',
  'Weighted ring dip',
  // Core ladder
  'Hollow body hold',
  'Tuck L-sit (floor)',
  'L-sit (floor)',
  'L-sit (parallettes)',
  'Tuck V-sit',
  'V-sit',
  'Manna progression',
]);

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

/**
 * Completion standard for each calisthenics ladder movement.
 * Mirrors the LADDERS constant in engine/constants.ts — kept here so UI
 * components can look up standards without importing engine files (Metro
 * bundler doesn't handle the .ts extension imports in engine/constants.ts).
 */
export const CALISTHENICS_STANDARDS: Record<string, string> = {
  // Push ladder
  'Incline push-up':          '3x12 RIR2',
  'Push-up':                  '3x15 RIR2',
  'Diamond push-up':          '3x12 RIR2',
  'Archer push-up':           '3x8 each RIR2',
  'Pseudo planche push-up':   '3x8 RIR2',
  'Ring push-up':             '3x10 RIR2',
  'Ring dip':                 '3x8 RIR2',
  'Weighted ring dip':        '3x6 +10kg RIR2',
  // Pull ladder
  'Band-assisted pull-up':    '3x10 RIR2',
  'Pull-up':                  '3x8 RIR2',
  'Weighted pull-up':         '3x6 +10kg RIR2',
  'L-sit pull-up':            '3x5 RIR2',
  'Archer pull-up':           '3x4 each RIR2',
  'Weighted pull-up +20kg':   '3x5 RIR2',
  'One-arm negative':         '3x3 each controlled',
  // Core ladder (timed)
  'Hollow body hold':         '3x30s',
  'Tuck L-sit (floor)':       '3x20s',
  'L-sit (floor)':            '3x15s',
  'L-sit (parallettes)':      '3x20s',
  'Tuck V-sit':               '3x10s',
  'V-sit':                    '3x10s',
  'Manna progression':        '3x5s',
  // Squat ladder
  'Assisted pistol squat':    '3x8 each RIR2',
  'Shrimp squat':             '3x6 each RIR2',
  'Pistol squat':             '3x5 each RIR2',
  'Weighted pistol squat':    '3x4 each +10kg RIR2',
  'Nordic curl':              '3x5 RIR2',
  'Weighted Nordic curl':     '3x5 +10kg RIR2',
};
