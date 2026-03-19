/**
 * useMesocycleState.ts
 *
 * Fetches the mesocycle_state row for the current user.
 * One active row per user — returns null if no mesocycle has been initialised yet
 * (new user who hasn't completed onboarding).
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MesocycleStateRow } from '../lib/supabase';

interface UseMesocycleStateResult {
  mesocycle: MesocycleStateRow | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMesocycleState(): UseMesocycleStateResult {
  const [mesocycle, setMesocycle] = useState<MesocycleStateRow | null>(null);
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
        setMesocycle(null);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('mesocycle_state')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (queryError) throw queryError;
      setMesocycle(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { mesocycle, isLoading, error, refetch: fetch };
}
