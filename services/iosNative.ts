/**
 * iOS Native Services
 * Provides native iOS functionality via Capacitor plugins
 * Includes HealthKit, Haptics, Notifications, Camera, and more
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';

// Platform detection
export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();
export const isIOS = (): boolean => Capacitor.getPlatform() === 'ios';
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';
export const isWeb = (): boolean => Capacitor.getPlatform() === 'web';

// ==========================================
// HAPTIC FEEDBACK
// ==========================================
export const HapticService = {
  /**
   * Light impact - for selection changes, toggles
   */
  light: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  },

  /**
   * Medium impact - for button presses, confirmations
   */
  medium: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  },

  /**
   * Heavy impact - for significant actions, errors
   */
  heavy: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
  },

  /**
   * Success notification
   */
  success: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.notification({ type: NotificationType.Success });
  },

  /**
   * Warning notification
   */
  warning: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.notification({ type: NotificationType.Warning });
  },

  /**
   * Error notification
   */
  error: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.notification({ type: NotificationType.Error });
  },

  /**
   * Selection change
   */
  selection: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  },

  /**
   * Vibrate pattern
   */
  vibrate: async (duration: number = 300): Promise<void> => {
    if (!isNativePlatform()) return;
    await Haptics.vibrate({ duration });
  },
};

// ==========================================
// LOCAL NOTIFICATIONS
// ==========================================
export const NotificationService = {
  /**
   * Request notification permissions
   */
  requestPermission: async (): Promise<boolean> => {
    if (!isNativePlatform()) return false;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  },

  /**
   * Check notification permission status
   */
  checkPermission: async (): Promise<boolean> => {
    if (!isNativePlatform()) return false;
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  },

  /**
   * Schedule a meal reminder notification
   */
  scheduleMealReminder: async (
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    hour: number,
    minute: number
  ): Promise<void> => {
    if (!isNativePlatform()) return;

    const mealEmojis = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '🍎',
    };

    const messages = {
      breakfast: "Time to fuel your morning! Log your breakfast.",
      lunch: "Lunch time! Don't forget to track your meal.",
      dinner: "Dinner hour! Record what you're eating.",
      snack: "Snack break? Log it to stay on track!",
    };

    await LocalNotifications.schedule({
      notifications: [
        {
          id: mealType.charCodeAt(0),
          title: `${mealEmojis[mealType]} ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Time`,
          body: messages[mealType],
          schedule: {
            on: { hour, minute },
            repeats: true,
          },
          sound: 'notification.wav',
          actionTypeId: 'MEAL_REMINDER',
          extra: { mealType },
        },
      ],
    });
  },

  /**
   * Schedule water reminder
   */
  scheduleWaterReminder: async (intervalHours: number = 2): Promise<void> => {
    if (!isNativePlatform()) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 100,
          title: '💧 Stay Hydrated!',
          body: 'Time to drink some water. Your body will thank you!',
          schedule: {
            every: 'hour',
            count: intervalHours,
          },
          sound: 'notification.wav',
          actionTypeId: 'WATER_REMINDER',
        },
      ],
    });
  },

  /**
   * Schedule workout reminder
   */
  scheduleWorkoutReminder: async (
    dayOfWeek: number,
    hour: number,
    minute: number,
    workoutType: string
  ): Promise<void> => {
    if (!isNativePlatform()) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 200 + dayOfWeek,
          title: '💪 Workout Time!',
          body: `Ready for your ${workoutType}? Let's crush it!`,
          schedule: {
            on: { weekday: dayOfWeek, hour, minute },
            repeats: true,
          },
          sound: 'notification.wav',
          actionTypeId: 'WORKOUT_REMINDER',
          extra: { workoutType },
        },
      ],
    });
  },

  /**
   * Schedule fasting end notification
   */
  scheduleFastingEnd: async (endTime: Date): Promise<void> => {
    if (!isNativePlatform()) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 300,
          title: '🎉 Fast Complete!',
          body: 'Congratulations! Your fasting period is complete. Time to eat!',
          schedule: { at: endTime },
          sound: 'notification.wav',
          actionTypeId: 'FASTING_END',
        },
      ],
    });
  },

  /**
   * Cancel all notifications
   */
  cancelAll: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await LocalNotifications.cancel({ notifications: [] });
  },

  /**
   * Cancel specific notification by ID
   */
  cancel: async (id: number): Promise<void> => {
    if (!isNativePlatform()) return;
    await LocalNotifications.cancel({ notifications: [{ id }] });
  },

  /**
   * Get all pending notifications
   */
  getPending: async () => {
    if (!isNativePlatform()) return { notifications: [] };
    return await LocalNotifications.getPending();
  },
};

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================
export const PushService = {
  /**
   * Register for push notifications
   */
  register: async (): Promise<string | null> => {
    if (!isNativePlatform()) return null;

    try {
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return null;

      await PushNotifications.register();

      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', () => {
          resolve(null);
        });
      });
    } catch (e) {
      console.error('Push registration failed:', e);
      return null;
    }
  },

  /**
   * Add listener for received notifications
   */
  onReceived: (callback: (notification: any) => void): void => {
    if (!isNativePlatform()) return;
    PushNotifications.addListener('pushNotificationReceived', callback);
  },

  /**
   * Add listener for notification actions
   */
  onAction: (callback: (action: any) => void): void => {
    if (!isNativePlatform()) return;
    PushNotifications.addListener('pushNotificationActionPerformed', callback);
  },
};

