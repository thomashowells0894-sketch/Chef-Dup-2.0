/**
 * Health Service Abstraction Layer
 *
 * Mock-ready health data service for VibeFit.
 * Provides Apple Health (iOS) / Health Connect (Android) integration
 * via a simulated implementation that can be swapped for real APIs
 * when building with EAS Build.
 *
 * Storage key: @vibefit_health_connected
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vibefit_health_connected';
const MOCK_STEPS_KEY = '@vibefit_health_mock_steps';
const MOCK_WEIGHT_KEY = '@vibefit_health_mock_weight';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random integer in [min, max]. */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Get the start of today (00:00:00) as a Date. */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date to YYYY-MM-DD. */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Seed-based daily random so the same day returns consistent mock values. */
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  // Simple hash -> 0-1 float
  h = ((h ^ (h >>> 16)) * 0x45d9f3b) | 0;
  h = ((h ^ (h >>> 16)) * 0x45d9f3b) | 0;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0xffffffff;
}

/** Get deterministic steps for a given date string. */
function mockStepsForDate(dateStr) {
  const r = seededRandom('steps_' + dateStr);
  return Math.round(4000 + r * 12000); // 4,000 - 16,000 range, centred ~10k
}

// ---------------------------------------------------------------------------
// Connection state (persisted via AsyncStorage)
// ---------------------------------------------------------------------------

let _connected = false;
let _connectionLoaded = false;

async function loadConnectionState() {
  if (_connectionLoaded) return _connected;
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    _connected = val === 'true';
  } catch {
    _connected = false;
  }
  _connectionLoaded = true;
  return _connected;
}

async function setConnectionState(connected) {
  _connected = connected;
  _connectionLoaded = true;
  try {
    if (connected) {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Silently fail on storage errors
  }
}

// ---------------------------------------------------------------------------
// Step subscription (polling-based mock)
// ---------------------------------------------------------------------------

let _stepSubscribers = [];
let _stepPollingInterval = null;

function startStepPolling() {
  if (_stepPollingInterval) return;
  _stepPollingInterval = setInterval(async () => {
    if (!_connected) return;
    const steps = await getStepsToday();
    _stepSubscribers.forEach((cb) => {
      try {
        cb(steps);
      } catch {
        // Ignore callback errors
      }
    });
  }, 60000); // Poll every 60 seconds
}

function stopStepPolling() {
  if (_stepPollingInterval) {
    clearInterval(_stepPollingInterval);
    _stepPollingInterval = null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a health platform is available on this device.
 * In Expo Go / development, returns false so we fall back to mocks.
 * When real native modules are available (EAS Build), this would check
 * for HealthKit / Health Connect availability.
 */
export function isHealthAvailable() {
  // In a real implementation this would check:
  // iOS: AppleHealthKit.isAvailable()
  // Android: HealthConnect.isAvailable()
  // For now, always return true so the mock flow works.
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Check whether the user has previously connected health data.
 */
export async function isHealthConnected() {
  return loadConnectionState();
}

/**
 * Request health permissions (steps, weight, active energy).
 * In mock mode this always succeeds.
 * Returns true if permissions were granted.
 */
export async function requestHealthPermissions() {
  // Real implementation:
  // iOS: request HealthKit permissions for StepCount, BodyMass, ActiveEnergyBurned
  // Android: request Health Connect permissions

  // Simulate a brief delay like a real permission dialog
  await new Promise((resolve) => setTimeout(resolve, 800));

  await setConnectionState(true);
  return true;
}

/**
 * Disconnect health integration.
 */
export async function disconnectHealth() {
  await setConnectionState(false);
  stopStepPolling();
  _stepSubscribers = [];
}

/**
 * Get today's step count.
 * Returns a number.
 */
export async function getStepsToday() {
  const connected = await loadConnectionState();
  if (!connected) return 0;

  const todayStr = formatDate(new Date());
  const hourProgress = new Date().getHours() / 24;

  // Base steps for today (deterministic) scaled by time of day
  const fullDaySteps = mockStepsForDate(todayStr);
  // Add a small random jitter so it feels "live"
  const jitter = randomInt(-200, 200);
  const steps = Math.max(0, Math.round(fullDaySteps * hourProgress + jitter));
  return steps;
}

/**
 * Get weekly step data for the last 7 days.
 * Returns an array of { date: string, steps: number }.
 */
export async function getWeeklySteps() {
  const connected = await loadConnectionState();
  if (!connected) return [];

  const result = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);

    if (i === 0) {
      // Today: use partial day steps
      const steps = await getStepsToday();
      result.push({ date: dateStr, steps });
    } else {
      // Past days: full deterministic value
      result.push({ date: dateStr, steps: mockStepsForDate(dateStr) });
    }
  }

  return result;
}

/**
 * Get the latest weight reading.
 * Returns { value: number, unit: string, date: string } or null.
 */
export async function getLatestWeight() {
  const connected = await loadConnectionState();
  if (!connected) return null;

  // Try to load a persisted mock weight, or generate one
  try {
    const stored = await AsyncStorage.getItem(MOCK_WEIGHT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Fall through to generate
  }

  // Generate a realistic mock weight (kg)
  const baseWeight = 72 + seededRandom('weight_base') * 20; // 72-92 kg range
  const weight = {
    value: Math.round(baseWeight * 10) / 10,
    unit: 'kg',
    date: formatDate(new Date()),
  };

  try {
    await AsyncStorage.setItem(MOCK_WEIGHT_KEY, JSON.stringify(weight));
  } catch {
    // Ignore storage errors
  }

  return weight;
}

/**
 * Get today's active calories burned.
 * Returns a number.
 */
export async function getActiveCaloriesToday() {
  const connected = await loadConnectionState();
  if (!connected) return 0;

  const todayStr = formatDate(new Date());
  const hourProgress = new Date().getHours() / 24;

  // Generate 200-500 kcal range scaled by time of day
  const fullDayCal = 200 + seededRandom('cal_' + todayStr) * 300;
  const jitter = randomInt(-15, 15);
  return Math.max(0, Math.round(fullDayCal * hourProgress + jitter));
}

/**
 * Subscribe to step count updates (polling fallback).
 * The callback receives the current step count.
 * Returns an unsubscribe function.
 */
export function subscribeToStepUpdates(callback) {
  _stepSubscribers.push(callback);
  startStepPolling();

  return () => {
    _stepSubscribers = _stepSubscribers.filter((cb) => cb !== callback);
    if (_stepSubscribers.length === 0) {
      stopStepPolling();
    }
  };
}

/**
 * Get the health platform name for the current OS.
 */
export function getHealthPlatformName() {
  return Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';
}
