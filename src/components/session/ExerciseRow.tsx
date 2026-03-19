/**
 * ExerciseRow.tsx
 *
 * A single exercise in the active session list.
 * Expanded: shows set logging rows + rest timer.
 * Collapsed (completed): shows a summary with a checkmark.
 *
 * Superset handling:
 *   When exercise.superset is not null, after each compound set is logged the
 *   athlete is prompted to perform the paired calisthenics movement before the
 *   rest timer starts. The calisthenics is rendered inline — not as a separate
 *   exercise card.
 *
 * Timed holds:
 *   When planned.hold_duration_seconds is not null, SetLogRow renders a
 *   HoldTimer instead of rep/RIR inputs.
 */

import React, { useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { PlannedExercise } from '../../types/athlete';
import type { LoggedSet } from '../../types/athlete';
import { SetLogRow } from './SetLogRow';
import { RestTimer } from './RestTimer';
import { FormCueSheet } from './FormCueSheet';
import { SubstituteSheet } from './SubstituteSheet';
import type { SubstituteEntry } from '../../data/substitutions';
import { hasSubstitutes } from '../../data/substitutions';
import { EXERCISES_WITH_CUES, CALISTHENICS_STANDARDS } from '../../data/exercises';

/** Looks up the completion standard for a calisthenics movement by name. */
function findStandard(movementName: string): string | null {
  return CALISTHENICS_STANDARDS[movementName] ?? null;
}

interface ExerciseRowProps {
  exercise: PlannedExercise;
  isActive: boolean;
  isCompleted: boolean;
  loggedSets: LoggedSet[];
  /** The currently active substitute name for this exercise, if any. */
  activeSubstitute: string | null;
  onSetLogged: (set: LoggedSet) => void;
  onSetEdited: (setIndex: number, updatedSet: LoggedSet) => void;
  onExerciseComplete: () => void;
  onSubstitute: (entry: SubstituteEntry) => void;
}

export function ExerciseRow({
  exercise,
  isActive,
  isCompleted,
  loggedSets,
  activeSubstitute,
  onSetLogged,
  onSetEdited,
  onExerciseComplete,
  onSubstitute,
}: ExerciseRowProps) {
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showCue, setShowCue] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showSupersetPrompt, setShowSupersetPrompt] = useState(false);

  // Track whether the compound set that triggered the superset prompt was the last set,
  // so we know whether to advance or start rest when the prompt is dismissed.
  const pendingLastSet = useRef(false);

  // Track consecutive high-RPE sets for warning
  const recentRpes = loggedSets
    .slice(-2)
    .map((s) => s.rpe_reported ?? 0);
  const showRpeWarning = recentRpes.length >= 2 && recentRpes.every((r) => r >= 9);

  const firstSet = exercise.sets[0];
  const loadStr = firstSet?.load_kg ? ` @ ${firstSet.load_kg}kg` : '';
  const isLegacyCalisthenics = firstSet?.target_reps_max != null && firstSet.target_reps_max >= 999;
  const repsStr = firstSet
    ? firstSet.hold_duration_seconds != null
      ? `${exercise.sets.length}×${firstSet.hold_duration_seconds}s hold`
      : isLegacyCalisthenics
      ? `${exercise.sets.length} sets`
      : `${exercise.sets.length}×${firstSet.target_reps_min}–${firstSet.target_reps_max}`
    : '';

  // ── Collapsed / completed state ───────────────────────────────────────────────

  if (isCompleted) {
    return (
      <View className="flex-row items-center py-3 px-1 gap-3 opacity-60">
        <View className="w-2 h-2 rounded-full bg-green-500" />
        <View className="flex-1">
          <Text className="text-zinc-300 text-sm">{exercise.name}</Text>
          <Text className="text-zinc-500 text-xs">{repsStr}{loadStr}</Text>
        </View>
        <Text className="text-green-500 text-sm">✓</Text>
      </View>
    );
  }

  // ── Inactive (upcoming) state ─────────────────────────────────────────────────

  if (!isActive) {
    return (
      <View className="flex-row items-center py-3 px-1 gap-3">
        <View className="w-2 h-2 rounded-full bg-zinc-700" />
        <View className="flex-1">
          <Text className="text-zinc-500 text-sm">{exercise.name}</Text>
          <Text className="text-zinc-600 text-xs">{repsStr}{loadStr}</Text>
        </View>
      </View>
    );
  }

  // ── Active (current exercise) state ──────────────────────────────────────────

  const nextSetIndex = loggedSets.length;
  const allSetsLogged = nextSetIndex >= exercise.sets.length;

  const handleSetLog = (reps: number | null, loadKg: number | null, rir: number | null) => {
    const rpeFromRir: Record<number, number> = { 0: 10, 1: 9, 2: 8, 3: 7, 4: 6 };
    const loggedSet: LoggedSet = {
      set_number: nextSetIndex + 1,
      load_kg: loadKg,
      reps_completed: reps,
      rir_reported: rir,
      rpe_reported: rir !== null ? (rpeFromRir[rir] ?? 8) : null,
    };
    onSetLogged(loggedSet);

    const isLastSet = nextSetIndex + 1 >= exercise.sets.length;
    pendingLastSet.current = isLastSet;

    if (exercise.superset) {
      setShowSupersetPrompt(true);
    } else if (!isLastSet) {
      setShowRestTimer(true);
    } else {
      onExerciseComplete();
    }
  };

  const handleSupersetDone = () => {
    setShowSupersetPrompt(false);
    if (pendingLastSet.current) {
      onExerciseComplete();
    } else {
      setShowRestTimer(true);
    }
  };

  return (
    <View className="bg-zinc-900 rounded-2xl border border-zinc-700 p-4 gap-3">
      {/* Header */}
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-white text-base font-semibold">{exercise.name}</Text>
          {exercise.superset && (
            <Text className="text-amber-400 text-xs">
              Superset — {exercise.superset.name}
            </Text>
          )}
          <Text className="text-zinc-400 text-xs">{repsStr}{loadStr}</Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2">
          {EXERCISES_WITH_CUES.has(exercise.name) && (
            <TouchableOpacity
              onPress={() => setShowCue(true)}
              className="bg-zinc-800 rounded-lg px-2.5 py-1.5"
            >
              <Text className="text-zinc-400 text-xs">Cue</Text>
            </TouchableOpacity>
          )}
          {hasSubstitutes(exercise.name) && (
            <TouchableOpacity
              onPress={() => setShowSub(true)}
              className="bg-zinc-800 rounded-lg px-2.5 py-1.5"
            >
              <Text className="text-zinc-400 text-xs">Sub</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* RPE warning */}
      {showRpeWarning && (
        <View className="bg-amber-900/40 border border-amber-700 rounded-lg px-3 py-2">
          <Text className="text-amber-400 text-xs">
            RPE 9+ on two consecutive sets — consider reducing load.
          </Text>
        </View>
      )}

      {/* Set rows */}
      <View>
        {exercise.sets.map((plannedSet, idx) => (
          <SetLogRow
            key={idx}
            setNumber={idx + 1}
            planned={plannedSet}
            isLogged={idx < loggedSets.length}
            loggedReps={loggedSets[idx]?.reps_completed}
            loggedLoad={loggedSets[idx]?.load_kg}
            loggedRir={loggedSets[idx]?.rir_reported}
            calisthenicsStandard={findStandard(exercise.name)}
            onLog={
              idx === nextSetIndex && !showRestTimer && !showSupersetPrompt && !allSetsLogged
                ? handleSetLog
                : () => {}
            }
            onEdit={(updatedSet) => onSetEdited(idx, updatedSet)}
          />
        ))}
      </View>

      {/* Superset prompt — shown after each compound set before rest */}
      {showSupersetPrompt && exercise.superset && (
        <View style={{ backgroundColor: '#1c1917', borderRadius: 12, borderWidth: 1, borderColor: '#292524', padding: 14, gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Superset
            </Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
              {exercise.superset.name}
            </Text>
            <Text style={{ color: '#a1a1aa', fontSize: 13 }}>
              {exercise.superset.standard}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSupersetDone}
            style={{ backgroundColor: '#292524', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rest timer */}
      {showRestTimer && (
        <RestTimer
          seconds={exercise.rest_seconds}
          onComplete={() => setShowRestTimer(false)}
          onSkip={() => setShowRestTimer(false)}
        />
      )}

      {/* All sets done — advance button */}
      {allSetsLogged && !showRestTimer && !showSupersetPrompt && (
        <TouchableOpacity
          onPress={onExerciseComplete}
          className="bg-zinc-800 rounded-xl py-3 items-center"
        >
          <Text className="text-white text-sm font-medium">Next Exercise →</Text>
        </TouchableOpacity>
      )}

      {/* Modals */}
      <FormCueSheet
        exerciseName={exercise.name}
        visible={showCue}
        onClose={() => setShowCue(false)}
      />
      <SubstituteSheet
        exerciseName={exercise.name}
        activeSubstitute={activeSubstitute}
        visible={showSub}
        onSelect={(entry) => { onSubstitute(entry); setShowSub(false); }}
        onClose={() => setShowSub(false)}
      />
    </View>
  );
}
