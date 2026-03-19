# FORGE — Session Templates
# Version: 1.0.0
# Purpose: Defines the structure of every session type the engine can generate.
#          Templates specify movement pattern order, exercise selection logic,
#          calisthenics pairings, rest periods, warm-up/cool-down, and the
#          scientific rationale for each structural decision.
#
# The engine uses these templates as scaffolding. It selects specific exercises
# from the pools in forge-engine-constants.md Section 16, applies loads and
# volumes from athlete state, and outputs a complete session. Templates do not
# hard-code exercise names — they define slots that the engine fills.

---

## 1. Split Structure — Upper / Lower

FORGE uses an Upper/Lower split as its default structure.

### Why Upper/Lower, not Push/Pull/Legs

Push/Pull/Legs (PPL) is the most common intermediate split, but it has a
structural problem for this program: it requires a minimum of 6 days to hit
each muscle group twice per week, and at 5 days it produces an asymmetric
week where some muscles hit 2x and others hit 1x.

Upper/Lower resolves this cleanly:
- At 4 days: every muscle group hits exactly 2x (Upper A + Upper B, Lower A + Lower B)
- At 5 days: adds a Zone 2 or intervals session — no split distortion
- At 6 days: adds a third Upper session (Metabolic) — muscle groups hit 2–3x
- At 3 days: Upper A, Lower A, Upper B — muscles hit 1–2x (acceptable for amber/red gate weeks)

This satisfies the 48hr minimum rest rule (Section 6 of engine constants) at
every day count without engine logic to detect violations.

Source: Colquhoun et al. (2018) — frequency-matched upper/lower vs PPL showed
equivalent hypertrophy with better adherence at 4 days/week. Schoenfeld, Ogborn
& Krieger (2016) — 2x/week frequency outperforms 1x for hypertrophy in trained athletes.

### DUP assignment across sessions

DUP requires each muscle group to hit all three rep zones within a 1–2 week window.
Upper/Lower assigns zones as follows:

```
Upper A → Strength zone     (4–6 reps)
Upper B → Hypertrophy zone  (8–12 reps)
Upper C → Metabolic zone    (15–20 reps) — only programmed when days = 6

Lower A → Strength zone     (4–6 reps)
Lower B → Hypertrophy zone  (8–12 reps)
Lower C → Metabolic zone    (15–20 reps) — only programmed when days = 6
```

Zone C sessions are not introduced until mesocycle 2. In mesocycle 1 the athlete
establishes movement patterns and baselines across Strength and Hypertrophy zones
before adding metabolic volume.

Source: Rhea et al. (2002) — DUP produced 28% greater strength gains than linear
periodisation over 12 weeks in trained athletes. Miranda et al. (2011) confirmed
DUP superiority for hypertrophy in intermediate trainees.

---

## 2. Session Sequence — Standard Week (5 days)

```
Day 1 — Upper A (Strength)
Day 2 — Lower A (Strength)
Day 3 — Zone 2 Cardio
Day 4 — Upper B (Hypertrophy)
Day 5 — Lower B (Hypertrophy)
Day 6 — Rest or Mobility (dedicated session)
Day 7 — Rest
```

Rest days are not fixed positions. The engine schedules sessions around the
athlete's available days and enforces the 48hr same-muscle rule. The sequence
above is the default — the engine reorders as needed.

Zone 2 placed on Day 3 is deliberate: it falls between the two strength days
as active recovery, improving blood flow and reducing DOMS without adding
neuromuscular fatigue. It does not interfere with Day 4 strength performance.

Source: Mika et al. (2007) — light aerobic work 24–48h post-strength training
reduces DOMS and perceived soreness vs passive rest. Supported by the concurrent
training interference model (Wilson et al. 2012) — Zone 2 does not activate
AMPK pathways that blunt mTOR.

---

## 3. Warm-Up Protocol — All Strength Sessions

Total warm-up duration: 8–10 minutes. Not optional — treated as part of the session.

### Phase 1 — General warm-up (3 minutes)
```
purpose: "Elevate core temperature, increase synovial fluid viscosity, prime CNS"
protocol:
  - 3 minutes low-intensity cardio (bike, row, jump rope — athlete's choice)
  - Target: HR reaches 100–110 BPM before Phase 2
source: "Bishop (2003) — active warm-up improves subsequent force output by 2–5%
         via increased muscle temperature and neural drive"
```

