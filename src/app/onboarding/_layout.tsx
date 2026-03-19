/**
 * onboarding/_layout.tsx
 *
 * Stack navigator for the onboarding flow.
 * Screens are presented in sequence — no tab bar, no back gesture on the
 * welcome screen (headerShown: false throughout for full-screen dark UI).
 */

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="health-permissions" />
      <Stack.Screen name="equipment" />
      <Stack.Screen name="assessment-briefing" />
      <Stack.Screen name="assessment-session" />
      <Stack.Screen name="calisthenics-placement" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
