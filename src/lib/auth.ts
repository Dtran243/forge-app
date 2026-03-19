/**
 * auth.ts
 *
 * Pure auth functions and session utilities.
 * All functions return typed results — callers handle error display.
 *
 * The API key is never exposed: all Supabase calls go through the
 * anon client which is subject to RLS. Service role key is Edge Functions only.
 */

import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AthleteProfileRow } from './supabase';

// ── Auth operations ──────────────────────────────────────────────────────────

/**
 * Signs the user in with email and password.
 * Returns the session on success, throws on failure.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.session) throw new Error('Sign in succeeded but no session was returned.');
  return data.session;
}

/**
 * Creates a new account with email and password.
 * Returns the user on success, throws on failure.
 * Note: Supabase may require email confirmation depending on project settings.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign up succeeded but no user was returned.');
  return data.user;
}

/** Signs the current user out and clears the local session. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Returns the current user from the active session, or null if not signed in.
 * Reads from the local cache — does not make an API call.
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/**
 * Returns the current session, or null if the user is not signed in.
 * Reads from the local cache — does not make an API call.
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Subscribes to auth state changes (sign in, sign out, token refresh).
 * Returns an unsubscribe function — call it on cleanup.
 *
 * @example
 * const unsubscribe = onAuthStateChange((event, session) => { ... })
 * return () => unsubscribe()
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ── Profile helpers ──────────────────────────────────────────────────────────

/**
 * Fetches the athlete_profiles row for the given user.
 * Returns null if no profile exists yet (new user before onboarding).
 */
export async function fetchAthleteProfile(
  userId: string,
): Promise<AthleteProfileRow | null> {
  const { data, error } = await supabase
    .from('athlete_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
