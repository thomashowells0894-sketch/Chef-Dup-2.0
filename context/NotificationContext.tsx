import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  configureNotifications,
  requestPermissions,
  getNotificationSettings,
  saveNotificationSettings,
  rescheduleAll,
  scheduleStreakWarning as scheduleStreakWarningService,
  scheduleFastingAlert as scheduleFastingAlertService,
  cancelByIdentifier,
  DEFAULT_SETTINGS,
} from '../services/notifications';

interface NotificationSettings {
  mealReminders: boolean;
  fastingAlerts: boolean;
  streakWarnings: boolean;
  dailyDigest: boolean;
  [key: string]: boolean;
}

interface NotificationContextValue {
  settings: NotificationSettings;
  hasPermission: boolean;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  scheduleFastingAlert: (endTime: Date) => Promise<void>;
  scheduleStreakWarning: (streakDays?: number, userName?: string) => Promise<void>;
  cancelNotification: (identifier: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS as unknown as NotificationSettings);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isHydrated = useRef<boolean>(false);

  // Configure notification handler once on mount
  useEffect(() => {
    configureNotifications();
  }, []);

  // Request permissions and load settings on mount
  useEffect(() => {
    async function initialize() {
      try {
        const granted = await requestPermissions();
        setHasPermission(granted);

        const saved = await getNotificationSettings();
        setSettings(saved as unknown as NotificationSettings);

        // Schedule notifications if we have permission
        if (granted) {
          await rescheduleAll(saved);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to initialize notifications:', error);
      } finally {
        isHydrated.current = true;
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  // Reschedule all notifications whenever settings change (after initial hydration)
  useEffect(() => {
    if (!isHydrated.current || !hasPermission) return;

    async function applySettings() {
      try {
        await saveNotificationSettings(settings as any);
        await rescheduleAll(settings as any);
      } catch (error) {
        if (__DEV__) console.error('Failed to apply notification settings:', error);
      }
    }
    applySettings();
  }, [settings, hasPermission]);

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
      cancelNotification,
    }),
    [
      settings,
      hasPermission,
      isLoading,
      updateSettings,
      scheduleFastingAlert,
      scheduleStreakWarning,
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
