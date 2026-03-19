/**
 * useStrengthState.ts
 *
 * Fetches all strength_state rows for the current user — one row per
 * tracked compound movement. Returns them as an array (ordered by
 * movement_name ascending) and as a lookup map keyed by movement name.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { StrengthStateRow } from '../lib/supabase';

interface UseStrengthStateResult {
  strengthRows: StrengthStateRow[];
  /** Quick lookup by movement_name. */
  strengthByMovement: Record<string, StrengthStateRow>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useStrengthState(): UseStrengthStateResult {
  const [strengthRows, setStrengthRows] = useState<StrengthStateRow[]>([]);
  const [strengthByMovement, setStrengthByMovement] = useState<
    Record<string, StrengthStateRow>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStrengthRows([]);
        setStrengthByMovement({});
        return;
      }

      const { data, error: queryError } = await supabase
        .from('strength_state')
        .select('*')
        .eq('user_id', session.user.id)
        .order('movement_name', { ascending: true });

      if (queryError) throw queryError;

      const rows = data ?? [];
      const byMovement = Object.fromEntries(rows.map((r) => [r.movement_name, r]));
      setStrengthRows(rows);
      setStrengthByMovement(byMovement);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { strengthRows, strengthByMovement, isLoading, error, refetch: fetch };
}
