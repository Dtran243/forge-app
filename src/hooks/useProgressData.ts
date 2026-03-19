/**
 * useProgressData.ts
 *
 * Data hooks for the Progress tab (Stage 8).
 * Each hook fetches a specific slice of historical data from Supabase.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { localDateISO } from '../lib/dates';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PillarScoreWeek {
  week_ending: string;
  strength_score: number | null;
  skill_score: number | null;
  cardio_score: number | null;
  mobility_score: number | null;
}

export interface CardioWeek {
  week_starting: string;
  zone2_minutes: number;
  zone2_target: number;
  intervals_completed: boolean;
}

export interface LadderProgress {
  ladder: string;
  current_rung: number;
  current_movement: string;
  current_standard: string;
  last_advancement_date: string | null;
  consecutive_weeks_met: number;
  advancement_due: boolean;
}

export interface HeatmapDay {
  date: string;
  session_type: string | null;
  session_rpe: number | null;
  trained: boolean;
}

export interface StrengthPR {
  movement_name: string;
  pr_kg: number | null;
  current_load_kg: number | null;
}

// ── Pillar score history ──────────────────────────────────────────────────────

export function usePillarScoreHistory() {
  const [data, setData] = useState<PillarScoreWeek[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setData([]); return; }

      const { data: rows, error: err } = await supabase
        .from('weekly_reports')
        .select('week_ending, strength_score, skill_score, cardio_score, mobility_score')
        .eq('user_id', session.user.id)
        .order('week_ending', { ascending: true })
        .limit(16);

      if (err) throw err;
      setData((rows ?? []) as PillarScoreWeek[]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, isLoading, error, refetch: fetch };
}

// ── Cardio trend ─────────────────────────────────────────────────────────────

export function useCardioTrend() {
  const [data, setData] = useState<CardioWeek[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setData([]); return; }

      const { data: rows, error: err } = await supabase
        .from('cardio_state')
        .select('week_starting, zone2_minutes, zone2_target, intervals_completed')
        .eq('user_id', session.user.id)
        .order('week_starting', { ascending: true })
        .limit(16);

      if (err) throw err;
      setData((rows ?? []) as CardioWeek[]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, isLoading, error, refetch: fetch };
}

// ── Ladder progress ───────────────────────────────────────────────────────────

export function useLadderProgress() {
  const [data, setData] = useState<LadderProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setData([]); return; }

      const { data: rows, error: err } = await supabase
        .from('skill_state')
        .select('ladder_name, current_rung, current_movement, current_standard, last_advancement_date, consecutive_weeks_meeting_standard, advancement_due')
        .eq('user_id', session.user.id);

      if (err) throw err;
      setData((rows ?? []).map((r: Record<string, unknown>) => ({
        ladder: r.ladder_name as string,
        current_rung: r.current_rung as number,
        current_movement: r.current_movement as string,
        current_standard: r.current_standard as string,
        last_advancement_date: r.last_advancement_date as string | null,
        consecutive_weeks_met: r.consecutive_weeks_meeting_standard as number,
        advancement_due: r.advancement_due as boolean,
      })));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, isLoading, error, refetch: fetch };
}

// ── Consistency heatmap ───────────────────────────────────────────────────────

export function useConsistencyHeatmap() {
  const [data, setData] = useState<HeatmapDay[]>([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setData([]); return; }

      const since = new Date();
      since.setDate(since.getDate() - 364);
      const sinceISO = localDateISO(since);

      const { data: logs, error: err } = await supabase
        .from('session_logs')
        .select('session_date, session_type, session_rpe')
        .eq('user_id', session.user.id)
        .gte('session_date', sinceISO)
        .order('session_date', { ascending: true });

      if (err) throw err;

      // Build a map from date → session info
      const logMap = new Map<string, { session_type: string; session_rpe: number | null }>();
      for (const log of logs ?? []) {
        if (log.session_type !== 'rest') {
          logMap.set(log.session_date, { session_type: log.session_type, session_rpe: log.session_rpe });
        }
      }

      // Build full 365-day array
      const days: HeatmapDay[] = [];
      for (let i = 364; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const entry = logMap.get(iso);
        days.push({
          date: iso,
          session_type: entry?.session_type ?? null,
          session_rpe: entry?.session_rpe ?? null,
          trained: !!entry,
        });
      }
      setData(days);

      // Compute current streak
      let s = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].trained) s++;
        else break;
      }
      setStreak(s);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, streak, isLoading, error, refetch: fetch };
}

// ── Strength PRs ─────────────────────────────────────────────────────────────

export function useStrengthPRs() {
  const [data, setData] = useState<StrengthPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setData([]); return; }

      const { data: rows, error: err } = await supabase
        .from('strength_state')
        .select('movement_name, pr_kg, current_load_kg')
        .eq('user_id', session.user.id)
        .order('movement_name', { ascending: true });

      if (err) throw err;
      setData((rows ?? []) as StrengthPR[]);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, isLoading, error, refetch: fetch };
}
