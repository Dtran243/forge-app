/**
 * ActiveSession.tsx
 *
 * Full-screen active session view. Rendered by today.tsx when sessionStore.isActive.
 *
 * Manages:
 * - Elapsed timer
 * - Exercise progression (current exercise index)
 * - Session RPE modal on complete
 * - session-complete Edge Function call
 * - Store cleanup + callback on done
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { localDateISO } from '../../lib/dates';
import { useSessionStore } from '../../store/sessionStore';
import { useRecoveryStore } from '../../store/recoveryStore';
import type { LoggedSet, PlannedExercise } from '../../types/athlete';
import type { SubstituteEntry } from '../../data/substitutions';
import { ExerciseRow } from './ExerciseRow';
import { Zone2Session } from './Zone2Session';
import { IntervalsSession } from './IntervalsSession';
import { MobilitySession } from './MobilitySession';

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength_calisthenics: 'Strength & Skill',
  zone2: 'Zone 2',
  intervals: 'Intervals',
  mobility: 'Mobility',
};

interface ActiveSessionProps {
  onComplete: () => void;
  onDiscard: () => void;
}

export function ActiveSession({ onComplete, onDiscard }: ActiveSessionProps) {
  const {
    sessionType,
    startedAt,
    plannedExercises: baseExercises,
    exerciseLogs,
    currentExerciseIndex,
    logSet,
    editSet,
    advanceExercise,
    setSessionRpe,
    setSessionComplete,
    clearSession,
  } = useSessionStore();

  const { currentGate } = useRecoveryStore();

  // Route non-strength session types to dedicated screens
  if (sessionType === 'zone2') {
    return <Zone2Session onComplete={onComplete} onDiscard={onDiscard} />;
  }
  if (sessionType === 'intervals') {
    return <IntervalsSession onComplete={onComplete} onDiscard={onDiscard} />;
  }
  if (sessionType === 'mobility') {
    return <MobilitySession onComplete={onComplete} onDiscard={onDiscard} />;
  }

  // Track active substitute per exercise index: { name, reason }
  const [substitutes, setSubstitutes] = useState<Record<number, { name: string; reason: string }>>({});
  const [elapsed, setElapsed] = useState(0);
  const [showRpeModal, setShowRpeModal] = useState(false);
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (startedAt) {
        setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsedStr = (() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  const exercises: PlannedExercise[] = baseExercises.map((ex, i) => ({
    ...ex,
    name: substitutes[i]?.name ?? ex.name,
  }));

  const handleSetLogged = useCallback(
    (exerciseName: string, set: LoggedSet) => {
      logSet(exerciseName, set);
    },
    [logSet],
  );

  const handleSetEdited = useCallback(
    (exerciseName: string, setIndex: number, updatedSet: LoggedSet) => {
      editSet(exerciseName, setIndex, updatedSet);
    },
    [editSet],
  );

  const handleExerciseComplete = useCallback(() => {
    if (currentExerciseIndex < exercises.length - 1) {
      advanceExercise();
    } else {
      // Last exercise done — prompt for session RPE
      setShowRpeModal(true);
    }
  }, [currentExerciseIndex, exercises.length, advanceExercise]);

  const handleSubstitute = (index: number, entry: SubstituteEntry) => {
    setSubstitutes((prev) => ({ ...prev, [index]: { name: entry.name, reason: entry.reason } }));
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Session',
      'All logged sets will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => { clearSession(); onDiscard(); },
        },
      ],
    );
  };

  const handleCompleteSession = async () => {
    if (selectedRpe === null) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      setSessionRpe(selectedRpe);

      const durationMinutes = Math.round(elapsed / 60);
      const today = localDateISO();

      // Build logged exercises array — always log the original programmed name
      const loggedExercises = baseExercises.map((originalEx, i) => {
        const sub = substitutes[i] ?? null;
        const displayedName = sub?.name ?? originalEx.name;
        const log = exerciseLogs[displayedName] ?? exerciseLogs[originalEx.name];
        return {
          name: originalEx.name,           // original programmed movement
          pattern: originalEx.pattern,
          tier: originalEx.tier,
          sets: log?.sets ?? [],
          substitute_used: sub !== null,
          substitute_name: sub?.name ?? null,
          substitute_reason: sub?.reason ?? null,
          superset: originalEx.superset ?? null,
        };
      });

      const { error } = await supabase.functions.invoke('session-complete', {
        body: {
          date: today,
          session_type: sessionType,
          session_rpe: selectedRpe,
          duration_minutes: durationMinutes,
          exercises_json: {
            exercises: loggedExercises,
            cardio: null,
            mobility: null,
          },
          gate_at_time: currentGate ?? 'green',
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setSessionComplete();
      clearSession();
      setShowRpeModal(false);
      onComplete();
    } catch (e) {
      Alert.alert('Failed to save session', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const sessionLabel = SESSION_TYPE_LABELS[sessionType ?? ''] ?? sessionType ?? 'Session';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
        <View style={{ flex: 1 }}>
          <Text className="text-white text-base font-semibold">{sessionLabel}</Text>
          <Text className="text-zinc-500 text-sm tabular-nums">{elapsedStr}</Text>
        </View>
        <TouchableOpacity
          onPress={handleDiscard}
          className="bg-zinc-900 rounded-lg px-3 py-2"
        >
          <Text className="text-zinc-400 text-sm">End</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.map((ex, idx) => (
          <ExerciseRow
            key={`${ex.name}-${idx}`}
            exercise={ex}
            isActive={idx === currentExerciseIndex}
            isCompleted={idx < currentExerciseIndex}
            loggedSets={exerciseLogs[substitutes[idx]?.name ?? ex.name]?.sets ?? []}
            activeSubstitute={substitutes[idx]?.name ?? null}
            onSetLogged={(set) => handleSetLogged(substitutes[idx]?.name ?? ex.name, set)}
            onSetEdited={(setIndex, updatedSet) => handleSetEdited(substitutes[idx]?.name ?? ex.name, setIndex, updatedSet)}
            onExerciseComplete={handleExerciseComplete}
            onSubstitute={(entry) => handleSubstitute(idx, entry)}
          />
        ))}

        {/* Spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Footer — Complete Session CTA */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#18181b' }}>
        <TouchableOpacity
          onPress={() => setShowRpeModal(true)}
          className="bg-white rounded-xl py-4 items-center"
        >
          <Text className="text-black text-sm font-semibold">Complete Session</Text>
        </TouchableOpacity>
      </View>

      {/* Session RPE modal */}
      <Modal
        visible={showRpeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRpeModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/70"
          activeOpacity={1}
          onPress={() => !isSubmitting && setShowRpeModal(false)}
        />
        <View className="bg-zinc-900 rounded-t-3xl border-t border-zinc-800 px-6 pt-5 pb-10 gap-5">
          <View className="w-10 h-1 bg-zinc-700 rounded-full self-center" />

          <View>
            <Text className="text-white text-base font-semibold">
              How was that session overall?
            </Text>
            <Text className="text-zinc-500 text-sm mt-1">
              Rate effort out of 10
            </Text>
          </View>

          {/* RPE grid */}
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => setSelectedRpe(val)}
                className={`w-14 py-3.5 rounded-xl items-center border ${
                  selectedRpe === val
                    ? 'bg-white border-white'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    selectedRpe === val ? 'text-black' : 'text-zinc-300'
                  }`}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleCompleteSession}
            disabled={selectedRpe === null || isSubmitting}
            className={`py-4 rounded-xl items-center ${
              selectedRpe !== null && !isSubmitting ? 'bg-white' : 'bg-zinc-800'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color={selectedRpe !== null ? '#000' : '#71717a'} />
            ) : (
              <Text
                className={`text-sm font-semibold ${
                  selectedRpe !== null ? 'text-black' : 'text-zinc-600'
                }`}
              >
                Save Session
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
