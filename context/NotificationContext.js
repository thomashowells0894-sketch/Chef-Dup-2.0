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

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isHydrated = useRef(false);

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
        setSettings(saved);

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
        await saveNotificationSettings(settings);
        await rescheduleAll(settings);
      } catch (error) {
        if (__DEV__) console.error('Failed to apply notification settings:', error);
      }
    }
    applySettings();
  }, [settings, hasPermission]);

  // Update one or more settings fields
  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Passthrough: schedule a fasting completion alert
  const scheduleFastingAlert = useCallback(async (endTime) => {
    if (!hasPermission) return;
    try {
      await scheduleFastingAlertService(endTime);
    } catch (error) {
      if (__DEV__) console.error('Failed to schedule fasting alert:', error);
    }
  }, [hasPermission]);

  // Passthrough: schedule a streak warning for tonight
  const scheduleStreakWarning = useCallback(async () => {
    if (!hasPermission || !settings.streakWarnings) return;
    try {
      await scheduleStreakWarningService();
    } catch (error) {
      if (__DEV__) console.error('Failed to schedule streak warning:', error);
    }
  }, [hasPermission, settings.streakWarnings]);

  // Cancel a specific notification by identifier
  const cancelNotification = useCallback(async (identifier) => {
    try {
      await cancelByIdentifier(identifier);
    } catch (error) {
      if (__DEV__) console.error('Failed to cancel notification:', error);
    }
  }, []);

  const value = useMemo(
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

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
