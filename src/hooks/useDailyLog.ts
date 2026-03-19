/**
 * useDailyLog.ts
 *
 * Fetches today's daily_logs row for the current user.
 * A null result means the athlete hasn't submitted today's check-in yet.
 * Also updates the recoveryStore's checkInCompleted flag.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { localDateISO } from '../lib/dates';
import type { DailyLogRow } from '../lib/supabase';
import { useRecoveryStore } from '../store/recoveryStore';

interface UseDailyLogResult {
  todayLog: DailyLogRow | null;
  checkInCompleted: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDailyLog(): UseDailyLogResult {
  const [todayLog, setTodayLog] = useState<DailyLogRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { checkInCompleted, markCheckInComplete } = useRecoveryStore();

  const fetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setTodayLog(null);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('log_date', localDateISO())
        .maybeSingle();

      if (queryError) throw queryError;
      setTodayLog(data);

      // Sync the recovery store if a log exists but the store doesn't know yet.
      if (data && !checkInCompleted) {
        markCheckInComplete(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [checkInCompleted]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { todayLog, checkInCompleted, isLoading, error, refetch: fetch };
}
