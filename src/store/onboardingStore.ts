/**
 * onboardingStore.ts
 *
 * Holds all data collected across the onboarding flow.
 * Each screen reads from and writes to this store.
 * The complete.tsx screen sends the full store to the onboarding-complete
 * Edge Function, which creates the athlete profile and all initial state rows.
 *
 * This store is never persisted — it only lives for the duration of the
 * onboarding session. Once onboarding_complete is set to true in Supabase,
 * the root layout redirects to the Today tab and this store is abandoned.
 */

import { create } from 'zustand';
import type { TrainingAge, TrainingPhase, EquipmentProfile, LadderName } from '../types/athlete';

/** A single confirmed load from the assessment ramp protocol. */
export interface AssessmentLoad {
  /** TrackedMovement key (e.g. "deadlift", "barbell_squat"). */
  movementKey: string;
  /** Human-readable display name. */
  displayName: string;
  /** Confirmed working load in kg. */
  loadKg: number;
}

/** Self-placement rung (1-based) for each calisthenics ladder. */
export interface LadderPlacements {
  push_ladder: number;
  pull_ladder: number;
  core_ladder: number;
  squat_ladder: number;
}

export interface OnboardingStore {
  // ── Profile ────────────────────────────────────────────────────────────────
  age: number | null;
  bodyweight_kg: number | null;
  height_cm: number | null;
  training_age: TrainingAge;
  phase: TrainingPhase;

  // ── Health permissions ─────────────────────────────────────────────────────
  healthPermissionsGranted: boolean;

  // ── Equipment ──────────────────────────────────────────────────────────────
  equipment: EquipmentProfile;

  // ── Assessment ─────────────────────────────────────────────────────────────
  /** True when the athlete chose to skip the guided assessment. */
  skippedAssessment: boolean;
  /** Confirmed working loads per movement from the ramp protocol. */
  assessmentLoads: AssessmentLoad[];

  // ── Calisthenics placement ─────────────────────────────────────────────────
  ladderPlacements: LadderPlacements;

  // ── Actions ────────────────────────────────────────────────────────────────
  setProfile: (data: {
    age: number | null;
    bodyweight_kg: number | null;
    height_cm: number | null;
    training_age: TrainingAge;
    phase: TrainingPhase;
  }) => void;

  setHealthPermissionsGranted: (granted: boolean) => void;

  setEquipment: (equipment: EquipmentProfile) => void;

  setAssessmentLoads: (loads: AssessmentLoad[]) => void;
  setSkippedAssessment: (skipped: boolean) => void;

  setLadderPlacement: (ladder: LadderName, rung: number) => void;

  reset: () => void;
}

const DEFAULT_EQUIPMENT: EquipmentProfile = {
  barbell_rack: false,
  dumbbells: false,
  cable_machine: false,
  pull_up_bar: false,
  rings: false,
  parallettes: false,
};

const DEFAULT_LADDER_PLACEMENTS: LadderPlacements = {
  push_ladder: 1,
  pull_ladder: 1,
  core_ladder: 1,
  squat_ladder: 1,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  // Profile defaults
  age: null,
  bodyweight_kg: null,
  height_cm: null,
  training_age: 'athlete',
  phase: 'build',

  // Health
  healthPermissionsGranted: false,

  // Equipment
  equipment: DEFAULT_EQUIPMENT,

  // Assessment
  skippedAssessment: false,
  assessmentLoads: [],

  // Ladders
  ladderPlacements: DEFAULT_LADDER_PLACEMENTS,

  // ── Actions ──────────────────────────────────────────────────────────────

  setProfile: (data) => set(data),

  setHealthPermissionsGranted: (granted) =>
    set({ healthPermissionsGranted: granted }),

  setEquipment: (equipment) => set({ equipment }),

  setAssessmentLoads: (loads) => set({ assessmentLoads: loads }),

  setSkippedAssessment: (skipped) => set({ skippedAssessment: skipped }),

  setLadderPlacement: (ladder, rung) =>
    set((state) => ({
      ladderPlacements: { ...state.ladderPlacements, [ladder]: rung },
    })),

  reset: () =>
    set({
      age: null,
      bodyweight_kg: null,
      height_cm: null,
      training_age: 'athlete',
      phase: 'build',
      healthPermissionsGranted: false,
      equipment: DEFAULT_EQUIPMENT,
      skippedAssessment: false,
      assessmentLoads: [],
      ladderPlacements: DEFAULT_LADDER_PLACEMENTS,
    }),
}));
