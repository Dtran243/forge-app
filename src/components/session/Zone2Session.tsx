/**
 * Zone2Session.tsx
 *
 * Full-screen active session view for Zone 2 cardio sessions.
 * Shows elapsed timer, HR zone status, and target reminders.
 * On complete: queries Apple Health for workout data, falls back to manual entry.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { localDateISO } from '../../lib/dates';
import { useSessionStore } from '../../store/sessionStore';
import { useRecoveryStore } from '../../store/recoveryStore';
import { useAthleteStore } from '../../store/athleteStore';
import { queryRecentWorkout } from '../../lib/health';

interface Zone2SessionProps {
  onComplete: () => void;
  onDiscard: () => void;
}

export function Zone2Session({ onComplete, onDiscard }: Zone2SessionProps) {
  const { clearSession, setSessionComplete } = useSessionStore();
  const { currentGate } = useRecoveryStore();
  const { profile } = useAthleteStore();

  const hrMax = profile?.max_hr_bpm ?? (profile?.age ? 220 - profile.age : 185);
  const hrFloor = Math.round(hrMax * 0.60);
  const hrCeiling = Math.round(hrMax * 0.75);

  const startedAt = useRef(Date.now());
  const submittingRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDuration, setManualDuration] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const elapsedStr = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`;

  const targetMin = 45;
  const targetMax = 60;
  const progressPct = Math.min(1, elapsedMin / targetMax);

  const submitSession = useCallback(async (data: {
    duration_minutes: number;
    avg_hr_bpm: number | null;
    in_zone_minutes: number | null;
    data_source: 'apple_health' | 'manual';
  }) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const today = localDateISO();
      const { error } = await supabase.functions.invoke('session-complete', {
        body: {
          date: today,
          session_type: 'zone2',
          session_rpe: null,
          duration_minutes: data.duration_minutes,
          exercises_json: {
            exercises: [],
            cardio: {
              type: 'zone2',
              duration_minutes: data.duration_minutes,
              avg_hr_bpm: data.avg_hr_bpm,
              max_hr_bpm: null,
              distance_km: null,
              modality: 'cycling',
              zone2_minutes: data.in_zone_minutes,
              data_source: data.data_source,
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
  }, [currentGate, clearSession, setSessionComplete, onComplete]);

  const handleComplete = useCallback(async () => {
    const workout = await queryRecentWorkout(hrFloor, hrCeiling);
    if (workout) {
      await submitSession({
        duration_minutes: workout.duration_minutes,
        avg_hr_bpm: workout.avg_hr_bpm,
        in_zone_minutes: workout.in_zone_minutes,
        data_source: 'apple_health',
      });
    } else {
      setManualDuration(String(elapsedMin > 0 ? elapsedMin : ''));
      setShowManualModal(true);
    }
  }, [hrFloor, hrCeiling, elapsedMin, submitSession]);

  const handleManualSubmit = useCallback(async () => {
    const mins = parseInt(manualDuration, 10);
    if (!mins || mins < 1) {
      Alert.alert('Enter duration', 'How long did you train? (minutes)');
      return;
    }
    setShowManualModal(false);
    await submitSession({
      duration_minutes: mins,
      avg_hr_bpm: null,
      in_zone_minutes: null,
      data_source: 'manual',
    });
  }, [manualDuration, submitSession]);

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
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Zone 2 Cardio</Text>
          <Text style={{ color: '#71717a', fontSize: 13 }}>Stay conversational</Text>
        </View>
        <TouchableOpacity onPress={handleDiscard} style={{ backgroundColor: '#18181b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: '#71717a', fontSize: 13 }}>End</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, padding: 24, gap: 24 }}>
        {/* Elapsed timer */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ color: '#fff', fontSize: 72, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {elapsedStr}
          </Text>
          <Text style={{ color: '#52525b', fontSize: 14 }}>
            {elapsedMin < targetMin
              ? `${targetMin - elapsedMin} min to minimum`
              : elapsedMin < targetMax
              ? 'In target window ✓'
              : 'Great session length'}
          </Text>
          {/* Progress bar */}
          <View style={{ width: '100%', height: 4, backgroundColor: '#27272a', borderRadius: 2, marginTop: 8 }}>
            <View style={{ width: `${progressPct * 100}%`, height: 4, backgroundColor: progressPct >= 1 ? '#22c55e' : '#3b82f6', borderRadius: 2 }} />
          </View>
          <Text style={{ color: '#52525b', fontSize: 11, marginTop: 4 }}>Target: {targetMin}–{targetMax} min</Text>
        </View>

        {/* HR zone badge */}
        <View style={{ backgroundColor: '#18181b', borderRadius: 16, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#a1a1aa', fontSize: 14 }}>Heart Rate</Text>
            <View style={{ backgroundColor: '#27272a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#71717a', fontSize: 12 }}>— bpm</Text>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#52525b', fontSize: 13 }}>Zone floor</Text>
              <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{hrFloor} bpm</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#52525b', fontSize: 13 }}>Zone ceiling</Text>
              <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{hrCeiling} bpm</Text>
            </View>
          </View>
        </View>

        {/* Target reminder */}
        <View style={{ backgroundColor: '#18181b', borderRadius: 16, padding: 20, gap: 10 }}>
          <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Reminders</Text>
          <Text style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 20 }}>
            • Stay between {hrFloor}–{hrCeiling} bpm
          </Text>
          <Text style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 20 }}>
            • Talk test: full sentences at all times
          </Text>
          <Text style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 20 }}>
            • Preferred: cycling or rowing
          </Text>
        </View>
      </View>

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

      {/* Manual duration modal */}
      <Modal visible={showManualModal} transparent animationType="slide" onRequestClose={() => setShowManualModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} activeOpacity={1} onPress={() => setShowManualModal(false)} />
        <View style={{ backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#27272a', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 20 }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#3f3f46', borderRadius: 2, alignSelf: 'center' }} />
          <View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>How long did you train?</Text>
            <Text style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>Apple Health workout not found — enter manually.</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TextInput
              value={manualDuration}
              onChangeText={setManualDuration}
              keyboardType="number-pad"
              placeholder="45"
              placeholderTextColor="#52525b"
              style={{ flex: 1, backgroundColor: '#27272a', borderRadius: 10, borderWidth: 1, borderColor: '#3f3f46', color: '#fff', fontSize: 24, fontWeight: '600', textAlign: 'center', paddingVertical: 14 }}
            />
            <Text style={{ color: '#71717a', fontSize: 16 }}>minutes</Text>
          </View>
          <TouchableOpacity
            onPress={handleManualSubmit}
            disabled={isSubmitting}
            style={{ backgroundColor: manualDuration ? '#fff' : '#27272a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
          >
            {isSubmitting
              ? <ActivityIndicator color={manualDuration ? '#000' : '#71717a'} />
              : <Text style={{ color: manualDuration ? '#000' : '#52525b', fontSize: 14, fontWeight: '600' }}>Save Session</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
