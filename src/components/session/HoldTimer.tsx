/**
 * HoldTimer.tsx
 *
 * Countdown timer for timed hold exercises (hollow body hold, L-sit progressions).
 * Athlete taps "Start Hold" to begin countdown. Vibrates and auto-completes at 0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Vibration, View } from 'react-native';

interface HoldTimerProps {
  seconds: number;
  onComplete: () => void;
}

export function HoldTimer({ seconds, onComplete }: HoldTimerProps) {
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!started) return;

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
  }, [started]);

  const pct = started ? (remaining / seconds) * 100 : 100;

  if (!started) {
    return (
      <TouchableOpacity
        onPress={() => setStarted(true)}
        style={{ backgroundColor: '#27272a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
          Start Hold — {seconds}s
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ backgroundColor: '#18181b', borderRadius: 12, borderWidth: 1, borderColor: '#27272a', padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#a1a1aa', fontSize: 13 }}>Holding</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {remaining}s
        </Text>
      </View>

      {/* Progress bar — drains as time passes */}
      <View style={{ height: 4, backgroundColor: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: '100%', backgroundColor: '#fff', borderRadius: 2, width: `${pct}%` }} />
      </View>
    </View>
  );
}
