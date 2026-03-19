# FORGE — Athlete State Schema
# Version: 1.0.0
# Purpose: Defines the structure of athlete state data built from real training logs.
#          This is the memory layer of the engine. Every adaptation decision —
#          load progression, volume changes, ladder advancement, recovery gating —
#          is driven by what this state contains.
#
# State is not entered manually. It is derived from:
#   - Daily check-in (soreness, sleep, HRV)
#   - Session logging (exercises completed, loads, reps, RPE per set)
#   - Cardio logging (session type, duration, average HR, perceived zone)
#   - Weekly engine run (reads state → generates program → writes decisions back)
#
# The engine receives the full state object on each weekly generation call.
# It reads current values, applies the adaptation rules from forge-engine-constants.md,
# and writes its decisions back into the state for the following week.

---

## 1. Athlete Profile (static — set at onboarding, updated manually)

```json
{
  "athlete": {
    "training_age": "athlete",
    "phase": "build",
    "bodyweight_kg": null,
    "height_cm": null,
    "age": null,
    "max_hr_bpm": null,
    "hrv_baseline_ms": null,
    "onboarding_date": null
  }
}
```

Field notes:
- `training_age`: maps to engine constant modifier ("beginner" | "intermediate" | "athlete")
- `phase`: current nutritional/training phase ("build" | "lean" | "maintain")
- `max_hr_bpm`: used to calculate Zone 2 and VO2 max HR ceilings. Derive from 220 - age as default, update from observed max during 4x4 session.
- `hrv_baseline_ms`: 30-day rolling baseline. Engine updates this automatically. Null until 30 days of data exists — recovery gate uses soreness + sleep only until baseline is established.

---

## 2. Current Mesocycle State

Tracks where the athlete is within the current 4-week block.

```json
{
  "mesocycle": {
    "cycle_number": 1,
    "current_week": 1,
    "week_type": "loading",
    "loading_weeks_completed": 0,
    "deload_triggered_early": false,
    "deload_trigger_reason": null,
    "mev_increment_applied": 0
  }
}
```

Field notes:
- `current_week`: 1–4. Week 4 is always deload unless `deload_triggered_early` is true (red gate).
- `week_type`: "loading" | "deload"
- `mev_increment_applied`: running count of MEV +1 set additions across completed cycles. Caps when MRV - MAV < 2 sets.

---

## 3. Strength State — Per Movement

One entry per compound movement in the current program. Tracks load, progression status, and recent performance.

```json
{
  "strength_state": {
    "deadlift": {
      "current_load_kg": null,
      "current_rep_range": "4-6",
      "last_session_reps_completed": null,
      "last_session_rpe": null,
      "consecutive_sessions_at_top_of_range": 0,
      "consecutive_sessions_below_bottom_of_range": 0,
      "overload_due": false,
      "last_overload_date": null,
      "pr_kg": null,
      "pr_date": null,
      "active_substitute": null
    },
    "romanian_deadlift": { "...": "same structure" },
    "barbell_squat": { "...": "same structure" },
    "hack_squat": { "...": "same structure" },
    "barbell_bench_press": { "...": "same structure" },
    "dumbbell_bench_press": { "...": "same structure" },
    "barbell_overhead_press": { "...": "same structure" },
    "dumbbell_overhead_press": { "...": "same structure" },
    "barbell_row": { "...": "same structure" },
    "cable_row": { "...": "same structure" },
    "weighted_pull_up": { "...": "same structure" },
    "lat_pulldown": { "...": "same structure" }
  }
}
```

Field notes:
- `consecutive_sessions_at_top_of_range`: increments when athlete hits top of rep range at RPE ≤ 7. Resets to 0 if not hit. When this reaches 2, `overload_due` is set to true.
- `consecutive_sessions_below_bottom_of_range`: increments when reps completed < rep range minimum. When this reaches 2, engine holds load (does not increase and does not decrease — athlete repeats the weight).
- `active_substitute`: populated when athlete has swapped this movement for a substitute from forge-substitutions.md. Engine uses substitute name for session generation until cleared.
- `pr_kg`: all-time best load at which the athlete completed at least the minimum reps of the current rep range. Updated automatically when exceeded.

---

## 4. Volume State — Per Muscle Group Per Week

Tracks current weekly set count per muscle group. Engine reads this to determine where in the MEV → MAV progression the athlete sits and whether volume should increase, hold, or reduce.

