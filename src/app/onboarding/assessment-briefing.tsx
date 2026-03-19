/**
 * onboarding/assessment-briefing.tsx — Assessment explanation
 *
 * Explains the guided load assessment before the athlete begins.
 * Offers two options: run the assessment (accurate starting loads) or
 * skip it (engine starts at conservative defaults, auto-adjusts over 2–3 weeks).
 */

import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../../store/onboardingStore';

const ASSESSMENT_STEPS = [
  'Set up the first movement with a comfortable starting weight.',
  'Perform 6 reps at that load.',
  'Report your Reps in Reserve (how many more you had in the tank).',
  'Forge adjusts the suggestion and repeats — up to 3 sets per movement.',
  'The confirmed weight becomes your starting load.',
];

export default function AssessmentBriefingScreen() {
  const router = useRouter();
  const setSkipped = useOnboardingStore((s) => s.setSkippedAssessment);

  function handleRunAssessment() {
    setSkipped(false);
    router.push('/onboarding/assessment-session');
  }

  function handleSkip() {
    setSkipped(true);
    router.push('/onboarding/calisthenics-placement');
  }

  return (
    <View className="flex-1 bg-black px-6 justify-between py-16">
      <StepIndicator step={4} total={7} />

      <View className="flex-1 justify-center gap-8">
        <View>
          <Text className="text-white text-3xl font-bold mb-2">Load assessment</Text>
          <Text className="text-zinc-500 text-sm leading-relaxed">
            A short ramp protocol to find your working weight for each compound movement.
            Accurate starting loads mean the engine can progress you correctly from day one.
          </Text>
        </View>

        {/* Protocol steps */}
        <View className="gap-3">
          {ASSESSMENT_STEPS.map((step, i) => (
            <View key={i} className="flex-row gap-4">
              <View className="w-6 h-6 rounded-full bg-zinc-800 items-center justify-center mt-0.5">
                <Text className="text-zinc-400 text-xs font-bold">{i + 1}</Text>
              </View>
              <Text className="text-zinc-300 text-sm leading-relaxed flex-1">{step}</Text>
            </View>
          ))}
        </View>

        {/* Duration */}
        <View className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4">
          <Text className="text-zinc-400 text-sm leading-relaxed">
            <Text className="text-white font-medium">Takes 15–20 minutes</Text>
            {' '}depending on how many movements you have equipment for.
            You can skip movements you're unsure about.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View className="gap-3">
        <TouchableOpacity
          onPress={handleRunAssessment}
          className="bg-white rounded-xl py-4 items-center"
        >
          <Text className="text-black text-base font-semibold">Run Assessment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          className="border border-zinc-700 rounded-xl py-4 items-center"
        >
          <Text className="text-zinc-400 text-base">Skip — use conservative defaults</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-full ${i < step ? 'bg-white' : 'bg-zinc-800'}`}
        />
      ))}
    </View>
  );
}
