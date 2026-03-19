/**
 * engine/ladder.ts
 *
 * evaluateLadders(skillState) → LadderDecision[]
 *
 * Evaluates each calisthenics skill ladder for advancement or regression:
 *
 *   ADVANCE:  consecutive_weeks_met >= 2  AND  advancement_due = true
 *             → move to next rung (cap at max rung)
 *   REGRESS:  consecutive_sessions_failed >= 2  AND  regression_due = true
 *             → move to previous rung (floor at rung 1)
 *   NO CHANGE: neither condition met → stay at current rung
 *
 * Deload weeks: no advancement; regression still applies (safety).
 *
 * Returns one LadderDecision per ladder.
 */

import type { LadderName } from '../types/athlete.ts';
import type { SkillState } from '../types/athlete.ts';
import type { LadderDecision } from '../types/engine.ts';
import {
  LADDERS,
  LADDER_ADVANCE_CONSECUTIVE_WEEKS,
  LADDER_REGRESS_CONSECUTIVE_SESSIONS,
} from './constants.ts';

export function evaluateLadders(
  skillState: Record<LadderName, SkillState>,
  isDeload: boolean,
): LadderDecision[] {
  const decisions: LadderDecision[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [ladderKey, state] of Object.entries(skillState) as [LadderName, SkillState][]) {
    const ladder = LADDERS[ladderKey];
    const maxRung = ladder.length; // ladders are 1-indexed in content, array is 0-indexed
    const currentRung = state.current_rung;
    const currentRungData = ladder.find((r) => r.rung === currentRung);

    let newRung = currentRung;
    let change: 'advancement' | 'regression' | 'no_change' = 'no_change';
    let reason: string;
    let advanced = false;
    let regressed = false;

    if (
      !isDeload &&
      state.advancement_due &&
      state.consecutive_weeks_met >= LADDER_ADVANCE_CONSECUTIVE_WEEKS &&
      currentRung < maxRung
    ) {
      newRung = currentRung + 1;
      change = 'advancement';
      reason = `standard_met_${state.consecutive_weeks_met}_consecutive_weeks`;
      advanced = true;
    } else if (
      state.regression_due &&
      state.consecutive_sessions_failed >= LADDER_REGRESS_CONSECUTIVE_SESSIONS &&
      currentRung > 1
    ) {
      newRung = currentRung - 1;
      change = 'regression';
      reason = `failed_standard_${state.consecutive_sessions_failed}_consecutive_sessions`;
      regressed = true;
    } else if (isDeload && currentRung > 1) {
      // Deload: regress one rung temporarily (per session templates Section 12)
      newRung = currentRung - 1;
      change = 'regression';
      reason = 'deload_week_rung_regression';
      regressed = true;
    } else {
      newRung = currentRung;
      change = 'no_change';
      reason = 'no_change';
    }

    const newRungData = ladder.find((r) => r.rung === newRung) ?? currentRungData;

    decisions.push({
      ladder: ladderKey,
      change,
      from_rung: currentRung,
      to_rung: newRung,
      reason,
      consecutive_weeks_met: state.consecutive_weeks_met,
      consecutive_sessions_failed: state.consecutive_sessions_failed,
      new_movement: newRungData?.name ?? currentRungData?.name ?? '',
      new_standard: newRungData?.standard ?? currentRungData?.standard ?? '',
    });
  }

  return decisions;
}
