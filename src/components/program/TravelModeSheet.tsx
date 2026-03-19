/**
 * TravelModeSheet.tsx
 *
 * Bottom sheet for setting a travel mode date range.
 * User picks a start and end date; the engine generates minimal-equipment
 * sessions for any week that overlaps with the selected range.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface TravelModeSheetProps {
  visible: boolean;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  onClose: () => void;
  onToggled: () => void;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso: string, n: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Sun..6=Sat → convert to Mon-first (0=Mon..6=Sun)
  const raw = new Date(year, month, 1).getDay();
  return (raw + 6) % 7;
}

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_HEADERS = ['M','T','W','T','F','S','S'];

// ── Mini calendar component ───────────────────────────────────────────────────

interface CalendarProps {
  selecting: 'start' | 'end';
  startISO: string | null;
  endISO: string | null;
  minISO: string;
  onSelect: (iso: string) => void;
}

function Calendar({ selecting, startISO, endISO, minISO, onSelect }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);

  // Build a flat array: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function cellISO(day: number): string {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isDisabled(day: number): boolean {
    const iso = cellISO(day);
    if (iso < minISO) return true;
    // When picking end, can't be before start
    if (selecting === 'end' && startISO && iso < startISO) return true;
    return false;
  }

  function isInRange(day: number): boolean {
    if (!startISO || !endISO) return false;
    const iso = cellISO(day);
    return iso > startISO && iso < endISO;
  }

  function isStart(day: number): boolean {
    return !!startISO && cellISO(day) === startISO;
  }

  function isEnd(day: number): boolean {
    return !!endISO && cellISO(day) === endISO;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Don't allow navigating before the current month
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  return (
    <View>
      {/* Month navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity
          onPress={prevMonth}
          disabled={!canGoPrev}
          style={{ padding: 8 }}
        >
          <Text style={{ color: canGoPrev ? '#fff' : '#3f3f46', fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_HEADERS.map((h, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '600' }}>{h}</Text>
          </View>
        ))}
      </View>

      {/* Cells */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', marginBottom: 2 }}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={{ flex: 1 }} />;
            const disabled = isDisabled(day);
            const inRange = isInRange(day);
            const start = isStart(day);
            const end = isEnd(day);
            const highlighted = start || end || inRange;

            return (
              <TouchableOpacity
                key={col}
                onPress={() => !disabled && onSelect(cellISO(day))}
                style={{
                  flex: 1,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: start || end ? '#fff' : inRange ? '#3f3f46' : 'transparent',
                  borderRadius: start || end ? 8 : 0,
                  borderTopLeftRadius: start ? 8 : inRange && col === 0 ? 0 : undefined,
                  borderBottomLeftRadius: start ? 8 : inRange && col === 0 ? 0 : undefined,
                  borderTopRightRadius: end ? 8 : inRange && col === 6 ? 0 : undefined,
                  borderBottomRightRadius: end ? 8 : inRange && col === 6 ? 0 : undefined,
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: start || end ? '700' : '400',
                  color: start || end ? '#000' : disabled ? '#3f3f46' : highlighted ? '#e4e4e7' : '#d4d4d8',
                }}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Main sheet ────────────────────────────────────────────────────────────────

export function TravelModeSheet({ visible, isActive, startDate, endDate, onClose, onToggled }: TravelModeSheetProps) {
  const todayISO = toLocalISO(new Date());
  const isScheduled = isActive && !!startDate && startDate > todayISO;
  const isLive = isActive && !isScheduled;
  const [selectingStep, setSelectingStep] = useState<'start' | 'end'>('start');
  const [pickedStart, setPickedStart] = useState<string | null>(null);
  const [pickedEnd, setPickedEnd] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSelect(iso: string) {
    if (selectingStep === 'start') {
      setPickedStart(iso);
      setPickedEnd(null);
      setSelectingStep('end');
    } else {
      setPickedEnd(iso);
    }
  }

  function formatDate(iso: string): string {
    return parseLocal(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const handleActivate = async () => {
    if (!pickedStart || !pickedEnd) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('mesocycle_state')
        .update({
          travel_mode_active: true,
          travel_mode_start_date: pickedStart,
          travel_mode_end_date: pickedEnd,
        })
        .eq('user_id', session.user.id);

      if (error) throw error;
      setPickedStart(null);
      setPickedEnd(null);
      setSelectingStep('start');
      onToggled();
      onClose();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('mesocycle_state')
        .update({ travel_mode_active: false, travel_mode_start_date: null, travel_mode_end_date: null })
        .eq('user_id', session.user.id);

      if (error) throw error;
      onToggled();
      onClose();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleClose() {
    setPickedStart(null);
    setPickedEnd(null);
    setSelectingStep('start');
    onClose();
  }

  const canConfirm = !!pickedStart && !!pickedEnd;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={{
          backgroundColor: '#18181b',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: '#27272a',
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 44,
          maxHeight: '85%',
        }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: 20 }}>
              <View style={{ width: 40, height: 4, backgroundColor: '#3f3f46', borderRadius: 2, alignSelf: 'center' }} />

              {/* Header */}
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: isLive ? '#60a5fa' : isScheduled ? '#4ade80' : '#fff', fontSize: 17, fontWeight: '700' }}>Travel Mode</Text>
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
                <Text style={{ color: '#71717a', fontSize: 13, lineHeight: 19 }}>
                  {isLive && startDate && endDate
                    ? `Bodyweight sessions active from ${formatDate(startDate)} to ${formatDate(endDate)}.`
                    : isScheduled && startDate && endDate
                    ? `Bodyweight sessions scheduled from ${formatDate(startDate)} to ${formatDate(endDate)}. Takes effect at next program run.`
                    : 'Select your travel dates. The engine will generate bodyweight sessions for that period.'}
                </Text>
              </View>

              {isActive ? (
                <TouchableOpacity
                  onPress={handleDeactivate}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#1c0a0a',
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#7f1d1d',
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ef4444" />
                  ) : (
                    <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>Deactivate Travel Mode</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  {/* Step indicator */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['start', 'end'] as const).map((step) => {
                      const value = step === 'start' ? pickedStart : pickedEnd;
                      const isCurrentStep = selectingStep === step && !(step === 'end' && !pickedStart);
                      return (
                        <TouchableOpacity
                          key={step}
                          onPress={() => { if (step === 'start' || pickedStart) setSelectingStep(step); }}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: isCurrentStep ? '#27272a' : 'transparent',
                            borderWidth: 1,
                            borderColor: isCurrentStep ? '#fff' : '#3f3f46',
                          }}
                        >
                          <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {step === 'start' ? 'Depart' : 'Return'}
                          </Text>
                          <Text style={{ color: value ? '#fff' : '#52525b', fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                            {value ? formatDate(value) : '—'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Calendar */}
                  <Calendar
                    selecting={selectingStep}
                    startISO={pickedStart}
                    endISO={pickedEnd}
                    minISO={todayISO}
                    onSelect={handleSelect}
                  />

                  {/* Confirm */}
                  <TouchableOpacity
                    onPress={handleActivate}
                    disabled={!canConfirm || isSubmitting}
                    style={{
                      backgroundColor: canConfirm && !isSubmitting ? '#fff' : '#27272a',
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#71717a" />
                    ) : (
                      <Text style={{ color: canConfirm ? '#000' : '#52525b', fontSize: 14, fontWeight: '600' }}>
                        {canConfirm
                          ? `Activate  ${formatDate(pickedStart!)} → ${formatDate(pickedEnd!)}`
                          : 'Select travel dates'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
