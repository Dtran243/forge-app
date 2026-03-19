/**
 * useSessionLogs.ts
 *
 * Fetches session_logs rows for the current user.
 * Defaults to the current ISO week (Monday–Sunday). Pass a custom
 * weekStarting date (YYYY-MM-DD) to fetch a different week.
 *
 * Used by the Progress tab for PR charts and the engine's weekly
 * input snapshot.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { localDateISO, currentWeekMondayISO } from '../lib/dates';
import type { SessionLogRow } from '../lib/supabase';

interface UseSessionLogsOptions {
  /** ISO date (YYYY-MM-DD) of the Monday that starts the target week.
   *  Defaults to the current week's Monday. */
  weekStarting?: string;
}

interface UseSessionLogsResult {
  sessionLogs: SessionLogRow[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/** Returns the ISO date of the Sunday following the given Monday. */
function weekEnding(weekStartingIso: string): string {
  // Parse as local date to avoid UTC shift
  const [y, m, d] = weekStartingIso.split('-').map(Number);
  const date = new Date(y, m - 1, d + 6);
  return localDateISO(date);
}

export function useSessionLogs(options: UseSessionLogsOptions = {}): UseSessionLogsResult {
  const [sessionLogs, setSessionLogs] = useState<SessionLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const weekStart = options.weekStarting ?? currentWeekMondayISO();
  const weekEnd = weekEnding(weekStart);

  const fetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setSessionLogs([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('session_date', weekStart)
        .lte('session_date', weekEnd)
        .order('session_date', { ascending: true });

      if (queryError) throw queryError;
      setSessionLogs(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { sessionLogs, isLoading, error, refetch: fetch };
}
