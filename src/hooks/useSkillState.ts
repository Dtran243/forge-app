/**
 * useSkillState.ts
 *
 * Fetches all skill_state rows for the current user — one row per
 * calisthenics ladder. Returns them as an array and as a lookup map
 * keyed by ladder name.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SkillStateRow } from '../lib/supabase';
import type { LadderName } from '../types/athlete';

interface UseSkillStateResult {
  skillRows: SkillStateRow[];
  /** Quick lookup by ladder name. */
  skillByLadder: Partial<Record<LadderName, SkillStateRow>>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSkillState(): UseSkillStateResult {
  const [skillRows, setSkillRows] = useState<SkillStateRow[]>([]);
  const [skillByLadder, setSkillByLadder] = useState<
    Partial<Record<LadderName, SkillStateRow>>
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
        setSkillRows([]);
        setSkillByLadder({});
        return;
      }

      const { data, error: queryError } = await supabase
        .from('skill_state')
        .select('*')
        .eq('user_id', session.user.id)
        .order('ladder', { ascending: true });

      if (queryError) throw queryError;

      const rows = data ?? [];
      const byLadder = Object.fromEntries(
        rows.map((r) => [r.ladder as LadderName, r]),
      ) as Partial<Record<LadderName, SkillStateRow>>;

      setSkillRows(rows);
      setSkillByLadder(byLadder);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { skillRows, skillByLadder, isLoading, error, refetch: fetch };
}
