/**
 * substitutions.ts
 *
 * Local substitution data for the active session substitute sheet.
 * Sourced from docs/forge-substitutions.md — valid alternatives per movement.
 * No AI call — displayed as a static filtered list.
 *
 * Design decisions:
 * - `requiresEquipment` enables filtering when the athlete has limited equipment
 *   (travel mode, home gym). The app filters this against athlete.equipment before
 *   displaying the list — movements the athlete can't perform are hidden.
 * - Every substitute has its own entry in SUBSTITUTIONS so the chain works in
 *   both directions. If Deadlift → RDL, then RDL also lists its own substitutes.
 * - `gateRestricted` marks movements removed on amber/red gate — the app can
 *   optionally surface this as a label rather than hiding the entry entirely.
 * - Calisthenics entries use `requiresEquipment` to handle equipment-driven
 *   regressions without touching the skill ladder progression counters.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Equipment =
  | 'barbell'
  | 'dumbbells'
  | 'cable'
  | 'machine'
  | 'pull_up_bar'
  | 'rings'
  | 'parallettes'
  | 'bands'
  | 'dip_bar'

export type MovementPattern =
  | 'hinge'
  | 'quad'
  | 'h_push'
  | 'v_push'
  | 'h_pull'
  | 'v_pull'
  | 'push_calisthenics'
  | 'pull_calisthenics'
  | 'core_calisthenics'
  | 'squat_calisthenics'

export type SubstituteEntry = {
  /** Display name of the substitute movement */
  name: string
  /** Why this is a valid pattern-equivalent swap — shown in the substitute sheet */
  reason: string
  /** Practical tip: load adjustment, grip, ROM note. Null if none needed. */
  note: string | null
  /** Equipment the substitute itself requires — used to filter unavailable options */
  requiresEquipment: Equipment[]
  /**
   * True if this substitute is removed on amber or red gate (high-impact movements).
   * The app can surface this as context rather than hiding it entirely.
   */
  gateRestricted?: boolean
}

/**
 * SUBSTITUTIONS
 *
 * Keys are movement names exactly as they appear in session_logs and strength_state.
 * Every key that appears as a substitute value must also have its own top-level entry
 * so the chain works bidirectionally.
 */
