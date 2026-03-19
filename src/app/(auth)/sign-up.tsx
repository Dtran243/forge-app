/**
 * sign-up.tsx
 *
 * Email + password account creation screen.
 * On success, the root layout detects the new session and redirects
 * to /onboarding (since onboarding_complete will be false for new users).
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
import { signUp } from '../../lib/auth';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSignUp(): Promise<void> {
    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signUp(email, password);
      setConfirmed(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (confirmed) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-white text-4xl font-bold mb-2">Check your email</Text>
        <Text className="text-zinc-400 text-base text-center mb-10">
          We sent a confirmation link to{' '}
          <Text className="text-white font-medium">{email}</Text>.{'\n'}
          Click it to activate your account, then sign in.
        </Text>
        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity className="bg-white rounded-lg py-4 px-8 items-center">
            <Text className="text-black text-base font-semibold">Go to Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black"
    >
      <View className="flex-1 justify-center px-6">
        {/* Wordmark */}
        <Text className="text-white text-4xl font-bold mb-2">Forge</Text>
        <Text className="text-zinc-400 text-base mb-10">Create your account.</Text>

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
          placeholder="Min. 8 characters"
          placeholderTextColor="#52525b"
          secureTextEntry
          returnKeyType="next"
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-base mb-4"
        />

        {/* Confirm password */}
        <Text className="text-zinc-400 text-xs uppercase tracking-widest mb-2">
          Confirm Password
        </Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          placeholderTextColor="#52525b"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-base mb-6"
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={isLoading}
          className="bg-white rounded-lg py-4 items-center"
        >
          {isLoading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text className="text-black text-base font-semibold">Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Sign in link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-zinc-500 text-sm">Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text className="text-white text-sm font-medium">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
