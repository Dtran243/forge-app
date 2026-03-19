/**
 * IntervalsSession.tsx
 *
 * Full-screen active session view for VO2 max interval sessions (4×4 protocol).
 * Phase-based timer: Warm-up → Build → 4×[Interval + Recovery] → Cool-down.
 * Auto-advances phases, shows HR targets per phase.
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
import { useAthleteStore } from '../../store/athleteStore';
import { queryRecentWorkout } from '../../lib/health';

interface IntervalsSessionProps {
  onComplete: () => void;
  onDiscard: () => void;
}

interface Phase {
  name: string;
  durationSeconds: number;
  hrPctMin: number;
  hrPctMax: number;
  description: string;
  isWork: boolean;
}

const PHASES: Phase[] = [
  { name: 'Warm-up',    durationSeconds: 600, hrPctMin: 0.55, hrPctMax: 0.65, description: 'Easy pace — loosen up', isWork: false },
  { name: 'Build',      durationSeconds: 120, hrPctMin: 0.75, hrPctMax: 0.85, description: 'Gradually increase intensity', isWork: false },
  { name: 'Interval 1', durationSeconds: 240, hrPctMin: 0.90, hrPctMax: 0.95, description: 'Max sustainable effort', isWork: true },
  { name: 'Recovery 1', durationSeconds: 180, hrPctMin: 0.50, hrPctMax: 0.65, description: 'Walk or easy pedal', isWork: false },
  { name: 'Interval 2', durationSeconds: 240, hrPctMin: 0.90, hrPctMax: 0.95, description: 'Max sustainable effort', isWork: true },
  { name: 'Recovery 2', durationSeconds: 180, hrPctMin: 0.50, hrPctMax: 0.65, description: 'Walk or easy pedal', isWork: false },
  { name: 'Interval 3', durationSeconds: 240, hrPctMin: 0.90, hrPctMax: 0.95, description: 'Max sustainable effort', isWork: true },
  { name: 'Recovery 3', durationSeconds: 180, hrPctMin: 0.50, hrPctMax: 0.65, description: 'Walk or easy pedal', isWork: false },
  { name: 'Interval 4', durationSeconds: 240, hrPctMin: 0.90, hrPctMax: 0.95, description: 'Last one — give everything', isWork: true },
  { name: 'Cool-down',  durationSeconds: 300, hrPctMin: 0.40, hrPctMax: 0.60, description: 'Easy pace until HR drops', isWork: false },
];

export function IntervalsSession({ onComplete, onDiscard }: IntervalsSessionProps) {
  const { clearSession, setSessionComplete } = useSessionStore();
  const { currentGate } = useRecoveryStore();
  const { profile } = useAthleteStore();

  const hrMax = profile?.max_hr_bpm ?? (profile?.age ? 220 - profile.age : 185);

  const startedAt = useRef(Date.now());
  const submittingRef = useRef(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phase = PHASES[phaseIdx];
  const phaseRemaining = Math.max(0, (phase?.durationSeconds ?? 0) - phaseElapsed);
  const hrFloor = Math.round(hrMax * (phase?.hrPctMin ?? 0.6));
  const hrCeiling = Math.round(hrMax * (phase?.hrPctMax ?? 0.75));

  // Count work intervals completed so far
  const workIntervalsCompleted = PHASES
    .slice(0, phaseIdx)
    .filter((p) => p.isWork).length;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const total = Math.floor((now - startedAt.current) / 1000);
      setTotalElapsed(total);

      setPhaseElapsed((prev) => {
        const next = prev + 1;
        if (phase && next >= phase.durationSeconds && phaseIdx < PHASES.length - 1) {
          setPhaseIdx((p) => p + 1);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, phaseIdx]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const submitSession = useCallback(async (setsCompleted: number) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const workout = await queryRecentWorkout(
        Math.round(hrMax * 0.60),
        Math.round(hrMax * 0.95),
      );

      const durationMinutes = Math.round(totalElapsed / 60);
      const today = localDateISO();

      const { error } = await supabase.functions.invoke('session-complete', {
        body: {
          date: today,
          session_type: 'intervals',
          session_rpe: null,
          duration_minutes: workout?.duration_minutes ?? durationMinutes,
          exercises_json: {
            exercises: [],
            cardio: {
              type: 'intervals',
              duration_minutes: workout?.duration_minutes ?? durationMinutes,
              avg_hr_bpm: workout?.avg_hr_bpm ?? null,
              max_hr_bpm: null,
              distance_km: null,
              modality: 'running',
              interval_sets_completed: setsCompleted,
              data_source: workout ? 'apple_health' : 'manual',
            },
            mobility: null,
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
  }, [totalElapsed, hrMax, currentGate, clearSession, setSessionComplete, onComplete]);

  const handleComplete = useCallback(() => {
    const setsCompleted = PHASES.slice(0, phaseIdx + 1).filter((p) => p.isWork).length +
      (phase?.isWork && phaseElapsed >= (phase.durationSeconds * 0.5) ? 1 : 0);
    submitSession(Math.min(4, setsCompleted));
  }, [phaseIdx, phase, phaseElapsed, submitSession]);

  const handleAdvancePhase = () => {
    if (phaseIdx < PHASES.length - 1) {
      setPhaseIdx((p) => p + 1);
      setPhaseElapsed(0);
    }
  };

  const handleDiscard = () => {
    Alert.alert('End Session', 'Discard this session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { clearSession(); onDiscard(); } },
    ]);
  };

  const phaseColor = phase?.isWork ? '#ef4444' : phaseIdx <= 1 ? '#3b82f6' : '#22c55e';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#18181b' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Intervals</Text>
          <Text style={{ color: '#71717a', fontSize: 13, fontVariant: ['tabular-nums'] }}>{formatTime(totalElapsed)} elapsed</Text>
        </View>
        <TouchableOpacity onPress={handleDiscard} style={{ backgroundColor: '#18181b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: '#71717a', fontSize: 13 }}>End</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 20 }}>
        {/* Phase progress dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {PHASES.map((p, i) => (
            <View
              key={i}
              style={{
                width: i === phaseIdx ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i < phaseIdx ? '#52525b' : i === phaseIdx ? phaseColor : '#27272a',
              }}
            />
          ))}
        </View>

        {/* Current phase */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: phaseColor + '22', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: phaseColor, fontSize: 13, fontWeight: '600' }}>{phase?.name ?? 'Complete'}</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 80, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatTime(phaseRemaining)}
          </Text>
          <Text style={{ color: '#71717a', fontSize: 14 }}>{phase?.description}</Text>
        </View>

        {/* HR targets */}
        <View style={{ backgroundColor: '#18181b', borderRadius: 16, padding: 20, gap: 10 }}>
          <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Target HR</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
            {hrFloor}–{hrCeiling} <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '400' }}>bpm</Text>
          </Text>
          <Text style={{ color: '#52525b', fontSize: 13 }}>
            ({Math.round((phase?.hrPctMin ?? 0) * 100)}–{Math.round((phase?.hrPctMax ?? 0) * 100)}% HRmax)
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: '#52525b', fontSize: 13 }}>Current HR</Text>
            <Text style={{ color: '#71717a', fontSize: 13 }}>— bpm</Text>
          </View>
        </View>

        {/* Work intervals progress */}
        <View style={{ backgroundColor: '#18181b', borderRadius: 16, padding: 20, gap: 8 }}>
          <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Intervals</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4].map((n) => (
              <View
                key={n}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
                  backgroundColor: n <= workIntervalsCompleted ? '#22c55e22' : '#27272a',
                  borderWidth: 1,
                  borderColor: n <= workIntervalsCompleted ? '#22c55e' : '#3f3f46',
                }}
              >
                <Text style={{ color: n <= workIntervalsCompleted ? '#22c55e' : '#52525b', fontSize: 16, fontWeight: '700' }}>
                  {n <= workIntervalsCompleted ? '✓' : n}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Manual advance */}
        <TouchableOpacity
          onPress={handleAdvancePhase}
          disabled={phaseIdx >= PHASES.length - 1}
          style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' }}
        >
          <Text style={{ color: '#52525b', fontSize: 13 }}>
            {phaseIdx >= PHASES.length - 1 ? 'Last phase' : `Skip to ${PHASES[phaseIdx + 1]?.name ?? 'next'}`}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#18181b' }}>
        <TouchableOpacity
          onPress={handleComplete}
          disabled={isSubmitting}
          style={{ backgroundColor: isSubmitting ? '#27272a' : '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
        >
          {isSubmitting
            ? <ActivityIndicator color="#71717a" />
            : <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>Complete Session</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
