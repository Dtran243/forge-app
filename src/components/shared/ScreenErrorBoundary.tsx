/**
 * ScreenErrorBoundary.tsx
 *
 * Reusable error boundary UI for Expo Router's ErrorBoundary export.
 * Each tab screen exports this component as `ErrorBoundary` so uncaught
 * render errors show a recoverable fallback instead of a white crash screen.
 *
 * Usage in a route file:
 *   export { ScreenErrorBoundary as ErrorBoundary } from '../../components/shared/ScreenErrorBoundary';
 */

import { Text, TouchableOpacity, View } from 'react-native';

interface Props {
  error: Error;
  retry: () => void;
}

export function ScreenErrorBoundary({ error, retry }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
        Something went wrong
      </Text>
      <Text style={{ color: '#52525b', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
        {error.message || 'An unexpected error occurred.'}
      </Text>
      <TouchableOpacity
        onPress={retry}
        style={{ marginTop: 8, backgroundColor: '#18181b', borderRadius: 10, borderWidth: 1, borderColor: '#27272a', paddingHorizontal: 24, paddingVertical: 12 }}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}
