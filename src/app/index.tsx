/**
 * index.tsx — Root index
 *
 * Expo Router needs a screen at "/" to avoid an unmatched route on cold start.
 * The root _layout.tsx handles the actual redirect once the auth state resolves.
 */

import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <ActivityIndicator color="#ffffff" />
    </View>
  );
}
