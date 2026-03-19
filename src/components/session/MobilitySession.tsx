/**
 * MobilitySession.tsx
 *
 * Full-screen active session view for dedicated mobility sessions.
 * Shows a checklist of 3 exercises for the current rotation area,
 * each with a per-exercise hold timer. Complete enabled once all checked
 * or after 10 minutes elapsed.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { MobilityArea } from '../../types/athlete';

interface MobilitySessionProps {
  onComplete: () => void;
  onDiscard: () => void;
}

interface MobilityExercise {
  name: string;
  sets: number;
  durationSeconds?: number;
  reps?: number;
  cue: string;
}

const MOBILITY_EXERCISES: Record<string, MobilityExercise[]> = {
  hip_flexor: [
    { name: '90/90 hip stretch', sets: 2, durationSeconds: 60, cue: 'Sit tall — do not lean forward. Feel the stretch in the rear leg hip flexor.' },
    { name: 'Kneeling hip flexor stretch', sets: 2, durationSeconds: 45, cue: 'Posterior pelvic tilt before sinking forward. Prevents lumbar hyperextension.' },
    { name: 'Couch stretch', sets: 2, durationSeconds: 60, cue: 'Hips fully extended, upright torso. Most effective rectus femoris stretch.' },
  ],
  thoracic_rotation: [
    { name: 'Thoracic rotation (quadruped)', sets: 2, reps: 10, cue: 'Hand behind head. Rotate elbow toward ceiling — follow with eyes.' },
    { name: 'Open book stretch (side-lying)', sets: 2, reps: 10, cue: 'Keep knees stacked. Only the upper spine rotates — lower body stays still.' },
    { name: 'Foam roller thoracic extension', sets: 2, reps: 8, cue: 'Roll perpendicular to spine. Extend over the roller — arms crossed on chest.' },
  ],
  posterior_chain: [
    { name: 'Standing hamstring stretch (PNF)', sets: 3, durationSeconds: 30, cue: 'Contract hamstring for 5s, then relax deeper into stretch.' },
    { name: 'Seated forward fold', sets: 2, durationSeconds: 60, cue: 'Hinge at hip — do not round the spine. Reach for the shin, not the toe.' },
    { name: 'Supine glute stretch (figure-4)', sets: 2, durationSeconds: 45, cue: 'Pull knee toward opposite shoulder. Feel it in the piriformis.' },
  ],
  shoulder_internal_rotation: [
    { name: 'Sleeper stretch', sets: 3, durationSeconds: 45, cue: 'Side-lying. Forearm rotates toward floor. Gentle pressure only — stop if sharp pain.' },
    { name: 'Cross-body shoulder stretch', sets: 2, durationSeconds: 45, cue: 'Pull arm across chest at shoulder height. Feel it in the posterior deltoid.' },
    { name: 'Wall internal rotation stretch', sets: 2, durationSeconds: 30, cue: 'Forearm against wall. Rotate body away. Stretches posterior capsule.' },
  ],
  ankle_dorsiflexion: [
    { name: 'Knee-to-wall stretch', sets: 2, reps: 15, cue: 'Toes 10cm from wall. Knee drives forward over pinky toe without heel lifting.' },
    { name: 'Banded ankle mobilisation', sets: 2, reps: 15, cue: 'Band at anterior ankle, resistance pulling forward. Drive knee forward over foot.' },
    { name: 'Single-leg calf raise (eccentric)', sets: 2, reps: 10, cue: '3-second lowering. Develops calf eccentrically — addresses tissue restriction.' },
  ],
  adductors: [
    { name: 'Copenhagen adductor stretch', sets: 3, durationSeconds: 45, cue: 'Side-lying. Knee on bench, foot off. Let gravity provide the stretch.' },
    { name: 'Wide-stance hip shift', sets: 2, reps: 10, cue: 'Shift weight to one side. Keep both feet flat. Feel the stretch in the straight leg.' },
    { name: 'Frog stretch', sets: 2, durationSeconds: 60, cue: 'Forearms on floor. Knees wide. Rock hips back and forth gently.' },
  ],
};

const AREA_LABELS: Record<string, string> = {
  hip_flexor: 'Hip Flexor',
  thoracic_rotation: 'Thoracic Rotation',
  posterior_chain: 'Posterior Chain',
  shoulder_internal_rotation: 'Shoulder Internal Rotation',
  ankle_dorsiflexion: 'Ankle Dorsiflexion',
  adductors: 'Adductors',
};

function ExerciseCard({
  exercise,
  isChecked,
  onCheck,
}: {
  exercise: MobilityExercise;
  isChecked: boolean;
  onCheck: () => void;
}) {
  const [timerActive, setTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(exercise.durationSeconds ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerActive || !exercise.durationSeconds) return;
    setTimerRemaining(exercise.durationSeconds);
    setTimerActive(true);
  };

  useEffect(() => {
    if (!timerActive) return;
    intervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [timerActive]);

  const setLabel = exercise.durationSeconds
    ? `${exercise.sets}×${exercise.durationSeconds}s`
    : `${exercise.sets}×${exercise.reps} reps`;

  return (
    <View style={{
      backgroundColor: isChecked ? '#14532d22' : '#18181b',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isChecked ? '#22c55e44' : '#27272a',
      padding: 16,
      gap: 10,
      opacity: isChecked ? 0.7 : 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: isChecked ? '#86efac' : '#fff', fontSize: 15, fontWeight: '600', textDecorationLine: isChecked ? 'line-through' : 'none' }}>
            {exercise.name}
          </Text>
          <Text style={{ color: '#71717a', fontSize: 13 }}>{setLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={onCheck}
          style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: isChecked ? '#22c55e' : '#27272a',
            borderWidth: 1, borderColor: isChecked ? '#22c55e' : '#3f3f46',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isChecked && <Text style={{ color: '#000', fontSize: 14, fontWeight: '700' }}>✓</Text>}
        </TouchableOpacity>
      </View>

      {!isChecked && (
        <>
          <Text style={{ color: '#52525b', fontSize: 12, lineHeight: 18 }}>{exercise.cue}</Text>

          {exercise.durationSeconds != null && (
            <TouchableOpacity
              onPress={startTimer}
              disabled={timerActive}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: timerActive ? '#27272a' : '#1e3a5f',
                borderRadius: 10, paddingVertical: 10, gap: 8,
              }}
            >
              <Text style={{ color: timerActive ? '#fff' : '#93c5fd', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                {timerActive
                  ? `${String(Math.floor(timerRemaining / 60)).padStart(2, '0')}:${String(timerRemaining % 60).padStart(2, '0')}`
                  : timerRemaining === 0
                  ? '↺ Restart timer'
                  : `▶ ${exercise.durationSeconds}s hold`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

export function MobilitySession({ onComplete, onDiscard }: MobilitySessionProps) {
  const { clearSession, setSessionComplete } = useSessionStore();
  const { currentGate } = useRecoveryStore();

  const startedAt = useRef(Date.now());
  const submittingRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rotationArea, setRotationArea] = useState<string>('hip_flexor');

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current rotation area from mobility_state
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await (supabase as any)
          .from('mobility_state')
          .select('current_rotation_area')
          .eq('user_id', session.user.id)
          .order('week_starting', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.current_rotation_area) {
          setRotationArea(data.current_rotation_area as string);
        }
      } catch {
        // Fall back to hip_flexor
      }
    })();
  }, []);

  const exercises = MOBILITY_EXERCISES[rotationArea] ?? MOBILITY_EXERCISES.hip_flexor;
  const allChecked = checked.every(Boolean);
  const elapsedMin = Math.floor(elapsed / 60);
  const canComplete = allChecked || elapsedMin >= 10;
  const checkedCount = checked.filter(Boolean).length;

  const handleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const handleComplete = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const durationMinutes = Math.max(1, Math.round(elapsed / 60));
      const today = localDateISO();

      const { error } = await supabase.functions.invoke('session-complete', {
        body: {
          date: today,
          session_type: 'mobility',
          session_rpe: null,
          duration_minutes: durationMinutes,
          exercises_json: {
            exercises: [],
            cardio: null,
            mobility: {
              area_trained: rotationArea as MobilityArea,
              session_duration_minutes: durationMinutes,
              embedded: false,
              subjective_quality: null,
              exercises_completed: checkedCount,
              exercises_total: exercises.length,
            },
          },
          gate_at_time: currentGate ?? 'green',
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setSessionComplete();
      clearSession();
      onComplete();
    } catch (e) {
      Alert.alert('Failed to save session', e instanceof Error ? e.message : 'Try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [elapsed, rotationArea, checkedCount, exercises.length, currentGate, clearSession, setSessionComplete, onComplete]);

  const handleDiscard = () => {
    Alert.alert('End Session', 'Discard this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { clearSession(); onDiscard(); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Mobility</Text>
          <Text style={{ color: '#71717a', fontSize: 13 }}>
            {AREA_LABELS[rotationArea] ?? rotationArea} · {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDiscard} style={{ backgroundColor: '#18181b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: '#71717a', fontSize: 13 }}>End</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
        {/* Progress */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#52525b', fontSize: 13 }}>{checkedCount} / {exercises.length} exercises</Text>
          {!allChecked && elapsedMin >= 10 && (
            <Text style={{ color: '#f59e0b', fontSize: 12 }}>10+ min — ready to finish</Text>
          )}
        </View>

        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            isChecked={checked[i] ?? false}
            onCheck={() => handleCheck(i)}
          />
        ))}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#18181b' }}>
        <TouchableOpacity
          onPress={handleComplete}
          disabled={!canComplete || isSubmitting}
          style={{
            backgroundColor: canComplete && !isSubmitting ? '#fff' : '#27272a',
            borderRadius: 12, paddingVertical: 14, alignItems: 'center',
          }}
        >
          {isSubmitting
            ? <ActivityIndicator color={canComplete ? '#000' : '#71717a'} />
            : <Text style={{ color: canComplete ? '#000' : '#52525b', fontSize: 14, fontWeight: '600' }}>
                {allChecked ? 'Complete Session' : canComplete ? 'Complete Session (early)' : `Complete after all exercises or 10 min`}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
