/**
 * SessionDetailSheet.tsx
 *
 * Bottom sheet modal showing the full planned exercise list for a session.
 * Each exercise card shows set prescription, load, RIR target, rest period,
 * and superset partner. Tapping Cue opens the FormCueSheet.
 *
 * For non-strength sessions (zone2, intervals, mobility) the exercises array
 * is empty — a type-specific description is shown instead.
 */

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PlannedExercise, PlannedSession, PlannedSet } from '../../types/athlete';
import { FormCueSheet } from '../session/FormCueSheet';

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength_calisthenics: 'Strength & Skill',
  zone2: 'Zone 2 Cardio',
  intervals: 'Intervals',
  mobility: 'Mobility',
  rest: 'Rest',
};

const NON_STRENGTH_DESCRIPTIONS: Record<string, string> = {
  zone2: '45–60 min at conversational pace. Keep HR within Zone 2 band throughout.',
  intervals: '4×4 protocol — 10 min warm-up, 4 intervals of 4 min work / 3 min recovery, 5 min cool-down.',
  mobility: '3 exercises for the current rotation area, ~15–20 min total.',
  rest: 'Full rest. Focus on sleep, nutrition, and light movement if desired.',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSets(sets: PlannedSet[]): string {
  if (sets.length === 0) return '';
  const s = sets[0];
  const count = sets.length;
  if (s.hold_duration_seconds != null) {
    return `${count} × ${s.hold_duration_seconds}s hold`;
  }
  if (s.target_reps_min != null && s.target_reps_max != null) {
    const reps =
      s.target_reps_min === s.target_reps_max
        ? `${s.target_reps_min}`
        : `${s.target_reps_min}–${s.target_reps_max}`;
    return `${count} × ${reps} reps`;
  }
  return `${count} sets`;
}

function formatRest(seconds: number): string {
  return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds}s`;
}

// ── ExerciseCard ──────────────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: PlannedExercise }) {
  const [showCue, setShowCue] = useState(false);

  const setLabel = formatSets(exercise.sets);
  const load = exercise.sets[0]?.load_kg != null ? `${exercise.sets[0].load_kg} kg` : null;
  const rir = exercise.sets[0]?.rir_target != null ? `RIR ${exercise.sets[0].rir_target}` : null;
  const superset = exercise.superset;

  return (
    <>
      <View
        style={{
          backgroundColor: '#18181b',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#27272a',
          padding: 14,
          gap: 10,
        }}
      >
        {/* Name row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{exercise.name}</Text>
            <Text style={{ color: '#52525b', fontSize: 12, textTransform: 'capitalize' }}>
              {exercise.tier} · {exercise.pattern.replace('_', ' ')}
            </Text>
          </View>
          {exercise.tier === 'primary' && (
            <TouchableOpacity
              onPress={() => setShowCue(true)}
              style={{
                backgroundColor: '#27272a',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: '#a1a1aa', fontSize: 11, fontWeight: '600' }}>Cue</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Prescription chips */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {setLabel !== '' && (
            <Text style={{ color: '#e4e4e7', fontSize: 13, fontWeight: '500' }}>{setLabel}</Text>
          )}
          {load && (
            <View style={{ backgroundColor: '#3f3f46', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{load}</Text>
            </View>
          )}
          {rir && (
            <View style={{ backgroundColor: '#3f3f46', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{rir}</Text>
            </View>
          )}
          <View style={{ backgroundColor: '#27272a', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: '#71717a', fontSize: 12 }}>rest {formatRest(exercise.rest_seconds)}</Text>
          </View>
        </View>

        {/* Superset partner */}
        {superset && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#27272a', paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: '#71717a', fontSize: 12, flex: 1 }} numberOfLines={1}>
                ⤷ {superset.name}
              </Text>
              <Text style={{ color: '#52525b', fontSize: 12 }}>{superset.standard}</Text>
            </View>
          </View>
        )}
      </View>

      <FormCueSheet
        exerciseName={exercise.name}
        visible={showCue}
        onClose={() => setShowCue(false)}
      />
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface SessionDetailSheetProps {
  session: PlannedSession | null;
  /** Formatted label for the day, e.g. "Mon, Mar 16" */
  dayLabel: string;
  visible: boolean;
  onClose: () => void;
}

export function SessionDetailSheet({ session, dayLabel, visible, onClose }: SessionDetailSheetProps) {
  if (!session) return null;

  const typeLabel = SESSION_TYPE_LABELS[session.session_type] ?? session.session_type;
  const hasExercises = session.exercises.length > 0;
  const nonStrengthDesc = NON_STRENGTH_DESCRIPTIONS[session.session_type] ?? null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Dismiss overlay */}
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Sheet — fixed height so ScrollView flex:1 has a definite parent to measure */}
        <View
          style={{
            backgroundColor: '#09090b',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: '#27272a',
            height: '80%',
          }}
        >
        {/* Handle */}
        <View style={{ width: 40, height: 4, backgroundColor: '#3f3f46', borderRadius: 2, alignSelf: 'center', marginTop: 12 }} />

        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 14,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: '#18181b',
          }}
        >
          <View style={{ gap: 2 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{typeLabel}</Text>
            <Text style={{ color: '#52525b', fontSize: 13 }}>
              {dayLabel} · {session.estimated_duration_minutes} min
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{ backgroundColor: '#27272a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Text style={{ color: '#71717a', fontSize: 13 }}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {hasExercises ? (
            session.exercises.map((ex, idx) => (
              <ExerciseCard key={`${ex.name}-${idx}`} exercise={ex} />
            ))
          ) : (
            <View
              style={{
                backgroundColor: '#18181b',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#27272a',
                padding: 20,
                gap: 6,
              }}
            >
              <Text style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 22 }}>
                {nonStrengthDesc ?? 'No exercises programmed.'}
              </Text>
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
