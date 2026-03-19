/**
 * health.ts
 *
 * Apple Health / Google Fit integration stubs.
 *
 * expo-health requires a native build (npx expo run:ios) — it cannot run in
 * Expo Go. These stubs allow the full app to build and run during development.
 * Replace the function bodies with real expo-health calls once a native build
 * is in place.
 *
 * Real implementation will need:
 *   import * as Health from 'expo-health';
 *   and the NSHealthShareUsageDescription key in app.json ios.infoPlist
 */

/**
 * Request Apple Health / Google Fit read permissions.
 * Returns true if granted, false if denied or unavailable.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  // TODO: replace with real expo-health permission request in native build
  return false;
}

/**
 * Read the most recent HRV (RMSSD) measurement from Apple Health.
 * Returns null if unavailable or permission not granted.
 */
export async function readLatestHrv(): Promise<number | null> {
  // TODO: replace with real expo-health HRV query in native build
  return null;
}

/**
 * Read last night's sleep duration from Apple Health / Google Fit.
 * Returns total hours as a decimal (e.g. 7.5 for 7h 30m), or null if unavailable.
 */
export async function readLastNightSleepHours(): Promise<number | null> {
  // TODO: replace with real expo-health sleep query in native build
  return null;
}

export interface WorkoutSummary {
  duration_minutes: number;
  avg_hr_bpm: number | null;
  /** Minutes where HR stayed within the Zone 2 band (hrFloor–hrCeiling). */
  in_zone_minutes: number | null;
  data_source: 'apple_health';
}

/**
 * Query Apple Health for a workout completed within the last withinLastMinutes.
 * Returns null if no matching workout found or permissions not granted.
 *
 * hrFloor / hrCeiling define the Zone 2 band for in_zone_minutes calculation.
 * If per-minute HR is unavailable but avg_hr_bpm is in-zone, full duration counts.
 *
 * TODO: replace stub with real expo-health workout query in native build.
 */
export async function queryRecentWorkout(
  _hrFloor: number,
  _hrCeiling: number,
  _withinLastMinutes = 120,
): Promise<WorkoutSummary | null> {
  // TODO: replace with real expo-health workout query in native build
  return null;
}
