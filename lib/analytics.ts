import { Platform, Dimensions, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { Sentry } from './sentry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventCategory =
  | 'navigation'
  | 'engagement'
  | 'conversion'
  | 'performance'
  | 'error'
  | 'retention'
  | 'ai'
  | 'health'
  | 'social';

export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  screenName?: string;
}

interface DeviceInfo {
  platform: string;
  osVersion: string | null;
  deviceName: string | null;
  brand: string | null;
  modelName: string | null;
  screenWidth: number;
  screenHeight: number;
}

interface TrackEventParams {
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;
const STORAGE_KEY = 'analytics_unsent_events';
const SCREEN_VIEW_DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let sessionId: string = '';
let currentUserId: string | undefined;
let currentScreenName: string | undefined;
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastScreenView: { name: string; time: number } = { name: '', time: 0 };
let userProperties: Record<string, unknown> = {};
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let isInitialized = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeviceInfo(): DeviceInfo {
  const { width, height } = Dimensions.get('window');
  return {
    platform: Platform.OS,
    osVersion: Device.osVersion,
    deviceName: Device.deviceName,
    brand: Device.brand,
    modelName: Device.modelName,
    screenWidth: width,
    screenHeight: height,
  };
}

async function generateSessionId(): Promise<string> {
  try {
    const bytes = await Crypto.getRandomBytesAsync(16);
    // Convert to hex string
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback if crypto is unavailable
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

function addSentryBreadcrumb(event: AnalyticsEvent): void {
  try {
    Sentry.addBreadcrumb({
      category: `analytics.${event.category}`,
      message: event.action,
      data: {
        label: event.label,
        value: event.value,
        screenName: event.screenName,
        ...(event.metadata || {}),
      },
      level: event.category === 'error' ? 'error' : 'info',
      timestamp: event.timestamp / 1000, // Sentry expects seconds
    });
  } catch {
    // Sentry not initialized — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Persistence — save unsent events on background, restore on resume
// ---------------------------------------------------------------------------

async function persistQueue(): Promise<void> {
  if (eventQueue.length === 0) return;
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const persisted: AnalyticsEvent[] = existing ? JSON.parse(existing) : [];
    const merged = [...persisted, ...eventQueue];
    // Cap persisted events at 500 to avoid unbounded growth
    const capped = merged.slice(-500);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    eventQueue = [];
  } catch {
    // Storage failure — events remain in memory queue
  }
}

async function restoreQueue(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const events: AnalyticsEvent[] = JSON.parse(stored);
      eventQueue = [...events, ...eventQueue];
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore restore errors
  }
}

// ---------------------------------------------------------------------------
// Flush — send queued events to Supabase
// ---------------------------------------------------------------------------

async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, BATCH_SIZE);
  const deviceInfo = getDeviceInfo();

  const rows = batch.map((evt) => ({
    user_id: evt.userId || null,
    session_id: evt.sessionId,
    category: evt.category,
    action: evt.action,
    label: evt.label || null,
    value: evt.value ?? null,
    metadata: evt.metadata || {},
    screen_name: evt.screenName || null,
    device_info: deviceInfo,
    created_at: new Date(evt.timestamp).toISOString(),
  }));

  try {
    const { error } = await supabase.from('analytics_events').insert(rows);
    if (error) {
      if (__DEV__) console.warn('[Analytics] Flush error:', error.message);
      // Re-queue failed events at the front
      eventQueue = [...batch, ...eventQueue];
    }
  } catch (err) {
    if (__DEV__) console.warn('[Analytics] Flush exception:', err);
    // Re-queue failed events at the front
    eventQueue = [...batch, ...eventQueue];
  }

  // If there are remaining events, schedule another flush
  if (eventQueue.length >= BATCH_SIZE) {
    scheduleFlush();
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, 5000); // 5-second debounce for network batching
}

function enqueueEvent(event: AnalyticsEvent): void {
  eventQueue.push(event);
  addSentryBreadcrumb(event);

  if (__DEV__) {
    console.log(`[Analytics] ${event.category}.${event.action}`, event.label || '', event.value ?? '');
  }

  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
}

// ---------------------------------------------------------------------------
// AppState listener — persist on background, restore+flush on foreground
// ---------------------------------------------------------------------------

function handleAppStateChange(nextState: AppStateStatus): void {
  if (nextState === 'background' || nextState === 'inactive') {
    persistQueue();
  } else if (nextState === 'active') {
    restoreQueue().then(() => {
      if (eventQueue.length > 0) {
        flushEvents();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track a structured analytics event.
 */
export function trackEvent(
  category: EventCategory,
  action: string,
  params?: TrackEventParams
): void {
  const event: AnalyticsEvent = {
    category,
    action,
    label: params?.label,
    value: params?.value,
    metadata: params?.metadata,
    timestamp: Date.now(),
    sessionId,
    userId: currentUserId,
    screenName: currentScreenName,
  };

  enqueueEvent(event);
}

/**
 * Track a screen view with 500ms debounce to ignore duplicate rapid navigations.
 */
export function trackScreenView(screenName: string): void {
  const now = Date.now();
  if (
    lastScreenView.name === screenName &&
    now - lastScreenView.time < SCREEN_VIEW_DEBOUNCE_MS
  ) {
    return; // Debounced duplicate
  }

  lastScreenView = { name: screenName, time: now };
  currentScreenName = screenName;

  trackEvent('navigation', 'screen_view', {
    label: screenName,
  });
}

/**
 * Track a timing measurement (e.g. screen load time, API latency).
 * Pass the `startTime` from `Date.now()` or `performance.now()` at the start
 * and this function computes the duration automatically.
 */
export function trackTiming(
  category: string,
  action: string,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  trackEvent(category as EventCategory, action, {
    value: duration,
    metadata: { durationMs: duration },
  });
}

/**
 * Set user properties for analytics context.
 * These are sent as Sentry user context and stored locally.
 */
export function setUserProperties(props: Record<string, unknown>): void {
  userProperties = { ...userProperties, ...props };

  if (props.userId && typeof props.userId === 'string') {
    currentUserId = props.userId;
  }

  try {
    Sentry.setContext('user_properties', userProperties);
  } catch {
    // Sentry not initialized
  }
}

/**
 * Start a new analytics session. Call this when the user authenticates
 * or the app becomes active.
 */
export async function startSession(): Promise<void> {
  sessionId = await generateSessionId();

  // Set up AppState listener only once
  if (!isInitialized) {
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    isInitialized = true;
  }

  // Restore any persisted events from a prior session
  await restoreQueue();

  trackEvent('retention', 'session_start', {
    metadata: {
      deviceInfo: getDeviceInfo(),
    },
  });
}

/**
 * End the current analytics session. Call this on app background or sign-out.
 * Flushes all remaining events.
 */
export async function endSession(): Promise<void> {
  trackEvent('retention', 'session_end');

  // Force-flush remaining events
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushEvents();

  // Persist any events that failed to send
  await persistQueue();
}

/**
 * Set the current authenticated user ID for tagging events.
 */
export function setAnalyticsUserId(userId: string | undefined): void {
  currentUserId = userId;
}

/**
 * Force-flush all queued events. Useful before the app closes or navigates away.
 */
export async function forceFlush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  while (eventQueue.length > 0) {
    await flushEvents();
  }
}

/**
 * Clean up the analytics engine. Call on unmount of the root layout.
 */
export function cleanupAnalytics(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  isInitialized = false;
}
