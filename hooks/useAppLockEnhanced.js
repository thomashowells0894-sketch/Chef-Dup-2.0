/**
 * useAppLockEnhanced - Enhanced biometric app lock with auto-lock
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { secureStore, secureRetrieve, authenticateWithBiometrics, isBiometricAvailable, recordActivity } from '../lib/security';

const LOCK_SETTINGS_KEY = 'app_lock_settings';
const DEFAULT_SETTINGS = {
  enabled: false,
  autoLockTimeout: 5 * 60 * 1000, // 5 minutes
  lockOnBackground: true,
  requireOnOpen: true,
};

export function useAppLockEnhanced() {
  const [isLocked, setIsLocked] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [biometricInfo, setBiometricInfo] = useState({ available: false, type: 'none' });
  const [isLoading, setIsLoading] = useState(true);
  const backgroundTimeRef = useRef(null);
  const autoLockTimerRef = useRef(null);

  // Load settings
  useEffect(() => {
    (async () => {
      try {
        const saved = await secureRetrieve(LOCK_SETTINGS_KEY);
        if (saved) setSettings(prev => ({ ...prev, ...saved }));
        const bio = await isBiometricAvailable();
        setBiometricInfo(bio);
        if (saved?.enabled && saved?.requireOnOpen) setIsLocked(true);
      } catch {} finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Handle app state changes for auto-lock
  useEffect(() => {
    if (!settings.enabled) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
        if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
      } else if (nextState === 'active') {
        const elapsed = backgroundTimeRef.current ? Date.now() - backgroundTimeRef.current : 0;
        if (settings.lockOnBackground && elapsed > settings.autoLockTimeout) {
          setIsLocked(true);
        }
        backgroundTimeRef.current = null;
      }
    });

    return () => subscription.remove();
  }, [settings]);

  const unlock = useCallback(async () => {
    const result = await authenticateWithBiometrics('Unlock VibeFit');
    if (result.success) {
      setIsLocked(false);
      recordActivity();
      return true;
    }
    return false;
  }, []);

  const updateSettings = useCallback(async (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await secureStore(LOCK_SETTINGS_KEY, newSettings);
  }, [settings]);

  const lock = useCallback(() => {
    if (settings.enabled) setIsLocked(true);
  }, [settings.enabled]);

  return {
    isLocked,
    settings,
    biometricInfo,
    isLoading,
    unlock,
    lock,
    updateSettings,
  };
}

export default useAppLockEnhanced;
