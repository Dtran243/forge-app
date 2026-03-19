/**
 * useWeeklyReport.ts
 *
 * Fetches the most recent weekly_reports row for the current user and
 * populates the weekStore. The week store is the primary source for
 * pillar scores, the coaching report text, and the current week's program.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { WeeklyReportRow } from '../lib/supabase';
import { useWeekStore } from '../store/weekStore';

interface UseWeeklyReportResult {
  report: WeeklyReportRow | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWeeklyReport(): UseWeeklyReportResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { report, setReport, setLoading } = useWeekStore();

  const fetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setReport(null);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', session.user.id)
        .order('week_ending', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;
      setReport(data);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { report, isLoading, error, refetch: fetch };
}
