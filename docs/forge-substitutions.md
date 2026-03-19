# FORGE — Substitution Rules
# Version: 1.0.0
# Purpose: Defines valid substitutes for every compound and accessory movement
#          in the strength pillar, and for calisthenics skill movements when
#          equipment is unavailable or movement is contraindicated.
#
# Two substitution contexts:
#   1. VOLUNTARY — athlete chooses to swap (equipment unavailable, preference,
#      movement feel on the day). Engine accepts without changing gate status.
#   2. GATE-TRIGGERED — engine forces swap based on amber/red recovery gate
#      (defined in forge-engine-constants.md Section 17). These override voluntary
#      choices — an athlete cannot voluntarily choose a gate-triggered primary
#      movement when their gate colour disallows it.
#
# Substitution validity rules:
#   - A valid substitute must share the SAME PRIMARY MOVEMENT PATTERN
#     (hinge, quad, h-push, v-push, h-pull, v-pull). Cross-pattern swaps
#     are never valid — they break the push/pull balance and muscle targeting.
#   - A substitute must produce comparable stimulus to the primary. Downgrading
#     from a bilateral compound to an isolation accessory is never valid
#     (e.g. deadlift → leg curl is invalid — different pattern AND stimulus tier).
#   - Equipment substitutes are tier-equivalent. Primary barbell → dumbbell or
#     machine equivalent is valid. Primary compound → isolation is not.
#   - Where a substitute changes the stimulus in a meaningful way, a note explains
#     what the athlete should expect (e.g. reduced load capacity, altered ROM).

---

## 1. Lower Body — Hinge Pattern

### Primary: Deadlift (conventional)
```
valid_substitutes:
  - name: "Trap bar deadlift"
    reason: "Hip hinge pattern preserved. Reduces lumbar shear — preferred when lower back fatigue is reported."
    note: "Load can typically be 5–10% higher than conventional. Adjust RPE targets accordingly."

  - name: "Romanian deadlift"
    reason: "Hinge pattern preserved with greater hamstring emphasis. Valid primary-tier substitute."
    note: "Use 60–70% of conventional deadlift load as a starting point. Pause 2s at mid-shin."

  - name: "Sumo deadlift"
    reason: "Hip hinge pattern preserved. Wider stance reduces ROM and lumbar demand."
    note: "Valid when hip flexor or adductor tightness limits conventional stance."

invalid_substitutes:
  - name: "Leg curl"
    reason: "Isolation — different stimulus tier. Does not replicate hip hinge pattern."
  - name: "Good morning"
    reason: "Accessory-tier only. Insufficient loading potential to serve as primary stimulus."
  - name: "Barbell squat"
    reason: "Quad-dominant pattern — not a hinge substitute."
```

### Primary: Romanian Deadlift
```
valid_substitutes:
  - name: "Single-leg RDL (dumbbell)"
    reason: "Hinge pattern preserved. Adds unilateral balance demand — valid as primary when bilateral loading is unavailable."
    note: "Use 40–50% of bilateral RDL load per hand."

  - name: "Trap bar deadlift"
    reason: "More upright torso but hip hinge preserved. Valid substitute."

  - name: "Dumbbell RDL"
    reason: "Direct equipment substitute. Identical movement, reduced load capacity."
    note: "Use when barbell is unavailable."

invalid_substitutes:
  - name: "Leg curl"
    reason: "Isolation — hamstring in isolation, no hip hinge."
  - name: "Hyperextension"
    reason: "Accessory-tier only. Use as finisher, not primary."
```

---

## 2. Lower Body — Quad Pattern

### Primary: Barbell Squat
```
valid_substitutes:
  - name: "Hack squat (machine)"
    reason: "Quad-dominant pattern preserved. Reduced spinal load — preferred for lower back fatigue days."
    note: "Load is not directly comparable. Start at perceived RPE 7 and calibrate."

  - name: "Leg press"
    reason: "Quad-dominant pattern, bilateral loading preserved. Valid primary substitute."
    note: "Eliminates core and stabiliser demand. Use when squat mechanics are compromised."

  - name: "Goblet squat"
    reason: "Pattern preserved. Load ceiling is lower — valid primary only when barbell unavailable entirely."
    note: "Use heaviest available dumbbell. If RPE < 6 at top of rep range, insufficient stimulus."

invalid_substitutes:
  - name: "Leg extension"
    reason: "Isolation — no hip involvement. Not a squat substitute."
  - name: "Lunge"
    reason: "Accessory-tier unilateral movement. Does not replace bilateral primary stimulus."
  - name: "Bulgarian split squat"
    reason: "Accessory-tier. Valid as supplemental work, not as primary squat replacement."
```