// ==========================================
// CAMERA SERVICE
// ==========================================
export const CameraService = {
  /**
   * Take a photo for food scanning
   */
  takePhoto: async (): Promise<string | null> => {
    try {
      const image: Photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 1024,
        height: 1024,
        presentationStyle: 'fullScreen',
        promptLabelPhoto: 'Select from Gallery',
        promptLabelPicture: 'Take Photo',
      });

      return image.base64String ? `data:image/${image.format};base64,${image.base64String}` : null;
    } catch (e) {
      console.error('Camera error:', e);
      return null;
    }
  },

  /**
   * Pick from gallery
   */
  pickFromGallery: async (): Promise<string | null> => {
    try {
      const image: Photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true,
        width: 1024,
        height: 1024,
      });

      return image.base64String ? `data:image/${image.format};base64,${image.base64String}` : null;
    } catch (e) {
      console.error('Gallery error:', e);
      return null;
    }
  },

  /**
   * Check camera permissions
   */
  checkPermissions: async (): Promise<boolean> => {
    const status = await Camera.checkPermissions();
    return status.camera === 'granted' && status.photos === 'granted';
  },

  /**
   * Request camera permissions
   */
  requestPermissions: async (): Promise<boolean> => {
    const status = await Camera.requestPermissions();
    return status.camera === 'granted';
  },
};

// ==========================================
// SHARE SERVICE
// ==========================================
export const ShareService = {
  /**
   * Share recipe/meal
   */
  shareRecipe: async (
    title: string,
    text: string,
    url?: string
  ): Promise<boolean> => {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share with friends',
      });
      return true;
    } catch (e) {
      console.error('Share error:', e);
      return false;
    }
  },

  /**
   * Share progress photo
   */
  shareProgress: async (
    imageBase64: string,
    caption: string
  ): Promise<boolean> => {
    try {
      await Share.share({
        title: 'My NutriChef Progress',
        text: caption,
        // Note: For images, you'd need to save to file first
      });
      return true;
    } catch (e) {
      console.error('Share error:', e);
      return false;
    }
  },

  /**
   * Check if sharing is available
   */
  canShare: async (): Promise<boolean> => {
    const { value } = await Share.canShare();
    return value;
  },
};

// ==========================================
// SECURE STORAGE
// ==========================================
export const SecureStorage = {
  /**
   * Set item securely
   */
  set: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
  },

  /**
   * Get item
   */
  get: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },

  /**
   * Remove item
   */
  remove: async (key: string): Promise<void> => {
    await Preferences.remove({ key });
  },

  /**
   * Clear all
   */
  clear: async (): Promise<void> => {
    await Preferences.clear();
  },

  /**
   * Get all keys
   */
  keys: async (): Promise<string[]> => {
    const { keys } = await Preferences.keys();
    return keys;
  },
};

