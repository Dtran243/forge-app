/**
 * FormCueSheet.tsx
 *
 * Bottom sheet modal that fetches and displays a form cue for an exercise.
 * Cues are fetched from the ai-form-cue Edge Function and cached per exercise.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Module-level cache so cues persist across re-renders within a session
const cueCache: Record<string, string> = {};

interface FormCueSheetProps {
  exerciseName: string;
  visible: boolean;
  onClose: () => void;
}

export function FormCueSheet({ exerciseName, visible, onClose }: FormCueSheetProps) {
  const [cue, setCue] = useState<string | null>(cueCache[exerciseName] ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !exerciseName) return;
    if (cueCache[exerciseName]) {
      setCue(cueCache[exerciseName]);
      return;
    }
    if (fetchedFor.current === exerciseName) return;

    const fetch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Let supabase-js manage auth headers automatically (handles refresh)
        const { data, error: fnError } = await supabase.functions.invoke('ai-form-cue', {
          body: { exercise_name: exerciseName },
        });

        if (fnError) throw fnError;
        const text = data?.cue ?? 'No cue available.';
        cueCache[exerciseName] = text;
        setCue(text);
        fetchedFor.current = exerciseName;
      } catch (e) {
        setError('Could not load form cue. Check your connection.');
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [visible, exerciseName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/60"
        activeOpacity={1}
        onPress={onClose}
      />
      <View className="bg-zinc-900 rounded-t-3xl border-t border-zinc-800 px-6 pt-5 pb-10 gap-4">
        {/* Handle */}
        <View className="w-10 h-1 bg-zinc-700 rounded-full self-center" />

        {/* Title */}
        <Text className="text-white text-base font-semibold">{exerciseName}</Text>
        <Text className="text-zinc-500 text-xs uppercase tracking-wider">Form Cue</Text>

        {/* Content */}
        {isLoading && (
          <View className="py-6 items-center">
            <ActivityIndicator color="#ffffff" />
          </View>
        )}
        {!isLoading && error && (
          <Text className="text-zinc-500 text-sm">{error}</Text>
        )}
        {!isLoading && cue && !error && (
          <Text className="text-zinc-200 text-sm leading-6">{cue}</Text>
        )}

        <TouchableOpacity
          onPress={onClose}
          className="bg-zinc-800 rounded-xl py-3.5 items-center mt-2"
        >
          <Text className="text-white text-sm font-medium">Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
