/**
 * onboarding/equipment.tsx — Equipment checklist
 *
 * The athlete selects all equipment they have consistent access to.
 * This gates exercise selection — if a movement requires rings and rings = false,
 * it will never be programmed.
 *
 * Writes to onboardingStore.equipment (and derives which assessment movements
 * are relevant for the next screen).
 */

import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../../store/onboardingStore';
import type { EquipmentProfile } from '../../types/athlete';

const EQUIPMENT_ITEMS: {
  key: keyof EquipmentProfile;
  label: string;
  description: string;
}[] = [
  {
    key: 'barbell_rack',
    label: 'Barbell + rack',
    description: 'Squat rack, bench press, deadlift platform',
  },
  {
    key: 'dumbbells',
    label: 'Dumbbells',
    description: 'Adjustable or fixed dumbbell set',
  },
  {
    key: 'cable_machine',
    label: 'Cable machine',
    description: 'Cable row, lat pulldown, cable fly',
  },
  {
    key: 'pull_up_bar',
    label: 'Pull-up bar',
    description: 'Fixed bar or door-frame bar',
  },
  {
    key: 'rings',
    label: 'Gymnastic rings',
    description: 'Ring push-up, ring dip progressions',
  },
  {
    key: 'parallettes',
    label: 'Parallettes',
    description: 'L-sit, V-sit, and planche progressions',
  },
];

export default function EquipmentScreen() {
  const router = useRouter();
  const equipment = useOnboardingStore((s) => s.equipment);
  const setEquipment = useOnboardingStore((s) => s.setEquipment);

  function toggle(key: keyof EquipmentProfile) {
    setEquipment({ ...equipment, [key]: !equipment[key] });
  }

  const hasAnyEquipment = Object.values(equipment).some(Boolean);

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-16 pb-6"
      >
        <StepIndicator step={3} total={7} />

        <Text className="text-white text-3xl font-bold mt-6 mb-1">Your equipment</Text>
        <Text className="text-zinc-500 text-sm mb-8">
          Select everything you have consistent access to. The engine only programs
          movements you can actually do.
        </Text>

        <View className="gap-2">
          {EQUIPMENT_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => toggle(item.key)}
              className={`flex-row items-center gap-4 rounded-xl px-4 py-4 border ${
                equipment[item.key]
                  ? 'bg-zinc-800 border-white'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <View
                className={`w-5 h-5 rounded border-2 items-center justify-center ${
                  equipment[item.key] ? 'bg-white border-white' : 'border-zinc-600'
                }`}
              >
                {equipment[item.key] && (
                  <Text className="text-black text-xs font-bold">✓</Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${
                    equipment[item.key] ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  {item.label}
                </Text>
                <Text className="text-zinc-600 text-xs mt-0.5">{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {!hasAnyEquipment && (
          <View className="mt-4 bg-amber-950 border border-amber-700 rounded-xl px-4 py-3">
            <Text className="text-amber-400 text-sm">
              Select at least one piece of equipment to continue.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View className="px-6 pb-10 pt-4 border-t border-zinc-900">
        <TouchableOpacity
          onPress={() => router.push('/onboarding/assessment-briefing')}
          disabled={!hasAnyEquipment}
          className={`rounded-xl py-4 items-center ${
            hasAnyEquipment ? 'bg-white' : 'bg-zinc-800'
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              hasAnyEquipment ? 'text-black' : 'text-zinc-600'
            }`}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-full ${i < step ? 'bg-white' : 'bg-zinc-800'}`}
        />
      ))}
    </View>
  );
}
