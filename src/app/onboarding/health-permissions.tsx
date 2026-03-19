/**
 * onboarding/health-permissions.tsx — Apple Health / Google Fit permissions
 *
 * Explains what health data Forge reads and why, then requests permission.
 * Skippable — HRV-based gate falls back to soreness + sleep only until
 * 30 days of data exists (see forge-engine-constants.md Section 11).
 *
 * Real permission request requires a native build. The health.ts stubs
 * return false until then.
 */

import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { requestHealthPermissions } from '../../lib/health';
import { useOnboardingStore } from '../../store/onboardingStore';

const HEALTH_READS = [
  { color: '#ef4444', label: 'HRV (RMSSD)', reason: 'Recovery gate — drives deload decisions' },
  { color: '#6366f1', label: 'Sleep duration', reason: 'Recovery gate input alongside HRV' },
];

export default function HealthPermissionsScreen() {
  const router = useRouter();
  const setGranted = useOnboardingStore((s) => s.setHealthPermissionsGranted);
  const [isRequesting, setIsRequesting] = useState(false);

  async function handleConnect() {
    setIsRequesting(true);
    try {
      const granted = await requestHealthPermissions();
      setGranted(granted);
    } finally {
      setIsRequesting(false);
    }
    router.push('/onboarding/equipment');
  }

  function handleSkip() {
    setGranted(false);
    router.push('/onboarding/equipment');
  }

  return (
    <View className="flex-1 bg-black px-6 justify-between py-16">
      {/* Step indicator */}
      <StepIndicator step={2} total={7} />

      {/* Content */}
      <View className="flex-1 justify-center gap-8">
        <View>
          <Text className="text-white text-3xl font-bold mb-2">Connect health data</Text>
          <Text className="text-zinc-500 text-sm leading-relaxed">
            Forge reads two signals from Apple Health to power the recovery gate.
            All data stays on your device — it is never stored or sent to any server.
          </Text>
        </View>

        {/* What we read */}
        <View className="gap-3">
          {HEALTH_READS.map((item) => (
            <View
              key={item.label}
              className="flex-row items-start gap-4 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4"
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginTop: 4 }} />
              <View className="flex-1">
                <Text className="text-white text-sm font-semibold">{item.label}</Text>
                <Text className="text-zinc-500 text-xs mt-0.5">{item.reason}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Fallback note */}
        <View className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4">
          <Text className="text-zinc-400 text-sm leading-relaxed">
            <Text className="text-white font-medium">No HRV data? No problem.</Text>
            {' '}The engine falls back to soreness and sleep ratings until 30 days of HRV exist.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View className="gap-3">
        <TouchableOpacity
          onPress={handleConnect}
          disabled={isRequesting}
          className="bg-white rounded-xl py-4 items-center"
        >
          {isRequesting ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text className="text-black text-base font-semibold">Connect Apple Health</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} className="py-3 items-center">
          <Text className="text-zinc-500 text-sm">Skip for now</Text>
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