### Phase 2 — Movement-specific activation (5–7 minutes)
```
purpose: "Activate primary movers, prime motor patterns, identify any acute
          movement restrictions before loading"

upper_session_activation:
  - Band pull-apart: 2 × 15
    reason: "Activates lower traps and rear delts. Counteracts anterior shoulder
             dominance. Sets scapular position for pressing and pulling."
  - Wall slide: 2 × 10
    reason: "Reinforces scapular upward rotation. Critical pre-requisite for
             overhead pressing and pull-up mechanics."
  - Dead hang: 2 × 20–30s
    reason: "Decompresses shoulder joint, activates lats and serratus anterior.
             Directly improves pull-up and row starting position."
  source: "Cools et al. (2007) — scapular stabiliser activation pre-training
           reduces shoulder impingement risk in overhead and pulling movements"

lower_session_activation:
  - Glute bridge: 2 × 15
    reason: "Activates gluteus maximus prior to hinge and quad loading. Reduces
             compensatory lumbar hyperextension during deadlift and squat."
  - Banded clamshell: 2 × 12 each side
    reason: "Activates gluteus medius — the primary hip abductor. Weakness here
             drives knee valgus under load, the primary mechanism of ACL and
             patellar tendon overload."
  - Ankle dorsiflexion mobilisation: 2 × 10 each (knee-to-wall)
    reason: "Ankle mobility is the limiting factor for squat depth in most athletes.
             10 reps pre-session produces acute range improvements sufficient to
             affect squat mechanics."
  source: "Neto et al. (2019) — hip abductor activation pre-squatting reduces
           knee valgus collapse by 30% in trained athletes.
           Hoch & McKeon (2011) — ankle dorsiflexion restriction is associated
           with compensatory patterns in squat and lunge."
```

### Phase 3 — Ramp sets for the first primary compound
```
purpose: "Load the motor pattern progressively before working weight. Reduces
          injury risk. Primes the neuromuscular system for heavy loads."

protocol:
  - Set 1: 40% of working weight × 8 reps (bar speed focus)
  - Set 2: 60% of working weight × 5 reps
  - Set 3: 80% of working weight × 3 reps
  - Working sets begin after Set 3

rest_between_ramp_sets: 60 seconds
note: "Ramp sets are performed for the first primary compound only. Subsequent
       compounds in the same session begin at working weight — the general and
       movement-specific activation is sufficient."

source: "Gourgoulis et al. (2003) — progressive ramp sets (40–80% 1RM) before
         maximal effort produce greater peak force output than jumping straight
         to working weight."
```

---

## 4. Cool-Down Protocol — All Strength Sessions

Total cool-down duration: 5 minutes. Embedded mobility work — not additional time.

```
purpose: "Transition nervous system from high-arousal training state. Begin
          mobility rotation for the week. Capitalise on elevated tissue
          temperature for flexibility gains."

protocol:
  - 5 minutes of the current rotation area from forge-engine-constants.md Section 9
  - Static stretches held 45–60s per position (not dynamic — post-session only)
  - Breathing focus: exhale into the stretch to facilitate PNS activation

note: "Post-exercise tissue temperature is elevated for 15–20 minutes. Static
       stretching is most effective during this window. This is why embedded
       mobility is always post-session, never pre-session."

source: "Opplert & Babault (2018) — post-exercise static stretching produces
         superior ROM gains vs pre-exercise stretching due to elevated tissue
         temperature and reduced stretch-reflex sensitivity."
```

---

## 5. Upper A — Strength Session Template

Rep zone: Strength (4–6 reps, RIR 2, final set RIR 1)
Duration target: 60 minutes (75 max)
Calisthenics: supersetted with compounds (not additional time)

