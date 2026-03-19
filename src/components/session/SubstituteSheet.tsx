/**
 * SubstituteSheet.tsx
 *
 * Bottom sheet for selecting a substitute exercise.
 * Filters by available athlete equipment and excludes the currently active substitute.
 * Shows reason (always) and note (if present) for each option.
 */

import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getSubstitutes, type SubstituteEntry, type Equipment } from '../../data/substitutions';
import { useAthleteStore } from '../../store/athleteStore';
import type { EquipmentProfile } from '../../types/athlete';

interface SubstituteSheetProps {
  /** The current displayed exercise name (may already be a substitute) */
  exerciseName: string;
  /** The currently active substitute name, if any — excluded from the list */
  activeSubstitute: string | null;
  visible: boolean;
  onSelect: (entry: SubstituteEntry) => void;
  onClose: () => void;
}

/** Map EquipmentProfile keys to the Equipment union used by substitutions data. */
function equipmentProfileToMap(
  profile: EquipmentProfile | null | undefined,
): Partial<Record<Equipment, boolean>> {
  if (!profile) return {};
  return {
    barbell: profile.barbell_rack,
    dumbbells: profile.dumbbells,
    cable: profile.cable_machine,
    pull_up_bar: profile.pull_up_bar,
    rings: profile.rings,
    parallettes: profile.parallettes,
    // machine, bands, dip_bar not in EquipmentProfile — treated as unavailable
  };
}

export function SubstituteSheet({
  exerciseName,
  activeSubstitute,
  visible,
  onSelect,
  onClose,
}: SubstituteSheetProps) {
  const { profile } = useAthleteStore();
  const equipmentMap = profile?.equipment ? equipmentProfileToMap(profile.equipment) : null;
  const options = getSubstitutes(exerciseName, equipmentMap, activeSubstitute);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={{ backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#27272a', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, maxHeight: '70%' }}>
        {/* Handle */}
        <View style={{ width: 40, height: 4, backgroundColor: '#3f3f46', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
          Substitute: {exerciseName}
        </Text>
        <Text style={{ color: '#71717a', fontSize: 13, marginBottom: 16 }}>
          Same movement pattern, comparable stimulus.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {options.length === 0 ? (
            <Text style={{ color: '#71717a', fontSize: 14, paddingVertical: 16 }}>
              No substitutes available with your current equipment.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {options.map((entry) => (
                <TouchableOpacity
                  key={entry.name}
                  onPress={() => onSelect(entry)}
                  style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 14, padding: 14, gap: 4 }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{entry.name}</Text>
                  <Text style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 18 }}>{entry.reason}</Text>
                  {entry.note && (
                    <Text style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>{entry.note}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: '#27272a', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
        >
          <Text style={{ color: '#71717a', fontSize: 14, fontWeight: '500' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
