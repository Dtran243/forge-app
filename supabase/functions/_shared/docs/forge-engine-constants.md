# FORGE — Engine Constants
# Version: 1.0.0
# Purpose: Hard calibration values parsed by the TypeScript adaptation engine.
# All values are evidence-based defaults for a trained athlete (2+ years consistent training).
# Update values here to recalibrate the engine without touching TypeScript logic.

---

## 1. Athlete Profile Defaults

```
training_age_modifier: "athlete"          # beginner | intermediate | athlete
# "athlete" = 2+ years consistent training, applies +20% volume vs beginner defaults
# Source: Ralston et al. (2017)

phase: "build"                            # build | lean | maintain
# build   = slight surplus, prioritise volume + progressive overload
# lean    = slight deficit, protect strength, bump cardio, reduce volume 10%
# maintain = neutral, optimise performance across all pillars equally
```

---

## 2. Volume Landmarks — Sets Per Muscle Group Per Week

These are the MEV / MAV / MRV landmarks for a trained athlete.
The engine starts each mesocycle at MEV and climbs toward MAV by week 3.
MRV is a hard ceiling — never exceeded during loading phases.

```
# Chest
chest_mev: 10
chest_mav: 16
chest_mrv: 22

# Back (lats + mid-back combined)
back_mev: 10
back_mav: 18
back_mrv: 25

# Shoulders (lateral + rear delt)
shoulders_mev: 8
shoulders_mav: 14
shoulders_mrv: 20

# Biceps
biceps_mev: 6
biceps_mav: 12
biceps_mrv: 18

# Triceps
triceps_mev: 6
triceps_mav: 12
triceps_mrv: 18

# Quads
quads_mev: 8
quads_mav: 16
quads_mrv: 22

# Hamstrings
hamstrings_mev: 6
hamstrings_mav: 12
hamstrings_mrv: 18

# Glutes
glutes_mev: 6
glutes_mav: 12
glutes_mrv: 16

# Calves
calves_mev: 8
calves_mav: 14
calves_mrv: 20

# Core (direct)
core_mev: 6
core_mav: 10
core_mrv: 14
```

Source: Schoenfeld et al. (2017), Israetel / Renaissance Periodization MEV/MAV/MRV model

---

## 3. Weekly Volume Progression

Within a mesocycle loading phase (weeks 1–3), weekly volume increases as follows:

```
volume_increase_per_week_min: 0.05        # +5% minimum
volume_increase_per_week_max: 0.10        # +10% maximum
volume_increase_method: "sets"            # increase by adding sets, not reps

# Example: if week 1 chest sets = 10, week 2 = 11, week 3 = 12
```

---

## 4. Rep Ranges — Daily Undulating Periodisation (DUP)

The engine rotates rep ranges across sessions within the same week.
Each muscle group hits all three zones within a 1–2 week rotation.

```
strength_rep_range_min: 4
strength_rep_range_max: 6
strength_rir_target: 2                    # reps in reserve on working sets
strength_rir_final_set: 1                 # reps in reserve on final set only

hypertrophy_rep_range_min: 8
hypertrophy_rep_range_max: 12
hypertrophy_rir_target: 2
hypertrophy_rir_final_set: 0

metabolic_rep_range_min: 15
metabolic_rep_range_max: 20
metabolic_rir_target: 1
metabolic_rir_final_set: 0

# DUP rotation: strength → hypertrophy → metabolic across weekly sessions
# Never repeat same rep zone on same muscle group in consecutive sessions
```

Source: Schoenfeld et al. (2017) rep range equivalence, Helms et al. (2016) RPE/RIR framework

---

## 5. RPE Targets

```
working_set_rpe_min: 7
working_set_rpe_max: 8                    # 2–3 RIR on all working sets
top_set_rpe: 9                            # final set only — 1 RIR
test_week_rpe: 10                         # only on designated PR testing sessions

# RPE < 6 on a session = volume headroom, engine may increase load next week
# RPE > 8 on 3+ consecutive sessions = fatigue signal, engine reduces load
# Session RPE collected via single tap (1–10) after each workout
```

Source: Helms, Cronin, Storey & Zourdos (2016)

---

## 6. Training Frequency

```
min_frequency_per_muscle_per_week: 2      # minimum 2x per muscle group
max_frequency_per_muscle_per_week: 3      # maximum 3x for lagging pillars
min_rest_hours_between_same_muscle: 48    # hard minimum — never violated

# Engine enforces 48hr rule in session scheduling regardless of total days trained
# If recovery scores are low, frequency drops to 2x across all muscle groups
```

