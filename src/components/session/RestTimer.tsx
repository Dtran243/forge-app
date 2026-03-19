/**
 * RestTimer.tsx
 *
 * Countdown timer displayed between sets. Auto-starts when a set is logged.
 * Calls onComplete when the countdown reaches 0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Vibration, View } from 'react-native';

interface RestTimerProps {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimer({ seconds, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          Vibration.vibrate([0, 100, 50, 100]);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [seconds]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`;

  const pct = (remaining / seconds) * 100;

  return (
    <View className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-zinc-400 text-sm">Rest</Text>
        <Text className="text-white text-xl font-bold tabular-nums">{timeStr}</Text>
      </View>

      {/* Progress bar */}
      <View className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <View
          className="h-full bg-white rounded-full"
          style={{ width: `${pct}%` }}
        />
      </View>

      <TouchableOpacity onPress={onSkip} className="items-center">
        <Text className="text-zinc-500 text-xs">Skip rest</Text>
      </TouchableOpacity>
    </View>
  );
}