```
session_structure:
  warm_up: "Protocol from Section 3 above"

  slot_1:
    type: "compound_primary"
    pattern: "vertical_pull"
    exercise_pool: "v_pull_primary"
    sets: "per_volume_state"
    rep_zone: "strength"
    paired_calisthenics: "pull_ladder"
    pairing_structure: "superset"
    pairing_rest: 90
    reason: "Vertical pull opens the session when CNS is fresh. Pull-ups and
             weighted pull-ups require the most neuromuscular coordination of any
             upper body movement. Heavy pulling before pressing also pre-activates
             the lats, which stabilise the shoulder girdle during the bench press."
    source: "Augustsson et al. (2003) — performing pulling movements before pressing
             movements produces greater shoulder stability and reduced anterior
             deltoid overactivation during pressing."

  slot_2:
    type: "compound_primary"
    pattern: "horizontal_push"
    exercise_pool: "h_push_primary"
    sets: "per_volume_state"
    rep_zone: "strength"
    paired_calisthenics: "push_ladder"
    pairing_structure: "superset"
    pairing_rest: 90
    reason: "Horizontal push follows vertical pull as an antagonist pairing.
             The lats are the primary stabiliser for bench press — pre-activating
             them in Slot 1 directly improves pressing performance and reduces
             anterior shoulder stress."
    source: "Paz et al. (2017) — antagonist pre-activation (pull before push)
             increases agonist force output by 4–8% via reciprocal inhibition
             and improved joint stability."

  slot_3:
    type: "compound_primary"
    pattern: "vertical_push"
    exercise_pool: "v_push_primary"
    sets: "per_volume_state"
    rep_zone: "strength"
    rest_seconds: 120
    reason: "Vertical push placed third, standalone. Overhead pressing after
             pulling and horizontal pressing means shoulder stabilisers are
             already warm and primed. Placing it last among primaries prevents
             pre-fatigue during the heaviest loads."

  slot_4:
    type: "compound_primary"
    pattern: "horizontal_pull"
    exercise_pool: "h_pull_primary"
    sets: "per_volume_state"
    rep_zone: "strength"
    rest_seconds: 90
    reason: "Horizontal pull as the fourth compound completes the push/pull
             balance. Every pressing movement in this session has a corresponding
             pull. This is the structural injury prevention mechanism for the
             shoulder — imbalanced programs are the primary driver of rotator
             cuff impingement."
    source: "Kolber et al. (2014) — push-dominant programs without matching
             horizontal pull volume are significantly associated with shoulder
             impingement syndrome in strength athletes."

  slot_5:
    type: "accessory"
    pattern: "shoulders"
    exercise_pool: "v_push_accessory"
    sets: 3
    rep_zone: "strength"
    rest_seconds: 60
    note: "Lateral and rear delt work. Direct shoulder accessory placed here
           because deltoids are already warm but not yet fatigued to failure.
           Never placed after overhead press at the start — cold deltoids under
           heavy load increase impingement risk."

  slot_6:
    type: "calisthenics_finisher"
    pattern: "core_compression"
    exercise_pool: "core_ladder"
    sets: 2
    note: "Core compression finisher. L-sit and hollow body progressions.
           Placed at the end because core fatigue earlier in the session would
           compromise bracing on all compound lifts."

  cool_down: "Protocol from Section 4 above"
```

### Superset structure for Slots 1 and 2
```
superset_protocol:
  - Perform compound set (e.g. weighted pull-up × 5)
  - Rest 60 seconds
  - Perform calisthenics set (e.g. archer pull-up × 4 each)
  - Rest 90 seconds
  - Repeat for programmed sets

rationale: "Supersets reduce session time by 15–20% without compromising
            adaptation. Pairing antagonist or skill movements (pull compound +
            pull skill, push compound + push skill) avoids local muscle fatigue
            accumulation that would compromise working weight on the compound.
            This is not circuit training — the skill movement uses different
            motor units and energy systems from the compound."

source: "Robbins et al. (2010) — antagonist-paired supersets maintained force
         output on the agonist compound vs straight sets, while reducing total
         session time by 17%."
```

### Session timing estimate
```
warm_up:          10 min
slot_1 (superset): 14 min  (4 sets compound + 4 sets skill @ 90s rest)
slot_2 (superset): 14 min
slot_3:            10 min  (3 sets @ 120s rest)
slot_4:            10 min  (3 sets @ 90s rest)
slot_5:             7 min  (3 sets @ 60s rest)
slot_6:             4 min  (2 sets @ 45s rest)
cool_down:          5 min
total:             74 min  (within 75-minute ceiling at max sets)
                   60 min  (at MEV set counts)
```

---

## 6. Upper B — Hypertrophy Session Template

Rep zone: Hypertrophy (8–12 reps, RIR 2, final set RIR 0)
Duration target: 60 minutes (75 max)

