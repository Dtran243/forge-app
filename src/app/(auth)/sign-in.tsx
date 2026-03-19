/**
 * sign-in.tsx
 *
 * Email + password sign-in screen.
 * On success, the root layout's auth state listener redirects automatically —
 * this screen does not navigate directly.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { signIn } from '../../lib/auth';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn(): Promise<void> {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signIn(email, password);
      // Root layout handles redirect on auth state change.
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black"
    >
      <View className="flex-1 justify-center px-6">
        {/* Wordmark */}
        <Text className="text-white text-4xl font-bold mb-2">Forge</Text>
        <Text className="text-zinc-400 text-base mb-10">Sign in to continue.</Text>

        {/* Error */}
        {errorMessage !== null && (
          <View className="bg-red-950 border border-red-700 rounded-lg px-4 py-3 mb-5">
            <Text className="text-red-400 text-sm">{errorMessage}</Text>
          </View>
        )}

        {/* Email */}
        <Text className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#52525b"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-base mb-4"
        />

        {/* Password */}
        <Text className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#52525b"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-base mb-6"
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSignIn}
          disabled={isLoading}
          className="bg-white rounded-lg py-4 items-center"
        >
          {isLoading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text className="text-black text-base font-semibold">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Sign up link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-zinc-500 text-sm">Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text className="text-white text-sm font-medium">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
