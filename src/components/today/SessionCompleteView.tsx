/**
 * SessionCompleteView.tsx
 *
 * Shown on the Today tab after a session is successfully saved.
 * Renders a type-appropriate completion summary for all four session types.
 */

import React from 'react';
import { Text, View } from 'react-native';
import type { SessionLogRow } from '../../lib/supabase';
import type { GateColour } from '../../types/athlete';
import { isTimedHold, CALISTHENICS_STANDARDS } from '../../data/exercises';

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength_calisthenics: 'Strength & Skill',
  zone2: 'Zone 2 Cardio',
  intervals: 'Intervals',
  mobility: 'Mobility',
};

const AREA_LABELS: Record<string, string> = {
  hip_flexor: 'Hip flexor',
  thoracic_rotation: 'Thoracic rotation',
  posterior_chain: 'Posterior chain',
  shoulder_internal_rotation: 'Shoulder internal rotation',
  ankle_dorsiflexion: 'Ankle dorsiflexion',
  adductors: 'Adductors',
};

/** Parse hold seconds from a standard string like "3x30s" → 30. */
function holdSecondsFromStandard(exerciseName: string): number | null {
  const standard = CALISTHENICS_STANDARDS[exerciseName];
  if (!standard) return null;
  const match = standard.match(/(\d+)s/);
  return match ? Number(match[1]) : null;
}

interface SessionCompleteViewProps {
  sessionLog: SessionLogRow;
  currentGate: GateColour;
}

// ── Zone 2 completion card ────────────────────────────────────────────────────

function Zone2CompleteCard({ sessionLog }: { sessionLog: SessionLogRow }) {
  const cardio = sessionLog.cardio;
  const durationMin = sessionLog.duration_minutes;
  const avgHr = cardio?.avg_hr_bpm ?? null;
  const zone2Min = (cardio as typeof cardio & { zone2_minutes?: number | null })?.zone2_minutes ?? null;
  const dataSource = (cardio as typeof cardio & { data_source?: string })?.data_source ?? null;
  const isManual = dataSource === 'manual' || dataSource == null;

  const inZonePct = durationMin && zone2Min != null ? zone2Min / durationMin : null;
  const inZoneGood = inZonePct != null && inZonePct >= 0.80;

  return (
    <View style={{ gap: 10 }}>
      {durationMin != null && (
        <Row label="Duration" value={`${durationMin} min`} />
      )}
      {!isManual && avgHr != null && (
        <Row label="Avg HR" value={`${avgHr} bpm`} />
      )}
      {!isManual && zone2Min != null && (
        <Row
          label="In-zone time"
          value={`${zone2Min} min`}
          valueColor={inZoneGood ? '#4ade80' : '#a1a1aa'}
        />
      )}
      <Row label="Source" value={isManual ? 'Manual' : 'Apple Health'} />
    </View>
  );
}

// ── Intervals completion card ─────────────────────────────────────────────────

function IntervalsCompleteCard({ sessionLog }: { sessionLog: SessionLogRow }) {
  const cardio = sessionLog.cardio;
  const durationMin = sessionLog.duration_minutes;
  const avgHr = cardio?.avg_hr_bpm ?? null;
  const setsCompleted = (cardio as typeof cardio & { interval_sets_completed?: number | null })?.interval_sets_completed ?? null;
  const dataSource = (cardio as typeof cardio & { data_source?: string })?.data_source ?? null;
  const isManual = dataSource === 'manual' || dataSource == null;

  return (
    <View style={{ gap: 10 }}>
      {durationMin != null && (
        <Row label="Duration" value={`${durationMin} min`} />
      )}
      {setsCompleted != null && (
        <Row label="Sets completed" value={`${setsCompleted} / 4`} valueColor={setsCompleted === 4 ? '#4ade80' : '#a1a1aa'} />
      )}
      {!isManual && avgHr != null && (
        <Row label="Avg work HR" value={`${avgHr} bpm`} />
      )}
      <Row label="Source" value={isManual ? 'Manual' : 'Apple Health'} />
    </View>
  );
}

// ── Mobility completion card ──────────────────────────────────────────────────

