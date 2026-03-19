/**
 * CheckInCard.tsx
 *
 * Daily check-in form: soreness (1–5), sleep hours, HRV (auto), optional notes.
 * Submits to the daily-checkin Edge Function and updates the recovery store.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { readLatestHrv, readLastNightSleepHours } from '../../lib/health';
import { useRecoveryStore } from '../../store/recoveryStore';
import type { DailyLogRow } from '../../lib/supabase';
import type { GateColour } from '../../types/athlete';

const SORENESS_LABELS = ['', 'Fresh', 'Mild', 'Moderate', 'Sore', 'Very Sore'];

interface CheckInCardProps {
  onComplete: (gate: GateColour) => void;
}

export function CheckInCard({ onComplete }: CheckInCardProps) {
  const [soreness, setSoreness] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setCurrentGate, markCheckInComplete } = useRecoveryStore();

  // Sleep hour steps: 4.0 → 10.0 in 0.5 increments
  const adjustSleep = (delta: number) => {
    const current = sleepHours ?? 7.5;
    const next = Math.min(12, Math.max(3, current + delta));
    setSleepHours(Math.round(next * 2) / 2);
  };

  const canSubmit = soreness !== null && sleepHours !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Try to read HRV from health (returns null if unavailable)
      const hrv = await readLatestHrv();

      const { data, error } = await supabase.functions.invoke('daily-checkin', {
        body: {
          soreness_rating: soreness!,
          sleep_hours: sleepHours!,
          hrv_ms: hrv,
          notes: notes.trim() || null,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const gate = (data?.gate ?? 'green') as GateColour;
      setCurrentGate(gate);

      // Optimistically mark check-in complete in the store
      const todayLog: Partial<DailyLogRow> = {
        soreness_rating: soreness!,
        sleep_hours: sleepHours!,
        hrv_ms: hrv,
        notes: notes.trim() || null,
        session_logged: false,
        session_type: null,
        session_rpe: null,
        log_date: new Date().toISOString().slice(0, 10),
      };
      markCheckInComplete(todayLog as DailyLogRow);
      onComplete(gate);
    } catch (e) {
      Alert.alert('Check-in failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 gap-5">
      <Text className="text-white text-base font-semibold">Daily Check-in</Text>

      {/* Soreness selector */}
      <View className="gap-2">
        <Text className="text-zinc-400 text-sm">
          How sore are you?
          {soreness !== null && (
            <Text className="text-white"> {SORENESS_LABELS[soreness]}</Text>
          )}
        </Text>
        <View className="flex-row gap-2">
          {[1, 2, 3, 4, 5].map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setSoreness(val)}
              className={`flex-1 py-3 rounded-xl items-center border ${
                soreness === val
                  ? 'bg-white border-white'
                  : 'bg-zinc-800 border-zinc-700'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  soreness === val ? 'text-black' : 'text-zinc-300'
                }`}
              >
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sleep hours stepper */}
      <View className="gap-2">
        <Text className="text-zinc-400 text-sm">Sleep last night</Text>
        <View className="flex-row items-center bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
          <TouchableOpacity
            onPress={() => adjustSleep(-0.5)}
            className="px-5 py-3"
          >
            <Text className="text-white text-xl font-light">−</Text>
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-white text-base font-semibold">
              {sleepHours !== null ? `${sleepHours}h` : '—'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => adjustSleep(0.5)}
            className="px-5 py-3"
          >
            <Text className="text-white text-xl font-light">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes (optional) */}
      <View className="gap-2">
        <Text className="text-zinc-400 text-sm">Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything to flag for your coach..."
          placeholderTextColor="#52525b"
          multiline
          maxLength={140}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm min-h-16"
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className={`py-4 rounded-xl items-center ${
          canSubmit && !isSubmitting ? 'bg-white' : 'bg-zinc-800'
        }`}
      >
        {isSubmitting ? (
          <ActivityIndicator color={canSubmit ? '#000' : '#71717a'} />
        ) : (
          <Text
            className={`text-sm font-semibold ${
              canSubmit ? 'text-black' : 'text-zinc-600'
            }`}
          >
            Log Check-in
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