```
session_structure:
  warm_up: "Protocol from Section 3 above"

  slot_1:
    type: "compound_primary"
    pattern: "horizontal_push"
    exercise_pool: "h_push_primary"
    sets: "per_volume_state"
    rep_zone: "hypertrophy"
    paired_calisthenics: "push_ladder"
    pairing_structure: "superset"
    pairing_rest: 75
    reason: "Horizontal push opens Upper B. Upper A opened with vertical pull —
             alternating which compound is fresh each session ensures neither
             pattern is consistently disadvantaged by fatigue. Hypertrophy zone
             pressing (8–12 reps) produces the highest metabolic stress and
             muscle damage of the three zones — performing it when fully fresh
             maximises stimulus."
    source: "Schoenfeld (2010) — mechanical tension + metabolic stress are the
             primary hypertrophy mechanisms. 8–12 rep range optimises the balance
             of both for upper body pressing."

  slot_2:
    type: "compound_primary"
    pattern: "horizontal_pull"
    exercise_pool: "h_pull_primary"
    sets: "per_volume_state"
    rep_zone: "hypertrophy"
    paired_calisthenics: "pull_ladder"
    pairing_structure: "superset"
    pairing_rest: 75
    reason: "Horizontal pull supersetted with pull skill. Push/pull antagonist
             balance maintained. Horizontal pull placed second (vs first in Upper A)
             ensures back training hits the full set of rep zones across the week."

  slot_3:
    type: "compound_primary"
    pattern: "vertical_push"
    exercise_pool: "v_push_primary"
    sets: "per_volume_state"
    rep_zone: "hypertrophy"
    rest_seconds: 90
    reason: "Vertical push in hypertrophy zone (8–12 reps). Upper A vertical push
             was in strength zone (4–6). This ensures shoulders hit both neural
             and hypertrophy stimuli within the week."

  slot_4:
    type: "accessory"
    pattern: "biceps"
    exercise_pool: ["Dumbbell curl", "Hammer curl", "Cable curl", "Incline dumbbell curl"]
    sets: 3
    rep_zone: "hypertrophy"
    rest_seconds: 60
    reason: "Direct bicep work placed here — vertical pull and horizontal pull in
             this session have already produced significant bicep stimulus via
             compound pulling. Accessory work adds volume beyond what compounds
             produce, staying within biceps MAV/MRV landmarks."
    note: "Biceps receive indirect sets from all pulling compounds. Track indirect
           volume toward biceps weekly set count: each pull set = 0.5 indirect
           bicep sets for MEV/MAV tracking."

  slot_5:
    type: "accessory"
    pattern: "triceps"
    exercise_pool: ["Tricep pushdown", "Overhead tricep extension", "Close-grip bench press", "Skull crusher"]
    sets: 3
    rep_zone: "hypertrophy"
    rest_seconds: 60
    reason: "Direct tricep work. Triceps receive indirect stimulus from all pressing
             compounds. Placed after all pressing work to avoid pre-fatigue on primary
             compounds."
    note: "Same indirect volume tracking rule as biceps: each press set = 0.5
           indirect tricep sets."

  slot_6:
    type: "calisthenics_finisher"
    pattern: "core_compression"
    exercise_pool: "core_ladder"
    sets: 2
    note: "Same as Upper A — core finisher. The engine alternates core ladder rung
           based on current standard to ensure progression."

  cool_down: "Protocol from Section 4 above"
```

---

## 7. Lower A — Strength Session Template

Rep zone: Strength (4–6 reps, RIR 2, final set RIR 1)
Duration target: 60 minutes (75 max)

