import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState } from 'react-native';

const STORAGE_KEY = '@fueliq_app_lock';
const PIN_SECURE_KEY = 'fueliq_pin_hash';
const SALT_SECURE_KEY = 'fueliq_pin_salt';
const LOCKOUT_SECURE_KEY = 'fueliq_pin_lockout';

const PIN_LENGTH = 6;

// Exponential backoff lockout thresholds (in seconds)
// 1-3 failures: no delay
// 4-5 failures: 30-second lockout
// 6-7 failures: 5-minute lockout
// 8+  failures: 30-minute lockout
function getLockoutDurationMs(attempts) {
  if (attempts <= 3) return 0;
  if (attempts <= 5) return 30 * 1000;        // 30 seconds
  if (attempts <= 7) return 5 * 60 * 1000;    // 5 minutes
  return 30 * 60 * 1000;                       // 30 minutes
}

/**
 * Get or generate a per-device random salt for PIN hashing.
 * Stored in SecureStore so it persists but is device-specific.
 */
async function getOrCreateSalt() {
  try {
    const existing = await SecureStore.getItemAsync(SALT_SECURE_KEY);
    if (existing) return existing;
    // Generate 32 random bytes as hex string
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const salt = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(SALT_SECURE_KEY, salt);
    return salt;
  } catch {
    // Fallback — should never happen but don't break the app
    return 'fueliq_pin_salt_v2_fallback';
  }
}

