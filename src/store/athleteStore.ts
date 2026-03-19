/**
 * athleteStore.ts
 *
 * Holds the authenticated athlete's profile and derived preferences.
 * Populated by useAthleteProfile hook on app start.
 * Provides optimistic update actions for phase and equipment changes
 * (the engine picks up the changes at the next weekly run).
 */

import { create } from 'zustand';
import type { AthleteProfileRow } from '../lib/supabase';
import type { EquipmentProfile, TrainingPhase } from '../types/athlete';

interface AthleteStore {
  profile: AthleteProfileRow | null;
  isLoading: boolean;

  /** Replace the full profile (called by useAthleteProfile on fetch). */
  setProfile: (profile: AthleteProfileRow | null) => void;

  /** Mark the store as loading (called before a fetch begins). */
  setLoading: (loading: boolean) => void;

  /**
   * Optimistically update the training phase in local state.
   * The caller is responsible for persisting to Supabase.
   */
  updatePhase: (phase: TrainingPhase) => void;

  /**
   * Optimistically update the equipment profile in local state.
   * The caller is responsible for persisting to Supabase.
   */
  updateEquipment: (equipment: EquipmentProfile) => void;
}

export const useAthleteStore = create<AthleteStore>((set) => ({
  profile: null,
  isLoading: true,

  setProfile: (profile) => set({ profile, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  updatePhase: (phase) =>
    set((state) =>
      state.profile ? { profile: { ...state.profile, phase } } : state,
    ),

  updateEquipment: (equipment) =>
    set((state) =>
      state.profile ? { profile: { ...state.profile, equipment } } : state,
    ),
}));