```
session_structure:
  warm_up: "Protocol from Section 3 above (lower activation)"

  slot_1:
    type: "compound_primary"
    pattern: "hinge"
    exercise_pool: "hinge_primary"
    sets: "per_volume_state"
    rep_zone: "strength"
    paired_calisthenics: "squat_ladder"
    pairing_structure: "superset"
    pairing_rest: 120
    reason: "Hinge opens Lower A in the strength zone. Deadlift and its variants
             produce the highest absolute load of any movement in this program —
             they require maximal CNS freshness and should always be performed
             first in a lower session when strength is the zone. Pairing with
             squat ladder (pistol progressions, Nordic curls) is safe because
             skill movements use bodyweight and do not compound fatigue on the
             loaded hinge pattern."
    source: "Swinton et al. (2012) — deadlift force production is significantly
             reduced when performed after squatting due to accumulated spinal and
             hip flexor fatigue. Hinge-first ordering preserves peak force output."

  slot_2:
    type: "compound_primary"
    pattern: "quad"
    exercise_pool: "quad_primary"
    sets: "per_volume_state"
    rep_zone: "strength"
    rest_seconds: 120
    reason: "Quad dominant compound follows hinge. This is the most common ordering
             question in lower body programming — hinge-first is consistently
             supported over squat-first when strength is the primary goal, as the
             posterior chain (glutes, hamstrings, spinal erectors) is already
             activated from hinge work and can continue to stabilise during
             squatting."
    source: "Graham (2002) — posterior chain activation from prior hinge work
             improves squat stability and reduces lower back strain during
             subsequent barbell squatting."
    note: "If the athlete's primary goal session uses barbell squat as quad primary,
           and they are also deadlifting in the same session, ramp sets for the
           squat are still required — the hinge ramp does not substitute for squat
           ramp. Reduce ramp sets to 2 (60%, 80%) since the CNS is already elevated."

  slot_3:
    type: "accessory"
    pattern: "hinge_accessory"
    exercise_pool: "hinge_accessory"
    sets: 3
    rep_zone: "strength"
    rest_seconds: 75
    reason: "Hinge accessory reinforces posterior chain after the primary hinge.
             Single-leg RDL and good mornings address unilateral and lumbar
             strength deficits that the primary bilateral hinge doesn't expose."

  slot_4:
    type: "accessory"
    pattern: "quad_accessory"
    exercise_pool: "quad_accessory"
    sets: 3
    rep_zone: "strength"
    rest_seconds: 60

  slot_5:
    type: "accessory"
    pattern: "glutes_calves"
    exercise_pool: ["Hip thrust", "Cable kickback", "Standing calf raise", "Seated calf raise"]
    sets: 3
    rep_zone: "strength"
    rest_seconds: 60
    reason: "Glutes receive indirect stimulus from hinge and quad compounds. Direct
             glute work here targets the gluteus maximus through hip extension range
             that deadlifts and squats underload (full hip extension at lockout).
             Hip thrust is the highest-stimulus glute exercise in the literature."
    source: "Contreras et al. (2015) — hip thrust produces significantly greater
             gluteus maximus EMG activation than squat or deadlift across the full
             range of motion, particularly at hip extension lockout."

  slot_6:
    type: "calisthenics_finisher"
    pattern: "core_compression"
    exercise_pool: "core_ladder"
    sets: 2
    note: "Core ladder finisher — same as upper sessions."

  cool_down: "Protocol from Section 4 above"
```

---

## 8. Lower B — Hypertrophy Session Template

Rep zone: Hypertrophy (8–12 reps, RIR 2, final set RIR 0)
Duration target: 60 minutes (75 max)

```
session_structure:
  warm_up: "Protocol from Section 3 above (lower activation)"

  slot_1:
    type: "compound_primary"
    pattern: "quad"
    exercise_pool: "quad_primary"
    sets: "per_volume_state"
    rep_zone: "hypertrophy"
    paired_calisthenics: "squat_ladder"
    pairing_structure: "superset"
    pairing_rest: 90
    reason: "Quad-first in Lower B — reversed from Lower A where hinge leads.
             Alternating which pattern is fresh across sessions prevents one
             pattern from being systematically disadvantaged. Hypertrophy zone
             squatting (8–12 reps) produces high metabolic stress and muscle
             damage in the quads — it benefits from CNS freshness."

  slot_2:
    type: "compound_primary"
    pattern: "hinge"
    exercise_pool: "hinge_primary"
    sets: "per_volume_state"
    rep_zone: "hypertrophy"
    rest_seconds: 90
    reason: "Hinge in hypertrophy zone. Romanian deadlift is preferred over
             conventional for this slot — at 8–12 reps, the conventional deadlift
             produces disproportionate spinal fatigue relative to the hypertrophy
             stimulus. RDL and trap bar are the preferred primaries in hypertrophy
             zone lower sessions."
    note: "Engine should default to RDL or trap bar for hinge primary in
           hypertrophy zone unless athlete has explicitly selected conventional
           deadlift and RPE history supports it."

  slot_3:
    type: "accessory"
    pattern: "quad_accessory"
    exercise_pool: "quad_accessory"
    sets: 3
    rep_zone: "hypertrophy"
    rest_seconds: 75

  slot_4:
    type: "accessory"
    pattern: "hamstring_isolation"
    exercise_pool: ["Leg curl (seated or lying)", "Nordic curl (regression)", "Cable pull-through"]
    sets: 3
    rep_zone: "hypertrophy"
    rest_seconds: 60
    reason: "Direct hamstring isolation in the hypertrophy session. The knee-flexion
             component of hamstring function (leg curl) is underloaded by the
             hip-extension dominant hinge movements. Including leg curl addresses
             the full functional capacity of the hamstring — both hip extension and
             knee flexion — which is important for both injury prevention and
             complete hamstring development."
    source: "Hegyi et al. (2019) — hamstring exercises that combine hip extension
             and knee flexion produce greater whole-muscle hypertrophy than either
             function in isolation. Nordic curls specifically show preferential
             hypertrophy in the distal hamstring, where strain injuries most
             commonly occur."

  slot_5:
    type: "accessory"
    pattern: "glutes_calves"
    exercise_pool: ["Hip thrust", "Cable kickback", "Standing calf raise", "Seated calf raise"]
    sets: 3
    rep_zone: "hypertrophy"
    rest_seconds: 60

  slot_6:
    type: "calisthenics_finisher"
    pattern: "core_compression"
    exercise_pool: "core_ladder"
    sets: 2

  cool_down: "Protocol from Section 4 above"
```

