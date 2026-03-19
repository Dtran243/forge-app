/**
 * onboarding/calisthenics-placement.tsx — Calisthenics ladder self-placement
 *
 * Athlete self-selects their current level on each of the four skill ladders.
 * Rungs are defined in forge-engine-constants.md Section 15.
 *
 * Pull ladder special case: "Can't do a pull-up" option maps to rung 1
 * (Band-assisted pull-up). If the athlete can do unassisted pull-ups they
 * select their actual current rung.
 */

import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../../store/onboardingStore';
import type { LadderName } from '../../types/athlete';

// ── Ladder definitions (from forge-engine-constants.md Section 15) ────────────

interface LadderRung {
  rung: number;
  name: string;
  standard: string;
}

const PUSH_LADDER: LadderRung[] = [
  { rung: 1, name: 'Incline push-up', standard: '3×12 RIR2' },
  { rung: 2, name: 'Push-up', standard: '3×15 RIR2' },
  { rung: 3, name: 'Diamond push-up', standard: '3×12 RIR2' },
  { rung: 4, name: 'Archer push-up', standard: '3×8 each RIR2' },
  { rung: 5, name: 'Pseudo planche push-up', standard: '3×8 RIR2' },
  { rung: 6, name: 'Ring push-up', standard: '3×10 RIR2' },
  { rung: 7, name: 'Ring dip', standard: '3×8 RIR2' },
  { rung: 8, name: 'Weighted ring dip', standard: '3×6 +10kg RIR2' },
];

const PULL_LADDER: LadderRung[] = [
  { rung: 1, name: 'Band-assisted pull-up', standard: '3×10 RIR2' },
  { rung: 2, name: 'Pull-up', standard: '3×8 RIR2' },
  { rung: 3, name: 'Weighted pull-up', standard: '3×6 +10kg RIR2' },
  { rung: 4, name: 'L-sit pull-up', standard: '3×5 RIR2' },
  { rung: 5, name: 'Archer pull-up', standard: '3×4 each RIR2' },
  { rung: 6, name: 'Weighted pull-up +20kg', standard: '3×5 RIR2' },
  { rung: 7, name: 'One-arm negative', standard: '3×3 each controlled' },
];

const CORE_LADDER: LadderRung[] = [
  { rung: 1, name: 'Hollow body hold', standard: '3×30s' },
  { rung: 2, name: 'Tuck L-sit (floor)', standard: '3×20s' },
  { rung: 3, name: 'L-sit (floor)', standard: '3×15s' },
  { rung: 4, name: 'L-sit (parallettes)', standard: '3×20s' },
  { rung: 5, name: 'Tuck V-sit', standard: '3×10s' },
  { rung: 6, name: 'V-sit', standard: '3×10s' },
  { rung: 7, name: 'Manna progression', standard: '3×5s' },
];

const SQUAT_LADDER: LadderRung[] = [
  { rung: 1, name: 'Assisted pistol squat', standard: '3×8 each RIR2' },
  { rung: 2, name: 'Shrimp squat', standard: '3×6 each RIR2' },
  { rung: 3, name: 'Pistol squat', standard: '3×5 each RIR2' },
  { rung: 4, name: 'Weighted pistol squat', standard: '3×4 each +10kg RIR2' },
  { rung: 5, name: 'Nordic curl', standard: '3×5 RIR2' },
  { rung: 6, name: 'Weighted Nordic curl', standard: '3×5 +10kg RIR2' },
];

const LADDERS: {
  key: LadderName;
  label: string;
  description: string;
  rungs: LadderRung[];
  cantDoLabel?: string; // special "can't do first rung" option
}[] = [
  {
    key: 'push_ladder',
    label: 'Push',
    description: 'Push-up and dip progressions',
    rungs: PUSH_LADDER,
  },
  {
    key: 'pull_ladder',
    label: 'Pull',
    description: 'Pull-up progressions',
    rungs: PULL_LADDER,
    cantDoLabel: "Can't do a pull-up yet",
  },
  {
    key: 'core_ladder',
    label: 'Core',
    description: 'L-sit and compression progressions',
    rungs: CORE_LADDER,
  },
  {
    key: 'squat_ladder',
    label: 'Squat',
    description: 'Single-leg and hinge calisthenics',
    rungs: SQUAT_LADDER,
  },
];

export default function CalisthenicsPlacementScreen() {
  const router = useRouter();
  const ladderPlacements = useOnboardingStore((s) => s.ladderPlacements);
  const setLadderPlacement = useOnboardingStore((s) => s.setLadderPlacement);

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-16 pb-6"
      >
        <StepIndicator step={6} total={7} />

        <Text className="text-white text-3xl font-bold mt-6 mb-1">Skill placement</Text>
        <Text className="text-zinc-500 text-sm mb-8">
          Select your current level on each ladder. Be honest — the engine will advance you
          when you're consistently hitting the standard with good reserves.
        </Text>

        {LADDERS.map((ladder) => (
          <View key={ladder.key} className="mb-8">
            <Text className="text-white text-lg font-bold mb-1">{ladder.label}</Text>
            <Text className="text-zinc-500 text-xs mb-3">{ladder.description}</Text>

            <View className="gap-2">
              {ladder.cantDoLabel && (
                <TouchableOpacity
                  onPress={() => setLadderPlacement(ladder.key, 1)}
                  className={`flex-row items-center gap-4 rounded-xl px-4 py-3 border ${
                    ladderPlacements[ladder.key] === 1
                      ? 'bg-zinc-800 border-white'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center ${
                      ladderPlacements[ladder.key] === 1 ? 'bg-white' : 'bg-zinc-800'
                    }`}
                  >
                    {ladderPlacements[ladder.key] === 1 && (
                      <View className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-medium ${
                        ladderPlacements[ladder.key] === 1 ? 'text-white' : 'text-zinc-500'
                      }`}
                    >
                      {ladder.cantDoLabel}
                    </Text>
                    <Text className="text-zinc-600 text-xs">→ Starts at rung 1</Text>
                  </View>
                </TouchableOpacity>
              )}

              {ladder.rungs.map((rung) => {
                const isSelected = ladderPlacements[ladder.key] === rung.rung;
                // For pull ladder, rung 1 is covered by the "can't do" option above
                if (ladder.cantDoLabel && rung.rung === 1) return null;
                return (
                  <TouchableOpacity
                    key={rung.rung}
                    onPress={() => setLadderPlacement(ladder.key, rung.rung)}
                    className={`flex-row items-center gap-4 rounded-xl px-4 py-3 border ${
                      isSelected ? 'bg-zinc-800 border-white' : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full items-center justify-center ${
                        isSelected ? 'bg-white' : 'bg-zinc-800'
                      }`}
                    >
                      {isSelected && <View className="w-2 h-2 rounded-full bg-black" />}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-zinc-600 text-xs">Rung {rung.rung}</Text>
                      </View>
                      <Text
                        className={`text-sm font-medium ${
                          isSelected ? 'text-white' : 'text-zinc-400'
                        }`}
                      >
                        {rung.name}
                      </Text>
                      <Text className="text-zinc-600 text-xs">{rung.standard}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Sticky footer */}
      <View className="px-6 pb-10 pt-4 border-t border-zinc-900">
        <Text className="text-zinc-600 text-xs text-center mb-3">
          4 ladders total — scroll up to review all before continuing
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/onboarding/complete')}
          className="bg-white rounded-xl py-4 items-center"
        >
          <Text className="text-black text-base font-semibold">Continue</Text>
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