Source: Schoenfeld, Ogborn & Krieger (2016) frequency meta-analysis, Nuckols / Stronger By Science

---

## 7. Session Structure

```
max_exercises_per_session: 6
min_exercises_per_session: 3
compound_to_accessory_ratio: 0.5          # 50% compound, 50% accessory/skill
calisthenics_finisher_sets: 2            # skill/control sets added after compound work
session_duration_target_minutes: 60
session_duration_max_minutes: 75
```

---

## 8. Cardio Targets

```
# Zone 2 (aerobic base)
zone2_weekly_minutes_min: 150             # absolute minimum
zone2_weekly_minutes_target: 180          # standard week target
zone2_weekly_minutes_high_fitness: 240    # when cardio pillar score > 85
zone2_heart_rate_ceiling_pct: 0.75        # max 75% HRmax to stay in Zone 2
zone2_heart_rate_floor_pct: 0.60          # min 60% HRmax

# VO2 max intervals
vo2max_sessions_per_week_max: 1           # hard cap — never more than 1/week
vo2max_session_structure: "4x4"           # 4 sets x 4 minutes
vo2max_work_hr_pct_min: 0.90              # 90% HRmax minimum
vo2max_work_hr_pct_max: 0.95             # 95% HRmax maximum
vo2max_rest_minutes: 3                    # 3 min active recovery between sets
vo2max_recovery_gate: "green_only"        # only programmed on green recovery days

# Polarised split
cardio_polarised_low_intensity_pct: 0.80  # 80% of cardio volume at Zone 2
cardio_polarised_high_intensity_pct: 0.20 # 20% at VO2 max intensity

# Concurrent training interference prevention
min_hours_between_intervals_and_strength: 6
intervals_never_same_day_as_strength: true
zone2_can_share_day_with_strength: true   # low intensity does not interfere
```

Source: Seiler (2010) polarised training, Helgerud et al. (2007) 4x4 protocol, Attia (2023) concurrent training

---

## 9. Mobility Targets

```
mobility_sessions_per_week_min: 1
mobility_sessions_per_week_standard: 1
mobility_sessions_per_week_deload: 2      # bumped during deload weeks
mobility_session_duration_minutes: 20
mobility_embedded_per_session_minutes: 10 # pre/post-session embedded work

# Rotation cycle — covers all planes over 2 weeks
mobility_areas: [
  "hip_flexor",
  "thoracic_rotation",
  "posterior_chain",
  "shoulder_internal_rotation",
  "ankle_dorsiflexion",
  "adductors"
]
mobility_rotation_weeks: 2               # full cycle completes every 2 weeks
```

---

## 10. Mesocycle Structure

```
mesocycle_loading_weeks: 3               # weeks of progressive loading
mesocycle_deload_weeks: 1                # week 4 is always deload
mesocycle_length_total: 4

# Deload parameters
deload_volume_reduction: 0.40            # -40% sets
deload_intensity_reduction: 0.20         # -20% load
deload_rpe_ceiling: 7                    # no set above RPE 7 during deload
deload_mobility_sessions: 2              # mobility doubled during deload
deload_zone2_maintained: true            # cardio base maintained during deload
deload_intervals_removed: true           # no high-intensity cardio during deload

# Mesocycle counter reset conditions
reset_on_forced_deload: true             # forced deload by recovery gate resets counter
reset_starting_volume: "mev_plus_increment" # next cycle starts slightly above previous MEV
mev_increment_per_cycle: 1              # add 1 set to MEV after each completed mesocycle
```

Source: Bompa & Buzzichelli — Periodization (7th ed.), Israetel / RP mesocycle model

---

## 11. Recovery Gate — HRV and Readiness Thresholds

```
# HRV gate (7-day rolling average vs 30-day baseline)
hrv_green_threshold: 0.00                # at or above baseline = green
hrv_amber_threshold: -0.10               # 1–10% below baseline = amber
hrv_red_threshold: -0.10                 # >10% below baseline for 3+ days = red
hrv_consecutive_days_for_red: 3          # must be below threshold for 3 days straight
hrv_rolling_window_days: 7               # use 7-day rolling trend, not single readings

# Soreness gate (subjective check-in, 1–5 scale)
soreness_green: 3                        # <= 3 = green
soreness_amber: 4                        # 4 = amber
soreness_red: 5                          # 5 = red

# Sleep gate (average nightly hours)
sleep_green_hours: 7.0                   # >= 7h = green
sleep_amber_hours: 6.0                   # 6–7h = amber
sleep_red_hours: 6.0                     # < 6h for 5+ days = red
sleep_consecutive_days_for_red: 5

# Combined gate logic
# GREEN  = all signals green → continue loading
# AMBER  = 1–2 amber signals, no red → deload recommended, skip allowed if RPE <= 7
# RED    = any red signal OR 3 amber signals → forced deload, no skip allowed

# Deload skip rules
deload_skip_allowed_gate: "amber"        # only amber gate allows skip
deload_skip_rpe_ceiling: 7               # RPE must be <= 7 to skip
deload_skip_consecutive_max: 1           # cannot skip 2 consecutive recommended deloads
```