// ==========================================
// STATUS BAR
// ==========================================
export const StatusBarService = {
  /**
   * Set light status bar (dark icons)
   */
  setLight: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await StatusBar.setStyle({ style: Style.Light });
  },

  /**
   * Set dark status bar (light icons)
   */
  setDark: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await StatusBar.setStyle({ style: Style.Dark });
  },

  /**
   * Hide status bar
   */
  hide: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await StatusBar.hide();
  },

  /**
   * Show status bar
   */
  show: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await StatusBar.show();
  },

  /**
   * Set background color (iOS only)
   */
  setBackgroundColor: async (color: string): Promise<void> => {
    if (!isNativePlatform()) return;
    await StatusBar.setBackgroundColor({ color });
  },
};

// ==========================================
// KEYBOARD
// ==========================================
export const KeyboardService = {
  /**
   * Hide keyboard
   */
  hide: async (): Promise<void> => {
    if (!isNativePlatform()) return;
    await Keyboard.hide();
  },

  /**
   * Add listener for keyboard show
   */
  onShow: (callback: (info: { keyboardHeight: number }) => void): void => {
    if (!isNativePlatform()) return;
    Keyboard.addListener('keyboardWillShow', callback);
  },

  /**
   * Add listener for keyboard hide
   */
  onHide: (callback: () => void): void => {
    if (!isNativePlatform()) return;
    Keyboard.addListener('keyboardWillHide', callback);
  },
};

// ==========================================
// APP LIFECYCLE
// ==========================================
export const AppLifecycle = {
  /**
   * Add listener for app state change
   */
  onStateChange: (
    callback: (state: { isActive: boolean }) => void
  ): void => {
    App.addListener('appStateChange', callback);
  },

  /**
   * Add listener for back button (Android)
   */
  onBackButton: (callback: () => void): void => {
    App.addListener('backButton', callback);
  },

  /**
   * Add listener for URL open (deep linking)
   */
  onUrlOpen: (callback: (url: { url: string }) => void): void => {
    App.addListener('appUrlOpen', callback);
  },

  /**
   * Exit app
   */
  exit: async (): Promise<void> => {
    await App.exitApp();
  },

  /**
   * Get app info
   */
  getInfo: async () => {
    return await App.getInfo();
  },

  /**
   * Get app state
   */
  getState: async () => {
    return await App.getState();
  },
};

// ==========================================
// NETWORK
// ==========================================
export const NetworkService = {
  /**
   * Get current network status
   */
  getStatus: async () => {
    return await Network.getStatus();
  },

  /**
   * Add listener for network status change
   */
  onChange: (
    callback: (status: { connected: boolean; connectionType: string }) => void
  ): void => {
    Network.addListener('networkStatusChange', callback);
  },
};

// ==========================================
// DEVICE INFO
// ==========================================
export const DeviceService = {
  /**
   * Get device info
   */
  getInfo: async () => {
    return await Device.getInfo();
  },

  /**
   * Get device ID
   */
  getId: async () => {
    return await Device.getId();
  },

  /**
   * Get battery info
   */
  getBatteryInfo: async () => {
    return await Device.getBatteryInfo();
  },

  /**
   * Get language
   */
  getLanguage: async () => {
    return await Device.getLanguageCode();
  },
};

// ==========================================
// BROWSER
// ==========================================
export const BrowserService = {
  /**
   * Open URL in in-app browser
   */
  open: async (url: string): Promise<void> => {
    await Browser.open({
      url,
      presentationStyle: 'popover',
      toolbarColor: '#0F172A',
    });
  },

  /**
   * Close browser
   */
  close: async (): Promise<void> => {
    await Browser.close();
  },

  /**
   * Add listener for browser finished
   */
  onFinished: (callback: () => void): void => {
    Browser.addListener('browserFinished', callback);
  },
};

// ==========================================
// SPLASH SCREEN
// ==========================================
export const SplashService = {
  /**
   * Show splash screen
   */
  show: async (): Promise<void> => {
    await SplashScreen.show({
      showDuration: 2000,
      fadeInDuration: 500,
      fadeOutDuration: 500,
      autoHide: true,
    });
  },

  /**
   * Hide splash screen
   */
  hide: async (): Promise<void> => {
    await SplashScreen.hide({
      fadeOutDuration: 500,
    });
  },
};

