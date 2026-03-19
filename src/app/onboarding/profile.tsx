/**
 * onboarding/profile.tsx — Athlete profile
 *
 * Collects: age, bodyweight (kg), height (cm), training age, training phase.
 * Writes to onboardingStore — not Supabase yet (that happens at complete.tsx).
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../../store/onboardingStore';
import type { TrainingAge, TrainingPhase } from '../../types/athlete';

const TRAINING_AGES: { value: TrainingAge; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Less than 1 year of consistent training' },
  { value: 'intermediate', label: 'Intermediate', description: '1–2 years consistent training' },
  { value: 'athlete', label: 'Athlete', description: '2+ years consistent training' },
];

const PHASES: { value: TrainingPhase; label: string; description: string }[] = [
  { value: 'build', label: 'Build', description: 'Slight surplus — prioritise strength and muscle' },
  { value: 'lean', label: 'Lean', description: 'Slight deficit — protect strength, increase cardio' },
  { value: 'maintain', label: 'Maintain', description: 'Neutral — optimise performance across all pillars' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const store = useOnboardingStore();

  const [ageText, setAgeText] = useState(store.age?.toString() ?? '');
  const [weightText, setWeightText] = useState(store.bodyweight_kg?.toString() ?? '');
  const [heightText, setHeightText] = useState(store.height_cm?.toString() ?? '');
  const [trainingAge, setTrainingAge] = useState<TrainingAge>(store.training_age);
  const [phase, setPhase] = useState<TrainingPhase>(store.phase);
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    const age = parseInt(ageText, 10);
    const bodyweight = parseFloat(weightText);
    const height = parseFloat(heightText);

    if (!ageText || isNaN(age) || age < 14 || age > 80) {
      setError('Enter a valid age (14–80).');
      return;
    }
    if (!weightText || isNaN(bodyweight) || bodyweight < 30 || bodyweight > 250) {
      setError('Enter a valid bodyweight in kg (30–250).');
      return;
    }
    if (!heightText || isNaN(height) || height < 100 || height > 250) {
      setError('Enter a valid height in cm (100–250).');
      return;
    }

    setError(null);
    store.setProfile({
      age,
      bodyweight_kg: bodyweight,
      height_cm: height,
      training_age: trainingAge,
      phase,
    });
    router.push('/onboarding/health-permissions');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-16 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator step={1} total={7} />

        <Text className="text-white text-3xl font-bold mt-6 mb-1">Your profile</Text>
        <Text className="text-zinc-500 text-sm mb-8">
          Used to calibrate volume, heart rate zones, and max HR defaults.
        </Text>

        {error !== null && (
          <View className="bg-red-950 border border-red-700 rounded-lg px-4 py-3 mb-5">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        )}

        {/* Numeric fields */}
        <View className="flex-row gap-3 mb-6">
          <LabeledInput
            label="Age"
            value={ageText}
            onChangeText={setAgeText}
            placeholder="28"
            unit="yrs"
            className="flex-1"
          />
          <LabeledInput
            label="Bodyweight"
            value={weightText}
            onChangeText={setWeightText}
            placeholder="80"
            unit="kg"
            className="flex-1"
          />
          <LabeledInput
            label="Height"
            value={heightText}
            onChangeText={setHeightText}
            placeholder="178"
            unit="cm"
            className="flex-1"
          />
        </View>

        {/* Training age */}
        <SectionLabel label="Training experience" />
        <View className="gap-2 mb-6">
          {TRAINING_AGES.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={trainingAge === opt.value}
              onPress={() => setTrainingAge(opt.value)}
            />
          ))}
        </View>

        {/* Phase */}
        <SectionLabel label="Current goal" />
        <View className="gap-2 mb-8">
          {PHASES.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={phase === opt.value}
              onPress={() => setPhase(opt.value)}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          className="bg-white rounded-xl py-4 items-center"
        >
          <Text className="text-black text-base font-semibold">Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-zinc-400 text-xs uppercase tracking-widest mb-2">{label}</Text>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  className,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  unit: string;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="text-zinc-400 text-xs uppercase tracking-widest mb-2">{label}</Text>
      <View className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#52525b"
          keyboardType="decimal-pad"
          className="flex-1 text-white text-base"
        />
        <Text className="text-zinc-500 text-sm ml-1">{unit}</Text>
      </View>
    </View>
  );
}

function OptionCard({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-xl px-4 py-3 border ${
        selected ? 'bg-zinc-800 border-white' : 'bg-zinc-950 border-zinc-800'
      }`}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-zinc-400'}`}>
        {label}
      </Text>
      <Text className="text-zinc-600 text-xs mt-0.5">{description}</Text>
    </TouchableOpacity>
  );
}