Source: Flatt & Esco (2016) HRV readiness in trained athletes, HRV4Training research

---

## 12. Pillar Scoring

```
# Score range: 0–100 per pillar per week

# Score thresholds — drive next week's allocation
pillar_score_increase_threshold: 85      # score >= 85 → maintain volume, do not increase
pillar_score_decrease_threshold: 60      # score < 60 → increase volume next week
pillar_score_maintain_range: [61, 84]    # hold current volume

# Strength pillar inputs
strength_score_weight_completion: 0.50   # 50% — did you complete target sets
strength_score_weight_overload: 0.30     # 30% — did progressive overload occur
strength_score_weight_rpe: 0.20          # 20% — session RPE trend

# Calisthenics / skill pillar inputs
skill_score_weight_completion: 0.50
skill_score_weight_progression: 0.30     # rung advancement or hold time improvement
skill_score_weight_quality: 0.20         # self-reported quality (1–5)

# Cardio pillar inputs
cardio_score_weight_zone2_mins: 0.50     # % of weekly Zone 2 target hit
cardio_score_weight_intervals: 0.30      # interval session completed (Y/N)
cardio_score_weight_consistency: 0.20    # sessions completed vs planned

# Mobility pillar inputs
mobility_score_weight_sessions: 0.60     # sessions completed vs planned
mobility_score_weight_embedded: 0.20     # pre/post embedded work completed
mobility_score_weight_subjective: 0.20   # self-reported flexibility/range trend
```

---

## 13. Progressive Overload Rules

```
# Strength — double progression
overload_method_strength: "double_progression"
# Rule: hit top of rep range (e.g. 3x6) at RPE <= 7 for 2 consecutive sessions
#       → increase weight by increment next session
# Rule: fail to hit bottom of rep range (e.g. 3x4 when targeting 4–6)
#       → repeat same weight next session
# Rule: RPE >= 9 on final set → do NOT increase weight next session

overload_increment_barbell_upper_kg: 2.5
overload_increment_barbell_lower_kg: 5.0
overload_increment_dumbbell_kg: 2.0

# Calisthenics — skill ladder progression
overload_method_calisthenics: "skill_ladder"
# Advance rung when: target reps hit with RIR >= 2 for 2 consecutive weeks
# Regress rung when: cannot hit minimum reps for 2 consecutive sessions
ladder_advance_consecutive_weeks: 2
ladder_regress_consecutive_sessions: 2
```

---

## 14. Days Trained Per Week — Engine Decision Logic

```
# Engine decides days per week based on recovery score and pillar gaps
# No fixed schedule — fully adaptive

days_per_week_min: 3
days_per_week_max: 6
days_per_week_default: 5

# Recovery score → day count mapping
days_green_high_pillar_gaps: 6           # green recovery, multiple pillars < 60
days_green_standard: 5                   # green recovery, normal pillar gaps
days_amber: 4                            # amber recovery gate
days_red: 3                              # red recovery gate (deload week)

# Session type distribution per week (approximate, engine adjusts by pillar scores)
sessions_strength_calisthenics_min: 2
sessions_strength_calisthenics_max: 3
sessions_cardio_zone2_min: 1
sessions_cardio_zone2_max: 3
sessions_cardio_intervals_max: 1
sessions_mobility_dedicated_min: 1
sessions_mobility_dedicated_max: 2
```

---

## 15. Calisthenics Skill Ladders

### Push pattern
```
push_ladder: [
  { rung: 1, name: "Incline push-up",          standard: "3x12 RIR2" },
  { rung: 2, name: "Push-up",                  standard: "3x15 RIR2" },
  { rung: 3, name: "Diamond push-up",          standard: "3x12 RIR2" },
  { rung: 4, name: "Archer push-up",           standard: "3x8 each RIR2" },
  { rung: 5, name: "Pseudo planche push-up",   standard: "3x8 RIR2" },
  { rung: 6, name: "Ring push-up",             standard: "3x10 RIR2" },
  { rung: 7, name: "Ring dip",                 standard: "3x8 RIR2" },
  { rung: 8, name: "Weighted ring dip",        standard: "3x6 +10kg RIR2" }
]
```

