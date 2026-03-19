/**
 * useRecoveryState.ts
 *
 * Fetches the recovery_state row for the current user and populates
 * the recoveryStore alongside today's daily log entry.
 * The recovery gate colour displayed in the UI is always read from
 * the store, not directly from this hook.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RecoveryStateRow } from '../lib/supabase';
import { useRecoveryStore } from '../store/recoveryStore';

interface UseRecoveryStateResult {
  recoveryState: RecoveryStateRow | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/** Returns today's ISO date string in local time (YYYY-MM-DD). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useRecoveryState(): UseRecoveryStateResult {
  const [recoveryState, setRecoveryState] = useState<RecoveryStateRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { hydrate } = useRecoveryStore();

  const fetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setRecoveryState(null);
        return;
      }

      const userId = session.user.id;

      // Fetch recovery state and today's log in parallel.
      const [recoveryResult, logResult] = await Promise.all([
        supabase
          .from('recovery_state')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('log_date', todayIso())
          .maybeSingle(),
      ]);

      if (recoveryResult.error) throw recoveryResult.error;
      if (logResult.error) throw logResult.error;

      const state = recoveryResult.data;
      setRecoveryState(state);

      if (state) {
        hydrate(state, logResult.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { recoveryState, isLoading, error, refetch: fetch };
}
