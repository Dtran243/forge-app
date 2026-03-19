/**
 * onboarding/complete.tsx — Final onboarding screen
 *
 * Explains HRV baseline period, previews the first week, then calls the
 * onboarding-complete Edge Function to write the athlete's full initial state
 * to Supabase. On success, the root layout detects onboarding_complete = true
 * and redirects to /(tabs)/today.
 */

import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useOnboardingStore } from '../../store/onboardingStore';

const HRV_NOTES = [
  {
    label: 'Days 1–30',
    body: 'Gate uses soreness + sleep only. HRV data is collected but not yet factored in.',
  },
  {
    label: 'Day 30+',
    body: 'Once a 30-day HRV baseline is established, all three signals drive the gate colour.',
  },
];

export default function OnboardingCompleteScreen() {
  const store = useOnboardingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnterForge() {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        setError('Session expired. Please sign in again.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        age: store.age,
        bodyweight_kg: store.bodyweight_kg,
        height_cm: store.height_cm,
        training_age: store.training_age,
        phase: store.phase,
        equipment: store.equipment,
        assessment_loads: store.assessmentLoads,
        ladder_placements: store.ladderPlacements,
      };

      const { error: fnError } = await supabase.functions.invoke('onboarding-complete', {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        // Try to extract the actual error body from the function response
        let message = fnError.message ?? 'Onboarding failed.';
        try {
          const body = await (fnError as unknown as { context: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore — use the default message
        }
        throw new Error(message);
      }

      // Refresh the session so _layout.tsx detects onboarding_complete = true
      await supabase.auth.refreshSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-black px-6 justify-between py-16">
      <StepIndicator step={7} total={7} />

      <View className="flex-1 justify-center gap-8">
        <View>
          <Text className="text-white text-3xl font-bold mb-2">You're ready</Text>
          <Text className="text-zinc-500 text-sm leading-relaxed">
            Your first week's program will be generated now. Every Sunday the engine
            rewrites next week based on what you actually did.
          </Text>
        </View>

        {/* HRV baseline explanation */}
        <View className="gap-3">
          <Text className="text-zinc-400 text-xs uppercase tracking-widest">HRV baseline period</Text>
          {HRV_NOTES.map((note) => (
            <View
              key={note.label}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4"
            >
              <Text className="text-white text-sm font-semibold mb-1">{note.label}</Text>
              <Text className="text-zinc-500 text-sm leading-relaxed">{note.body}</Text>
            </View>
          ))}
        </View>

        {/* Summary of what was set up */}
        <View className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 gap-2">
          <Text className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Setup summary</Text>
          <SummaryRow label="Phase" value={store.phase} />
          <SummaryRow label="Experience" value={store.training_age} />
          <SummaryRow
            label="Assessment"
            value={
              store.skippedAssessment
                ? 'Skipped — defaults applied'
                : `${store.assessmentLoads.length} movement${store.assessmentLoads.length !== 1 ? 's' : ''} assessed`
            }
          />
          <SummaryRow
            label="Equipment"
            value={
              Object.entries(store.equipment)
                .filter(([, v]) => v)
                .map(([k]) => k.replace(/_/g, ' '))
                .join(', ') || 'None selected'
            }
          />
        </View>

        {error !== null && (
          <View className="bg-red-950 border border-red-700 rounded-lg px-4 py-3">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={handleEnterForge}
        disabled={isSubmitting}
        className={`rounded-xl py-4 items-center ${isSubmitting ? 'bg-zinc-800' : 'bg-white'}`}
      >
        {isSubmitting ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color="#ffffff" />
            <Text className="text-white text-base font-semibold">Setting up your program…</Text>
          </View>
        ) : (
          <Text className="text-black text-base font-semibold">Enter Forge</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-zinc-500 text-sm">{label}</Text>
      <Text className="text-white text-sm capitalize flex-shrink">{value}</Text>
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
