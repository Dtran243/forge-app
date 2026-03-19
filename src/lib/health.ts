/**
 * health.ts
 *
 * Apple Health integration via react-native-health.
 * Reads HRV, sleep, and workout data to feed the daily check-in and
 * cardio session logging flows.
 *
 * All functions return null gracefully if permissions are denied or
 * data is unavailable — callers fall back to manual entry.
 */

import AppleHealthKit, {
  type HealthKitPermissions,
  type HKQuantityTypeIdentifier,
} from 'react-native-health';
import { Platform } from 'react-native';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRateVariabilitySDNN,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.HeartRate,
    ],
    write: [],
  },
};

let _initialized = false;

function initHealthKit(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (_initialized) { resolve(); return; }
    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
      if (err) { reject(err); return; }
      _initialized = true;
      resolve();
    });
  });
}

/**
 * Request Apple Health read permissions.
 * Returns true if granted, false if denied or unavailable.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    await initHealthKit();
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the most recent HRV (RMSSD/SDNN) measurement from Apple Health.
 * Returns null if unavailable or permission not granted.
 */
export async function readLatestHrv(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    await initHealthKit();
    return new Promise((resolve) => {
      const options = { limit: 1, ascending: false };
      AppleHealthKit.getHeartRateVariabilitySamples(options, (err, results) => {
        if (err || !results?.length) { resolve(null); return; }
        const latest = results[0];
        // react-native-health returns HRV in ms — convert to ms value directly
        resolve(latest?.value ?? null);
      });
    });
  } catch {
    return null;
  }
}

/**
 * Read last night's sleep duration from Apple Health.
 * Returns total hours as a decimal (e.g. 7.5 for 7h 30m), or null if unavailable.
 */
export async function readLastNightSleepHours(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    await initHealthKit();
    return new Promise((resolve) => {
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(18, 0, 0, 0); // 6pm yesterday

      const now = new Date();

      const options = {
        startDate: startOfYesterday.toISOString(),
        endDate: now.toISOString(),
      };

      AppleHealthKit.getSleepSamples(options, (err, results) => {
        if (err || !results?.length) { resolve(null); return; }

        // Sum asleep stages only (value === 3 = asleep in HealthKit)
        const asleepMs = results
          .filter((s) => s.value === 'ASLEEP' || s.value === 'CORE' || s.value === 'DEEP' || s.value === 'REM')
          .reduce((sum, s) => {
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();
            return sum + (end - start);
          }, 0);

        if (asleepMs === 0) { resolve(null); return; }
        resolve(Math.round((asleepMs / 3600000) * 10) / 10); // hours, 1 decimal
      });
    });
  } catch {
    return null;
  }
}

export interface WorkoutSummary {
  duration_minutes: number;
  avg_hr_bpm: number | null;
  in_zone_minutes: number | null;
  data_source: 'apple_health';
}

/**
 * Query Apple Health for a workout completed within the last withinLastMinutes.
 * Returns the most recent workout or null if none found.
 *
 * hrFloor / hrCeiling define the zone band for in_zone_minutes calculation.
 */
export async function queryRecentWorkout(
  hrFloor: number,
  hrCeiling: number,
  withinLastMinutes = 120,
): Promise<WorkoutSummary | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    await initHealthKit();
    return new Promise((resolve) => {
      const startDate = new Date(Date.now() - withinLastMinutes * 60 * 1000);

      const options = {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        limit: 10,
        ascending: false,
      };

      AppleHealthKit.getSamples(
        { ...options, type: 'Workout' as unknown as HKQuantityTypeIdentifier },
        (err, results) => {
          if (err || !results?.length) { resolve(null); return; }

          // Pick the most recent workout
          const workout = results[0] as unknown as {
            startDate: string;
            endDate: string;
            duration: number;
          };

          const durationMinutes = Math.round(
            (new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime()) / 60000
          );

          if (durationMinutes < 5) { resolve(null); return; }

          // Query heart rate during the workout window
          AppleHealthKit.getHeartRateSamples(
            {
              startDate: workout.startDate,
              endDate: workout.endDate,
              limit: 1000,
              ascending: true,
            },
            (hrErr, hrSamples) => {
              if (hrErr || !hrSamples?.length) {
                resolve({
                  duration_minutes: durationMinutes,
                  avg_hr_bpm: null,
                  in_zone_minutes: null,
                  data_source: 'apple_health',
                });
                return;
              }

              const values = hrSamples.map((s) => s.value);
              const avgHr = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

              // Estimate in-zone minutes: fraction of samples in zone × duration
              const inZoneCount = values.filter((v) => v >= hrFloor && v <= hrCeiling).length;
              const inZoneMinutes = Math.round((inZoneCount / values.length) * durationMinutes);

              resolve({
                duration_minutes: durationMinutes,
                avg_hr_bpm: avgHr,
                in_zone_minutes: inZoneMinutes,
                data_source: 'apple_health',
              });
            }
          );
        }
      );
    });
  } catch {
    return null;
  }
}
