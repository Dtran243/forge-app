/**
 * program.tsx — Program Tab
 *
 * Displays the current week's training program, pillar scores, mesocycle
 * position, and travel mode toggle.
 *
 * Layout:
 *   1. Mesocycle header (cycle, week, gate, week type)
 *   2. 7-day horizontal scroll strip — tap a session day to open the detail sheet
 *   3. Pillar score bars (strength, skill, cardio, mobility)
 *   4. 4-week mesocycle block
 *   5. Travel mode button
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWeeklyReport } from '../../hooks/useWeeklyReport';
import { useMesocycleState } from '../../hooks/useMesocycleState';
import { useWeekStore } from '../../store/weekStore';
import type { DayOfWeek, PlannedSession, PillarScoresJson } from '../../types/athlete';
import { SessionDetailSheet } from '../../components/program/SessionDetailSheet';
import { TravelModeSheet } from '../../components/program/TravelModeSheet';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const DAY_ABBREVS: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const SESSION_TYPE_SHORT: Record<string, string> = {
  strength_calisthenics: 'S&S',
  zone2: 'Z2',
  intervals: 'Int',
  mobility: 'Mob',
  rest: 'Rest',
};

const SESSION_COLOURS: Record<string, string> = {
  strength_calisthenics: '#a78bfa',
  zone2: '#34d399',
  intervals: '#f87171',
  mobility: '#fb923c',
};

const GATE_COLOURS: Record<string, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

const PILLAR_BARS: Array<{ key: keyof PillarScoresJson; label: string }> = [
  { key: 'strength_score', label: 'Strength' },
  { key: 'skill_score', label: 'Skill' },
  { key: 'cardio_score', label: 'Cardio' },
  { key: 'mobility_score', label: 'Mobility' },
];

const WEEK_ARC_LABELS = ['MEV', 'MAV', 'MRV', 'Deload'] as const;

// ── Pillar helpers ────────────────────────────────────────────────────────────

function pillarColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function pillarConsequence(key: keyof PillarScoresJson, score: number): { text: string; color: string } {
  if (score === 0) {
    const text = key === 'cardio_score'
      ? '· No Zone 2 sessions logged'
      : key === 'mobility_score'
      ? '· Not yet tracked this week'
      : '⚠ No sessions logged';
    return { text, color: '#3f3f46' };
  }
  if (score >= 85) {
    const texts: Record<keyof PillarScoresJson, string> = {
      strength_score: '↑ Volume increased this week',
      skill_score: '↑ Ladder advancement eligible this week',
      cardio_score: '↑ Zone 2 volume increased this week',
      mobility_score: '↑ Rotation advanced this week',
    };
    return { text: texts[key], color: '#166534' };
  }
  if (score >= 60) {
    const texts: Record<keyof PillarScoresJson, string> = {
      strength_score: '→ Volume maintained this week',
      skill_score: '→ Current rung maintained this week',
      cardio_score: '→ Zone 2 volume maintained this week',
      mobility_score: '→ Current rotation maintained this week',
    };
    return { text: texts[key], color: '#52525b' };
  }
  const texts: Record<keyof PillarScoresJson, string> = {
    strength_score: '↓ Volume reduced this week',
    skill_score: '↓ Rung regression possible this week',
    cardio_score: '↓ Zone 2 volume reduced this week',
    mobility_score: '↓ Extra mobility work added this week',
  };
  return { text: texts[key], color: '#7f1d1d' };
}

function pillarSectionLabel(mesocycleWeek: number, cycleNumber: number): string {
  if (mesocycleWeek === 1 && cycleNumber === 1) return 'Baseline pillar scores';
  if (mesocycleWeek === 1) return `Cycle ${cycleNumber - 1}, Week 4 scores`;
  return `Week ${mesocycleWeek - 1} pillar scores`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD in the device's local timezone. */
