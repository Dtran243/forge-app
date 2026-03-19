/**
 * test-engine.ts — quick smoke test for the Forge engine
 *
 * Run with:  deno run test-engine.ts
 *
 * No Supabase connection needed. Uses a realistic mock snapshot.
 */

import { runEngine } from './supabase/functions/_shared/engine/index.ts';
import type { EngineInputSnapshot } from './supabase/functions/_shared/types/engine.ts';

// ── Mock snapshot ──────────────────────────────────────────────────────────────

const snapshot: EngineInputSnapshot = {
  athlete: {
    user_id: 'test-user',
    training_age: 'athlete',
    phase: 'build',
    bodyweight_kg: 82,
    max_hr_bpm: 192,
    hrv_baseline_ms: null, // < 30 days — HRV not factored into gate
    equipment_json: {
      barbell_rack: true,
      dumbbells: true,
      cable_machine: true,
      pull_up_bar: true,
      rings: false,
      parallettes: false,
    },
    onboarding_complete: true,
  },
  mesocycle: {
    user_id: 'test-user',
    cycle_number: 1,
    current_week: 1, // first week of first cycle
    week_type: 'loading',
    mev_increment_applied: 0,
    deload_triggered_early: false,
    deload_trigger_reason: null,
    travel_mode_active: false,
    travel_mode_start_date: null,
    travel_mode_end_date: null,
  },
  strength: {
    barbell_bench_press: {
      user_id: 'test-user',
      movement_name: 'barbell_bench_press',
      current_load_kg: 80,
      current_rep_range: '4-6',
      consecutive_top: 2, // overload should trigger
      consecutive_fail: 0,
      overload_due: true,
      pr_kg: 80,
      active_substitute: null,
    },
    barbell_squat: {
      user_id: 'test-user',
      movement_name: 'barbell_squat',
      current_load_kg: 100,
      current_rep_range: '4-6',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 100,
      active_substitute: null,
    },
    deadlift: {
      user_id: 'test-user',
      movement_name: 'deadlift',
      current_load_kg: 130,
      current_rep_range: '4-6',
      consecutive_top: 1,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 130,
      active_substitute: null,
    },
    weighted_pull_up: {
      user_id: 'test-user',
      movement_name: 'weighted_pull_up',
      current_load_kg: 20,
      current_rep_range: '4-6',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 20,
      active_substitute: null,
    },
    barbell_overhead_press: {
      user_id: 'test-user',
      movement_name: 'barbell_overhead_press',
      current_load_kg: 60,
      current_rep_range: '4-6',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 60,
      active_substitute: null,
    },
    barbell_row: {
      user_id: 'test-user',
      movement_name: 'barbell_row',
      current_load_kg: 80,
      current_rep_range: '4-6',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 80,
      active_substitute: null,
    },
    romanian_deadlift: {
      user_id: 'test-user',
      movement_name: 'romanian_deadlift',
      current_load_kg: 80,
      current_rep_range: '8-12',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 80,
      active_substitute: null,
    },
    hack_squat: {
      user_id: 'test-user',
      movement_name: 'hack_squat',
      current_load_kg: 60,
      current_rep_range: '8-12',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 60,
      active_substitute: null,
    },
    dumbbell_bench_press: {
      user_id: 'test-user',
      movement_name: 'dumbbell_bench_press',
      current_load_kg: 30,
      current_rep_range: '8-12',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 30,
      active_substitute: null,
    },
    dumbbell_overhead_press: {
      user_id: 'test-user',
      movement_name: 'dumbbell_overhead_press',
      current_load_kg: 22,
      current_rep_range: '8-12',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 22,
      active_substitute: null,
    },
    cable_row: {
      user_id: 'test-user',
      movement_name: 'cable_row',
      current_load_kg: 70,
      current_rep_range: '8-12',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 70,
      active_substitute: null,
    },
    lat_pulldown: {
      user_id: 'test-user',
      movement_name: 'lat_pulldown',
      current_load_kg: 70,
      current_rep_range: '8-12',
      consecutive_top: 0,
      consecutive_fail: 0,
      overload_due: false,
      pr_kg: 70,
      active_substitute: null,
    },
  },
  volume: {
    current_week_sets: {
      chest: 10, back: 10, shoulders: 8, biceps: 6, triceps: 6,
      quads: 8, hamstrings: 6, glutes: 6, calves: 8, core: 6,
    },
    target_sets_this_week: {
      chest: 10, back: 10, shoulders: 8, biceps: 6, triceps: 6,
      quads: 8, hamstrings: 6, glutes: 6, calves: 8, core: 6,
    },
    volume_completion_pct_last_week: {
      chest: 1.0, back: 1.0, shoulders: 1.0, biceps: 1.0, triceps: 1.0,
      quads: 0.9, hamstrings: 0.9, glutes: 1.0, calves: 0.8, core: 1.0,
    },
  },
  skill: {
    push_ladder: {
      user_id: 'test-user',
      ladder_name: 'push_ladder',
      current_rung: 2,
      current_movement: 'Push-up',
      current_standard: '3x15 RIR2',
      consecutive_weeks_met: 2,
      consecutive_sessions_failed: 0,
      advancement_due: true,
      regression_due: false,
      last_advancement_date: null,
      last_regression_date: null,
    },
    pull_ladder: {
      user_id: 'test-user',
      ladder_name: 'pull_ladder',
      current_rung: 2,
      current_movement: 'Pull-up',
      current_standard: '3x8 RIR2',
      consecutive_weeks_met: 1,
      consecutive_sessions_failed: 0,
      advancement_due: false,
      regression_due: false,
      last_advancement_date: null,
      last_regression_date: null,
    },
    core_ladder: {
      user_id: 'test-user',
      ladder_name: 'core_ladder',
      current_rung: 1,
      current_movement: 'Hollow body hold',
      current_standard: '3x30s',
      consecutive_weeks_met: 0,
      consecutive_sessions_failed: 0,
      advancement_due: false,
      regression_due: false,
      last_advancement_date: null,
      last_regression_date: null,
    },
    squat_ladder: {
      user_id: 'test-user',
      ladder_name: 'squat_ladder',
      current_rung: 1,
      current_movement: 'Assisted pistol squat',
      current_standard: '3x8 each RIR2',
      consecutive_weeks_met: 0,
      consecutive_sessions_failed: 0,
      advancement_due: false,
      regression_due: false,
      last_advancement_date: null,
      last_regression_date: null,
    },
  },
  cardio: {
    user_id: 'test-user',
    week_starting: '2026-03-16',
    zone2_minutes: 180,
    zone2_target: 180,
    intervals_completed: true,
    pillar_score: null,
  },
  mobility: {
    sessions_completed_this_week: 1,
    sessions_planned_this_week: 1,
    embedded_work_completed_this_week: 3,
    embedded_work_sessions_this_week: 4,
    current_rotation_area: 'hip_flexor',
    next_rotation_area: 'thoracic_rotation',
    rotation_week: 1,
    subjective_flexibility_trend: 'stable',
    mobility_pillar_score_last_week: 75,
  },
  recovery: {
    hrv_readings_7d: [],
    hrv_baseline_30d: null,
    hrv_trend_7d_vs_baseline_pct: null,
    sleep_hours_7d: [7.5, 8.0, 7.0, 7.5, 8.0, 7.5, 7.0],
    sleep_avg_7d: 7.5,
    soreness_ratings_7d: [2, 2, 3, 2, 2, 1, 2],
    soreness_avg_7d: 2.0,
    consecutive_days_hrv_below_amber: 0,
    consecutive_days_below_sleep_amber: 0,
    current_gate: 'green',
    gate_override_active: false,
    gate_override_expires_date: null,
  },
  session_logs_this_week: [],
  daily_logs_7d: [],
};

