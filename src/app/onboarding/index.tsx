/**
 * onboarding/index.tsx — Welcome screen
 *
 * First screen a new user sees after creating an account.
 * Establishes the Forge identity and leads into the setup flow.
 */

import { Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function OnboardingWelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-black px-6 justify-between py-16">
      {/* Top — identity */}
      <View>
        <Text className="text-white text-5xl font-bold tracking-tight">Forge</Text>
        <Text className="text-zinc-400 text-base mt-3 leading-relaxed">
          Your program. Adapted every week.{'\n'}
          Built from your data, not a template.
        </Text>
      </View>

      {/* Middle — value props */}
      <View className="gap-6">
        <ValueProp
          title="Science-backed engine"
          body="Volume, load, and recovery decisions follow peer-reviewed sport science — not guesswork."
        />
        <ValueProp
          title="Adapts every Sunday"
          body="After each week, the engine reads your check-ins and session data and rewrites your program."
        />
        <ValueProp
          title="Coach in your pocket"
          body="Ask anything about your training, technique, or nutrition. Context-aware AI, no hallucinated numbers."
        />
      </View>

      {/* Bottom — CTA */}
      <View className="gap-4">
        <Text className="text-zinc-600 text-xs text-center">Takes about 10 minutes to set up.</Text>
        <TouchableOpacity
          onPress={() => router.push('/onboarding/profile')}
          className="bg-white rounded-xl py-4 items-center"
        >
          <Text className="text-black text-base font-semibold">Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ValueProp({ title, body }: { title: string; body: string }) {
  return (
    <View className="flex-row gap-4">
      <View className="w-1 bg-zinc-700 rounded-full" />
      <View className="flex-1">
        <Text className="text-white text-sm font-semibold mb-1">{title}</Text>
        <Text className="text-zinc-500 text-sm leading-relaxed">{body}</Text>
      </View>
    </View>
  );
}
