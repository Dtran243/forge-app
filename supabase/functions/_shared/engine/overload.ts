/**
 * engine/overload.ts
 *
 * evaluateOverload(strengthState) → LoadDecision[]
 *
 * Applies the double-progression overload rule to each tracked movement:
 *
 *   ADVANCE:  consecutive_top >= 2  AND  overload_due = true
 *             → increase load by the appropriate increment
 *   HOLD:     consecutive_fail >= 2
 *             → repeat the same load, do not increase
 *   NO CHANGE: neither condition met
 *             → carry current load forward unchanged
 *
 * Load increments (from docs/forge-engine-constants.md Section 13):
 *   Barbell upper:  +2.5 kg
 *   Barbell lower:  +5.0 kg
 *   Dumbbell:       +2.0 kg
 *
 * Returns one LoadDecision per tracked movement.
 */

import type { TrackedMovement } from '../types/athlete.ts';
import type { StrengthState } from '../types/athlete.ts';
import type { LoadDecision } from '../types/engine.ts';
import {
  OVERLOAD_CONSECUTIVE_TOP_REQUIRED,
  OVERLOAD_CONSECUTIVE_FAIL_BLOCKS,
  OVERLOAD_INCREMENT_BARBELL_UPPER_KG,
  OVERLOAD_INCREMENT_BARBELL_LOWER_KG,
  OVERLOAD_INCREMENT_DUMBBELL_KG,
} from './constants.ts';

// ── Movement classification ───────────────────────────────────────────────────

type MovementCategory = 'barbell_upper' | 'barbell_lower' | 'dumbbell';

const MOVEMENT_CATEGORY: Record<TrackedMovement, MovementCategory> = {
  deadlift:                 'barbell_lower',
  romanian_deadlift:        'barbell_lower',
  barbell_squat:            'barbell_lower',
  hack_squat:               'barbell_lower',
  barbell_bench_press:      'barbell_upper',
  dumbbell_bench_press:     'dumbbell',
  barbell_overhead_press:   'barbell_upper',
  dumbbell_overhead_press:  'dumbbell',
  barbell_row:              'barbell_upper',
  cable_row:                'dumbbell', // treat cable as dumbbell increment
  weighted_pull_up:         'barbell_upper',
  lat_pulldown:             'dumbbell',
};

function getIncrement(movement: TrackedMovement, isDeload: boolean): number {
  if (isDeload) return 0;
  const category = MOVEMENT_CATEGORY[movement];
  switch (category) {
    case 'barbell_lower': return OVERLOAD_INCREMENT_BARBELL_LOWER_KG;
    case 'barbell_upper': return OVERLOAD_INCREMENT_BARBELL_UPPER_KG;
    case 'dumbbell':      return OVERLOAD_INCREMENT_DUMBBELL_KG;
  }
}

// ── Public function ───────────────────────────────────────────────────────────

export function evaluateOverload(
  strengthState: Record<TrackedMovement, StrengthState>,
  isDeload: boolean,
): LoadDecision[] {
  const decisions: LoadDecision[] = [];

  for (const [movementKey, state] of Object.entries(strengthState) as [TrackedMovement, StrengthState][]) {
    const currentLoad = state.current_load_kg ?? 0;
    let newLoad = currentLoad;
    let reason: string;
    let overload_triggered = false;
    let load_held = false;

    if (isDeload) {
      // Deload: reduce load by 20%
      newLoad = Math.round(currentLoad * 0.80 / 2.5) * 2.5; // round to nearest 2.5
      reason = 'deload_week_load_reduction';
    } else if (state.consecutive_fail >= OVERLOAD_CONSECUTIVE_FAIL_BLOCKS) {
      // Fail streak — hold load, do not increase
      newLoad = currentLoad;
      reason = `consecutive_failures_${state.consecutive_fail}_hold_load`;
      load_held = true;
    } else if (state.overload_due && state.consecutive_top >= OVERLOAD_CONSECUTIVE_TOP_REQUIRED) {
      // Double progression triggered
      const increment = getIncrement(movementKey, false);
      newLoad = currentLoad + increment;
      reason = `double_progression_triggered_${state.consecutive_top}_sessions_at_top`;
      overload_triggered = true;
    } else {
      // No change — carry current load forward
      newLoad = currentLoad;
      reason = 'no_overload_condition_met';
    }

    decisions.push({
      movement: movementKey,
      previous_load_kg: currentLoad,
      new_load_kg: newLoad,
      reason,
      consecutive_top: state.consecutive_top,
      consecutive_fail: state.consecutive_fail,
      last_session_rpe: null, // populated by the edge function from daily_logs
      overload_triggered,
      load_held,
    });
  }

  return decisions;
}