---

## 9. Zone 2 Cardio Session Template

Duration: per weekly target from engine constants (150–240 min/week split across sessions)
Typical session: 45–60 minutes

```
session_structure:

  modality_selection:
    preferred: ["Cycling", "Rowing"]
    acceptable: ["Running", "Elliptical", "Walking (incline)"]
    rationale: "Cycling and rowing are preferred for concurrent training contexts
                because they produce minimal eccentric muscle damage. Running at
                Zone 2 intensity after strength training days produces residual
                DOMS in quads and hamstrings that compounds accumulated fatigue.
                Cycling uses the same primary muscles but without the eccentric
                landing forces."
    source: "Beattie et al. (2014) — low-impact Zone 2 modalities (cycling, rowing)
             show less interference with subsequent strength sessions than running
             at equivalent HR intensities."

  hr_targets:
    floor_pct_hrmax: 0.60
    ceiling_pct_hrmax: 0.75
    talk_test: "Full sentences at all times. If you cannot, pace is above Zone 2."
    nasal_breathing_test: "Optional secondary check — if nasal-only breathing becomes
                           difficult, pace is above Zone 2."

  session_structure:
    - 5 min easy warm-up below 60% HRmax
    - Remaining time in Zone 2 band (60–75% HRmax)
    - No cool-down period required — last 5 minutes at lower end of zone serves this purpose

  common_error: "Athletes consistently self-report Zone 2 sessions that are actually
                 Zone 3 (75–85% HRmax). Zone 3 is the 'grey zone' — too hard to be
                 aerobic base work, too easy to be a proper stimulus. If average HR
                 from the athlete's device is above 75% HRmax, the session is flagged
                 in athlete state and the coaching report addresses it."
```

---

## 10. VO2 Max Intervals Session Template

Programmed once per week maximum. Green gate only.

```
session_structure:

  pre_check:
    - Confirm gate is green before generating this session
    - Never programmed within 24h of a strength session (min 6h, ideally separate day)

  warm_up:
    - 10 min easy Zone 2 (60% HRmax)
    - 2 min build to 80% HRmax
    source: "Helgerud et al. (2007) — the 4x4 protocol requires a proper aerobic
             warm-up to reach target HR intensity by the first interval. Jumping
             straight to 90%+ HRmax from rest produces suboptimal interval quality
             and higher perceived exertion."

  work_intervals:
    sets: 4
    work_duration_minutes: 4
    target_hr_pct_hrmax_min: 0.90
    target_hr_pct_hrmax_max: 0.95
    modality: "Running or cycling — running preferred for VO2 max intervals as
               it produces greater cardiac output demand than cycling at equivalent
               HR. Cycling acceptable if running is contraindicated."
    pacing: "RPE 9 throughout. HR should reach 90% by minute 2 of the first
             interval and should be at 90–95% for the majority of intervals 2–4."

  rest_intervals:
    duration_minutes: 3
    intensity: "Active recovery — walk or easy pedal. Do not sit still."
    reason: "3 minutes active recovery is the validated rest interval from Helgerud
             et al. (2007). Shorter rest produces incomplete cardiac recovery and
             reduces interval quality. Longer rest reduces the aggregate cardiac
             stimulus."

  cool_down:
    - 5–10 min easy Zone 2 until HR drops below 65% HRmax

  total_session_duration: "approximately 45–50 minutes"

  source: "Helgerud et al. (2007) — 4×4 protocol produced 7.2% VO2max improvement
           over 8 weeks, the highest of all interval protocols tested. Superior to
           24×1 min, 47×15s, and long slow distance at matched training volume."
```

