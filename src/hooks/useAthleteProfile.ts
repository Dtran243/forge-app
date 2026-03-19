/**
 * useAthleteProfile.ts
 *
 * Fetches the athlete_profiles row for the current user and populates
 * the athleteStore. Returns the profile alongside loading and error state.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AthleteProfileRow } from '../lib/supabase';
import { useAthleteStore } from '../store/athleteStore';

interface UseAthleteProfileResult {
  profile: AthleteProfileRow | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAthleteProfile(): UseAthleteProfileResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile, setProfile, setLoading } = useAthleteStore();

  const fetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setProfile(null);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (queryError) throw queryError;
      setProfile(data);
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

  return { profile, isLoading, error, refetch: fetch };
}