export const SUBSTITUTIONS: Record<string, SubstituteEntry[]> = {

  // ─── HINGE ──────────────────────────────────────────────────────────────────

  'Deadlift': [
    {
      name: 'Trap bar deadlift',
      reason: 'Hip hinge pattern preserved. Reduces lumbar shear — preferred when lower back fatigue is reported.',
      note: 'Load can typically be 5–10% higher than conventional. Adjust RPE accordingly.',
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Romanian deadlift',
      reason: 'Hinge pattern preserved with greater hamstring emphasis. Valid primary-tier substitute.',
      note: 'Start at 60–70% of your conventional deadlift load. Pause 2s at mid-shin.',
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Sumo deadlift',
      reason: 'Hip hinge pattern preserved. Wider stance reduces ROM and lumbar demand.',
      note: 'Valid when hip flexor or adductor tightness limits conventional stance.',
      requiresEquipment: ['barbell'],
      gateRestricted: true,
    },
    {
      name: 'Dumbbell RDL',
      reason: 'Hinge pattern preserved. Use when barbell is completely unavailable.',
      note: 'Load ceiling is lower — use heaviest available dumbbells.',
      requiresEquipment: ['dumbbells'],
    },
  ],

  'Trap bar deadlift': [
    {
      name: 'Deadlift',
      reason: 'Direct barbell equivalent. Greater lumbar demand — only if lower back is recovered.',
      note: 'Expect load to be 5–10% lower than your trap bar working weight.',
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Romanian deadlift',
      reason: 'Hinge pattern preserved. Lower spinal load than conventional.',
      note: 'Start at 60–70% of your trap bar load.',
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Dumbbell RDL',
      reason: 'Hinge pattern preserved when no barbell is available.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
  ],

  'Romanian deadlift': [
    {
      name: 'Dumbbell RDL',
      reason: 'Direct equipment substitute. Identical movement, lower load ceiling.',
      note: 'Use when barbell is unavailable.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Single-leg RDL',
      reason: 'Hinge pattern preserved. Adds unilateral balance demand — valid when bilateral loading is unavailable.',
      note: 'Use 40–50% of bilateral RDL load per dumbbell.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Trap bar deadlift',
      reason: 'More upright torso but hip hinge preserved. Higher absolute load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Deadlift',
      reason: 'Upgrades to full hip hinge primary. Valid if conventional deadlift is not contraindicated.',
      note: 'Greater lumbar demand — confirm lower back is recovered before using.',
      requiresEquipment: ['barbell'],
    },
  ],

  'Dumbbell RDL': [
    {
      name: 'Romanian deadlift',
      reason: 'Upgrades to barbell equivalent. Higher load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Single-leg RDL',
      reason: 'Hinge pattern preserved. Unilateral variation when bilateral loading is not possible.',
      note: 'Use same dumbbell weight per hand.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Cable pull-through',
      reason: 'Hip hinge pattern with constant cable tension. Valid equipment substitute.',
      note: null,
      requiresEquipment: ['cable'],
    },
  ],

  'Single-leg RDL': [
    {
      name: 'Dumbbell RDL',
      reason: 'Bilateral equivalent. Higher absolute load, lower balance demand.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Romanian deadlift',
      reason: 'Barbell bilateral equivalent. Valid upgrade when balance is the limitation.',
      note: null,
      requiresEquipment: ['barbell'],
    },
  ],

  // ─── QUAD ───────────────────────────────────────────────────────────────────

  'Barbell squat': [
    {
      name: 'Hack squat',
      reason: 'Quad-dominant pattern preserved. Reduced spinal load — preferred when lower back fatigue is reported.',
      note: 'Load is not directly comparable. Start at RPE 7 and calibrate.',
      requiresEquipment: ['machine'],
    },
    {
      name: 'Leg press',
      reason: 'Quad-dominant pattern, bilateral loading preserved. Eliminates core and stabiliser demand.',
      note: 'Use when squat mechanics are compromised or barbell is unavailable.',
      requiresEquipment: ['machine'],
    },
    {
      name: 'Goblet squat',
      reason: 'Pattern preserved. Valid primary when barbell is completely unavailable.',
      note: 'Use heaviest available dumbbell. If RPE < 6 at top of rep range, insufficient stimulus.',
      requiresEquipment: ['dumbbells'],
    },
  ],

  'Hack squat': [
    {
      name: 'Leg press',
      reason: 'Machine-based quad pattern. Valid when hack squat machine is unavailable.',
      note: null,
      requiresEquipment: ['machine'],
    },
    {
      name: 'Barbell squat',
      reason: 'Upgrades stimulus. Valid if barbell squat is not contraindicated.',
      note: 'Greater spinal load — confirm lower back is recovered.',
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Goblet squat',
      reason: 'Valid when no machine or barbell is available. Load ceiling applies.',
      note: 'Use heaviest available dumbbell.',
      requiresEquipment: ['dumbbells'],
    },
  ],

  'Leg press': [
    {
      name: 'Hack squat',
      reason: 'Direct machine equivalent. Greater quad isolation.',
      note: null,
      requiresEquipment: ['machine'],
    },
    {
      name: 'Barbell squat',
      reason: 'Upgrades stimulus with added core and stabiliser demand.',
      note: 'Confirm squat mechanics are sound before switching.',
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Goblet squat',
      reason: 'Valid when no machine is available. Lower load ceiling.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
  ],

  'Goblet squat': [
    {
      name: 'Barbell squat',
      reason: 'Upgrades to barbell primary. Higher load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Hack squat',
      reason: 'Machine equivalent with higher load potential than goblet.',
      note: null,
      requiresEquipment: ['machine'],
    },
    {
      name: 'Leg press',
      reason: 'Machine equivalent. Valid when hack squat unavailable.',
      note: null,
      requiresEquipment: ['machine'],
    },
  ],

  // ─── HORIZONTAL PUSH ────────────────────────────────────────────────────────

  'Barbell bench press': [
    {
      name: 'Dumbbell bench press',
      reason: 'Identical movement pattern. Greater ROM and unilateral stability demand.',
      note: 'Use 80–85% of barbell load per dumbbell as a starting point.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Machine chest press',
      reason: 'Pattern preserved. Eliminates stabiliser demand — valid when shoulder stability is compromised.',
      note: 'Use on amber gate days or when barbell is unavailable.',
      requiresEquipment: ['machine'],
      gateRestricted: true,
    },
  ],

  'Dumbbell bench press': [
    {
      name: 'Barbell bench press',
      reason: 'Direct pattern substitute. Higher load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Machine chest press',
      reason: 'Valid when dumbbells are unavailable or shoulder stability is a concern.',
      note: null,
      requiresEquipment: ['machine'],
    },
  ],

  'Machine chest press': [
    {
      name: 'Dumbbell bench press',
      reason: 'Free weight equivalent. Adds stability demand.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Barbell bench press',
      reason: 'Upgrades to barbell primary. Highest load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
  ],

  // ─── VERTICAL PUSH ──────────────────────────────────────────────────────────

  'Barbell overhead press': [
    {
      name: 'Dumbbell overhead press',
      reason: 'Pattern preserved. Use neutral grip when shoulder impingement is reported.',
      note: 'Use 80–85% of barbell load per dumbbell. Greater stability demand.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Seated dumbbell overhead press',
      reason: 'Reduces core and balance demand. Valid when lower back fatigue is limiting standing press.',
      note: 'Seated allows slightly higher loads — calibrate RPE.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Landmine press',
      reason: 'Arcing press path reduces shoulder impingement risk. Valid when overhead ROM is restricted.',
      note: 'Lower absolute load — not a direct load comparison.',
      requiresEquipment: ['barbell'],
    },
  ],

  'Dumbbell overhead press': [
    {
      name: 'Barbell overhead press',
      reason: 'Upgrades to barbell primary. Higher load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Seated dumbbell overhead press',
      reason: 'Same movement seated. Reduces lower back and balance demand.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Landmine press',
      reason: 'Arcing press path reduces shoulder impingement risk.',
      note: 'Lower absolute load — adjust RPE expectations.',
      requiresEquipment: ['barbell'],
    },
  ],

  'Seated dumbbell overhead press': [
    {
      name: 'Dumbbell overhead press',
      reason: 'Standing equivalent. Adds core and balance demand.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Barbell overhead press',
      reason: 'Upgrades to barbell primary. Higher load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Landmine press',
      reason: 'Shoulder-friendly alternative when overhead ROM is restricted.',
      note: null,
      requiresEquipment: ['barbell'],
    },
  ],

  'Landmine press': [
    {
      name: 'Dumbbell overhead press',
      reason: 'Free weight overhead equivalent. Greater ROM.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Seated dumbbell overhead press',
      reason: 'Seated equivalent. Less shoulder demand than standing barbell.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
  ],

  // ─── HORIZONTAL PULL ────────────────────────────────────────────────────────

  'Barbell row': [
    {
      name: 'Dumbbell row',
      reason: 'Horizontal pull pattern preserved. Unilateral — greater ROM and heavier loading per side.',
      note: 'Use 55–60% of barbell row load per dumbbell. Brace with non-working hand.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Chest-supported dumbbell row',
      reason: 'Eliminates lower back demand. Mandatory amber gate substitute.',
      note: 'Preferred when lumbar fatigue is reported.',
      requiresEquipment: ['dumbbells'],
      gateRestricted: true,
    },
    {
      name: 'Cable row',
      reason: 'Pattern preserved. Constant tension through full ROM.',
      note: 'Close grip emphasises lower traps and lats. Wide grip increases rear delt.',
      requiresEquipment: ['cable'],
    },
    {
      name: 'Machine row',
      reason: 'Valid when barbell and cable are unavailable. Pattern preserved.',
      note: null,
      requiresEquipment: ['machine'],
    },
  ],

  'Dumbbell row': [
    {
      name: 'Barbell row',
      reason: 'Upgrades to bilateral barbell primary. Higher absolute load.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Chest-supported dumbbell row',
      reason: 'Same dumbbell movement with lower back eliminated. Preferred on amber gate.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Cable row',
      reason: 'Pattern preserved. Constant cable tension throughout ROM.',
      note: null,
      requiresEquipment: ['cable'],
    },
  ],

  'Chest-supported dumbbell row': [
    {
      name: 'Dumbbell row',
      reason: 'Unilateral equivalent without the chest support. Adds lower back demand.',
      note: 'Only switch when lower back is fully recovered.',
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Cable row',
      reason: 'Seated cable row has minimal lower back demand — comparable to chest-supported.',
      note: null,
      requiresEquipment: ['cable'],
    },
    {
      name: 'Machine row',
      reason: 'Machine row also minimises lower back involvement. Valid equivalent.',
      note: null,
      requiresEquipment: ['machine'],
    },
  ],

  'Cable row': [
    {
      name: 'Dumbbell row',
      reason: 'Direct substitute when cable is unavailable.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Barbell row',
      reason: 'Upgrades to barbell primary. Higher load potential.',
      note: null,
      requiresEquipment: ['barbell'],
    },
    {
      name: 'Chest-supported dumbbell row',
      reason: 'Valid when lower back fatigue is a concern and cable is unavailable.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Machine row',
      reason: 'Machine equivalent when cable station is taken or unavailable.',
      note: null,
      requiresEquipment: ['machine'],
    },
  ],

  'Machine row': [
    {
      name: 'Cable row',
      reason: 'Direct cable equivalent. Constant tension throughout ROM.',
      note: null,
      requiresEquipment: ['cable'],
    },
    {
      name: 'Dumbbell row',
      reason: 'Free weight equivalent when no machine or cable is available.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
    {
      name: 'Chest-supported dumbbell row',
      reason: 'Chest-supported variant eliminates lower back. Similar machine-like stability.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
  ],

  // ─── VERTICAL PULL ──────────────────────────────────────────────────────────

  'Weighted pull-up': [
    {
      name: 'Pull-up',
      reason: 'Pattern fully preserved. Remove added weight — use when weighted RPE is too high.',
      note: null,
      requiresEquipment: ['pull_up_bar'],
    },
    {
      name: 'Band-assisted pull-up',
      reason: 'Pattern fully preserved. Reduces effective load. Preferred over lat pulldown when a rig is available.',
      note: 'Use thinnest band that lets you hit target rep range at RPE 7–8.',
      requiresEquipment: ['pull_up_bar', 'bands'],
    },
    {
      name: 'Lat pulldown',
      reason: 'Vertical pull pattern preserved. Allows load adjustment below bodyweight.',
      note: 'Removes bodyweight stabilisation demand. Use when pull-up produces RPE 10 before rep target.',
      requiresEquipment: ['cable'],
    },
  ],

  'Pull-up': [
    {
      name: 'Weighted pull-up',
      reason: 'Upgrades stimulus. Add load via dip belt when bodyweight is insufficient.',
      note: 'Start with 5kg and calibrate to RPE 7–8.',
      requiresEquipment: ['pull_up_bar'],
    },
    {
      name: 'Band-assisted pull-up',
      reason: 'Reduces effective load when bodyweight pull-up is too difficult for target rep range.',
      note: 'Use thinnest band that allows the rep standard at RIR 2.',
      requiresEquipment: ['pull_up_bar', 'bands'],
    },
    {
      name: 'Lat pulldown',
      reason: 'Machine equivalent when pull-up bar is unavailable.',
      note: null,
      requiresEquipment: ['cable'],
    },
  ],

  'Band-assisted pull-up': [
    {
      name: 'Pull-up',
      reason: 'Progression — remove the band when target reps are achievable at RIR 2 without it.',
      note: null,
      requiresEquipment: ['pull_up_bar'],
    },
    {
      name: 'Lat pulldown',
      reason: 'Machine equivalent when pull-up bar or bands are unavailable.',
      note: null,
      requiresEquipment: ['cable'],
    },
  ],

  'Lat pulldown': [
    {
      name: 'Pull-up',
      reason: 'Upgrades to bodyweight compound. Preferred when pull-up strength is adequate.',
      note: null,
      requiresEquipment: ['pull_up_bar'],
    },
    {
      name: 'Band-assisted pull-up',
      reason: 'Pull-up pattern with assistance. Preferred over machine when a rig is available.',
      note: null,
      requiresEquipment: ['pull_up_bar', 'bands'],
    },
    {
      name: 'Cable pulldown (neutral grip)',
      reason: 'Direct equipment substitute if specific lat pulldown machine is unavailable.',
      note: null,
      requiresEquipment: ['cable'],
    },
  ],

  // ─── CALISTHENICS — PUSH LADDER ─────────────────────────────────────────────
  // Equipment-driven regressions only. These do not affect skill ladder counters.

  'Ring push-up': [
    {
      name: 'Archer push-up',
      reason: 'Same rung difficulty without rings. Pattern fully preserved.',
      note: 'Ladder progression continues normally on this substitute.',
      requiresEquipment: [],
    },
  ],

  'Ring dip': [
    {
      name: 'Parallel bar dip',
      reason: 'Dip pattern preserved. Less instability demand than rings.',
      note: null,
      requiresEquipment: ['dip_bar'],
    },
    {
      name: 'Diamond push-up',
      reason: 'One rung down. Use when dip bar and rings are both unavailable.',
      note: 'Ladder advancement pauses — this counts as an equipment-limited session.',
      requiresEquipment: [],
    },
  ],

  'Weighted ring dip': [
    {
      name: 'Weighted parallel bar dip',
      reason: 'Dip pattern preserved with added load. Less instability than rings.',
      note: null,
      requiresEquipment: ['dip_bar'],
    },
    {
      name: 'Ring dip',
      reason: 'Remove added weight and continue on rings.',
      note: null,
      requiresEquipment: ['rings'],
    },
  ],

  // ─── CALISTHENICS — PULL LADDER ─────────────────────────────────────────────

  'L-sit pull-up': [
    {
      name: 'Pull-up',
      reason: 'Remove the L-sit position. Use when core compression fails before pull strength.',
      note: 'Continue L-sit core ladder independently to build the required compression strength.',
      requiresEquipment: ['pull_up_bar'],
    },
  ],

  'Archer pull-up': [
    {
      name: 'Weighted pull-up',
      reason: 'Add load to standard pull-up when bar access is limited to standard grip only.',
      note: 'Ladder advancement pauses — log as equipment-limited.',
      requiresEquipment: ['pull_up_bar'],
    },
  ],

  'One-arm negative': [
    {
      name: 'Archer pull-up',
      reason: 'One rung down. Use when one-arm negative is not yet achievable.',
      note: null,
      requiresEquipment: ['pull_up_bar'],
    },
  ],

  // ─── CALISTHENICS — CORE LADDER ─────────────────────────────────────────────

  'L-sit (parallettes)': [
    {
      name: 'L-sit (floor)',
      reason: 'Same movement on the floor. Valid substitute if wrist extension is adequate.',
      note: 'Count as same rung if full ROM is achieved.',
      requiresEquipment: [],
    },
  ],

  'Tuck V-sit': [
    {
      name: 'Advanced tuck L-sit hold',
      reason: 'One step below tuck V-sit. Use when parallettes are unavailable.',
      note: null,
      requiresEquipment: [],
    },
  ],

  'V-sit': [
    {
      name: 'Tuck V-sit',
      reason: 'One rung down. Use when full V-sit is not yet achievable.',
      note: null,
      requiresEquipment: [],
    },
  ],

  // ─── CALISTHENICS — SQUAT LADDER ────────────────────────────────────────────

  'Nordic curl': [
    {
      name: 'Leg curl (machine)',
      reason: 'Hamstring knee-flexion pattern preserved. Use when Nordic curl anchor is unavailable.',
      note: 'Ladder advancement pauses — log as equipment-limited.',
      requiresEquipment: ['machine'],
    },
    {
      name: 'Dumbbell leg curl',
      reason: 'Hamstring knee-flexion with dumbbell held between feet. Valid emergency substitute.',
      note: null,
      requiresEquipment: ['dumbbells'],
    },
  ],

  'Weighted Nordic curl': [
    {
      name: 'Nordic curl',
      reason: 'Remove added weight. Continue with bodyweight until strength supports loading.',
      note: null,
      requiresEquipment: [],
    },
    {
      name: 'Leg curl (machine)',
      reason: 'Machine equivalent when Nordic curl anchor is unavailable.',
      note: null,
      requiresEquipment: ['machine'],
    },
  ],
}

// ─── Utility functions ────────────────────────────────────────────────────────

/**
 * Returns valid substitutes for a movement, filtered by available equipment
 * and excluding the currently active substitute (to prevent circular display).
 *
 * @param movementName - The movement being substituted (current displayed name)
 * @param availableEquipment - Map of equipment availability from athlete profile.
 *   Pass null to skip equipment filtering.
 * @param activeSubstitute - Currently active substitute name to exclude from results.
 */
export function getSubstitutes(
  movementName: string,
  availableEquipment: Partial<Record<Equipment, boolean>> | null = null,
  activeSubstitute: string | null = null,
): SubstituteEntry[] {
  let entries = SUBSTITUTIONS[movementName] ?? []

  if (availableEquipment !== null) {
    entries = entries.filter(sub =>
      sub.requiresEquipment.every(req => availableEquipment[req] === true),
    )
  }

  if (activeSubstitute !== null) {
    entries = entries.filter(sub => sub.name !== activeSubstitute)
  }

  return entries
}

/**
 * Returns true if there are any available substitutes for a movement
 * given the athlete's equipment profile.
 */
export function hasSubstitutes(
  movementName: string,
  availableEquipment: Partial<Record<Equipment, boolean>> | null = null,
): boolean {
  return getSubstitutes(movementName, availableEquipment).length > 0
}

/**
 * Returns all movement names that have substitution entries defined.
 * Useful for validating that session exercises are covered.
 */
export function getCoveredMovements(): string[] {
  return Object.keys(SUBSTITUTIONS)
}