---

## 11. Mobility Session Template

Dedicated session: 20 minutes. Embedded (pre/post strength): 10 minutes.

```
mobility_rotation_areas_and_exercises:

  hip_flexor:
    exercises:
      - name: "90/90 hip stretch"
        duration_s: 60
        sets: 2
        cue: "Sit tall — do not lean forward. Feel the stretch in the rear leg hip flexor."
      - name: "Kneeling hip flexor stretch (rear foot elevated)"
        duration_s: 45
        sets: 2
        cue: "Posterior pelvic tilt before sinking forward. Prevents lumbar hyperextension."
      - name: "Couch stretch"
        duration_s: 60
        sets: 2
        cue: "The most effective rectus femoris stretch. Hips fully extended, upright torso."
    rationale: "Hip flexor restriction is the most common mobility limitation in
                sedentary and desk-bound athletes. Shortened hip flexors cause
                anterior pelvic tilt, which increases lumbar load during all lower
                body compounds and limits squat depth."
    source: "Moreside & McGill (2013) — hip flexor mobility intervention over 6 weeks
             produced significant improvements in squat depth and reduced lumbar
             hyperextension during barbell movements."

  thoracic_rotation:
    exercises:
      - name: "Thoracic rotation (quadruped)"
        reps: 10
        sets: 2
        cue: "Hand behind head. Rotate elbow toward ceiling — follow with eyes."
      - name: "Open book stretch (side-lying)"
        reps: 10
        sets: 2
        cue: "Keep knees stacked. Only the upper spine rotates — lower body stays still."
      - name: "Foam roller thoracic extension"
        reps: 8
        sets: 2
        cue: "Roll is perpendicular to spine. Extend over the roller — arms crossed on chest."
    rationale: "Thoracic mobility is the upstream requirement for overhead pressing and
                pull-up lockout. Restricted T-spine forces the lumbar spine to compensate,
                which increases lower back injury risk under load."
    source: "Heneghan et al. (2018) — thoracic restriction is significantly associated
             with shoulder impingement in overhead athletes. T-spine mobility
             interventions reduced impingement symptoms in 80% of subjects."

  posterior_chain:
    exercises:
      - name: "Standing hamstring stretch (PNF)"
        duration_s: 30
        sets: 3
        cue: "Contract hamstring against resistance for 5s, then relax deeper into stretch.
              PNF produces 10–15% greater ROM improvement than static holding alone."
        source: "Sharman et al. (2006) — PNF stretching is superior to static stretching
                 for hamstring ROM gains."
      - name: "Seated forward fold"
        duration_s: 60
        sets: 2
        cue: "Hinge at hip — do not round the spine. Reach for the shin, not the toe."
      - name: "Supine glute stretch (figure-4)"
        duration_s: 45
        sets: 2
        cue: "Pull knee toward opposite shoulder. Feel it in the piriformis, not the hip joint."

  shoulder_internal_rotation:
    exercises:
      - name: "Sleeper stretch"
        duration_s: 45
        sets: 3
        cue: "Side-lying. Forearm rotates toward floor. Gentle pressure only — this area
              is sensitive. Stop if sharp pain, not stretch."
      - name: "Cross-body shoulder stretch"
        duration_s: 45
        sets: 2
        cue: "Pull arm across chest at shoulder height. Feel it in the posterior deltoid
              and external rotators."
      - name: "Wall internal rotation stretch"
        duration_s: 30
        sets: 2
        cue: "Forearm against wall. Rotate body away from wall. Stretches posterior capsule."
    rationale: "Internal rotation restriction is the most common shoulder mobility deficit
                in strength athletes. It loads the posterior capsule during bench press and
                overhead press, and is the primary contributor to shoulder impingement.
                Addressing it directly reduces injury risk more than any other single
                mobility intervention for upper body lifters."
    source: "Tyler et al. (2010) — shoulder internal rotation stretching reduced
             impingement symptoms and improved pressing performance in athletes with
             sub-clinical posterior capsule tightness."

  ankle_dorsiflexion:
    exercises:
      - name: "Knee-to-wall stretch"
        reps: 15
        sets: 2
        cue: "Toes 10cm from wall. Knee drives forward over pinky toe without heel
              lifting. Measure progress: distance from wall at which heel lifts."
      - name: "Banded ankle mobilisation"
        reps: 15
        sets: 2
        cue: "Band at anterior ankle, resistance pulling forward. Drive knee forward
              over foot. The band distraction improves joint mechanics, not just tissue."
      - name: "Single-leg calf raise (eccentric focus)"
        reps: 10
        sets: 2
        cue: "3-second lowering. Develops the calf eccentrically — addresses the
              tissue component of dorsiflexion restriction, not just joint capsule."
    rationale: "Ankle dorsiflexion is the most common mechanical cause of squat depth
                limitation. Insufficient dorsiflexion forces forward lean, heel rise,
                or knee collapse under load — all of which shift stress to the lower back
                and knees."

  adductors:
    exercises:
      - name: "Copenhagen adductor stretch (passive)"
        duration_s: 45
        sets: 3
        cue: "Side-lying. Knee on bench, foot off. Let gravity provide the stretch.
              Do not force range — adductor strains are among the most common gym injuries."
      - name: "Wide-stance hip shift (lateral lunge position)"
        reps: 10
        sets: 2
        cue: "Shift weight to one side. Keep both feet flat. Feel the stretch in the
              straight leg inner thigh."
      - name: "Frog stretch"
        duration_s: 60
        sets: 2
        cue: "Forearms on floor. Knees wide. Rock hips back and forth gently.
              Combined hip flexor + adductor stretch."
    rationale: "Adductor restriction limits squat stance width and depth, and
                contributes to groin strain risk during lateral movements. Particularly
                relevant for athletes who also train Muay Thai — hip mobility in all
                planes is a performance and injury prevention requirement."
```