### Primary: Hack Squat / Leg Press
```
valid_substitutes:
  - name: "Barbell squat"
    reason: "Upgrades stimulus. Valid if barbell squat is not contraindicated."

  - name: "Dumbbell goblet squat"
    reason: "Valid if machine unavailable. Load ceiling applies — only viable if heavy dumbbells are accessible."

invalid_substitutes:
  - name: "Step-up"
    reason: "Accessory-tier unilateral. Different stimulus."
  - name: "Leg extension"
    reason: "Isolation only."
```

---

## 3. Upper Body — Horizontal Push

### Primary: Barbell Bench Press
```
valid_substitutes:
  - name: "Dumbbell bench press"
    reason: "Identical movement pattern. Greater ROM and unilateral stability demand. Valid primary substitute."
    note: "Use 80–85% of barbell load per dumbbell as starting point. Adjust to RPE."

  - name: "Machine chest press"
    reason: "Pattern preserved. Eliminates stabiliser demand — valid when shoulder stability is compromised."
    note: "Use on amber gate days or when barbell is unavailable."

invalid_substitutes:
  - name: "Push-up"
    reason: "Bodyweight only — insufficient progressive overload potential as primary substitute for a loaded compound."
    note: "Valid as calisthenics finisher per the skill ladder. Not a bench replacement."
  - name: "Cable fly"
    reason: "Isolation — no pressing pattern."
  - name: "Incline dumbbell press"
    reason: "Different angle — upper chest dominant. Valid as accessory rotation, not a flat bench substitute."
```

### Primary: Dumbbell Bench Press
```
valid_substitutes:
  - name: "Barbell bench press"
    reason: "Direct pattern substitute. Higher load potential."

  - name: "Machine chest press"
    reason: "Valid when dumbbells unavailable or shoulder stability is a limiting factor."

invalid_substitutes:
  - name: "Dumbbell fly"
    reason: "Isolation — no pressing stimulus."
```

---

## 4. Upper Body — Vertical Push

### Primary: Barbell Overhead Press
```
valid_substitutes:
  - name: "Dumbbell overhead press"
    reason: "Pattern preserved. Neutral or pronated grip — use neutral when shoulder impingement is reported."
    note: "Use 80–85% of barbell load per dumbbell. Greater stability demand."

  - name: "Seated dumbbell overhead press"
    reason: "Reduces core and balance demand. Valid when lower back fatigue is limiting standing press."
    note: "Seated pressing allows slightly higher loads — calibrate RPE."

  - name: "Landmine press"
    reason: "Arcing press path reduces shoulder impingement risk. Valid primary substitute when overhead ROM is restricted."
    note: "Lower absolute load — not a direct load comparison."

invalid_substitutes:
  - name: "Lateral raise"
    reason: "Isolation (medial delt only). Not a pressing movement."
  - name: "Arnold press"
    reason: "Accessory-tier variation. Rotation under load is not appropriate as a primary stimulus."
  - name: "Incline bench press"
    reason: "Horizontal push pattern — different pattern entirely."
```

---

## 5. Upper Body — Horizontal Pull

### Primary: Barbell Row (overhand)
```
valid_substitutes:
  - name: "Dumbbell row (single arm)"
    reason: "Horizontal pull pattern preserved. Unilateral — allows heavier loading per side and greater ROM."
    note: "Use 55–60% of barbell row load per dumbbell. Brace with non-working hand on bench."

  - name: "Chest-supported dumbbell row"
    reason: "Eliminates lower back demand. Preferred on amber gate days or when lumbar fatigue is reported."
    note: "This is the mandatory amber-gate substitute per Section 17."

  - name: "Cable row (seated, close or wide grip)"
    reason: "Pattern preserved. Constant tension through full ROM — valid primary substitute."
    note: "Close grip emphasises lower traps and lats. Wide grip increases rear delt involvement."

  - name: "Machine row"
    reason: "Valid when barbell and cable are unavailable. Pattern preserved."

invalid_substitutes:
  - name: "Lat pulldown"
    reason: "Vertical pull — different pattern. Does not substitute horizontal pull."
  - name: "Face pull"
    reason: "Accessory-tier rear delt/external rotation work. Not a row substitute."
  - name: "Pull-up"
    reason: "Vertical pull pattern. Different muscles and movement entirely."
```

### Primary: Cable Row
```
valid_substitutes:
  - name: "Barbell row"
    reason: "Pattern preserved. Higher load potential."

  - name: "Dumbbell row"
    reason: "Direct substitute when cable is unavailable."

  - name: "Chest-supported dumbbell row"
    reason: "Valid if lower back is a concern."

invalid_substitutes:
  - name: "Lat pulldown"
    reason: "Vertical pull. Different pattern."
```

---

## 6. Upper Body — Vertical Pull