async function hashPIN(pin) {
  const salt = await getOrCreateSalt();
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

/**
 * Persist lockout state to SecureStore so it survives app restarts.
 */
async function saveLockoutState(attempts, lockoutExpiry) {
  try {
    await SecureStore.setItemAsync(
      LOCKOUT_SECURE_KEY,
      JSON.stringify({ attempts, lockoutExpiry })
    );
  } catch {
    // Best effort — don't crash
  }
}

async function loadLockoutState() {
  try {
    const raw = await SecureStore.getItemAsync(LOCKOUT_SECURE_KEY);
    if (!raw) return { attempts: 0, lockoutExpiry: 0 };
    const parsed = JSON.parse(raw);
    return {
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      lockoutExpiry: typeof parsed.lockoutExpiry === 'number' ? parsed.lockoutExpiry : 0,
    };
  } catch {
    return { attempts: 0, lockoutExpiry: 0 };
  }
}

export default function useAppLock() {
  const [settings, setSettings] = useState({
    enabled: false,
    biometricEnabled: false,
    pinEnabled: false,
    lockOnBackground: true,
    autoLockMinutes: 5,
  });
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricType, setBiometricType] = useState(null);
  const [lastBackground, setLastBackground] = useState(null);

  // Lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutExpiry, setLockoutExpiry] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Check biometric availability
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }
      }
    })();
  }, []);

  // Load settings and lockout state
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Strip any legacy plain PIN from state -- it's now in SecureStore
          const { pin: _legacyPin, ...safeSettings } = parsed;
          setSettings(safeSettings);
          if (safeSettings.enabled) setIsLocked(true);

          // Migrate legacy plain PIN to SecureStore if present
          if (_legacyPin) {
            const pinHash = await hashPIN(_legacyPin);
            await SecureStore.setItemAsync(PIN_SECURE_KEY, pinHash);
            // Re-save settings without plain PIN
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safeSettings));
          }
        }

        // Restore lockout state across restarts
        const lockout = await loadLockoutState();
        setFailedAttempts(lockout.attempts);
        if (lockout.lockoutExpiry > Date.now()) {
          setLockoutExpiry(lockout.lockoutExpiry);
        } else if (lockout.attempts > 0 && lockout.lockoutExpiry <= Date.now()) {
          // Lockout has expired but attempts are still recorded — keep attempts
          // so next failure escalates correctly
          setLockoutExpiry(0);
        }
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutExpiry <= 0) {
      setLockoutRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, lockoutExpiry - Date.now());
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutExpiry(0);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lockoutExpiry]);

  // Save settings (never includes PIN -- PIN goes to SecureStore only)
  useEffect(() => {
    if (isLoading) return;
    const { pin: _dropped, ...safeSettings } = settings;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safeSettings)).catch(() => {});
  }, [settings, isLoading]);

  // Monitor app state for auto-lock
  useEffect(() => {
    if (!settings.enabled || !settings.lockOnBackground) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        setLastBackground(Date.now());
      } else if (state === 'active' && lastBackground) {
        const elapsed = (Date.now() - lastBackground) / 60000;
        if (elapsed >= settings.autoLockMinutes) {
          setIsLocked(true);
        }
        setLastBackground(null);
      }
    });

    return () => subscription?.remove();
  }, [settings.enabled, settings.lockOnBackground, settings.autoLockMinutes, lastBackground]);

  /**
   * Returns remaining lockout time in milliseconds.
   * 0 means the user is not locked out.
   */
  const getRemainingLockoutTime = useCallback(() => {
    if (lockoutExpiry <= 0) return 0;
    return Math.max(0, lockoutExpiry - Date.now());
  }, [lockoutExpiry]);

  const authenticate = useCallback(async () => {
    if (settings.biometricEnabled && biometricType) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock FuelIQ',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: settings.pinEnabled,
        fallbackLabel: settings.pinEnabled ? 'Use PIN' : 'Use Passcode',
      });
      if (result.success) {
        setIsLocked(false);
        // Reset lockout on successful biometric auth
        setFailedAttempts(0);
        setLockoutExpiry(0);
        await saveLockoutState(0, 0);
        return { success: true };
      }
      return { success: false, usePIN: settings.pinEnabled };
    }
    return { success: false, usePIN: settings.pinEnabled };
  }, [settings, biometricType]);

  const authenticateWithPIN = useCallback(async (enteredPin) => {
    // Check if currently locked out
    if (lockoutExpiry > Date.now()) {
      return false;
    }

    try {
      const storedHash = await SecureStore.getItemAsync(PIN_SECURE_KEY);
      if (!storedHash) return false;
      const enteredHash = await hashPIN(enteredPin);
      if (enteredHash === storedHash) {
        setIsLocked(false);
        // Reset failed attempts on success
        setFailedAttempts(0);
        setLockoutExpiry(0);
        await saveLockoutState(0, 0);
        return true;
      }
    } catch (e) {}

    // Incorrect PIN — increment attempts and apply lockout
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);

    const lockoutDuration = getLockoutDurationMs(newAttempts);
    if (lockoutDuration > 0) {
      const expiry = Date.now() + lockoutDuration;
      setLockoutExpiry(expiry);
      await saveLockoutState(newAttempts, expiry);
    } else {
      await saveLockoutState(newAttempts, 0);
    }

    return false;
  }, [failedAttempts, lockoutExpiry]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const enableLock = useCallback(async (type, pin = null) => {
    const updates = { enabled: true };
    if (type === 'biometric') updates.biometricEnabled = true;
    if (type === 'pin') updates.pinEnabled = true;
    if (type === 'both') { updates.biometricEnabled = true; updates.pinEnabled = true; }

    // Store PIN hash in SecureStore (Keychain/Keystore), never in AsyncStorage
    if (pin) {
      const pinHash = await hashPIN(pin);
      await SecureStore.setItemAsync(PIN_SECURE_KEY, pinHash);
    }

    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const disableLock = useCallback(async () => {
    // Wipe PIN, salt, and lockout from SecureStore
    try { await SecureStore.deleteItemAsync(PIN_SECURE_KEY); } catch (e) {}
    try { await SecureStore.deleteItemAsync(SALT_SECURE_KEY); } catch (e) {}
    try { await SecureStore.deleteItemAsync(LOCKOUT_SECURE_KEY); } catch (e) {}
    setSettings({
      enabled: false,
      biometricEnabled: false,
      pinEnabled: false,
      lockOnBackground: true,
      autoLockMinutes: 5,
    });
    setIsLocked(false);
    setFailedAttempts(0);
    setLockoutExpiry(0);
    setLockoutRemaining(0);
  }, []);

  return {
    settings, isLocked, isLoading, biometricType,
    authenticate, authenticateWithPIN, updateSettings,
    enableLock, disableLock, setIsLocked,
    // New lockout-related exports
    failedAttempts,
    lockoutRemaining,
    getRemainingLockoutTime,
    PIN_LENGTH,
  };
}

// Export PIN_LENGTH so LockScreen can use it
export { PIN_LENGTH };
