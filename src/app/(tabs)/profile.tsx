/**
 * profile.tsx — Stage 10
 *
 * Sections:
 *   1. Training Phase      — build / lean / maintain
 *   2. Equipment           — gear toggles that constrain engine exercise selection
 *   3. Body Stats          — bodyweight, age, units
 *   4. Health Sync         — Apple Health connection status
 *   5. Sign Out
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAthleteProfile } from '../../hooks/useAthleteProfile';
import { useAthleteStore } from '../../store/athleteStore';
import { requestHealthPermissions } from '../../lib/health';
import type { EquipmentProfile, TrainingPhase } from '../../types/athlete';

// ── Types ─────────────────────────────────────────────────────────────────────

type TrainingAge = 'beginner' | 'intermediate' | 'athlete';

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASE_OPTIONS: { value: TrainingPhase; label: string; description: string }[] = [
  { value: 'build',    label: 'Build',    description: 'Maximise muscle & strength' },
  { value: 'maintain', label: 'Maintain', description: 'Hold current fitness level' },
  { value: 'lean',     label: 'Lean',     description: 'Reduce body fat, preserve muscle' },
];

const TRAINING_AGE_OPTIONS: { value: TrainingAge; label: string }[] = [
  { value: 'beginner',     label: 'Beginner (<2 yrs)' },
  { value: 'intermediate', label: 'Intermediate (2–5 yrs)' },
  { value: 'athlete',      label: 'Advanced (5+ yrs)' },
];

const EQUIPMENT_ITEMS: { key: keyof EquipmentProfile; label: string; note?: string }[] = [
  { key: 'barbell_rack',  label: 'Barbell & Rack',   note: 'Required for compound lifts' },
  { key: 'dumbbells',     label: 'Dumbbells',         note: 'Required for dumbbell accessory work' },
  { key: 'cable_machine', label: 'Cable Machine',     note: 'Adds cable row and pulldown options' },
  { key: 'pull_up_bar',   label: 'Pull-up Bar',       note: 'Required for skill ladder' },
  { key: 'rings',         label: 'Gymnastics Rings',  note: 'Unlocks ring push-up progressions' },
  { key: 'parallettes',   label: 'Parallettes',       note: 'Unlocks L-sit and dip progressions' },
];

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: '#18181b', borderRadius: 14, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  note,
  right,
  onPress,
  last = false,
}: {
  label: string;
  note?: string;
  right: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: '#27272a',
      gap: 12,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#e4e4e7', fontSize: 15 }}>{label}</Text>
        {note && <Text style={{ color: '#52525b', fontSize: 12, marginTop: 2 }}>{note}</Text>}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onToggle, disabled = false }: { value: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: value ? '#1d4ed8' : '#3f3f46',
        justifyContent: 'center',
        paddingHorizontal: 3,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        alignSelf: value ? 'flex-end' : 'flex-start',
      }} />
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isLoading } = useAthleteProfile();
  const { profile, updatePhase, updateEquipment } = useAthleteStore();

  // Local editable body stats (synced from profile on load)
  const [bodyweight, setBodyweight] = useState('');
  const [age, setAge] = useState('');
  const [statsSaving, setStatsSaving] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthConnecting, setHealthConnecting] = useState(false);

  useEffect(() => {
    if (profile) {
      setBodyweight(profile.bodyweight_kg != null ? String(profile.bodyweight_kg) : '');
      setAge(profile.age != null ? String(profile.age) : '');
    }
  }, [profile?.id]);

  // ── Persist helpers ─────────────────────────────────────────────────────────

  async function persistUpdate(updates: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await (supabase as any)
      .from('athlete_profiles')
      .update(updates)
      .eq('user_id', session.user.id);
  }

  async function handlePhaseChange(phase: TrainingPhase) {
    updatePhase(phase);
    await persistUpdate({ phase });
  }

  async function handleEquipmentToggle(key: keyof EquipmentProfile) {
    if (!profile) return;
    const current = (profile.equipment ?? {}) as EquipmentProfile;
    const updated: EquipmentProfile = { ...current, [key]: !current[key] };
    updateEquipment(updated);
    await persistUpdate({ equipment: updated });
  }

  async function handleTrainingAgeChange(training_age: TrainingAge) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await (supabase as any)
      .from('athlete_profiles')
      .update({ training_age })
      .eq('user_id', session.user.id);
    // Refetch via store would be ideal but store doesn't track training_age directly
    // — the next app launch will pick it up
  }

  async function handleUnitsChange(units: 'kg' | 'lbs') {
    await persistUpdate({ units });
  }

  async function handleSaveStats() {
    setStatsSaving(true);
    try {
      const bw = parseFloat(bodyweight);
      const ag = parseInt(age, 10);
      const updates: Record<string, unknown> = {};
      if (!isNaN(bw) && bw > 0) updates.bodyweight_kg = bw;
      else updates.bodyweight_kg = null;
      if (!isNaN(ag) && ag > 0) {
        updates.age = ag;
        updates.max_hr_bpm = 220 - ag; // Fox formula default
      } else {
        updates.age = null;
      }
      await persistUpdate(updates);
    } finally {
      setStatsSaving(false);
    }
  }

  async function handleConnectHealth() {
    setHealthConnecting(true);
    try {
      const granted = await requestHealthPermissions();
      setHealthConnected(granted);
      if (!granted) {
        Alert.alert(
          'Health Access',
          'Enable Health access in Settings → Privacy & Security → Health → Forge to sync HRV and sleep data.',
        );
      }
    } finally {
      setHealthConnecting(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const equipment = (profile?.equipment ?? {}) as EquipmentProfile;
  const currentPhase = profile?.phase ?? 'build';
  const currentAge = profile?.training_age ?? 'intermediate';
  const currentUnits = profile?.units ?? 'kg';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 28 }}>Profile</Text>

        {/* ── 1. Training Phase ─────────────────────────────────────────── */}
        <Section title="Training Phase">
          {PHASE_OPTIONS.map((option, i) => (
            <Row
              key={option.value}
              label={option.label}
              note={option.description}
              last={i === PHASE_OPTIONS.length - 1}
              right={
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2,
                  borderColor: currentPhase === option.value ? '#1d4ed8' : '#3f3f46',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {currentPhase === option.value && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#1d4ed8' }} />
                  )}
                </View>
              }
              onPress={() => handlePhaseChange(option.value)}
            />
          ))}
        </Section>

        {/* ── 2. Equipment ──────────────────────────────────────────────── */}
        <Section title="Equipment">
          {EQUIPMENT_ITEMS.map((item, i) => (
            <Row
              key={item.key}
              label={item.label}
              note={item.note}
              last={i === EQUIPMENT_ITEMS.length - 1}
              right={
                <Toggle
                  value={!!equipment[item.key]}
                  onToggle={() => handleEquipmentToggle(item.key)}
                />
              }
            />
          ))}
        </Section>

        {/* ── 3. Body Stats ─────────────────────────────────────────────── */}
        <Section title="Body Stats">
          {/* Units */}
          <Row
            label="Units"
            right={
              <View style={{ flexDirection: 'row', backgroundColor: '#27272a', borderRadius: 8, padding: 2, gap: 2 }}>
                {(['kg', 'lbs'] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => handleUnitsChange(u)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 5, borderRadius: 6,
                      backgroundColor: currentUnits === u ? '#3f3f46' : 'transparent',
                    }}
                  >
                    <Text style={{ color: currentUnits === u ? '#fff' : '#71717a', fontSize: 13, fontWeight: '600' }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
          {/* Bodyweight */}
          <Row
            label="Bodyweight"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  value={bodyweight}
                  onChangeText={setBodyweight}
                  placeholder="—"
                  placeholderTextColor="#52525b"
                  keyboardType="decimal-pad"
                  style={{
                    color: '#fff', fontSize: 15, textAlign: 'right',
                    width: 64, borderBottomWidth: 1, borderBottomColor: '#3f3f46',
                    paddingBottom: 2,
                  }}
                />
                <Text style={{ color: '#52525b', fontSize: 13 }}>{currentUnits}</Text>
              </View>
            }
          />
          {/* Age */}
          <Row
            label="Age"
            note="Used to estimate max HR (220 − age)"
            right={
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="—"
                placeholderTextColor="#52525b"
                keyboardType="number-pad"
                style={{
                  color: '#fff', fontSize: 15, textAlign: 'right',
                  width: 48, borderBottomWidth: 1, borderBottomColor: '#3f3f46',
                  paddingBottom: 2,
                }}
              />
            }
          />
          {/* Training age */}
          {TRAINING_AGE_OPTIONS.map((opt, i) => (
            <Row
              key={opt.value}
              label={opt.label}
              last={i === TRAINING_AGE_OPTIONS.length - 1}
              right={
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2,
                  borderColor: currentAge === opt.value ? '#1d4ed8' : '#3f3f46',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {currentAge === opt.value && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#1d4ed8' }} />
                  )}
                </View>
              }
              onPress={() => handleTrainingAgeChange(opt.value)}
            />
          ))}
        </Section>

        {/* Save stats button */}
        <TouchableOpacity
          onPress={handleSaveStats}
          disabled={statsSaving}
          style={{
            backgroundColor: '#27272a',
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: -16,
            marginBottom: 28,
          }}
        >
          {statsSaving
            ? <ActivityIndicator size="small" color="#71717a" />
            : <Text style={{ color: '#a1a1aa', fontSize: 14, fontWeight: '600' }}>Save Stats</Text>
          }
        </TouchableOpacity>

        {/* ── 4. Health Sync ────────────────────────────────────────────── */}
        <Section title="Health Sync">
          <Row
            label="Apple Health"
            note={healthConnected ? 'HRV and sleep syncing' : 'Not connected — HRV and sleep entered manually'}
            last
            right={
              healthConnecting ? (
                <ActivityIndicator size="small" color="#71717a" />
              ) : healthConnected ? (
                <View style={{ backgroundColor: '#14532d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: '#86efac', fontSize: 12, fontWeight: '600' }}>Connected</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleConnectHealth}
                  style={{ backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
                >
                  <Text style={{ color: '#93c5fd', fontSize: 13, fontWeight: '600' }}>Connect</Text>
                </TouchableOpacity>
              )
            }
          />
        </Section>

        {/* ── Sign Out ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            backgroundColor: '#18181b',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#27272a',
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>Sign Out</Text>
        </TouchableOpacity>

        {/* Engine note */}
        <Text style={{ color: '#3f3f46', fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 }}>
          Phase and equipment changes take effect at the next{'\n'}weekly engine run (every Sunday).
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export { ScreenErrorBoundary as ErrorBoundary } from '../../components/shared/ScreenErrorBoundary';