```json
{
  "volume_state": {
    "current_week_sets": {
      "chest": 0,
      "back": 0,
      "shoulders": 0,
      "biceps": 0,
      "triceps": 0,
      "quads": 0,
      "hamstrings": 0,
      "glutes": 0,
      "calves": 0,
      "core": 0
    },
    "target_sets_this_week": {
      "chest": null,
      "back": null,
      "shoulders": null,
      "biceps": null,
      "triceps": null,
      "quads": null,
      "hamstrings": null,
      "glutes": null,
      "calves": null,
      "core": null
    },
    "volume_completion_pct_last_week": {
      "chest": null,
      "back": null,
      "shoulders": null,
      "biceps": null,
      "triceps": null,
      "quads": null,
      "hamstrings": null,
      "glutes": null,
      "calves": null,
      "core": null
    }
  }
}
```

Field notes:
- `current_week_sets`: accumulates in real time as sessions are logged. Resets at the start of each new week.
- `target_sets_this_week`: set by the engine at the start of each week based on current mesocycle week and pillar score.
- `volume_completion_pct_last_week`: prior week's actual vs target. Used by pillar scoring (strength_score_weight_completion).

---

## 5. Calisthenics Skill State — Per Ladder

One entry per skill pattern. Tracks current rung, recent completion, and advancement readiness.

```json
{
  "skill_state": {
    "push_ladder": {
      "current_rung": 1,
      "current_movement": "Incline push-up",
      "current_standard": "3x12 RIR2",
      "consecutive_weeks_meeting_standard": 0,
      "consecutive_sessions_failing_standard": 0,
      "advancement_due": false,
      "regression_due": false,
      "last_advancement_date": null,
      "last_regression_date": null
    },
    "pull_ladder": { "...": "same structure" },
    "core_ladder": { "...": "same structure" },
    "squat_ladder": { "...": "same structure" }
  }
}
```

Field notes:
- `consecutive_weeks_meeting_standard`: increments when standard is hit with RIR ≥ 2 for the week. Requires 2 to trigger `advancement_due`.
- `consecutive_sessions_failing_standard`: increments when minimum reps not achieved. Requires 2 to trigger `regression_due`. Resets if standard is met.
- Advancement and regression flags are read by the engine at weekly generation. The engine then updates `current_rung`, `current_movement`, and `current_standard` accordingly.

---

## 6. Cardio State

Tracks weekly cardio volume and fitness trend.

```json
{
  "cardio_state": {
    "zone2_minutes_this_week": 0,
    "zone2_minutes_last_week": 0,
    "zone2_target_this_week": 180,
    "intervals_completed_this_week": false,
    "intervals_completed_last_week": false,
    "sessions_completed_this_week": 0,
    "sessions_planned_this_week": 0,
    "avg_zone2_hr_last_session": null,
    "estimated_vo2max": null,
    "vo2max_trend": null,
    "cardio_pillar_score_last_week": null
  }
}
```

Field notes:
- `avg_zone2_hr_last_session`: used to verify athlete is staying within Zone 2 HR ceiling (75% HRmax). If consistently above ceiling, engine flags it in coaching report.
- `estimated_vo2max`: optional. Populate from Garmin/device estimate if available. Used for cardio pillar scoring context, not for gate logic.
- `vo2max_trend`: "improving" | "stable" | "declining" | null. Derived from 4-week rolling estimate if data available.

---

## 7. Mobility State

```json
{
  "mobility_state": {
    "sessions_completed_this_week": 0,
    "sessions_planned_this_week": 1,
    "embedded_work_completed_this_week": 0,
    "embedded_work_sessions_this_week": 0,
    "current_rotation_area": "hip_flexor",
    "next_rotation_area": "thoracic_rotation",
    "rotation_week": 1,
    "subjective_flexibility_trend": null,
    "mobility_pillar_score_last_week": null
  }
}
```

Field notes:
- `rotation_week`: 1 or 2 within the 2-week mobility rotation cycle.
- `subjective_flexibility_trend`: athlete self-reports at weekly check-in ("improving" | "stable" | "declining"). One of the inputs to mobility pillar score.

---

## 8. Recovery State

Built from daily check-ins. Engine reads the 7-day rolling window at weekly generation time.

```json
{
  "recovery_state": {
    "hrv_readings_7d": [],
    "hrv_baseline_30d": null,
    "hrv_trend_7d_vs_baseline_pct": null,
    "sleep_hours_7d": [],
    "sleep_avg_7d": null,
    "soreness_ratings_7d": [],
    "soreness_avg_7d": null,
    "consecutive_days_hrv_below_amber": 0,
    "consecutive_days_below_sleep_amber": 0,
    "current_gate": "green",
    "gate_override_active": false,
    "gate_override_expires_date": null
  }
}
```