function MobilityCompleteCard({ sessionLog }: { sessionLog: SessionLogRow }) {
  const mobility = sessionLog.mobility;
  const durationMin = sessionLog.duration_minutes;
  const area = mobility?.area_trained ?? null;
  const done = (mobility as typeof mobility & { exercises_completed?: number | null })?.exercises_completed ?? null;
  const total = (mobility as typeof mobility & { exercises_total?: number | null })?.exercises_total ?? null;

  return (
    <View style={{ gap: 10 }}>
      {durationMin != null && (
        <Row label="Duration" value={`${durationMin} min`} />
      )}
      {area && (
        <Row label="Area" value={AREA_LABELS[area] ?? area} />
      )}
      {done != null && total != null && (
        <Row label="Exercises" value={`${done} / ${total} completed`} valueColor={done === total ? '#4ade80' : '#a1a1aa'} />
      )}
    </View>
  );
}

// ── Strength completion card ──────────────────────────────────────────────────

function StrengthCompleteCard({ sessionLog }: { sessionLog: SessionLogRow }) {
  const exerciseRows = sessionLog.exercises.map((ex) => {
    const displayName = ex.substitute_used && ex.substitute_name ? ex.substitute_name : ex.name;
    const timed = isTimedHold(ex.name);

    if (timed) {
      const holdSeconds = holdSecondsFromStandard(ex.name);
      return { key: ex.name, displayName, detail: holdSeconds ? `${holdSeconds}s` : null, superset: ex.superset ?? null };
    }

    const maxLoad = ex.sets.reduce<number | null>((max, s) => {
      if (!s.load_kg || s.load_kg <= 0) return max;
      return max == null || s.load_kg > max ? s.load_kg : max;
    }, null);

    if (maxLoad != null) {
      return { key: ex.name, displayName, detail: `${maxLoad}kg`, superset: ex.superset ?? null };
    }

    const firstReps = ex.sets.find((s) => s.reps_completed != null)?.reps_completed;
    return { key: ex.name, displayName, detail: firstReps != null ? `${firstReps} reps` : null, superset: ex.superset ?? null };
  });

  if (exerciseRows.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      {exerciseRows.map((row) => {
        const superset = row.superset;
        const supersetDetail = superset
          ? superset.is_timed_hold
            ? superset.hold_duration_seconds != null
              ? `${superset.hold_duration_seconds}s`
              : holdSecondsFromStandard(superset.name) != null
              ? `${holdSecondsFromStandard(superset.name)}s`
              : superset.standard
            : superset.standard
          : null;

        return (
          <View key={row.key} style={{ gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a1a1aa', fontSize: 13, flex: 1 }} numberOfLines={1}>
                {row.displayName}
              </Text>
              <Text style={{ color: '#71717a', fontSize: 13 }}>{row.detail}</Text>
            </View>
            {superset && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12 }}>
                <Text style={{ color: '#52525b', fontSize: 12, flex: 1 }} numberOfLines={1}>
                  ⤷ {superset.name}
                </Text>
                {supersetDetail && (
                  <Text style={{ color: '#52525b', fontSize: 12 }}>{supersetDetail}</Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Shared row ────────────────────────────────────────────────────────────────

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: '#52525b', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: valueColor ?? '#a1a1aa', fontSize: 13 }}>{value}</Text>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SessionCompleteView({ sessionLog }: SessionCompleteViewProps) {
  const typeLabel = SESSION_TYPE_LABELS[sessionLog.session_type] ?? sessionLog.session_type;

  return (
    <View style={{ backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#3f6212', padding: 20, gap: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#86efac', fontSize: 16, fontWeight: '700' }}>✓ {typeLabel}</Text>
            {sessionLog.duration_minutes != null && (
              <Text style={{ color: '#4ade80', fontSize: 13 }}>{sessionLog.duration_minutes} min</Text>
            )}
          </View>
          <Text style={{ color: '#52525b', fontSize: 13 }}>Completed today</Text>
        </View>
        {sessionLog.session_rpe != null && (
          <View style={{ backgroundColor: '#27272a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#a1a1aa', fontSize: 11 }}>RPE</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
              {sessionLog.session_rpe}
            </Text>
          </View>
        )}
      </View>

      {/* Type-specific body */}
      {sessionLog.session_type === 'zone2' && <Zone2CompleteCard sessionLog={sessionLog} />}
      {sessionLog.session_type === 'intervals' && <IntervalsCompleteCard sessionLog={sessionLog} />}
      {sessionLog.session_type === 'mobility' && <MobilityCompleteCard sessionLog={sessionLog} />}
      {sessionLog.session_type === 'strength_calisthenics' && <StrengthCompleteCard sessionLog={sessionLog} />}
    </View>
  );
}