### Pull pattern
```
pull_ladder: [
  { rung: 1, name: "Band-assisted pull-up",    standard: "3x10 RIR2" },
  { rung: 2, name: "Pull-up",                  standard: "3x8 RIR2" },
  { rung: 3, name: "Weighted pull-up",         standard: "3x6 +10kg RIR2" },
  { rung: 4, name: "L-sit pull-up",            standard: "3x5 RIR2" },
  { rung: 5, name: "Archer pull-up",           standard: "3x4 each RIR2" },
  { rung: 6, name: "Weighted pull-up +20kg",   standard: "3x5 RIR2" },
  { rung: 7, name: "One-arm negative",         standard: "3x3 each controlled" }
]
```

### Core compression pattern
```
core_ladder: [
  { rung: 1, name: "Hollow body hold",         standard: "3x30s" },
  { rung: 2, name: "Tuck L-sit (floor)",       standard: "3x20s" },
  { rung: 3, name: "L-sit (floor)",            standard: "3x15s" },
  { rung: 4, name: "L-sit (parallettes)",      standard: "3x20s" },
  { rung: 5, name: "Tuck V-sit",               standard: "3x10s" },
  { rung: 6, name: "V-sit",                    standard: "3x10s" },
  { rung: 7, name: "Manna progression",        standard: "3x5s" }
]
```

### Squat / hinge pattern (calisthenics component)
```
squat_ladder: [
  { rung: 1, name: "Assisted pistol squat",    standard: "3x8 each RIR2" },
  { rung: 2, name: "Shrimp squat",             standard: "3x6 each RIR2" },
  { rung: 3, name: "Pistol squat",             standard: "3x5 each RIR2" },
  { rung: 4, name: "Weighted pistol squat",    standard: "3x4 each +10kg RIR2" },
  { rung: 5, name: "Nordic curl",              standard: "3x5 RIR2" },
  { rung: 6, name: "Weighted Nordic curl",     standard: "3x5 +10kg RIR2" }
]
```

---

## 16. Compound Exercise Pool — Strength Pillar

```
# Lower body — hinge dominant
hinge_primary: ["Deadlift", "Romanian deadlift", "Trap bar deadlift"]
hinge_accessory: ["Single-leg RDL", "Good morning", "Hyperextension"]

# Lower body — quad dominant
quad_primary: ["Barbell squat", "Hack squat", "Leg press"]
quad_accessory: ["Bulgarian split squat", "Leg extension", "Step-up"]

# Upper body — horizontal push
h_push_primary: ["Barbell bench press", "Dumbbell bench press"]
h_push_accessory: ["Incline dumbbell press", "Cable fly", "Dumbbell fly"]

# Upper body — vertical push
v_push_primary: ["Barbell overhead press", "Dumbbell overhead press"]
v_push_accessory: ["Lateral raise", "Rear delt fly", "Cable lateral raise"]

# Upper body — horizontal pull
h_pull_primary: ["Barbell row", "Dumbbell row", "Cable row"]
h_pull_accessory: ["Face pull", "Chest-supported row", "Band pull-apart"]

# Upper body — vertical pull
v_pull_primary: ["Weighted pull-up", "Lat pulldown"]
v_pull_accessory: ["Straight-arm pulldown", "Cable pullover"]

# Each session must contain at least one primary from each relevant pattern
# Accessories rotate to prevent adaptation and maintain joint health
```

---

## 17. Injury Prevention Substitution Rules

```
# When recovery gate is AMBER, substitute high-impact variations
substitutions_amber:
  "Barbell squat"          → "Goblet squat or hack squat"
  "Deadlift"               → "Romanian deadlift or trap bar deadlift"
  "Barbell overhead press" → "Dumbbell overhead press (neutral grip)"
  "Barbell row"            → "Chest-supported dumbbell row"
  "4x4 VO2 max intervals"  → "Removed entirely"

# When recovery gate is RED, full deload substitutions apply
substitutions_red:
  "All primary compounds"  → "Machine or dumbbell equivalent, -20% load"
  "All calisthenics skill" → "Regress one rung, reduce sets by 1"
  "Zone 2 cardio"          → "Maintained — active recovery benefit"
  "Intervals"              → "Removed entirely"
  "Dedicated mobility"     → "Doubled to 2 sessions"
```
