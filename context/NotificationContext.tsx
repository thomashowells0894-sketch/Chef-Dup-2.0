import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  cancelActivationReminder as cancelActivationReminderService,
  configureNotifications,
  requestPermissions,
  getNotificationSettings,
  saveNotificationSettings,
  rescheduleAll,
  scheduleActivationReminder as scheduleActivationReminderService,
  scheduleStreakWarning as scheduleStreakWarningService,
  scheduleFastingAlert as scheduleFastingAlertService,
  cancelAllScheduled,
  cancelByIdentifier,
  DEFAULT_SETTINGS,
  type NotificationSettings,
} from '../services/notifications';
import { useAuth } from './AuthContext';
import type { ActivationStage } from '../lib/activationTracker';

interface NotificationContextValue {
  settings: NotificationSettings;
  hasPermission: boolean;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  scheduleFastingAlert: (endTime: Date) => Promise<void>;
  scheduleStreakWarning: (streakDays?: number, userName?: string) => Promise<void>;
  syncActivationReminder: (stage: ActivationStage, userName?: string) => Promise<void>;
  cancelNotification: (identifier: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);

  // Configure notification handler once on mount
  useEffect(() => {
    configureNotifications();
  }, []);

  // Load saved settings once on mount. Permission prompts are user-gated.
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const saved = await getNotificationSettings();
        if (!cancelled) {
          setSettings(saved);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to initialize notifications:', error);
      } finally {
        if (!cancelled) {
          setSettingsLoaded(true);
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  // Only authenticated users should be prompted and have active reminders.
  useEffect(() => {
    if (!settingsLoaded) return;

    let cancelled = false;

    async function syncNotificationAccess() {
      if (!user) {
        setHasPermission(false);
        setIsLoading(false);
        await cancelAllScheduled();
        return;
      }

      setIsLoading(true);

      try {
        const granted = await requestPermissions();
        if (cancelled) return;

        setHasPermission(granted);

        if (!granted) {
          await cancelAllScheduled();
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to sync notification access:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    syncNotificationAccess();

    return () => {
      cancelled = true;
    };
  }, [settingsLoaded, user]);

  // Reschedule all notifications whenever settings change (after initial hydration)
  useEffect(() => {
    if (!settingsLoaded) return;

    async function applySettings() {
      try {
        await saveNotificationSettings(settings);

        if (user && hasPermission) {
          await rescheduleAll(settings);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to apply notification settings:', error);
      }
    }
    applySettings();
  }, [settings, hasPermission, settingsLoaded, user]);

  // Update one or more settings fields
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      return merged as NotificationSettings;
    });
  }, []);

  // Passthrough: schedule a fasting completion alert
  const scheduleFastingAlert = useCallback(async (endTime: Date) => {
    if (!hasPermission) return;
    try {
      await scheduleFastingAlertService(endTime);
    } catch (error) {
      if (__DEV__) console.error('Failed to schedule fasting alert:', error);
    }
  }, [hasPermission]);

  // Passthrough: schedule a streak warning for tonight with personalized copy
  const scheduleStreakWarning = useCallback(async (streakDays?: number, userName?: string) => {
    if (!hasPermission || !settings.streakWarnings) return;
    try {
      await scheduleStreakWarningService(streakDays, userName);
    } catch (error) {
      if (__DEV__) console.error('Failed to schedule streak warning:', error);
    }
  }, [hasPermission, settings.streakWarnings]);

  const syncActivationReminder = useCallback(async (stage: ActivationStage, userName?: string) => {
    if (!hasPermission || !settings.streakWarnings) return;

    try {
      if (stage === 'complete') {
        await cancelActivationReminderService();
        return;
      }

      await scheduleActivationReminderService(stage, userName);
    } catch (error) {
      if (__DEV__) console.error('Failed to sync activation reminder:', error);
    }
  }, [hasPermission, settings.streakWarnings]);

  // Cancel a specific notification by identifier
  const cancelNotification = useCallback(async (identifier: string) => {
    try {
      await cancelByIdentifier(identifier);
    } catch (error) {
      if (__DEV__) console.error('Failed to cancel notification:', error);
    }
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      // State
      settings,
      hasPermission,
      isLoading,
      // Actions
      updateSettings,
      scheduleFastingAlert,
      scheduleStreakWarning,
      syncActivationReminder,
      cancelNotification,
    }),
    [
      settings,
      hasPermission,
      isLoading,
      updateSettings,
      scheduleFastingAlert,
      scheduleStreakWarning,
      syncActivationReminder,
      cancelNotification,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
