/**
 * _layout.tsx — Root layout
 *
 * Single source of truth for auth routing.
 *
 * Rules:
 *   - No session          → /(auth)/sign-in
 *   - Session, no profile
 *     OR onboarding_complete = false → /onboarding (Stage 3)
 *   - Session, onboarding_complete = true → /(tabs)/today
 *
 * Shows an activity indicator while the session is being resolved so the
 * app never flashes an incorrect screen.
 */

import '../../global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchAthleteProfile, onAuthStateChange } from '../lib/auth';
import type { AthleteProfileRow } from '../lib/supabase';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'needs_onboarding'; session: Session }
  | { status: 'authenticated'; session: Session; profile: AthleteProfileRow };

export default function RootLayout() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const router = useRouter();
  const segments = useSegments();

  async function resolveAuthState(session: Session | null): Promise<void> {
    if (!session) {
      setAuthState({ status: 'unauthenticated' });
      return;
    }

    try {
      const profile = await fetchAthleteProfile(session.user.id);

      if (!profile || !profile.onboarding_complete) {
        setAuthState({ status: 'needs_onboarding', session });
      } else {
        setAuthState({ status: 'authenticated', session, profile });
      }
    } catch {
      // Profile fetch failed (e.g. table not yet migrated) but the session
      // is valid — send to onboarding rather than kicking them out.
      setAuthState({ status: 'needs_onboarding', session });
    }
  }

  useEffect(() => {
    // Resolve initial session from local cache.
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveAuthState(session);
    });

    // Keep auth state in sync with sign-in / sign-out events.
    const unsubscribe = onAuthStateChange((_event, session) => {
      resolveAuthState(session);
    });

    return unsubscribe;
  }, []);

  // Redirect when auth state changes, unless already on the correct segment.
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    switch (authState.status) {
      case 'loading':
        break;
      case 'unauthenticated':
        if (!inAuthGroup) router.replace('/(auth)/sign-in');
        break;
      case 'needs_onboarding':
        if (!inOnboarding) router.replace('/onboarding');
        break;
      case 'authenticated':
        if (!inTabs) router.replace('/(tabs)/today');
        break;
    }
  }, [authState, segments]);

  if (authState.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return <Slot />;
}
