/**
 * progress.tsx — Stage 8
 *
 * Five sections:
 *   1. Pillar Score History  — multi-line chart, 4 pillars
 *   2. Consistency Heatmap  — 52-week GitHub-style grid
 *   3. Calisthenics Ladder  — 4 vertical progress tracks
 *   4. Cardio Trend         — zone2 actual vs target bars
 *   5. Strength PRs         — current load vs PR per movement
 */

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCardioTrend,
  useConsistencyHeatmap,
  useLadderProgress,
  usePillarScoreHistory,
  useStrengthPRs,
  type HeatmapDay,
  type LadderProgress,
} from '../../hooks/useProgressData';

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_COLOURS = {
  strength: '#3b82f6',
  skill:    '#a855f7',
  cardio:   '#f97316',
  mobility: '#22c55e',
} as const;

const LADDER_LABELS: Record<string, string> = {
  push_ladder:  'Push',
  pull_ladder:  'Pull',
  core_ladder:  'Core',
  squat_ladder: 'Squat',
};

// Max rungs per ladder (from constants)
const LADDER_MAX_RUNGS: Record<string, number> = {
  push_ladder:  8,
  pull_ladder:  8,
  core_ladder:  8,
  squat_ladder: 8,
};

// ── SVG Line Chart ────────────────────────────────────────────────────────────

interface LineChartProps {
  series: { values: (number | null)[]; colour: string; label: string; visible: boolean }[];
  width: number;
  height: number;
  minY?: number;
  maxY?: number;
  labels?: string[];
}

