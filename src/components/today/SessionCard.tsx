/**
 * SessionCard.tsx
 *
 * Shows today's programmed session with type, duration, and a Start Session CTA.
 * Locked (dimmed) if the daily check-in has not been completed.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { PlannedSession, SessionType } from '../../types/athlete';

const SESSION_LABELS: Record<SessionType, string> = {
  strength_calisthenics: 'Strength & Skill',
  zone2: 'Zone 2 Cardio',
  intervals: 'Intervals',
  mobility: 'Mobility',
  rest: 'Rest Day',
};

const SESSION_ICONS: Record<SessionType, string> = {
  strength_calisthenics: '🏋',
  zone2: '🚴',
  intervals: '⚡',
  mobility: '🧘',
  rest: '😴',
};

interface SessionCardProps {
  session: PlannedSession;
  locked: boolean;
  onStart: () => void;
}

export function SessionCard({ session, locked, onStart }: SessionCardProps) {
  const label = SESSION_LABELS[session.session_type] ?? session.session_type;
  const icon = SESSION_ICONS[session.session_type] ?? '◈';
  const exerciseCount = session.exercises.length;
  const isRest = session.session_type === 'rest';

  return (
    <View
      className={`rounded-2xl border p-5 gap-4 ${
        locked ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-700 bg-zinc-900'
      }`}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3">
        <Text className="text-2xl">{icon}</Text>
        <View className="flex-1">
          <Text
            className={`text-base font-semibold ${locked ? 'text-zinc-500' : 'text-white'}`}
          >
            {label}
          </Text>
          <Text className="text-zinc-500 text-sm">
            {isRest
              ? 'Recovery day — no session scheduled'
              : `${session.estimated_duration_minutes} min · ${exerciseCount} exercises`}
          </Text>
        </View>
      </View>

      {/* Exercise preview (first 3) */}
      {!isRest && exerciseCount > 0 && (
        <View className="gap-1.5">
          {session.exercises.slice(0, 3).map((ex) => {
            const firstSet = ex.sets[0];
            const loadStr = firstSet?.load_kg ? ` @ ${firstSet.load_kg}kg` : '';
            const repsStr = firstSet
              ? `${ex.sets.length}×${firstSet.target_reps_min}–${firstSet.target_reps_max}`
              : '';
            return (
              <Text
                key={ex.name}
                className={`text-xs ${locked ? 'text-zinc-600' : 'text-zinc-400'}`}
              >
                {ex.name}{'  '}{repsStr}{loadStr}
              </Text>
            );
          })}
          {exerciseCount > 3 && (
            <Text className={`text-xs ${locked ? 'text-zinc-700' : 'text-zinc-500'}`}>
              +{exerciseCount - 3} more exercises
            </Text>
          )}
        </View>
      )}

      {/* Locked message */}
      {locked && (
        <Text className="text-zinc-600 text-xs">
          Complete your daily check-in to unlock this session.
        </Text>
      )}

      {/* Start CTA */}
      {!isRest && !locked && (
        <TouchableOpacity
          onPress={onStart}
          className="bg-white rounded-xl py-3.5 items-center"
        >
          <Text className="text-black text-sm font-semibold">Start Session</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
