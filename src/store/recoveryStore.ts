/**
 * recoveryStore.ts
 *
 * Holds the athlete's current recovery gate colour and today's check-in status.
 * Populated by useRecoveryState and useDailyLog hooks on app start.
 * Updated immediately (optimistically) when the athlete submits a check-in,
 * before the Edge Function confirms.
 */

import { create } from 'zustand';
import type { DailyLogRow, RecoveryStateRow } from '../lib/supabase';
import type { GateColour } from '../types/athlete';

interface RecoveryStore {
  /** The athlete's current recovery gate colour. Defaults to 'green' until loaded. */
  currentGate: GateColour;
  /** True once the athlete has submitted today's check-in. */
  checkInCompleted: boolean;
  /** The daily_logs row for today, if it exists. Null until loaded or if no check-in yet. */
  todayLog: DailyLogRow | null;
  /** The full recovery_state row. Null until loaded. */
  recoveryState: RecoveryStateRow | null;

  /** Set the current gate colour (called after check-in or on store hydration). */
  setCurrentGate: (gate: GateColour) => void;

  /**
   * Mark the check-in as complete and store today's log.
   * Called optimistically after the athlete submits, before Edge Function confirms.
   */
  markCheckInComplete: (log: DailyLogRow) => void;

  /** Hydrate the store from the database on app start. */
  hydrate: (state: RecoveryStateRow, todayLog: DailyLogRow | null) => void;

  /** Reset to defaults (called on sign-out). */
  reset: () => void;
}

const INITIAL_STATE: Pick<
  RecoveryStore,
  'currentGate' | 'checkInCompleted' | 'todayLog' | 'recoveryState'
> = {
  currentGate: 'green',
  checkInCompleted: false,
  todayLog: null,
  recoveryState: null,
};

export const useRecoveryStore = create<RecoveryStore>((set) => ({
  ...INITIAL_STATE,

  setCurrentGate: (gate) => set({ currentGate: gate }),

  markCheckInComplete: (log) =>
    set({
      checkInCompleted: true,
      todayLog: log,
      // Gate is set separately by setCurrentGate after the edge function confirms.
      // Do not override here — the recovery hook owns the gate value.
    }),

  hydrate: (recoveryState, todayLog) =>
    set({
      currentGate: recoveryState.current_gate,
      checkInCompleted: todayLog !== null,
      todayLog,
      recoveryState,
    }),

  reset: () => set({ ...INITIAL_STATE }),
}));