Field notes:
- `hrv_readings_7d` / `sleep_hours_7d` / `soreness_ratings_7d`: arrays of 7 daily values (most recent last). Engine computes averages and applies gate thresholds from Section 11 of engine constants.
- `consecutive_days_hrv_below_amber`: engine increments daily. Red gate requires 3 consecutive days below threshold.
- `current_gate`: "green" | "amber" | "red". Written by the engine each day after check-in. Session generation uses this value.
- `gate_override_active`: true when athlete has invoked the amber skip (allowed once per deload recommendation). The engine records this and blocks a second consecutive skip.

---

## 9. Daily Check-in Log

Each day appends one entry. Used to populate recovery arrays and session RPE history.

```json
{
  "daily_log": [
    {
      "date": "YYYY-MM-DD",
      "soreness_rating": null,
      "sleep_hours": null,
      "hrv_ms": null,
      "session_logged": false,
      "session_type": null,
      "session_rpe": null,
      "notes": null
    }
  ]
}
```

Field notes:
- `session_type`: "strength_calisthenics" | "zone2" | "intervals" | "mobility" | "rest"
- `session_rpe`: 1–10 collected as a single tap after session completion. Feeds into pillar scoring and recovery gate.
- `notes`: free text. Passed verbatim to coaching report context if populated — the AI can reference a specific athlete note ("felt sharp lower back tightness") in its report.

---

## 10. Weekly Pillar Scores (computed at end of each week)

The engine computes these at weekly generation and writes them into state for the coaching report and next-week planning.

```json
{
  "pillar_scores": {
    "history": [
      {
        "week_ending_date": "YYYY-MM-DD",
        "mesocycle_week": 1,
        "strength_score": null,
        "skill_score": null,
        "cardio_score": null,
        "mobility_score": null,
        "recovery_gate": "green",
        "days_trained": null,
        "coaching_report_generated": false
      }
    ]
  }
}
```

---

## 11. Session Log (per completed session)

Each completed session appends one entry. This is the source of truth for strength state updates, volume tracking, and pillar scoring.

```json
{
  "session_log": [
    {
      "date": "YYYY-MM-DD",
      "session_type": "strength_calisthenics",
      "session_rpe": null,
      "recovery_gate_at_time_of_session": "green",
      "duration_minutes": null,
      "exercises": [
        {
          "name": "Deadlift",
          "pattern": "hinge",
          "tier": "primary",
          "sets": [
            {
              "set_number": 1,
              "load_kg": null,
              "reps_completed": null,
              "rir_reported": null,
              "rpe_reported": null
            }
          ],
          "substitute_used": false,
          "substitute_name": null,
          "substitute_reason": null
        }
      ],
      "cardio": null,
      "mobility": null
    }
  ]
}
```

Cardio session structure (used when `session_type` is "zone2" or "intervals"):
```json
{
  "cardio": {
    "type": "zone2",
    "duration_minutes": null,
    "avg_hr_bpm": null,
    "max_hr_bpm": null,
    "distance_km": null,
    "modality": null
  }
}
```
- `modality`: "cycling" | "running" | "rowing" | "walk" | "elliptical"

Mobility session structure:
```json
{
  "mobility": {
    "area_trained": "hip_flexor",
    "session_duration_minutes": null,
    "embedded": false,
    "subjective_quality": null
  }
}
```

---

## 12. Engine Decision Log

The engine writes its decisions here at each weekly generation. This creates an audit trail that the AI can reference in the coaching report (e.g. "volume was reduced because..." / "overload triggered on deadlift because...").

```json
{
  "engine_decisions": [
    {
      "date_generated": "YYYY-MM-DD",
      "mesocycle_week": 2,
      "recovery_gate": "green",
      "volume_changes": [
        {
          "muscle_group": "chest",
          "previous_target_sets": 10,
          "new_target_sets": 11,
          "reason": "week_2_progression"
        }
      ],
      "load_changes": [
        {
          "movement": "Deadlift",
          "previous_load_kg": 100,
          "new_load_kg": 105,
          "reason": "double_progression_triggered"
        }
      ],
      "ladder_changes": [
        {
          "ladder": "push_ladder",
          "change": "advancement",
          "from_rung": 3,
          "to_rung": 4,
          "reason": "standard_met_2_consecutive_weeks"
        }
      ],
      "days_programmed": 5,
      "deload_triggered": false,
      "flags": []
    }
  ]
}
```

Field notes:
- `flags`: array of strings. Engine writes plain-language flags here that the AI should surface in the coaching report.
  Examples: "zone2_hr_consistently_above_ceiling", "soreness_rating_4_three_days_running", "no_overload_on_bench_in_6_weeks", "equipment_limited_session_x2"
- The coaching AI reads `flags` and surfaces relevant ones in the [NOTABLE SIGNAL OR ACHIEVEMENT] section of the weekly report.