// ── Run engine ─────────────────────────────────────────────────────────────────

console.log('Running engine...\n');
const output = runEngine(snapshot);

console.log('=== GATE ===');
console.log(`Colour: ${output.gate_evaluation.gate_colour}`);
console.log(`Signals: HRV=${output.gate_evaluation.signals.hrv_signal} Sleep=${output.gate_evaluation.signals.sleep_signal} Soreness=${output.gate_evaluation.signals.soreness_signal}`);
console.log(`Deload recommended: ${output.gate_evaluation.deload_recommended}`);

console.log('\n=== PILLAR SCORES ===');
console.log(`Strength: ${output.pillar_scores.strength_score}`);
console.log(`Skill:    ${output.pillar_scores.skill_score}`);
console.log(`Cardio:   ${output.pillar_scores.cardio_score}`);
console.log(`Mobility: ${output.pillar_scores.mobility_score}`);

console.log('\n=== LOAD DECISIONS (overload triggered) ===');
for (const d of output.load_decisions.filter((d) => d.overload_triggered)) {
  console.log(`  ${d.movement}: ${d.previous_load_kg}kg → ${d.new_load_kg}kg (${d.reason})`);
}
if (output.load_decisions.filter((d) => d.overload_triggered).length === 0) {
  console.log('  (none this week)');
}

console.log('\n=== LADDER DECISIONS (changes only) ===');
for (const d of output.ladder_decisions.filter((d) => d.from_rung !== d.to_rung)) {
  console.log(`  ${d.ladder}: rung ${d.from_rung} → ${d.to_rung} (${d.change}) — ${d.new_movement}`);
}
if (output.ladder_decisions.filter((d) => d.from_rung !== d.to_rung).length === 0) {
  console.log('  (no changes)');
}

console.log('\n=== VOLUME TARGETS (next week) ===');
for (const d of output.volume_decisions) {
  const change = d.new_target_sets !== d.previous_target_sets
    ? ` (${d.new_target_sets > d.previous_target_sets ? '+' : ''}${d.new_target_sets - d.previous_target_sets})`
    : '';
  console.log(`  ${d.muscle_group.padEnd(12)}: ${d.previous_target_sets} → ${d.new_target_sets}${change}`);
}

console.log('\n=== SESSION PLAN ===');
console.log(`Week: ${output.session_plan.week_starting} to ${output.session_plan.week_ending}`);
console.log(`Type: ${output.session_plan.week_type} | Days: ${output.session_plan.days_programmed}`);
for (const s of output.session_plan.sessions) {
  console.log(`  ${s.day_of_week.padEnd(10)} ${s.session_type} (${s.estimated_duration_minutes}min) — ${s.exercises.length} exercises`);
  for (const e of s.exercises.slice(0, 3)) {
    const sets = e.sets[0];
    const load = sets?.load_kg ? ` @ ${sets.load_kg}kg` : '';
    console.log(`    - ${e.name} ${e.sets.length}×${sets?.target_reps_min}–${sets?.target_reps_max}${load}`);
  }
  if (s.exercises.length > 3) console.log(`    ... +${s.exercises.length - 3} more`);
}

console.log('\n=== FLAGS ===');
for (const f of output.flags) {
  console.log(`  ⚑ ${f}`);
}
if (output.flags.length === 0) console.log('  (none)');

console.log('\n✓ Engine run complete');
