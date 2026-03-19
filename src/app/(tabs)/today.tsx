/**
 * today.tsx — Today Tab
 *
 * Renders one of six states derived from store + DB data:
 *   no_program       → engine hasn't run yet
 *   checkin_pending  → no check-in completed today
 *   session_locked   → session scheduled but check-in not done
 *   rest_day         → no session today + check-in done
 *   session_scheduled → ready to start
 *   session_complete  → session saved today
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { localDateISO } from '../../lib/dates';
import { useDailyLog } from '../../hooks/useDailyLog';
import { useRecoveryState } from '../../hooks/useRecoveryState';
import { useWeeklyReport } from '../../hooks/useWeeklyReport';
import { useSessionLogs } from '../../hooks/useSessionLogs';
import { useRecoveryStore } from '../../store/recoveryStore';
import { useSessionStore } from '../../store/sessionStore';
import { useWeekStore } from '../../store/weekStore';
import { SessionCompleteView } from '../../components/today/SessionCompleteView';
import type { GateColour, PlannedSession } from '../../types/athlete';

const GATE_COLORS: Record<string, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
};

const GATE_LABELS: Record<string, string> = {
  green: 'Recovery: Good',
  amber: 'Recovery: Reduced',
  red:   'Recovery: Poor',
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  strength_calisthenics: 'Strength & Skill',
  zone2: 'Zone 2 Cardio',
  intervals: 'Intervals',
  mobility: 'Mobility',
};

const DAY_INDEX_TO_STRING: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

type TodayTabState =
  | 'no_program'
  | 'checkin_pending'
  | 'session_locked'
  | 'rest_day'
  | 'session_scheduled'
  | 'session_complete';

function getTodayState(params: {
  hasProgramData: boolean;
  checkinComplete: boolean;
  hasScheduledSession: boolean;
  sessionComplete: boolean;
  sessionAlreadyLogged: boolean;
  hasSessionLog: boolean;
}): TodayTabState {
  if (!params.hasProgramData) return 'no_program';
  // Only show complete if DB confirms it — prevents stale Zustand flag persisting after deletion
  if (params.sessionAlreadyLogged || (params.sessionComplete && params.hasSessionLog)) return 'session_complete';
  if (!params.checkinComplete) {
    return params.hasScheduledSession ? 'session_locked' : 'checkin_pending';
  }
  if (params.hasScheduledSession) return 'session_scheduled';
  return 'rest_day';
}

export default function TodayScreen() {
  const { currentGate, checkInCompleted } = useRecoveryStore();
  const { isActive, todaySessionComplete, startSession } = useSessionStore();
  const { currentWeekSessions } = useWeekStore();
  const { todayLog, refetch: refetchLog } = useDailyLog();
  const { refetch: refetchRecovery } = useRecoveryState();
  const { refetch: refetchReport } = useWeeklyReport();
  const { sessionLogs, refetch: refetchSessionLogs } = useSessionLogs();

  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchRecovery(), refetchLog(), refetchReport(), refetchSessionLogs()]);
    setRefreshing(false);
  };

  // Toast logic — fires once when todaySessionComplete flips to true
  const prevComplete = useRef(false);
  useEffect(() => {
    if (todaySessionComplete && !prevComplete.current) {
      refetchLog();
      refetchSessionLogs();
      setShowToast(true);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2600),
        Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setShowToast(false));
    }
    prevComplete.current = todaySessionComplete;
  }, [todaySessionComplete]);

  // ── Active session renders full-screen ────────────────────────────────────────
  if (isActive) {
    const ActiveSession = require('../../components/session/ActiveSession').ActiveSession;
    return (
      <ActiveSession
        onComplete={() => {}}
        onDiscard={() => {}}
      />
    );
  }

  const today = DAY_INDEX_TO_STRING[new Date().getDay()];
  const todaySession: PlannedSession | null =
    currentWeekSessions.find((s) => s.day_of_week === today) ?? null;
  const isRestDay = !todaySession || todaySession.session_type === 'rest';
  const sessionAlreadyLogged = todayLog?.session_logged === true;

  const todayDateStr = localDateISO();
  const todaySessionLog = sessionLogs.find((l) => l.session_date === todayDateStr) ?? null;

  const gate = (currentGate ?? 'green') as GateColour;
  const gateColor = GATE_COLORS[gate] ?? GATE_COLORS.green;
  const gateLabel = GATE_LABELS[gate] ?? GATE_LABELS.green;

  const state = getTodayState({
    hasProgramData: currentWeekSessions.length > 0,
    checkinComplete: checkInCompleted,
    hasScheduledSession: !isRestDay && todaySession != null,
    sessionComplete: todaySessionComplete,
    sessionAlreadyLogged,
    hasSessionLog: todaySessionLog !== null,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
      {/* Toast */}
      {showToast && (
        <Animated.View style={{
          position: 'absolute', top: 60, left: 20, right: 20, zIndex: 100,
          backgroundColor: '#14532d', borderRadius: 12, borderWidth: 1, borderColor: '#166534',
          paddingHorizontal: 16, paddingVertical: 12,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          opacity: toastOpacity,
        }}>
          <Text style={{ color: '#86efac', fontSize: 14, fontWeight: '600' }}>✓ Session logged</Text>
        </Animated.View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Today</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: gateColor }} />
            <Text style={{ color: gateColor, fontSize: 12, fontWeight: '500' }}>{gateLabel}</Text>
          </View>
        </View>

        {/* State-driven content */}
        {state === 'no_program' && (
          <View style={{ backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#27272a', padding: 20 }}>
            <Text style={{ color: '#71717a', fontSize: 13 }}>
              No program yet. The engine runs every Sunday to generate next week's plan.
              {'\n\n'}To test now, trigger the engine-run function from your Supabase dashboard.
            </Text>
          </View>
        )}

        {state === 'checkin_pending' && (
          <CheckInInline onComplete={() => refetchRecovery()} />
        )}

        {state === 'session_locked' && todaySession && (
          <>
            <CheckInInline onComplete={() => refetchRecovery()} />
            <View style={{ backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#27272a', padding: 20, opacity: 0.5 }}>
              <Text style={{ color: '#71717a', fontSize: 16, fontWeight: '600' }}>
                {SESSION_TYPE_LABELS[todaySession.session_type] ?? todaySession.session_type}
              </Text>
              <Text style={{ color: '#52525b', fontSize: 12, marginTop: 8 }}>
                Complete your daily check-in to unlock this session.
              </Text>
            </View>
          </>
        )}

        {state === 'rest_day' && (
          <View style={{ backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#27272a', padding: 20, gap: 10 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Rest Day</Text>
            <Text style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 20 }}>
              No session scheduled today. Recovery is training.
            </Text>
          </View>
        )}

        {state === 'session_scheduled' && todaySession && (
          <View style={{ backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#3f3f46', padding: 20, gap: 16 }}>
            <View>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {SESSION_TYPE_LABELS[todaySession.session_type] ?? todaySession.session_type}
              </Text>
              <Text style={{ color: '#71717a', fontSize: 13, marginTop: 2 }}>
                {todaySession.estimated_duration_minutes} min · {todaySession.exercises.length} exercises
              </Text>
            </View>
            {todaySession.exercises.slice(0, 3).map((ex) => {
              const s = ex.sets[0];
              const isTimed = s?.hold_duration_seconds != null;
              return (
                <Text key={ex.name} style={{ color: '#a1a1aa', fontSize: 12 }}>
                  {ex.name}{'  '}
                  {isTimed
                    ? `${ex.sets.length}×${s.hold_duration_seconds}s`
                    : `${ex.sets.length}×${s?.target_reps_min}–${s?.target_reps_max}`}
                  {s?.load_kg ? ` @ ${s.load_kg}kg` : ''}
                </Text>
              );
            })}
            <TouchableOpacity
              onPress={() => {
                startSession(todaySession.session_type, todaySession.exercises);
              }}
              style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>Start Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'session_complete' && (
          todaySessionLog ? (
            <SessionCompleteView sessionLog={todaySessionLog} currentGate={gate} />
          ) : (
            <View style={{ backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#3f6212', padding: 20, gap: 6 }}>
              <Text style={{ color: '#86efac', fontSize: 15, fontWeight: '600' }}>✓ Session complete</Text>
              {todayLog?.session_rpe != null && (
                <Text style={{ color: '#71717a', fontSize: 13 }}>Session RPE: {todayLog.session_rpe}/10</Text>
              )}
            </View>
          )
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Inline check-in ───────────────────────────────────────────────────────────

import { Alert, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { readLatestHrv } from '../../lib/health';
import { useRecoveryStore as useRS } from '../../store/recoveryStore';
import type { DailyLogRow } from '../../lib/supabase';

function CheckInInline({ onComplete }: { onComplete: () => void }) {
  const [soreness, setSoreness] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { setCurrentGate, markCheckInComplete } = useRS();

  const adjustSleep = (d: number) => {
    const next = Math.min(12, Math.max(3, (sleep ?? 7.5) + d));
    setSleep(Math.round(next * 2) / 2);
  };

  const submit = async () => {
    if (!soreness || !sleep) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const hrv = await readLatestHrv();
      const { data, error } = await supabase.functions.invoke('daily-checkin', {
        body: { soreness_rating: soreness, sleep_hours: sleep, hrv_ms: hrv, notes: notes.trim() || null },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      const gate = (data?.gate ?? 'green') as GateColour;
      setCurrentGate(gate);
      markCheckInComplete({ soreness_rating: soreness, sleep_hours: sleep, hrv_ms: hrv, notes: notes.trim() || null, session_logged: false, log_date: new Date().toISOString().slice(0, 10) } as DailyLogRow);
      onComplete();
    } catch (e) {
      Alert.alert('Check-in failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const SORENESS_LABELS = ['', 'Fresh', 'Mild', 'Moderate', 'Sore', 'Very Sore'];

  return (
    <View style={{ backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#3f3f46', padding: 20, gap: 16 }}>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Daily Check-in</Text>

      <View style={{ gap: 8 }}>
        <Text style={{ color: '#a1a1aa', fontSize: 13 }}>
          How sore are you?{soreness ? `  ${SORENESS_LABELS[soreness]}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <TouchableOpacity key={v} onPress={() => setSoreness(v)}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1,
                backgroundColor: soreness === v ? '#fff' : '#27272a',
                borderColor: soreness === v ? '#fff' : '#3f3f46' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: soreness === v ? '#000' : '#a1a1aa' }}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: '#a1a1aa', fontSize: 13 }}>Sleep last night</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', borderRadius: 10, borderWidth: 1, borderColor: '#3f3f46', overflow: 'hidden' }}>
          <TouchableOpacity onPress={() => adjustSleep(-0.5)} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ color: '#fff', fontSize: 20 }}>−</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{sleep != null ? `${sleep}h` : '—'}</Text>
          </View>
          <TouchableOpacity onPress={() => adjustSleep(0.5)} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ color: '#fff', fontSize: 20 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={submit} disabled={!soreness || !sleep || submitting}
        style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center',
          backgroundColor: soreness && sleep && !submitting ? '#fff' : '#27272a' }}>
        {submitting
          ? <ActivityIndicator color={soreness && sleep ? '#000' : '#71717a'} />
          : <Text style={{ fontSize: 13, fontWeight: '600', color: soreness && sleep ? '#000' : '#52525b' }}>Log Check-in</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

export { ScreenErrorBoundary as ErrorBoundary } from '../../components/shared/ScreenErrorBoundary';