### Primary: Weighted Pull-up
```
valid_substitutes:
  - name: "Lat pulldown"
    reason: "Vertical pull pattern preserved. Allows load adjustment below bodyweight — valid when pull-up strength is insufficient for target rep range."
    note: "Not a straight swap. Lat pulldown removes bodyweight stabilisation demand. Use when weighted pull-up produces RPE 10 before rep target."

  - name: "Band-assisted pull-up"
    reason: "Pattern fully preserved. Reduces effective load. Preferred over lat pulldown when a rig is available."
    note: "Regress to appropriate band resistance to hit target rep range at RPE 7–8."

invalid_substitutes:
  - name: "Cable pullover"
    reason: "Accessory-tier lat isolation. Not a vertical pull substitute."
  - name: "Straight-arm pulldown"
    reason: "Accessory-tier. Does not replicate compound vertical pull."
  - name: "Barbell row"
    reason: "Horizontal pull pattern — different movement entirely."
```

### Primary: Lat Pulldown
```
valid_substitutes:
  - name: "Pull-up or band-assisted pull-up"
    reason: "Upgrades stimulus. Preferred when pull-up strength is adequate."

  - name: "Cable pulldown (neutral grip)"
    reason: "Direct equipment substitute if specific machine unavailable."
```

---

## 7. Accessory Substitution Rules

Accessories rotate by design to prevent adaptation. The rules are less strict — any movement within the same pattern and muscle group is valid. The engine rotates accessories independently of primaries.

```
accessory_substitution_principle:
  "Any accessory movement can be swapped for another within the same
   movement pattern and muscle group. Load and rep range remain as
   programmed. The engine does not need to validate accessory swaps —
   the athlete has full discretion within the same pattern."

examples_of_valid_accessory_swaps:
  - "Cable fly ↔ Dumbbell fly"           # h-push accessory
  - "Face pull ↔ Band pull-apart"        # h-pull accessory (rear delt)
  - "Lateral raise ↔ Cable lateral raise" # v-push accessory
  - "Leg extension ↔ Step-up"            # quad accessory
  - "Good morning ↔ Hyperextension"      # hinge accessory

examples_of_invalid_accessory_swaps:
  - "Cable fly → Lateral raise"          # h-push → v-push accessory (cross-pattern)
  - "Face pull → Lat pulldown"           # accessory → primary compound (tier mismatch)
  - "Leg extension → Leg curl"           # quad → hamstring (cross-muscle)
```

---

## 8. Calisthenics Skill Ladder — Equipment Substitutes

Skill ladder movements require specific equipment. When equipment is unavailable,
the engine regresses within the same pattern to a movement that doesn't need it.
This is not a gate-triggered regression — it is an equipment-driven regression only.

```
equipment_substitutes:

  rings_unavailable:
    "Ring push-up"          → "Archer push-up (same rung difficulty, no rings)"
    "Ring dip"              → "Parallel bar dip (if available) or Diamond push-up (rung down)"
    note: "Ring work should not be skipped entirely. Regress to closest rung not requiring rings."

  parallettes_unavailable:
    "L-sit (parallettes)"   → "L-sit (floor, hands flat) — same rung if ROM achieved"
    "Tuck V-sit"            → "Advanced tuck L-sit extension hold"
    note: "Floor L-sit is a valid substitute if wrist extension is adequate."

  pull_up_bar_unavailable:
    "Any pull_ladder rung"  → "Dumbbell row (2 sets) + Straight-arm pulldown (1 set)"
    note: "This is an equipment emergency substitute only. Skill ladder progression pauses
           for sessions where bar is unavailable — rung does not advance or regress."

  no_rig_or_rings_unavailable:
    "Entire calisthenics skill session" →
      "Replace with: Push pattern (2 sets max-difficulty push-up variation) +
       Core pattern (2 sets highest hollow/L-sit hold) + Note in session log"
    note: "Engine records session as 'equipment limited' — does not count toward
           ladder advancement. Two consecutive equipment-limited sessions triggers
           a flag to the athlete to address equipment access."
```

---

## 9. What the Engine Must Never Allow

Regardless of athlete request or equipment limitation:

```
hard_substitution_rules:
  - never_cross_pattern: true
    description: "A push movement cannot substitute a pull. A hinge cannot substitute
                  a quad movement. Pattern balance is the injury prevention mechanism."

  - never_downgrade_to_isolation_as_primary: true
    description: "An isolation movement (leg curl, lateral raise, cable fly) cannot
                  serve as the primary compound for a session. Accessories supplement
                  primaries — they do not replace them."

  - never_skip_primary_without_substitute: true
    description: "If a primary compound cannot be performed and no valid substitute
                  exists in the rules above, the engine removes the exercise AND
                  reduces session volume by the programmed set count. It does not
                  fill the gap with unrelated work."

  - never_substitute_during_test_week: true
    description: "PR testing sessions use the specific primary compound being tested.
                  Equipment limitations during a test week defer the test to the
                  next available session — they do not allow substitution."
```
