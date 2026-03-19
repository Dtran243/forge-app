/**
 * weekStore.ts
 *
 * Holds the current week's program, pillar scores, and coaching report.
 * Populated by useWeeklyReport hook on app start.
 *
 * The program is the engine's ProgramJson written to weekly_reports.program.
 * Pillar scores are the individual score columns on the same row.
 */

import { create } from 'zustand';
import type { WeeklyReportRow } from '../lib/supabase';
import type { PillarScoresJson, PlannedSession } from '../types/athlete';

interface WeekStore {
  /** The most recent weekly_reports row. Null until loaded or on first week. */
  report: WeeklyReportRow | null;
  /** The four pillar scores extracted from the current report. */
  pillarScores: PillarScoresJson | null;
  /**
   * The planned sessions for the current week, extracted from report.program.
   * Empty array before the first engine run.
   */
  currentWeekSessions: PlannedSession[];
  isLoading: boolean;

  /** Hydrate the store from the database (called by useWeeklyReport). */
  setReport: (report: WeeklyReportRow | null) => void;

  /** Mark the store as loading (called before a fetch begins). */
  setLoading: (loading: boolean) => void;

  /** Reset to defaults (called on sign-out). */
  reset: () => void;
}

export const useWeekStore = create<WeekStore>((set) => ({
  report: null,
  pillarScores: null,
  currentWeekSessions: [],
  isLoading: true,

  setReport: (report) => {
    if (!report) {
      set({ report: null, pillarScores: null, currentWeekSessions: [], isLoading: false });
      return;
    }

    const pillarScores: PillarScoresJson | null =
      report.strength_score !== null &&
      report.skill_score !== null &&
      report.cardio_score !== null &&
      report.mobility_score !== null
        ? {
            strength_score: report.strength_score,
            skill_score: report.skill_score,
            cardio_score: report.cardio_score,
            mobility_score: report.mobility_score,
          }
        : null;

    set({
      report,
      pillarScores,
      currentWeekSessions: report.program?.sessions ?? [],
      isLoading: false,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      report: null,
      pillarScores: null,
      currentWeekSessions: [],
      isLoading: true,
    }),
}));