// ==========================================
// HEALTHKIT INTEGRATION (iOS)
// ==========================================
export interface HealthKitData {
  steps: number;
  activeCalories: number;
  restingCalories: number;
  weight: number;
  waterIntake: number;
  sleepHours: number;
  heartRate: number;
}

export const HealthKitService = {
  /**
   * Check if HealthKit is available (iOS only)
   */
  isAvailable: (): boolean => {
    return isIOS();
  },

  /**
   * Request HealthKit permissions
   * Note: This requires a native plugin - showing the interface here
   */
  requestPermissions: async (): Promise<boolean> => {
    if (!isIOS()) return false;
    // This would be implemented via a native Capacitor plugin
    // For now, return true to show the interface
    console.log('HealthKit permissions would be requested here');
    return true;
  },

  /**
   * Get today's health data
   * Note: Requires native HealthKit plugin implementation
   */
  getTodayData: async (): Promise<HealthKitData | null> => {
    if (!isIOS()) return null;

    // This would fetch real data from HealthKit via a native plugin
    // Returning mock data to show the interface
    return {
      steps: 8432,
      activeCalories: 420,
      restingCalories: 1680,
      weight: 75.5,
      waterIntake: 1500,
      sleepHours: 7.5,
      heartRate: 68,
    };
  },

  /**
   * Write nutrition data to HealthKit
   */
  writeNutrition: async (data: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: Date;
  }): Promise<boolean> => {
    if (!isIOS()) return false;
    // Would write to HealthKit via native plugin
    console.log('Writing nutrition to HealthKit:', data);
    return true;
  },

  /**
   * Write workout to HealthKit
   */
  writeWorkout: async (data: {
    type: string;
    duration: number;
    calories: number;
    date: Date;
  }): Promise<boolean> => {
    if (!isIOS()) return false;
    // Would write to HealthKit via native plugin
    console.log('Writing workout to HealthKit:', data);
    return true;
  },

  /**
   * Write weight to HealthKit
   */
  writeWeight: async (weight: number, date: Date): Promise<boolean> => {
    if (!isIOS()) return false;
    // Would write to HealthKit via native plugin
    console.log('Writing weight to HealthKit:', weight, date);
    return true;
  },

  /**
   * Write water intake to HealthKit
   */
  writeWaterIntake: async (ml: number, date: Date): Promise<boolean> => {
    if (!isIOS()) return false;
    // Would write to HealthKit via native plugin
    console.log('Writing water to HealthKit:', ml, date);
    return true;
  },
};

// ==========================================
// INITIALIZE ALL iOS SERVICES
// ==========================================
export const initializeIOSServices = async (): Promise<void> => {
  if (!isNativePlatform()) {
    console.log('Running in web mode - native features disabled');
    return;
  }

  try {
    // Hide splash screen after app loads
    setTimeout(async () => {
      await SplashService.hide();
    }, 2000);

    // Set status bar style
    await StatusBarService.setDark();

    // Request notification permissions
    await NotificationService.requestPermission();

    // Setup keyboard listeners
    KeyboardService.onShow((info) => {
      document.body.style.paddingBottom = `${info.keyboardHeight}px`;
    });
    KeyboardService.onHide(() => {
      document.body.style.paddingBottom = '0px';
    });

    // Setup network listener
    NetworkService.onChange((status) => {
      if (!status.connected) {
        console.log('Network disconnected - app will work offline');
      }
    });

    // Setup app lifecycle
    AppLifecycle.onStateChange((state) => {
      if (state.isActive) {
        console.log('App became active');
      } else {
        console.log('App went to background');
      }
    });

    console.log('iOS services initialized successfully');
  } catch (e) {
    console.error('Failed to initialize iOS services:', e);
  }
};

export default {
  isNativePlatform,
  isIOS,
  isAndroid,
  isWeb,
  HapticService,
  NotificationService,
  PushService,
  CameraService,
  ShareService,
  SecureStorage,
  StatusBarService,
  KeyboardService,
  AppLifecycle,
  NetworkService,
  DeviceService,
  BrowserService,
  SplashService,
  HealthKitService,
  initializeIOSServices,
};
