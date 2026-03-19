/**
 * onboarding/assessment-session.tsx — Guided load assessment
 *
 * Ramp protocol: up to 3 sets per movement to find the working weight.
 *   RIR 0–1  → too heavy. Reduce 10%, save as confirmed load. Move on.
 *   RIR 2–3  → perfect. Confirm this load. Move on.
 *   RIR 4+   → too light. Increase 15% and try again (if sets remain).
 *   3 sets with no RIR 2–3 confirmation → use lightest load attempted.
 *
 * Movements assessed depend on equipment selected in the previous screen.
 * Each movement can be skipped individually.
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
import { useOnboardingStore, type AssessmentLoad } from '../../store/onboardingStore';
import type { EquipmentProfile } from '../../types/athlete';

// ── Assessment movement definitions ─────────────────────────────────────────

interface AssessmentMovement {
  key: string;
  displayName: string;
  patternLabel: string;
  requiresBarbell: boolean;
  requiresDumbbells: boolean;
  requiresCable: boolean;
  defaultStartKg: number;
  incrementKg: number;
}

const ALL_MOVEMENTS: AssessmentMovement[] = [
  {
    key: 'deadlift',
    displayName: 'Deadlift',
    patternLabel: 'Hinge — primary',
    requiresBarbell: true,
    requiresDumbbells: false,
    requiresCable: false,
    defaultStartKg: 60,
    incrementKg: 5,
  },
  {
    key: 'romanian_deadlift',
    displayName: 'Romanian Deadlift',
    patternLabel: 'Hinge — primary',
    requiresBarbell: false,
    requiresDumbbells: true,
    requiresCable: false,
    defaultStartKg: 20,
    incrementKg: 2.5,
  },
  {
    key: 'barbell_squat',
    displayName: 'Barbell Squat',
    patternLabel: 'Quad — primary',
    requiresBarbell: true,
    requiresDumbbells: false,
    requiresCable: false,
    defaultStartKg: 50,
    incrementKg: 5,
  },
  {
    key: 'barbell_bench_press',
    displayName: 'Bench Press',
    patternLabel: 'Horizontal push — primary',
    requiresBarbell: true,
    requiresDumbbells: false,
    requiresCable: false,
    defaultStartKg: 40,
    incrementKg: 2.5,
  },
  {
    key: 'dumbbell_bench_press',
    displayName: 'DB Bench Press',
    patternLabel: 'Horizontal push — primary',
    requiresBarbell: false,
    requiresDumbbells: true,
    requiresCable: false,
    defaultStartKg: 15,
    incrementKg: 2,
  },
  {
    key: 'barbell_overhead_press',
    displayName: 'Overhead Press',
    patternLabel: 'Vertical push — primary',
    requiresBarbell: true,
    requiresDumbbells: false,
    requiresCable: false,
    defaultStartKg: 30,
    incrementKg: 2.5,
  },
  {
    key: 'dumbbell_overhead_press',
    displayName: 'DB Overhead Press',
    patternLabel: 'Vertical push — primary',
    requiresBarbell: false,
    requiresDumbbells: true,
    requiresCable: false,
    defaultStartKg: 12,
    incrementKg: 2,
  },
  {
    key: 'barbell_row',
    displayName: 'Barbell Row',
    patternLabel: 'Horizontal pull — primary',
    requiresBarbell: true,
    requiresDumbbells: false,
    requiresCable: false,
    defaultStartKg: 40,
    incrementKg: 2.5,
  },
  {
    key: 'cable_row',
    displayName: 'Cable Row',
    patternLabel: 'Horizontal pull — primary',
    requiresBarbell: false,
    requiresDumbbells: false,
    requiresCable: true,
    defaultStartKg: 40,
    incrementKg: 5,
  },
  {
    key: 'lat_pulldown',
    displayName: 'Lat Pulldown',
    patternLabel: 'Vertical pull — primary',
    requiresBarbell: false,
    requiresDumbbells: false,
    requiresCable: true,
    defaultStartKg: 40,
    incrementKg: 5,
  },
];

function getMovementsForEquipment(equipment: EquipmentProfile): AssessmentMovement[] {
  const hasBarbell = equipment.barbell_rack;
  const hasDumbbells = equipment.dumbbells;
  const hasCable = equipment.cable_machine;

  return ALL_MOVEMENTS.filter((m) => {
    if (m.requiresBarbell && !hasBarbell) return false;
    if (m.requiresDumbbells && !hasDumbbells) return false;
    if (m.requiresCable && !hasCable) return false;

    // Don't show both barbell and dumbbell variants for the same pattern.
    // Prefer barbell if available.
    if (m.key === 'dumbbell_bench_press' && hasBarbell) return false;
    if (m.key === 'dumbbell_overhead_press' && hasBarbell) return false;
    if (m.key === 'romanian_deadlift' && hasBarbell) return false;

    return true;
  });
}

// ── RIR option ────────────────────────────────────────────────────────────────

const RIR_OPTIONS = [
  { value: 0, label: '0', description: 'Absolute failure' },
  { value: 1, label: '1', description: 'One left' },
  { value: 2, label: '2', description: 'Two left' },
  { value: 3, label: '3', description: 'Three left' },
  { value: 4, label: '4+', description: 'Very easy' },
];

// ── Screen ────────────────────────────────────────────────────────────────────

type SetRecord = { loadKg: number; rir: number };

type Phase =
  | { type: 'enter_weight' }
  | { type: 'log_rir'; loadKg: number }
  | { type: 'result'; confirmedLoad: number; reason: string };

export default function AssessmentSessionScreen() {
  const router = useRouter();
  const equipment = useOnboardingStore((s) => s.equipment);
  const setAssessmentLoads = useOnboardingStore((s) => s.setAssessmentLoads);

  const movements = getMovementsForEquipment(equipment);
  const [movementIndex, setMovementIndex] = useState(0);
  const [setsForCurrentMovement, setSetsForCurrentMovement] = useState<SetRecord[]>([]);
  const [phase, setPhase] = useState<Phase>({ type: 'enter_weight' });
  const [loadText, setLoadText] = useState('');
  const [completedLoads, setCompletedLoads] = useState<AssessmentLoad[]>([]);

  const currentMovement = movements[movementIndex];
  const setNumber = setsForCurrentMovement.length + 1;

  function suggestedLoad(): number {
    if (setsForCurrentMovement.length === 0) {
      return currentMovement.defaultStartKg;
    }
    const last = setsForCurrentMovement[setsForCurrentMovement.length - 1]!;
    if (last.rir >= 4) {
      return Math.round((last.loadKg * 1.15) / currentMovement.incrementKg) * currentMovement.incrementKg;
    }
    return last.loadKg;
  }

  function handleLoadConfirm() {
    const load = parseFloat(loadText);
    if (isNaN(load) || load <= 0) return;
    setPhase({ type: 'log_rir', loadKg: load });
  }

  function handleRir(rir: number) {
    const loadKg = (phase as { type: 'log_rir'; loadKg: number }).loadKg;
    const newSets: SetRecord[] = [...setsForCurrentMovement, { loadKg, rir }];
    setSetsForCurrentMovement(newSets);

    let confirmedLoad: number;
    let reason: string;

    if (rir >= 2 && rir <= 3) {
      // Perfect working weight
      confirmedLoad = loadKg;
      reason = `Set ${setNumber}: RIR ${rir} — confirmed working weight.`;
      setPhase({ type: 'result', confirmedLoad, reason });
    } else if (rir <= 1) {
      // Too heavy — reduce 10%
      confirmedLoad = Math.round((loadKg * 0.9) / currentMovement.incrementKg) * currentMovement.incrementKg;
      reason = `Set ${setNumber}: RIR ${rir} (too heavy). Starting load set to ${confirmedLoad} kg.`;
      setPhase({ type: 'result', confirmedLoad, reason });
    } else if (newSets.length >= 3) {
      // 3 sets reached, no confirmation — use lightest attempted load
      const loadsAttempted = newSets.map((s) => s.loadKg);
      confirmedLoad = Math.min(...loadsAttempted);
      reason = `3 sets complete without confirmation. Using lightest attempted load: ${confirmedLoad} kg.`;
      setPhase({ type: 'result', confirmedLoad, reason });
    } else {
      // Too light, more sets available — suggest higher load
      const nextLoad = Math.round((loadKg * 1.15) / currentMovement.incrementKg) * currentMovement.incrementKg;
      setLoadText(nextLoad.toString());
      setPhase({ type: 'enter_weight' });
    }
  }

  function handleMovementResult(confirmedLoad: number) {
    const newLoad: AssessmentLoad = {
      movementKey: currentMovement.key,
      displayName: currentMovement.displayName,
      loadKg: confirmedLoad,
    };
    const updated = [...completedLoads, newLoad];
    setCompletedLoads(updated);
    advanceMovement(updated);
  }

  function handleSkipMovement() {
    advanceMovement(completedLoads);
  }

  function advanceMovement(loads: AssessmentLoad[]) {
    if (movementIndex + 1 >= movements.length) {
      setAssessmentLoads(loads);
      router.push('/onboarding/calisthenics-placement');
      return;
    }
    const nextIndex = movementIndex + 1;
    setMovementIndex(nextIndex);
    setSetsForCurrentMovement([]);
    setPhase({ type: 'enter_weight' });
    setLoadText('');
  }

  if (movements.length === 0) {
    return (
      <View className="flex-1 bg-black px-6 justify-center items-center">
        <Text className="text-zinc-400 text-center">
          No movements to assess with your current equipment. Tap Continue to proceed.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/onboarding/calisthenics-placement')}
          className="mt-8 bg-white rounded-xl py-4 px-8 items-center"
        >
          <Text className="text-black font-semibold">Continue</Text>
        </TouchableOpacity>
      </View>
    );
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
        <StepIndicator step={5} total={7} />

        {/* Progress across movements */}
        <View className="flex-row justify-between mt-6 mb-2">
          <Text className="text-zinc-500 text-xs">
            Movement {movementIndex + 1} of {movements.length}
          </Text>
          <TouchableOpacity onPress={handleSkipMovement}>
            <Text className="text-zinc-600 text-xs">Skip this movement</Text>
          </TouchableOpacity>
        </View>

        {/* Movement header */}
        <Text className="text-white text-3xl font-bold mb-1">{currentMovement.displayName}</Text>
        <Text className="text-zinc-500 text-sm mb-6">{currentMovement.patternLabel}</Text>

        {/* Set counter */}
        <View className="flex-row gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              className={`flex-1 h-1 rounded-full ${n <= setNumber ? 'bg-white' : 'bg-zinc-800'}`}
            />
          ))}
        </View>

        {phase.type === 'enter_weight' && (
          <EnterWeightPhase
            setNumber={setNumber}
            suggestedLoad={suggestedLoad()}
            loadText={loadText}
            setLoadText={setLoadText}
            increment={currentMovement.incrementKg}
            onConfirm={handleLoadConfirm}
          />
        )}

        {phase.type === 'log_rir' && (
          <LogRirPhase
            setNumber={setNumber}
            loadKg={phase.loadKg}
            onRirSelect={handleRir}
          />
        )}

        {phase.type === 'result' && (
          <ResultPhase
            confirmedLoad={phase.confirmedLoad}
            reason={phase.reason}
            onNext={() => handleMovementResult(phase.confirmedLoad)}
            isLast={movementIndex + 1 >= movements.length}
          />
        )}

        {/* Previously completed */}
        {completedLoads.length > 0 && (
          <View className="mt-8">
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Completed</Text>
            <View className="gap-2">
              {completedLoads.map((l) => (
                <View
                  key={l.movementKey}
                  className="flex-row justify-between bg-zinc-900 rounded-lg px-4 py-3"
                >
                  <Text className="text-zinc-400 text-sm">{l.displayName}</Text>
                  <Text className="text-white text-sm font-semibold">{l.loadKg} kg</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EnterWeightPhase({
  setNumber,
  suggestedLoad,
  loadText,
  setLoadText,
  increment,
  onConfirm,
}: {
  setNumber: number;
  suggestedLoad: number;
  loadText: string;
  setLoadText: (v: string) => void;
  increment: number;
  onConfirm: () => void;
}) {
  const display = loadText || suggestedLoad.toString();

  return (
    <View className="gap-6">
      <View className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4">
        <Text className="text-zinc-400 text-sm mb-1">Set {setNumber} — perform 6 reps</Text>
        <Text className="text-zinc-300 text-sm leading-relaxed">
          Load the bar to your chosen weight, perform exactly 6 reps, and note how many more
          you could have completed.
        </Text>
      </View>

      <View>
        <Text className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Load (kg)</Text>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => {
              const current = parseFloat(display) || suggestedLoad;
              setLoadText(Math.max(increment, current - increment).toString());
            }}
            className="w-10 h-10 bg-zinc-800 rounded-lg items-center justify-center"
          >
            <Text className="text-white text-xl">−</Text>
          </TouchableOpacity>
          <TextInput
            value={loadText}
            onChangeText={setLoadText}
            placeholder={suggestedLoad.toString()}
            placeholderTextColor="#52525b"
            keyboardType="decimal-pad"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-lg text-center"
          />
          <TouchableOpacity
            onPress={() => {
              const current = parseFloat(display) || suggestedLoad;
              setLoadText((current + increment).toString());
            }}
            className="w-10 h-10 bg-zinc-800 rounded-lg items-center justify-center"
          >
            <Text className="text-white text-xl">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={onConfirm}
        className="bg-white rounded-xl py-4 items-center"
      >
        <Text className="text-black text-base font-semibold">Done — log RIR</Text>
      </TouchableOpacity>
    </View>
  );
}

function LogRirPhase({
  setNumber,
  loadKg,
  onRirSelect,
}: {
  setNumber: number;
  loadKg: number;
  onRirSelect: (rir: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View className="gap-6">
      <View className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4">
        <Text className="text-zinc-400 text-sm mb-1">
          Set {setNumber} at {loadKg} kg — how many reps did you have left?
        </Text>
        <Text className="text-zinc-300 text-sm leading-relaxed">
          RIR = Reps In Reserve. If you stopped and could have done 2 more, that's RIR 2.
        </Text>
      </View>

      <View className="gap-2">
        {RIR_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setSelected(opt.value)}
            className={`flex-row items-center justify-between rounded-xl px-4 py-4 border ${
              selected === opt.value
                ? 'bg-zinc-800 border-white'
                : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                selected === opt.value ? 'text-white' : 'text-zinc-400'
              }`}
            >
              RIR {opt.label}
            </Text>
            <Text className="text-zinc-600 text-xs">{opt.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => selected !== null && onRirSelect(selected)}
        disabled={selected === null}
        className={`rounded-xl py-4 items-center ${selected !== null ? 'bg-white' : 'bg-zinc-800'}`}
      >
        <Text className={`text-base font-semibold ${selected !== null ? 'text-black' : 'text-zinc-600'}`}>
          Confirm
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultPhase({
  confirmedLoad,
  reason,
  onNext,
  isLast,
}: {
  confirmedLoad: number;
  reason: string;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <View className="gap-6">
      <View className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-5 items-center gap-2">
        <Text className="text-zinc-500 text-xs uppercase tracking-widest">Confirmed load</Text>
        <Text className="text-white text-5xl font-bold">{confirmedLoad}</Text>
        <Text className="text-zinc-500 text-base">kg</Text>
      </View>

      <Text className="text-zinc-500 text-sm text-center leading-relaxed">{reason}</Text>

      <TouchableOpacity onPress={onNext} className="bg-white rounded-xl py-4 items-center">
        <Text className="text-black text-base font-semibold">
          {isLast ? 'Finish Assessment' : 'Next Movement'}
        </Text>
      </TouchableOpacity>
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