function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDates(weekStarting: string): Record<DayOfWeek, string> {
  const start = new Date(weekStarting + 'T00:00:00');
  const result = {} as Record<DayOfWeek, string>;
  DAYS_OF_WEEK.forEach((day, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result[day] = toLocalISO(d);
  });
  return result;
}

function formatDayLabel(day: DayOfWeek, isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return `${DAY_ABBREVS[day]}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// ── Day strip item ────────────────────────────────────────────────────────────

function DayPill({
  day,
  isoDate,
  session,
  isToday,
  isSelected,
  onPress,
}: {
  day: DayOfWeek;
  isoDate: string;
  session: PlannedSession | null;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const shortType = session ? SESSION_TYPE_SHORT[session.session_type] ?? session.session_type : null;
  const dotColor = session ? SESSION_COLOURS[session.session_type] ?? '#52525b' : null;
  const dayNum = new Date(isoDate + 'T00:00:00').getDate();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!session}
      style={{
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 14,
        minWidth: 60,
        backgroundColor: isSelected ? '#27272a' : 'transparent',
        borderWidth: 1,
        borderColor: isSelected ? '#3f3f46' : 'transparent',
      }}
    >
      <Text
        style={{
          color: isToday ? '#fff' : '#52525b',
          fontSize: 12,
          fontWeight: isToday ? '700' : '400',
        }}
      >
        {DAY_ABBREVS[day]}
      </Text>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: isToday ? '#27272a' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: isToday ? '#fff' : '#3f3f46',
            fontSize: 13,
            fontWeight: isToday ? '700' : '400',
          }}
        >
          {dayNum}
        </Text>
      </View>
      {dotColor ? (
        <View
          style={{
            backgroundColor: dotColor + '22',
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: dotColor + '44',
          }}
        >
          <Text style={{ color: dotColor, fontSize: 11, fontWeight: '600' }}>{shortType}</Text>
        </View>
      ) : (
        <View style={{ height: 22, justifyContent: 'center' }}>
          <Text style={{ color: '#3f3f46', fontSize: 16 }}>·</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Pillar info sheet ─────────────────────────────────────────────────────────

const PILLAR_INFO = [
  {
    label: 'Strength',
    color: '#a78bfa',
    description: 'Scores how well you executed your weighted lifting week — not how hard you trained. A low score means sessions were missed or loads stalled, not that you overtrained.',
    inputs: [
      { pct: '50%', text: 'Sets completed vs planned' },
      { pct: '30%', text: 'Progressive overload achieved (double progression triggered)' },
      { pct: '20%', text: 'Session RPE trend (7–8 is ideal; consistently above 8 pulls this down)' },
    ],
    higher: [
      'Complete every planned set — even partial sessions count',
      'Hit the top of your rep range (e.g. 3×6) at RIR ≥ 2 for two sessions in a row to trigger a load increase',
      'Keep session RPE at 7–8; going to failure every set hurts the RPE component',
    ],
    lower: [
      'Skipping sessions or cutting sets short',
      'Failing to hit the bottom of the rep range (stalled load)',
      'Logging RPE 9–10 consistently signals the engine you are overreaching',
    ],
  },
  {
    label: 'Skill',
    color: '#60a5fa',
    description: 'Tracks progress on the four calisthenics ladders (push, pull, core, squat). Advancing rungs drives a high score — holding a rung with clean reps scores in the middle.',
    inputs: [
      { pct: '50%', text: 'Calisthenics sets completed vs planned' },
      { pct: '30%', text: 'Skill progression — rung advancement or hold time improvement' },
      { pct: '20%', text: 'Self-reported movement quality (1–5 after each skill set)' },
    ],
    higher: [
      'Complete all calisthenics finisher sets — they are short but count for 50%',
      'Hit the rung standard (e.g. 3×8 RIR 2) for two weeks running to advance',
      'Rate movement quality honestly — a 4–5 when you earned it lifts the score',
    ],
    lower: [
      'Skipping skill sets at the end of strength sessions',
      'Being stuck on the same rung for multiple weeks without attempting the standard',
      'Consistently rating quality at 1–2 signals the engine to hold or regress',
    ],
  },
  {
    label: 'Cardio',
    color: '#34d399',
    description: 'Measures aerobic base compliance. Zone 2 is the majority of the score — the interval session is a bonus. 0 simply means no cardio was logged, not that something went wrong.',
    inputs: [
      { pct: '50%', text: 'Zone 2 minutes hit vs 150–180 min weekly target' },
      { pct: '30%', text: 'Interval session completed (green gate only, max 1/week)' },
      { pct: '20%', text: 'Consistency — sessions completed vs planned' },
    ],
    higher: [
      'Hit 150+ minutes of Zone 2 per week (conversational pace, 60–75% HRmax)',
      'Complete the interval session when it is programmed (green gate required)',
      'Do cardio on the days it is scheduled rather than doubling up later in the week',
    ],
    lower: [
      'Skipping Zone 2 sessions — a single missed 45-min session drops you out of the top band',
      'Zone 2 intensity creeping too high (above 75% HRmax) — it still counts, but the base benefit is reduced',
      'No intervals logged when programmed on a green gate week',
    ],
  },
  {
    label: 'Mobility',
    color: '#fb923c',
    description: 'Covers your dedicated mobility session plus the 10-minute embedded pre/post work in every strength session. The rotation cycles through six areas over two weeks.',
    inputs: [
      { pct: '60%', text: 'Dedicated mobility sessions completed vs planned' },
      { pct: '20%', text: 'Embedded pre/post-session mobility work completed' },
      { pct: '20%', text: 'Self-reported flexibility and range improvement (1–5)' },
    ],
    higher: [
      'Complete your dedicated mobility session each week — it carries 60% of the score',
      'Do the 10-min embedded warm-up and cool-down in every strength session',
      'Rate your range improvement honestly after each session; consistent 3–4s keep the score in the green band',
    ],
    lower: [
      'Skipping the standalone mobility session entirely',
      'Rushing through or skipping warm-up and cool-down work',
      'Rating flexibility as 1–2 week after week — the engine adds extra mobility sessions in response',
    ],
  },
] as const;

function PillarInfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: '#09090b',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: '#27272a',
            height: '85%',
          }}
        >
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
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>How Pillars Are Scored</Text>
              <Text style={{ color: '#52525b', fontSize: 13 }}>Resets weekly · drives next week's volume</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: '#27272a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: '#71717a', fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Threshold legend */}
            <View
              style={{
                backgroundColor: '#18181b',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#27272a',
                padding: 14,
                gap: 8,
              }}
            >
              <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Score thresholds
              </Text>
              {[
                { range: '≥ 85', label: 'Volume increased this week', color: '#22c55e' },
                { range: '61–84', label: 'Volume maintained this week', color: '#f59e0b' },
                { range: '< 60', label: 'Volume reduced this week', color: '#ef4444' },
              ].map(({ range, label, color }) => (
                <View key={range} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      backgroundColor: color + '22',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      alignSelf: 'center',
                    }}
                  >
                    <Text style={{ color, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{range}</Text>
                  </View>
                  <Text style={{ color: '#a1a1aa', fontSize: 13, flex: 1 }}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Per-pillar breakdown */}
            {PILLAR_INFO.map(({ label, color, description, inputs, higher, lower }) => (
              <View
                key={label}
                style={{
                  backgroundColor: '#18181b',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#27272a',
                  padding: 14,
                  gap: 12,
                }}
              >
                {/* Pillar name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{label}</Text>
                </View>

                {/* Description */}
                <Text style={{ color: '#71717a', fontSize: 13, lineHeight: 19 }}>{description}</Text>

                {/* Scoring weights */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    What's measured
                  </Text>
                  {inputs.map(({ pct, text }) => (
                    <View key={pct} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View
                        style={{
                          backgroundColor: color + '22',
                          borderRadius: 5,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          minWidth: 38,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{pct}</Text>
                      </View>
                      <Text style={{ color: '#a1a1aa', fontSize: 13, flex: 1, lineHeight: 18 }}>{text}</Text>
                    </View>
                  ))}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#27272a' }} />

                {/* Score higher */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#166534', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    To score higher
                  </Text>
                  {higher.map((tip, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ color: '#22c55e', fontSize: 13, lineHeight: 18 }}>↑</Text>
                      <Text style={{ color: '#a1a1aa', fontSize: 13, flex: 1, lineHeight: 18 }}>{tip}</Text>
                    </View>
                  ))}
                </View>

                {/* Score lower */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#7f1d1d', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    What pulls it down
                  </Text>
                  {lower.map((tip, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ color: '#ef4444', fontSize: 13, lineHeight: 18 }}>↓</Text>
                      <Text style={{ color: '#71717a', fontSize: 13, flex: 1, lineHeight: 18 }}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Pillar score bar ──────────────────────────────────────────────────────────

function PillarBar({
  label,
  score,
  pillarKey,
}: {
  label: string;
  score: number;
  pillarKey: keyof PillarScoresJson;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pillarColor(score);
  const isCritical = score > 0 && score < 40;
  const consequence = pillarConsequence(pillarKey, score);

  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{label}</Text>
          {isCritical && (
            <View style={{ backgroundColor: '#450a0a', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>LOW</Text>
            </View>
          )}
        </View>
        <Text style={{ color, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {score}
        </Text>
      </View>
      <View style={{ height: 5, backgroundColor: '#27272a', borderRadius: 3 }}>
        {pct > 0 && (
          <View style={{ width: `${pct}%`, height: 5, backgroundColor: color, borderRadius: 3 }} />
        )}
      </View>
      <Text style={{ color: consequence.color, fontSize: 11 }}>{consequence.text}</Text>
    </View>
  );
}

// ── Mesocycle 4-week block ────────────────────────────────────────────────────

function MesocycleBlock({
  cycleNumber,
  currentWeek,
  weekType,
}: {
  cycleNumber: number;
  currentWeek: number;
  weekType: string;
}) {
  const weeks = [1, 2, 3, 4] as const;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Mesocycle {cycleNumber}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {weeks.map((w) => {
          const isDeload = w === 4;
          const isPast = w < currentWeek;
          const isCurrent = w === currentWeek;

          let bg = '#18181b';
          let border = '#27272a';
          let labelColor = '#52525b';
          let weekLabel = isDeload ? 'Deload' : `Week ${w}`;

          if (isCurrent) {
            bg = isDeload ? '#291500' : '#1a1a2e';
            border = isDeload ? '#d97706' : '#4f46e5';
            labelColor = isDeload ? '#fbbf24' : '#818cf8';
          } else if (isPast) {
            bg = '#18181b';
            border = '#3f3f46';
            labelColor = '#71717a';
          }

          return (
            <View
              key={w}
              style={{
                flex: 1,
                backgroundColor: bg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                paddingVertical: 10,
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Text style={{ color: labelColor, fontSize: 11, fontWeight: '600' }}>
                {weekLabel}
              </Text>
              <Text style={{ color: isCurrent ? labelColor : '#3f3f46', fontSize: 10, opacity: 0.7 }}>
                {WEEK_ARC_LABELS[w - 1]}
              </Text>
              {isCurrent && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: isDeload ? '#fbbf24' : '#818cf8',
                    marginTop: 1,
                  }}
                />
              )}
              {isPast && (
                <Text style={{ color: '#3f3f46', fontSize: 11, marginTop: 1 }}>✓</Text>
              )}
              {!isCurrent && !isPast && (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#3f3f46', marginTop: 1 }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProgramScreen() {
  const { report, pillarScores, currentWeekSessions, isLoading } = useWeekStore();
  const { refetch: refetchReport } = useWeeklyReport();
  const { mesocycle, refetch: refetchMesocycle } = useMesocycleState();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showTravelMode, setShowTravelMode] = useState(false);
  const [showPillarInfo, setShowPillarInfo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchReport(), refetchMesocycle()]);
    setIsRefreshing(false);
  }, [refetchReport, refetchMesocycle]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const weekStarting = report?.program?.week_starting ?? null;
  const weekDates = weekStarting ? getWeekDates(weekStarting) : null;
  const today = toLocalISO(new Date());

  // Build a map: day_of_week → PlannedSession
  const sessionByDay = new Map<DayOfWeek, PlannedSession>();
  currentWeekSessions.forEach((s) => sessionByDay.set(s.day_of_week, s));

  const selectedSession = selectedDay ? (sessionByDay.get(selectedDay) ?? null) : null;
  const selectedDayLabel =
    selectedDay && weekDates ? formatDayLabel(selectedDay, weekDates[selectedDay]) : '';

  const travelModeActive = mesocycle?.travel_mode_active ?? false;
  const travelModeStartDate = mesocycle?.travel_mode_start_date ?? null;
  const travelModeEndDate = mesocycle?.travel_mode_end_date ?? null;

  // ── Loading state ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52525b" />
      </SafeAreaView>
    );
  }

  // ── No program yet ──────────────────────────────────────────────────────────

  if (!report || !weekDates) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            No program yet
          </Text>
          <Text style={{ color: '#52525b', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            Your first program will be generated after completing onboarding. The engine runs every Sunday.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Rendered ────────────────────────────────────────────────────────────────

  const gateColour = report.gate_colour;
  const mesocycleWeek = report.mesocycle_week ?? 1;
  const weekType = report.program?.week_type ?? 'loading';
  const cycleNumber = report.cycle_number ?? 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#52525b" />}
      >
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#18181b',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Program</Text>
              <Text style={{ color: '#52525b', fontSize: 13 }}>
                Cycle {cycleNumber} · Week {mesocycleWeek} of 4 ·{' '}
                {weekType === 'deload' ? 'Deload' : 'Loading'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {travelModeActive && (
                <View style={{ backgroundColor: '#291500', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '600' }}>✈ Travel</Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: (GATE_COLOURS[gateColour] ?? '#22c55e') + '22',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text
                  style={{
                    color: GATE_COLOURS[gateColour] ?? '#22c55e',
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {gateColour.charAt(0).toUpperCase() + gateColour.slice(1)} gate
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 7-day strip ──────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}
          style={{ borderBottomWidth: 1, borderBottomColor: '#18181b' }}
        >
          {DAYS_OF_WEEK.map((day) => {
            const isoDate = weekDates[day];
            const session = sessionByDay.get(day) ?? null;
            const isToday = isoDate === today;
            const isSelected = selectedDay === day;

            return (
              <DayPill
                key={day}
                day={day}
                isoDate={isoDate}
                session={session}
                isToday={isToday}
                isSelected={isSelected}
                onPress={() => {
                  if (session) {
                    setSelectedDay((prev) => (prev === day ? null : day));
                    setShowDetailSheet(false);
                  }
                }}
              />
            );
          })}
        </ScrollView>

        <View style={{ padding: 20, gap: 20 }}>
          {/* ── Selected day preview / hint ───────────────────────────────── */}
          {selectedDay && selectedSession ? (
            <View
              style={{
                backgroundColor: '#18181b',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#27272a',
                padding: 16,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {formatDayLabel(selectedDay, weekDates[selectedDay])}
                  </Text>
                  <Text style={{ color: '#52525b', fontSize: 13 }}>
                    {selectedSession.estimated_duration_minutes} min ·{' '}
                    {SESSION_TYPE_SHORT[selectedSession.session_type] ?? selectedSession.session_type}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDetailSheet(true)}
                  style={{
                    backgroundColor: '#27272a',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#a1a1aa', fontSize: 13, fontWeight: '600' }}>View →</Text>
                </TouchableOpacity>
              </View>
              {selectedSession.exercises.length > 0 && (
                <View style={{ gap: 4 }}>
                  {selectedSession.exercises.slice(0, 3).map((ex, i) => (
                    <Text key={i} style={{ color: '#71717a', fontSize: 12 }} numberOfLines={1}>
                      · {ex.name}
                    </Text>
                  ))}
                  {selectedSession.exercises.length > 3 && (
                    <Text style={{ color: '#3f3f46', fontSize: 12 }}>
                      +{selectedSession.exercises.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#18181b',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#27272a',
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#52525b', fontSize: 13 }}>Tap a session day to view details</Text>
            </View>
          )}

          {/* ── Pillar scores ─────────────────────────────────────────────── */}
          {pillarScores && (
            <View
              style={{
                backgroundColor: '#18181b',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#27272a',
                padding: 16,
                gap: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {pillarSectionLabel(mesocycleWeek, cycleNumber)}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPillarInfo(true)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#27272a',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '700', lineHeight: 14 }}>i</Text>
                </TouchableOpacity>
              </View>
              {PILLAR_BARS.map(({ key, label }) => (
                <PillarBar key={key} label={label} score={pillarScores[key]} pillarKey={key} />
              ))}
            </View>
          )}

          {/* ── Mesocycle block ───────────────────────────────────────────── */}
          {mesocycle && (
            <View
              style={{
                backgroundColor: '#18181b',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#27272a',
                padding: 16,
                gap: 14,
              }}
            >
              <MesocycleBlock
                cycleNumber={mesocycle.cycle_number}
                currentWeek={mesocycle.current_week}
                weekType={mesocycle.week_type}
              />
            </View>
          )}

          {/* ── Travel mode ───────────────────────────────────────────────── */}
          {(() => {
            const todayISO = toLocalISO(new Date());
            const isScheduled = travelModeActive && !!travelModeStartDate && travelModeStartDate > todayISO;
            const isLive = travelModeActive && !isScheduled;
            const fmtDate = (iso: string) =>
              new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <TouchableOpacity
                onPress={() => setShowTravelMode(true)}
                style={{
                  backgroundColor: isLive ? '#0c1a2e' : isScheduled ? '#0f1a12' : '#18181b',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isLive ? '#1d4ed8' : isScheduled ? '#166534' : '#27272a',
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: isLive ? '#60a5fa' : isScheduled ? '#4ade80' : '#a1a1aa', fontSize: 14, fontWeight: '600' }}>
                      ✈ Travel Mode
                    </Text>
                    {isLive && (
                      <View style={{ backgroundColor: '#1e3a8a', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '700' }}>ACTIVE</Text>
                      </View>
                    )}
                    {isScheduled && (
                      <View style={{ backgroundColor: '#14532d', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#86efac', fontSize: 10, fontWeight: '700' }}>SCHEDULED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: '#52525b', fontSize: 12 }}>
                    {isLive && travelModeEndDate
                      ? `Bodyweight sessions until ${fmtDate(travelModeEndDate)}`
                      : isScheduled && travelModeStartDate && travelModeEndDate
                      ? `${fmtDate(travelModeStartDate)} → ${fmtDate(travelModeEndDate)}`
                      : 'Switch to bodyweight program'}
                  </Text>
                </View>
                <Text style={{ color: '#3f3f46', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      </ScrollView>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <SessionDetailSheet
        session={selectedSession}
        dayLabel={selectedDayLabel}
        visible={showDetailSheet && selectedSession !== null}
        onClose={() => setShowDetailSheet(false)}
      />

      <TravelModeSheet
        visible={showTravelMode}
        isActive={travelModeActive}
        startDate={travelModeStartDate}
        endDate={travelModeEndDate}
        onClose={() => setShowTravelMode(false)}
        onToggled={() => refetchMesocycle()}
      />

      <PillarInfoSheet
        visible={showPillarInfo}
        onClose={() => setShowPillarInfo(false)}
      />
    </SafeAreaView>
  );
}

export { ScreenErrorBoundary as ErrorBoundary } from '../../components/shared/ScreenErrorBoundary';