---

## 12. Deload Session Templates

Deload weeks use modified versions of the standard templates. Same structure, reduced parameters.

```
deload_modifications:
  volume: "-40% sets vs final loading week"
  load: "-20% weight on all exercises"
  rep_zone: "hypertrophy only (8–12 reps) — no strength or metabolic zone during deload"
  rpe_ceiling: 7
  calisthenics: "regress one rung, reduce sets by 1"
  cardio_zone2: "maintained at standard target"
  intervals: "removed entirely"
  mobility: "dedicated sessions doubled (2 per week)"

deload_session_order:
  - Upper A (deload) — compounds only, no accessories
  - Lower A (deload) — compounds only, no accessories
  - Mobility (dedicated)
  - Upper B (deload) — compounds only, no accessories
  - Rest
  - Mobility (dedicated)
  - Rest

rationale: "Deload sessions drop accessory work first — accessories are the
            volume that fatigues without providing the core adaptation stimulus.
            Keeping compound patterns active maintains motor pattern quality
            and prevents detraining. Two mobility sessions capitalise on the
            reduced training load to accelerate ROM gains."

source: "Pritchard et al. (2015) — volume reduction of 30–50% over 1 week
         produced supercompensation (performance exceeding pre-deload baseline)
         7–10 days post-deload in trained athletes. Eliminating all training
         produced no supercompensation effect — some stimulation is required."
```

---

## 13. Rest Period Reference Table

```
movement_type              | rep_zone     | rest_seconds | rationale
---------------------------|--------------|--------------|----------------------------------
Primary compound (hinge)   | Strength     | 180–240      | CNS recovery for maximal force
Primary compound (quad)    | Strength     | 180          | High spinal load — full recovery
Primary compound (upper)   | Strength     | 120          | Lower systemic demand than lower
Primary compound (any)     | Hypertrophy  | 90–120       | Partial metabolic stress preserved
Primary compound (any)     | Metabolic    | 60           | Metabolic stress is the intent
Superset (compound set)    | Any          | 60           | Before calisthenics set
Superset (calisthenics set)| Any          | 90           | Before next compound set
Accessory (upper)          | Any          | 60           | Lower systemic fatigue
Accessory (lower)          | Any          | 75           | Quad/glute accessories need more
Core finisher              | Any          | 45           | Low systemic demand

source: "Schoenfeld et al. (2016) — longer rest periods (3 min vs 1 min) produced
         significantly greater strength and hypertrophy gains in trained athletes,
         likely via greater volume load per session at equivalent RPE. Shorter
         rest for accessories is acceptable because load is lower and muscular
         recovery (not CNS recovery) is the limiting factor."
```