function LineChart({ series, width, height, minY = 0, maxY = 100, labels = [] }: LineChartProps) {
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const visibleSeries = series.filter(s => s.visible);
  const allValues = visibleSeries.flatMap(s => s.values.filter((v): v is number => v !== null));
  const yMin = allValues.length > 0 ? Math.max(minY, Math.floor(Math.min(...allValues) / 10) * 10) : minY;
  const yMax = allValues.length > 0 ? Math.min(maxY, Math.ceil(Math.max(...allValues) / 10) * 10) : maxY;
  const yRange = yMax - yMin || 1;

  const n = Math.max(...series.map(s => s.values.length), 1);

  function xFor(i: number) {
    return padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  }
  function yFor(v: number) {
    return padT + chartH - ((v - yMin) / yRange) * chartH;
  }

  // Y-axis ticks
  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax];

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <React.Fragment key={tick}>
          <Line
            x1={padL} y1={yFor(tick)}
            x2={width - padR} y2={yFor(tick)}
            stroke="#27272a" strokeWidth={1}
          />
          <SvgText
            x={padL - 4} y={yFor(tick) + 4}
            fontSize={9} fill="#52525b" textAnchor="end"
          >
            {tick}
          </SvgText>
        </React.Fragment>
      ))}

      {/* X-axis labels (show first, middle, last) */}
      {labels.length > 0 && [0, Math.floor((labels.length - 1) / 2), labels.length - 1].map((i) => (
        <SvgText
          key={i}
          x={xFor(i)} y={height - 4}
          fontSize={9} fill="#52525b" textAnchor="middle"
        >
          {labels[i]}
        </SvgText>
      ))}

      {/* Lines */}
      {series.filter(s => s.visible).map((s) => {
        const points: string[] = [];
        s.values.forEach((v, i) => {
          if (v !== null) points.push(`${xFor(i)},${yFor(v)}`);
        });
        if (points.length < 2) return null;
        return (
          <Polyline
            key={s.label}
            points={points.join(' ')}
            fill="none"
            stroke={s.colour}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Dots on last point */}
      {series.filter(s => s.visible).map((s) => {
        const lastIdx = s.values.length - 1;
        const lastVal = s.values[lastIdx];
        if (lastVal === null) return null;
        return (
          <Circle
            key={s.label}
            cx={xFor(lastIdx)} cy={yFor(lastVal)}
            r={3} fill={s.colour}
          />
        );
      })}
    </Svg>
  );
}

// ── Bar Chart (cardio) ────────────────────────────────────────────────────────

interface BarChartProps {
  actuals: number[];
  targets: number[];
  intervals: boolean[];
  labels: string[];
  width: number;
  height: number;
}

function CardioBarChart({ actuals, targets, intervals, labels, width, height }: BarChartProps) {
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 20;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const n = actuals.length;
  if (n === 0) return null;

  const maxVal = Math.max(...actuals, ...targets, 1);
  const yMax = Math.ceil(maxVal / 60) * 60;

  const barW = Math.max(4, (chartW / n) * 0.55);
  const gap = chartW / n;

  function xCenter(i: number) { return padL + gap * i + gap / 2; }
  function yFor(v: number) { return padT + chartH - (v / yMax) * chartH; }
  function barH(v: number) { return (v / yMax) * chartH; }

  const yTicks = [0, Math.round(yMax / 2), yMax];

  return (
    <Svg width={width} height={height}>
      {yTicks.map((tick) => (
        <React.Fragment key={tick}>
          <Line x1={padL} y1={yFor(tick)} x2={width - padR} y2={yFor(tick)} stroke="#27272a" strokeWidth={1} />
          <SvgText x={padL - 4} y={yFor(tick) + 4} fontSize={9} fill="#52525b" textAnchor="end">{tick}</SvgText>
        </React.Fragment>
      ))}

      {actuals.map((val, i) => {
        const x = xCenter(i);
        const target = targets[i] ?? 0;
        const hasInterval = intervals[i];
        const hitTarget = val >= target;
        return (
          <React.Fragment key={i}>
            {/* Target ghost bar */}
            <Rect
              x={x - barW / 2} y={yFor(target)}
              width={barW} height={barH(target)}
              fill="#27272a" rx={2}
            />
            {/* Actual bar */}
            <Rect
              x={x - barW / 2} y={yFor(val)}
              width={barW} height={barH(val)}
              fill={hitTarget ? '#f97316' : '#7c3a14'} rx={2}
            />
            {/* Interval dot */}
            {hasInterval && (
              <Circle cx={x} cy={padT + 6} r={3} fill="#ef4444" />
            )}
          </React.Fragment>
        );
      })}

      {labels.length > 0 && [0, Math.floor((n - 1) / 2), n - 1].map((i) => (
        <SvgText key={i} x={xCenter(i)} y={height - 4} fontSize={9} fill="#52525b" textAnchor="middle">
          {labels[i]}
        </SvgText>
      ))}
    </Svg>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 32 }}>
      <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// ── Heatmap cell tooltip modal ────────────────────────────────────────────────

function HeatmapTooltip({ day, onClose }: { day: HeatmapDay; onClose: () => void }) {
  const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const typeLabel: Record<string, string> = {
    strength_calisthenics: 'Strength',
    zone2: 'Zone 2',
    intervals: 'Intervals',
    mobility: 'Mobility',
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#27272a', borderRadius: 12, padding: 16, minWidth: 160, gap: 4 }}>
            <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{label}</Text>
            {day.trained ? (
              <>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  {typeLabel[day.session_type ?? ''] ?? day.session_type}
                </Text>
                {day.session_rpe !== null && (
                  <Text style={{ color: '#71717a', fontSize: 12 }}>RPE {day.session_rpe}</Text>
                )}
              </>
            ) : (
              <Text style={{ color: '#52525b', fontSize: 13 }}>Rest day</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function ConsistencyHeatmap({ days, streak }: { days: HeatmapDay[]; streak: number }) {
  const [selected, setSelected] = useState<HeatmapDay | null>(null);

  // Pad to start from Monday — build 53 columns of 7
  const CELL = 11;
  const GAP = 2;

  // Group into weeks (columns)
  const weeks: HeatmapDay[][] = [];
  let week: HeatmapDay[] = [];
  for (const day of days) {
    const dow = new Date(day.date + 'T00:00:00').getDay(); // 0=Sun
    const monDow = (dow + 6) % 7; // 0=Mon
    if (week.length === 0 && monDow !== 0) {
      // Pad first week
      for (let i = 0; i < monDow; i++) week.push({ date: '', session_type: null, session_rpe: null, trained: false });
    }
    week.push(day);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) weeks.push(week);

  function cellColor(day: HeatmapDay): string {
    if (!day.date) return 'transparent';
    if (!day.trained) return '#1c1c1e';
    const type = day.session_type;
    if (type === 'strength_calisthenics') return '#1d4ed8';
    if (type === 'zone2') return '#c2410c';
    if (type === 'intervals') return '#dc2626';
    if (type === 'mobility') return '#166534';
    return '#3f3f46';
  }

  const DOW_LABELS = ['M', '', 'W', '', 'F', '', 'S'];

  return (
    <View>
      {streak > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '700' }}>🔥 {streak} day streak</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {/* Day labels */}
          <View style={{ gap: GAP, paddingTop: 0 }}>
            {DOW_LABELS.map((l, i) => (
              <View key={i} style={{ width: 10, height: CELL, justifyContent: 'center' }}>
                <Text style={{ color: '#52525b', fontSize: 8 }}>{l}</Text>
              </View>
            ))}
          </View>
          {/* Columns */}
          {weeks.map((w, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {Array.from({ length: 7 }, (_, di) => {
                const day = w[di];
                if (!day) return <View key={di} style={{ width: CELL, height: CELL }} />;
                return (
                  <TouchableOpacity
                    key={di}
                    onPress={() => day.date && setSelected(day)}
                    style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: cellColor(day) }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { colour: '#1d4ed8', label: 'Strength' },
          { colour: '#c2410c', label: 'Zone 2' },
          { colour: '#dc2626', label: 'Intervals' },
          { colour: '#166534', label: 'Mobility' },
        ].map(({ colour, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colour }} />
            <Text style={{ color: '#52525b', fontSize: 10 }}>{label}</Text>
          </View>
        ))}
      </View>

      {selected && <HeatmapTooltip day={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

// ── Calisthenics Ladder ───────────────────────────────────────────────────────

function LadderTrack({ ladder }: { ladder: LadderProgress }) {
  const maxRungs = LADDER_MAX_RUNGS[ladder.ladder] ?? 8;
  const label = LADDER_LABELS[ladder.ladder] ?? ladder.ladder;

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 0 }}>
      <Text style={{ color: '#71717a', fontSize: 11, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      {/* Rungs from top (highest) to bottom (rung 1) */}
      {Array.from({ length: maxRungs }, (_, i) => {
        const rung = maxRungs - i; // count down from max
        const isCurrent = rung === ladder.current_rung;
        const isCompleted = rung < ladder.current_rung;
        const isFuture = rung > ladder.current_rung;

        return (
          <React.Fragment key={rung}>
            <View style={{
              width: 44,
              height: 28,
              borderRadius: 6,
              borderWidth: isCurrent ? 2 : 1,
              borderColor: isCurrent ? '#fff' : isCompleted ? '#3f3f46' : '#27272a',
              backgroundColor: isCurrent ? '#fff' : isCompleted ? '#27272a' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {isCurrent ? (
                <Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>{rung}</Text>
              ) : isCompleted ? (
                <Text style={{ color: '#71717a', fontSize: 10 }}>✓</Text>
              ) : (
                <Text style={{ color: '#3f3f46', fontSize: 10 }}>{rung}</Text>
              )}
            </View>
            {i < maxRungs - 1 && (
              <View style={{ width: 1, height: 4, backgroundColor: '#27272a' }} />
            )}
          </React.Fragment>
        );
      })}
      <Text style={{ color: '#52525b', fontSize: 10, marginTop: 8, textAlign: 'center' }} numberOfLines={2}>
        {ladder.current_movement}
      </Text>
    </View>
  );
}

// ── Strength PRs ─────────────────────────────────────────────────────────────

function StrengthPRList({ data }: { data: ReturnType<typeof useStrengthPRs>['data'] }) {
  if (data.length === 0) {
    return <Text style={{ color: '#52525b', fontSize: 13 }}>No strength data yet.</Text>;
  }

  const formatName = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <View style={{ gap: 10 }}>
      {data.map((row) => {
        const pr = row.pr_kg;
        const current = row.current_load_kg;
        const pct = pr && pr > 0 && current ? Math.round((current / pr) * 100) : null;

        return (
          <View key={row.movement_name} style={{
            backgroundColor: '#18181b',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#27272a',
            padding: 12,
            gap: 6,
          }}>
            <Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: '600' }}>
              {formatName(row.movement_name)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View>
                <Text style={{ color: '#52525b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>PR</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  {pr ? `${pr} kg` : '—'}
                </Text>
              </View>
              <View>
                <Text style={{ color: '#52525b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current</Text>
                <Text style={{ color: '#a1a1aa', fontSize: 16, fontWeight: '600' }}>
                  {current ? `${current} kg` : '—'}
                </Text>
              </View>
              {pct !== null && (
                <View style={{ justifyContent: 'flex-end' }}>
                  <Text style={{ color: pct >= 95 ? '#22c55e' : '#71717a', fontSize: 12 }}>
                    {pct}% of PR
                  </Text>
                </View>
              )}
            </View>
            {/* Progress bar */}
            {pr && current && (
              <View style={{ height: 3, backgroundColor: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: 3, width: `${Math.min(pct ?? 0, 100)}%`, backgroundColor: '#3b82f6', borderRadius: 2 }} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const pillar = usePillarScoreHistory();
  const cardio = useCardioTrend();
  const ladders = useLadderProgress();
  const heatmap = useConsistencyHeatmap();
  const prs = useStrengthPRs();

  const [visiblePillars, setVisiblePillars] = useState({
    strength: true, skill: true, cardio: true, mobility: true,
  });

  function togglePillar(key: keyof typeof visiblePillars) {
    setVisiblePillars(v => ({ ...v, [key]: !v[key] }));
  }

  // Pillar chart data
  const pillarLabels = pillar.data.map(w => {
    const d = new Date(w.week_ending + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const pillarSeries = [
    { label: 'strength', colour: PILLAR_COLOURS.strength, values: pillar.data.map(w => w.strength_score), visible: visiblePillars.strength },
    { label: 'skill',    colour: PILLAR_COLOURS.skill,    values: pillar.data.map(w => w.skill_score),    visible: visiblePillars.skill },
    { label: 'cardio',   colour: PILLAR_COLOURS.cardio,   values: pillar.data.map(w => w.cardio_score),   visible: visiblePillars.cardio },
    { label: 'mobility', colour: PILLAR_COLOURS.mobility, values: pillar.data.map(w => w.mobility_score), visible: visiblePillars.mobility },
  ];

  // Cardio chart data
  const cardioLabels = cardio.data.map(w => {
    const d = new Date(w.week_starting + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const { width: screenWidth } = useWindowDimensions();
  const CHART_WIDTH = screenWidth - 40 - 24; // paddingHorizontal 20 each side + card padding 12 each side

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 28 }}>Progress</Text>

      {/* ── 1. Pillar Score History ─────────────────────────────────────── */}
      <Section title="Pillar Scores">
        {/* Toggle pills */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {(Object.keys(PILLAR_COLOURS) as (keyof typeof PILLAR_COLOURS)[]).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => togglePillar(key)}
              style={{
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                backgroundColor: visiblePillars[key] ? PILLAR_COLOURS[key] + '22' : '#18181b',
                borderWidth: 1,
                borderColor: visiblePillars[key] ? PILLAR_COLOURS[key] : '#27272a',
              }}
            >
              <Text style={{ color: visiblePillars[key] ? PILLAR_COLOURS[key] : '#52525b', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {pillar.isLoading ? (
          <Text style={{ color: '#52525b', fontSize: 13 }}>Loading…</Text>
        ) : pillar.data.length < 2 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ color: '#52525b', fontSize: 13 }}>Score history appears after 2+ engine runs.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#18181b', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#27272a' }}>
            <LineChart
              series={pillarSeries}
              width={CHART_WIDTH}
              height={160}
              minY={0} maxY={100}
              labels={pillarLabels}
            />
          </View>
        )}
      </Section>

      {/* ── 2. Consistency Heatmap ──────────────────────────────────────── */}
      <Section title="Consistency">
        {heatmap.isLoading ? (
          <Text style={{ color: '#52525b', fontSize: 13 }}>Loading…</Text>
        ) : (
          <View style={{ backgroundColor: '#18181b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272a' }}>
            <ConsistencyHeatmap days={heatmap.data} streak={heatmap.streak} />
          </View>
        )}
      </Section>

      {/* ── 3. Calisthenics Ladder ──────────────────────────────────────── */}
      <Section title="Skill Ladder">
        {ladders.isLoading ? (
          <Text style={{ color: '#52525b', fontSize: 13 }}>Loading…</Text>
        ) : ladders.data.length === 0 ? (
          <Text style={{ color: '#52525b', fontSize: 13 }}>No ladder data yet.</Text>
        ) : (
          <View style={{ backgroundColor: '#18181b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#27272a' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {['push_ladder', 'pull_ladder', 'core_ladder', 'squat_ladder'].map((name) => {
                const l = ladders.data.find(d => d.ladder === name);
                if (!l) return null;
                return <LadderTrack key={name} ladder={l} />;
              })}
            </View>
          </View>
        )}
      </Section>

      {/* ── 4. Cardio Trend ─────────────────────────────────────────────── */}
      <Section title="Cardio">
        {cardio.isLoading ? (
          <Text style={{ color: '#52525b', fontSize: 13 }}>Loading…</Text>
        ) : cardio.data.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ color: '#52525b', fontSize: 13 }}>No cardio data yet.</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#18181b', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#27272a' }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#f97316' }} />
                <Text style={{ color: '#71717a', fontSize: 11 }}>Zone 2 (actual)</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#27272a' }} />
                <Text style={{ color: '#71717a', fontSize: 11 }}>Target</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
                <Text style={{ color: '#71717a', fontSize: 11 }}>Intervals</Text>
              </View>
            </View>
            <CardioBarChart
              actuals={cardio.data.map(w => w.zone2_minutes)}
              targets={cardio.data.map(w => w.zone2_target)}
              intervals={cardio.data.map(w => w.intervals_completed)}
              labels={cardioLabels}
              width={CHART_WIDTH}
              height={130}
            />
          </View>
        )}
      </Section>

      {/* ── 5. Strength PRs ─────────────────────────────────────────────── */}
      <Section title="Strength PRs">
        {prs.isLoading ? (
          <Text style={{ color: '#52525b', fontSize: 13 }}>Loading…</Text>
        ) : (
          <StrengthPRList data={prs.data} />
        )}
      </Section>
    </ScrollView>
  );
}

export { ScreenErrorBoundary as ErrorBoundary } from '../../components/shared/ScreenErrorBoundary';
