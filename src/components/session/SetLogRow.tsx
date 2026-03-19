/**
 * SetLogRow.tsx
 *
 * A single set logging row within an exercise.
 *
 * Two modes:
 *   Rep-based (planned.hold_duration_seconds is null):
 *     Shows set number, load input, reps input, and RIR selector.
 *   Timed hold (planned.hold_duration_seconds is not null):
 *     Shows "Hold for Xs" and a HoldTimer countdown. No reps or RIR input.
 *
 * Calls onLog when the set is confirmed (reps + RIR for rep-based, null/null for holds).
 */

import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { LoggedSet, PlannedSet } from '../../types/athlete';
import { HoldTimer } from './HoldTimer';

const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;

interface SetLogRowProps {
  setNumber: number;
  planned: PlannedSet;
  isLogged: boolean;
  loggedReps?: number | null;
  loggedLoad?: number | null;
  loggedRir?: number | null;
  /** Standard string for legacy calisthenics sets (e.g. "3x8 each RIR2"). */
  calisthenicsStandard?: string | null;
  onLog: (reps: number | null, loadKg: number | null, rir: number | null) => void;
  onEdit: (updatedSet: LoggedSet) => void;
}

export function SetLogRow({
  setNumber,
  planned,
  isLogged,
  loggedReps,
  loggedLoad,
  loggedRir,
  calisthenicsStandard,
  onLog,
  onEdit,
}: SetLogRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isTimed = planned.hold_duration_seconds != null;
  // Legacy calisthenics data stored with placeholder 1–999 rep range before timed hold support.
  // Parse the actual target reps + RIR from the standard string so the input pre-fills correctly.
  const isLegacyCalisthenics = !isTimed && planned.target_reps_max != null && planned.target_reps_max >= 999;
  const legacyReps = isLegacyCalisthenics && calisthenicsStandard
    ? (calisthenicsStandard.match(/x(\d+)/) ?? [])[1] ?? ''
    : null;
  const legacyRir = isLegacyCalisthenics && calisthenicsStandard
    ? Number((calisthenicsStandard.match(/RIR(\d+)/) ?? [])[1] ?? 2)
    : null;

  const [reps, setReps] = useState(
    loggedReps?.toString() ?? legacyReps ?? planned.target_reps_min?.toString() ?? '',
  );
  const [load, setLoad] = useState(
    loggedLoad?.toString() ?? planned.load_kg?.toString() ?? '',
  );
  const [rir, setRir] = useState<number>(loggedRir ?? legacyRir ?? planned.rir_target ?? 2);

  // ── Logged (completed) state ───────────────────────────────────────────────

  if (isLogged && !isEditing) {
    return (
      <TouchableOpacity
        onPress={() => !isTimed && setIsEditing(true)}
        activeOpacity={isTimed ? 1 : 0.6}
        className="flex-row items-center py-2 gap-3 opacity-50"
      >
        <Text className="text-zinc-500 w-5 text-center text-sm">{setNumber}</Text>
        {isTimed ? (
          <Text className="text-zinc-400 text-sm flex-1">
            {planned.hold_duration_seconds}s hold completed
          </Text>
        ) : (
          <Text className="text-zinc-400 text-sm flex-1">
            {loggedReps} reps{loggedLoad ? ` @ ${loggedLoad}kg` : ''}{loggedRir != null ? ` · RIR ${loggedRir}` : ''}
          </Text>
        )}
        <Text className="text-green-500 text-sm">✓</Text>
      </TouchableOpacity>
    );
  }

  // ── Edit mode — logged set being corrected ─────────────────────────────────

  if (isEditing) {
    const handleSaveEdit = () => {
      const repsNum = parseInt(reps, 10);
      if (isNaN(repsNum) || repsNum <= 0) return;
      const loadNum = load ? parseFloat(load) : null;
      const rpeFromRir: Record<number, number> = { 0: 10, 1: 9, 2: 8, 3: 7, 4: 6 };
      onEdit({
        set_number: setNumber,
        load_kg: loadNum,
        reps_completed: repsNum,
        rir_reported: rir,
        rpe_reported: rpeFromRir[rir] ?? 8,
      });
      setIsEditing(false);
    };

    return (
      <View className="flex-row items-center py-2.5 gap-3">
        <Text className="text-zinc-500 w-5 text-center text-sm">{setNumber}</Text>

        {planned.load_kg !== null && (
          <View className="flex-row items-center bg-zinc-800 border border-amber-600 rounded-lg px-2 py-1.5 w-20">
            <TextInput
              value={load}
              onChangeText={setLoad}
              keyboardType="decimal-pad"
              className="text-white text-sm flex-1 text-center"
              placeholderTextColor="#52525b"
            />
            <Text className="text-zinc-500 text-xs">kg</Text>
          </View>
        )}

        <View className="flex-row items-center bg-zinc-800 border border-amber-600 rounded-lg px-2 py-1.5 w-16">
          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            className="text-white text-sm flex-1 text-center"
          />
        </View>

        <View className="flex-row gap-1">
          {RIR_OPTIONS.map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setRir(val)}
              className={`w-8 h-8 rounded-lg items-center justify-center ${
                rir === val ? 'bg-white' : 'bg-zinc-800'
              }`}
            >
              <Text className={`text-xs font-bold ${rir === val ? 'text-black' : 'text-zinc-400'}`}>
                {val === 4 ? '4+' : val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleSaveEdit} className="bg-amber-500 rounded-lg px-3 py-2">
          <Text className="text-black text-xs font-semibold">Save</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Timed hold mode ────────────────────────────────────────────────────────

  if (isTimed) {
    return (
      <View className="py-2 gap-2">
        <View className="flex-row items-center gap-3">
          <Text className="text-zinc-500 w-5 text-center text-sm">{setNumber}</Text>
          <Text className="text-zinc-400 text-sm">
            Hold for {planned.hold_duration_seconds}s
          </Text>
        </View>
        <View style={{ paddingLeft: 32 }}>
          <HoldTimer
            seconds={planned.hold_duration_seconds!}
            onComplete={() => onLog(null, null, null)}
          />
        </View>
      </View>
    );
  }

  // ── Rep-based mode (includes legacy calisthenics — pre-filled from standard) ─

  const handleLog = () => {
    const repsNum = parseInt(reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;
    const loadNum = load ? parseFloat(load) : null;
    onLog(repsNum, loadNum, rir);
  };

  return (
    <View className="flex-row items-center py-2.5 gap-3">
      {/* Set number */}
      <Text className="text-zinc-500 w-5 text-center text-sm">{setNumber}</Text>

      {/* Load input */}
      {planned.load_kg !== null && (
        <View className="flex-row items-center bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 w-20">
          <TextInput
            value={load}
            onChangeText={setLoad}
            keyboardType="decimal-pad"
            className="text-white text-sm flex-1 text-center"
            placeholder={planned.load_kg?.toString() ?? '—'}
            placeholderTextColor="#52525b"
          />
          <Text className="text-zinc-500 text-xs">kg</Text>
        </View>
      )}

      {/* Reps input */}
      <View className="flex-row items-center bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 w-16">
        <TextInput
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          className="text-white text-sm flex-1 text-center"
        />
      </View>

      {/* RIR selector */}
      <View className="flex-row gap-1">
        {RIR_OPTIONS.map((val) => (
          <TouchableOpacity
            key={val}
            onPress={() => setRir(val)}
            className={`w-8 h-8 rounded-lg items-center justify-center ${
              rir === val ? 'bg-white' : 'bg-zinc-800'
            }`}
          >
            <Text
              className={`text-xs font-bold ${rir === val ? 'text-black' : 'text-zinc-400'}`}
            >
              {val === 4 ? '4+' : val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Log button */}
      <TouchableOpacity
        onPress={handleLog}
        className="bg-white rounded-lg px-3 py-2"
      >
        <Text className="text-black text-xs font-semibold">Log</Text>
      </TouchableOpacity>
    </View>
  );
}
