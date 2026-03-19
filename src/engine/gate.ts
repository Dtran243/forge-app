/**
 * engine/gate.ts
 *
 * evaluateRecoveryGate(snapshot) → GateEvaluationOutput
 *
 * Evaluates the three recovery signals (HRV, sleep, soreness) independently,
 * then combines them into a single gate colour per the rules in
 * docs/forge-engine-constants.md Section 11.
 *
 * Rules:
 *   RED   = any signal is red  OR  all three signals are amber
 *   AMBER = 1–2 signals are amber, none are red
 *   GREEN = all signals are green
 *
 * HRV signal is skipped (treated as green) when baseline has not yet
 * been established (< 30 days of data → hrv_baseline_30d is null).
 */

import type { RecoverySnapshot } from '../types/engine.ts';
import type { GateColour } from '../types/athlete.ts';
import type { GateEvaluationOutput, GateSignalDetail } from '../types/engine.ts';
import {
  HRV_AMBER_THRESHOLD_PCT,
  HRV_CONSECUTIVE_DAYS_FOR_RED,
  SORENESS_GREEN_MAX,
  SORENESS_AMBER,
  SORENESS_RED,
  SLEEP_GREEN_HOURS,
  SLEEP_AMBER_HOURS,
  SLEEP_CONSECUTIVE_DAYS_FOR_RED,
} from './constants.ts';

// ── Signal evaluators ─────────────────────────────────────────────────────────

function evaluateHrvSignal(snapshot: RecoverySnapshot): GateColour {
  // No baseline yet — HRV signal is not included in gate calculation
  if (snapshot.hrv_baseline_30d === null || snapshot.hrv_trend_7d_vs_baseline_pct === null) {
    return 'green';
  }

  const trend = snapshot.hrv_trend_7d_vs_baseline_pct;

  // > 10% below baseline for 3+ consecutive days = RED
  if (
    trend < HRV_AMBER_THRESHOLD_PCT &&
    snapshot.consecutive_days_hrv_below_amber >= HRV_CONSECUTIVE_DAYS_FOR_RED
  ) {
    return 'red';
  }

  // Any amount below baseline threshold = AMBER
  if (trend < HRV_AMBER_THRESHOLD_PCT) {
    return 'amber';
  }

  return 'green';
}

function evaluateSorenessSignal(snapshot: RecoverySnapshot): GateColour {
  // Use the most recent soreness reading
  const latest = snapshot.soreness_ratings_7d[snapshot.soreness_ratings_7d.length - 1];
  if (latest === undefined) return 'green';

  if (latest >= SORENESS_RED) return 'red';
  if (latest >= SORENESS_AMBER) return 'amber';
  return 'green';
}

function evaluateSleepSignal(snapshot: RecoverySnapshot): GateColour {
  const avg = snapshot.sleep_avg_7d;

  // < 6h average for 5+ consecutive days = RED
  if (
    avg < SLEEP_AMBER_HOURS &&
    snapshot.consecutive_days_below_sleep_amber >= SLEEP_CONSECUTIVE_DAYS_FOR_RED
  ) {
    return 'red';
  }

  // < 6h average = RED (immediate, even without consecutive streak)
  if (avg < SLEEP_AMBER_HOURS) return 'red';

  // 6–7h = AMBER
  if (avg < SLEEP_GREEN_HOURS) return 'amber';

  return 'green';
}

// ── Gate combiner ─────────────────────────────────────────────────────────────

function combineSignals(
  hrv: GateColour,
  sleep: GateColour,
  soreness: GateColour,
): GateColour {
  const signals = [hrv, sleep, soreness];

  // Any red → RED
  if (signals.includes('red')) return 'red';

  // All three amber → RED
  const amberCount = signals.filter((s) => s === 'amber').length;
  if (amberCount === 3) return 'red';

  // 1–2 amber → AMBER
  if (amberCount > 0) return 'amber';

  return 'green';
}

// ── Public function ───────────────────────────────────────────────────────────

export function evaluateRecoveryGate(snapshot: RecoverySnapshot): GateEvaluationOutput {
  const hrv_signal = evaluateHrvSignal(snapshot);
  const sleep_signal = evaluateSleepSignal(snapshot);
  const soreness_signal = evaluateSorenessSignal(snapshot);

  const gate_colour = combineSignals(hrv_signal, sleep_signal, soreness_signal);

  const signals: GateSignalDetail = {
    hrv_signal,
    sleep_signal,
    soreness_signal,
    hrv_trend_pct: snapshot.hrv_trend_7d_vs_baseline_pct,
    sleep_avg_7d: snapshot.sleep_avg_7d,
    soreness_avg_7d: snapshot.soreness_avg_7d,
  };

  const deload_recommended = gate_colour === 'amber' || gate_colour === 'red';

  // Deload is skippable only for amber gate AND the athlete hasn't already
  // used their one permitted consecutive skip
  const deload_skippable =
    gate_colour === 'amber' && !snapshot.gate_override_active;

  return {
    gate_colour,
    signals,
    deload_recommended,
    deload_skippable,
  };
}
