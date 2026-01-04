/**
 * React Hook for Native iOS Features
 * Provides easy access to native functionality with automatic platform detection
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isNativePlatform,
  isIOS,
  HapticService,
  NotificationService,
  CameraService,
  ShareService,
  NetworkService,
  DeviceService,
  HealthKitService,
  HealthKitData,
  initializeIOSServices,
} from '../services/iosNative';

// Hook for haptic feedback
export function useHaptics() {
  const light = useCallback(() => HapticService.light(), []);
  const medium = useCallback(() => HapticService.medium(), []);
  const heavy = useCallback(() => HapticService.heavy(), []);
  const success = useCallback(() => HapticService.success(), []);
  const warning = useCallback(() => HapticService.warning(), []);
  const error = useCallback(() => HapticService.error(), []);
  const selection = useCallback(() => HapticService.selection(), []);

  return {
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
    isAvailable: isNativePlatform(),
  };
}

// Hook for camera functionality
export function useCamera() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    CameraService.checkPermissions().then(setHasPermission);
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await CameraService.requestPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  const takePhoto = useCallback(async () => {
    setIsLoading(true);
    try {
      const photo = await CameraService.takePhoto();
      return photo;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    setIsLoading(true);
    try {
      const photo = await CameraService.pickFromGallery();
      return photo;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    takePhoto,
    pickFromGallery,
    requestPermission,
    hasPermission,
    isLoading,
  };
}

// Hook for notifications
export function useNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    NotificationService.checkPermission().then(setHasPermission);
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await NotificationService.requestPermission();
    setHasPermission(granted);
    return granted;
  }, []);

  const scheduleMealReminder = useCallback(
    async (
      mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
      hour: number,
      minute: number
    ) => {
      await NotificationService.scheduleMealReminder(mealType, hour, minute);
    },
    []
  );

  const scheduleWaterReminder = useCallback(async (intervalHours: number = 2) => {
    await NotificationService.scheduleWaterReminder(intervalHours);
  }, []);

  const scheduleWorkoutReminder = useCallback(
    async (dayOfWeek: number, hour: number, minute: number, workoutType: string) => {
      await NotificationService.scheduleWorkoutReminder(
        dayOfWeek,
        hour,
        minute,
        workoutType
      );
    },
    []
  );

  const scheduleFastingEnd = useCallback(async (endTime: Date) => {
    await NotificationService.scheduleFastingEnd(endTime);
  }, []);

  const cancelAll = useCallback(async () => {
    await NotificationService.cancelAll();
  }, []);

  return {
    hasPermission,
    requestPermission,
    scheduleMealReminder,
    scheduleWaterReminder,
    scheduleWorkoutReminder,
    scheduleFastingEnd,
    cancelAll,
  };
}

// Hook for sharing
export function useShare() {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    ShareService.canShare().then(setCanShare);
  }, []);

  const shareRecipe = useCallback(
    async (title: string, text: string, url?: string) => {
      return ShareService.shareRecipe(title, text, url);
    },
    []
  );

  const shareProgress = useCallback(
    async (imageBase64: string, caption: string) => {
      return ShareService.shareProgress(imageBase64, caption);
    },
    []
  );

  return {
    canShare,
    shareRecipe,
    shareProgress,
  };
}

// Hook for network status
export function useNetwork() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Get initial status
    NetworkService.getStatus().then((status) => {
      setIsConnected(status.connected);
      setConnectionType(status.connectionType);
    });

    // Listen for changes
    NetworkService.onChange((status) => {
      setIsConnected(status.connected);
      setConnectionType(status.connectionType);
    });
  }, []);

  return {
    isConnected,
    connectionType,
    isWifi: connectionType === 'wifi',
    isCellular: connectionType === 'cellular',
  };
}

// Hook for device info
export function useDevice() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [batteryInfo, setBatteryInfo] = useState<any>(null);

  useEffect(() => {
    DeviceService.getInfo().then(setDeviceInfo);
    DeviceService.getBatteryInfo().then(setBatteryInfo);
  }, []);

  return {
    deviceInfo,
    batteryInfo,
    isIOS: isIOS(),
    isNative: isNativePlatform(),
  };
}

// Hook for HealthKit (iOS only)
export function useHealthKit() {
  const [isAvailable] = useState(HealthKitService.isAvailable());
  const [hasPermission, setHasPermission] = useState(false);
  const [healthData, setHealthData] = useState<HealthKitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermission = useCallback(async () => {
    if (!isAvailable) return false;
    const granted = await HealthKitService.requestPermissions();
    setHasPermission(granted);
    return granted;
  }, [isAvailable]);

  const fetchTodayData = useCallback(async () => {
    if (!isAvailable || !hasPermission) return null;
    setIsLoading(true);
    try {
      const data = await HealthKitService.getTodayData();
      setHealthData(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, hasPermission]);

  const writeNutrition = useCallback(
    async (data: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      date: Date;
    }) => {
      if (!isAvailable) return false;
      return HealthKitService.writeNutrition(data);
    },
    [isAvailable]
  );

  const writeWorkout = useCallback(
    async (data: { type: string; duration: number; calories: number; date: Date }) => {
      if (!isAvailable) return false;
      return HealthKitService.writeWorkout(data);
    },
    [isAvailable]
  );

  const writeWeight = useCallback(
    async (weight: number, date: Date = new Date()) => {
      if (!isAvailable) return false;
      return HealthKitService.writeWeight(weight, date);
    },
    [isAvailable]
  );

  const writeWaterIntake = useCallback(
    async (ml: number, date: Date = new Date()) => {
      if (!isAvailable) return false;
      return HealthKitService.writeWaterIntake(ml, date);
    },
    [isAvailable]
  );

  return {
    isAvailable,
    hasPermission,
    healthData,
    isLoading,
    requestPermission,
    fetchTodayData,
    writeNutrition,
    writeWorkout,
    writeWeight,
    writeWaterIntake,
  };
}

// Combined hook for all platform features
export function usePlatform() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeIOSServices().then(() => {
      setIsInitialized(true);
    });
  }, []);

  return {
    isInitialized,
    isNative: isNativePlatform(),
    isIOS: isIOS(),
  };
}

// Hook for safe area insets (iOS notch support)
export function useSafeArea() {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    // Get CSS safe area insets
    const computeInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('--sat') || '0', 10) ||
             parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10) ||
             (isIOS() ? 44 : 0),
        bottom: parseInt(style.getPropertyValue('--sab') || '0', 10) ||
                parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10) ||
                (isIOS() ? 34 : 0),
        left: parseInt(style.getPropertyValue('--sal') || '0', 10) || 0,
        right: parseInt(style.getPropertyValue('--sar') || '0', 10) || 0,
      });
    };

    computeInsets();
    window.addEventListener('resize', computeInsets);
    return () => window.removeEventListener('resize', computeInsets);
  }, []);

  return insets;
}

export default {
  useHaptics,
  useCamera,
  useNotifications,
  useShare,
  useNetwork,
  useDevice,
  useHealthKit,
  usePlatform,
  useSafeArea,
};
