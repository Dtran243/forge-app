/**
 * GateBadge.tsx
 *
 * Displays the recovery gate colour (green / amber / red) as a small pill badge.
 */

import React from 'react';
import { Text, View } from 'react-native';
import type { GateColour } from '../../types/athlete';

interface GateBadgeProps {
  gate: GateColour;
  size?: 'sm' | 'md';
}

const GATE_STYLES: Record<GateColour, { dot: string; label: string; text: string }> = {
  green: { dot: 'bg-green-500', label: 'Recovery: Good', text: 'text-green-400' },
  amber: { dot: 'bg-amber-500', label: 'Recovery: Reduced', text: 'text-amber-400' },
  red:   { dot: 'bg-red-500',   label: 'Recovery: Poor',    text: 'text-red-400' },
};

export function GateBadge({ gate, size = 'md' }: GateBadgeProps) {
  const styles = GATE_STYLES[gate] ?? GATE_STYLES.green;
  const isSmall = size === 'sm';

  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`rounded-full ${isSmall ? 'w-2 h-2' : 'w-2.5 h-2.5'} ${styles.dot}`} />
      <Text className={`${styles.text} ${isSmall ? 'text-xs' : 'text-sm'} font-medium`}>
        {styles.label}
      </Text>
    </View>
  );
}
