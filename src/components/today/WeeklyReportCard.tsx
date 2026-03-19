/**
 * WeeklyReportCard.tsx
 *
 * Shown on Sundays when a new weekly report is ready.
 * Displays pillar scores and the coaching report text (truncated by default).
 */

import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { WeeklyReportRow } from '../../lib/supabase';

interface WeeklyReportCardProps {
  report: WeeklyReportRow;
}

const PILLAR_LABELS = [
  { key: 'strength_score', label: 'Strength' },
  { key: 'skill_score',    label: 'Skill' },
  { key: 'cardio_score',   label: 'Cardio' },
  { key: 'mobility_score', label: 'Mobility' },
] as const;

function PillarBar({ label, score }: { label: string; score: number | null }) {
  const pct = score ?? 0;
  const barColor =
    pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Text className="text-zinc-400 text-xs">{label}</Text>
        <Text className="text-white text-xs font-medium">{score ?? '—'}</Text>
      </View>
      <View className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}

export function WeeklyReportCard({ report }: WeeklyReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const reportText = report.coaching_report ?? null;

  return (
    <View className="bg-zinc-900 rounded-2xl border border-zinc-700 p-5 gap-5">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-white text-base font-semibold">Weekly Report</Text>
          <Text className="text-zinc-500 text-xs mt-0.5">Week of {report.week_starting}</Text>
        </View>
        <View className="bg-zinc-800 rounded-lg px-2.5 py-1">
          <Text className="text-zinc-300 text-xs font-medium uppercase tracking-wider">
            {report.gate_colour}
          </Text>
        </View>
      </View>

      {/* Pillar scores */}
      <View className="gap-3">
        {PILLAR_LABELS.map(({ key, label }) => (
          <PillarBar key={key} label={label} score={report[key]} />
        ))}
      </View>

      {/* Coaching report text */}
      {reportText && (
        <View className="gap-2">
          <Text
            className="text-zinc-300 text-sm leading-5"
            numberOfLines={expanded ? undefined : 4}
          >
            {reportText}
          </Text>
          <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
            <Text className="text-zinc-500 text-xs">
              {expanded ? 'Show less' : 'Read full report'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {report.report_generation_failed && (
        <Text className="text-zinc-500 text-xs">
          Report unavailable — will retry at next engine run.
        </Text>
      )}
    </View>
  );
}
