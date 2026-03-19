/**
 * (auth)/_layout.tsx
 *
 * Stack navigator for the unauthenticated screens.
 * No header shown — each screen handles its own chrome.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
