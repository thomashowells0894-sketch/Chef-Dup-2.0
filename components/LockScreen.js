import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Fingerprint, ScanFace, Delete, Shield, Lock } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import { hapticLight, hapticSuccess, hapticWarning, hapticError } from '../lib/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAD_BUTTON_SIZE = 64;
const PIN_LENGTH = 6;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Format milliseconds into a human-readable timer string (e.g. "4:32")
 */
function formatLockoutTime(ms) {
  if (ms <= 0) return '';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function LockScreen({
  isLocked,
  biometricType,
  biometricEnabled,
  pinEnabled,
  onBiometricAuth,
  onPINAuth,
  // Lockout props (new)
  failedAttempts = 0,
  lockoutRemaining = 0,
}) {
  const [pin, setPin] = useState('');
  const [showPIN, setShowPIN] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const mountedRef = useRef(false);

  const isLockedOut = lockoutRemaining > 0;

  // Animations
  const shakeX = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const biometricGlow = useSharedValue(0.3);

  // Pulse animation for biometric button
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    biometricGlow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (!mountedRef.current && biometricEnabled && biometricType && !showPIN) {
      mountedRef.current = true;
      const timer = setTimeout(() => {
        handleBiometric();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [biometricEnabled, biometricType, showPIN]);

  // Reset PIN when lock screen shows
  useEffect(() => {
    if (isLocked) {
      setPin('');
      setError(false);
      setShowPIN(!biometricEnabled);
      mountedRef.current = false;
    }
  }, [isLocked]);

  // Sync external failedAttempts to local attempts for display
  useEffect(() => {
    setAttempts(failedAttempts);
  }, [failedAttempts]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: biometricGlow.value,
  }));

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, []);

  const handleBiometric = useCallback(async () => {
    await hapticLight();
    const result = await onBiometricAuth();
    if (result.success) {
      await hapticSuccess();
    } else if (result.usePIN) {
      setShowPIN(true);
    }
  }, [onBiometricAuth]);

  const handlePINDigit = useCallback(async (digit) => {
    // Block input during lockout
    if (isLockedOut) {
      await hapticWarning();
      return;
    }

    await hapticLight();
    setError(false);

    setPin(prev => {
      const newPin = prev + digit;

      if (newPin.length === PIN_LENGTH) {
        // Verify PIN on next tick so state updates first
        setTimeout(async () => {
          const success = onPINAuth(newPin);
          if (success) {
            await hapticSuccess();
          } else {
            await hapticError();
            setError(true);
            setAttempts(a => a + 1);
            triggerShake();
            // Clear PIN after a short delay
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 600);
          }
        }, 50);
      }

      return newPin.length <= PIN_LENGTH ? newPin : prev;
    });
  }, [onPINAuth, triggerShake, isLockedOut]);

  const handleDelete = useCallback(async () => {
    if (isLockedOut) return;
    await hapticLight();
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }, [isLockedOut]);

  const BiometricIcon = biometricType === 'face' ? ScanFace : Fingerprint;
  const biometricLabel = biometricType === 'face' ? 'Face ID' : 'Fingerprint';

  if (!isLocked) return null;

  return (
    <Modal
      visible={isLocked}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0A12', '#060610', '#000000']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle top glow */}
        <LinearGradient
          colors={['rgba(0, 212, 255, 0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={styles.topGlow}
        />

        {/* Logo / Title */}
        <Animated.View entering={FadeInDown.delay(100).springify().mass(0.5)} style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Shield size={32} color={Colors.primary} />
          </View>
          <Text style={styles.appTitle}>VibeFit</Text>
          <Text style={styles.lockSubtitle}>
            {isLockedOut
              ? 'Too many attempts'
              : showPIN
                ? 'Enter your PIN'
                : 'App Locked'}
          </Text>
        </Animated.View>

        {/* Biometric Section */}
        {!showPIN && biometricEnabled && biometricType && (
          <Animated.View entering={FadeInDown.delay(250).springify().mass(0.5)} style={styles.biometricSection}>
            <AnimatedPressable
              style={[styles.biometricButton, pulseStyle]}
              onPress={handleBiometric}
            >
              <Animated.View style={[styles.biometricGlow, glowStyle]} />
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.03)']}
                style={styles.biometricGlass}
              >
                <BiometricIcon size={44} color={Colors.primary} />
              </LinearGradient>
            </AnimatedPressable>
            <Text style={styles.biometricLabel}>Tap to use {biometricLabel}</Text>

            {pinEnabled && (
              <Pressable
                style={styles.switchMethodButton}
                onPress={() => {
                  hapticLight();
                  setShowPIN(true);
                }}
              >
                <Text style={styles.switchMethodText}>Use PIN instead</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* PIN Section */}
        {showPIN && pinEnabled && (
          <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.pinSection}>
            {/* Lockout timer */}
            {isLockedOut && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.lockoutBanner}>
                <Lock size={18} color={Colors.error} />
                <Text style={styles.lockoutText}>
                  Try again in {formatLockoutTime(lockoutRemaining)}
                </Text>
              </Animated.View>
            )}

            {/* PIN Dots — 6 dots */}
            <Animated.View style={[styles.pinDotsRow, shakeStyle]}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    pin.length > i && styles.pinDotFilled,
                    error && styles.pinDotError,
                    isLockedOut && styles.pinDotDisabled,
                  ]}
                />
              ))}
            </Animated.View>

            {error && (
              <Animated.Text
                entering={FadeIn.duration(200)}
                style={styles.errorText}
              >
                Incorrect PIN{attempts >= 3 ? ` (${attempts} attempts)` : ''}
              </Animated.Text>
            )}

            {/* Attempt counter after 3 failures (even when not in error flash) */}
            {!error && attempts >= 3 && !isLockedOut && (
              <Text style={styles.attemptWarning}>
                {attempts} failed attempts
              </Text>
            )}

            {/* Number Pad */}
            <View style={[styles.numPad, isLockedOut && styles.numPadDisabled]}>
              {/* Row 1 */}
              <View style={styles.numRow}>
                {[1, 2, 3].map(num => (
                  <NumPadButton key={num} digit={String(num)} onPress={handlePINDigit} disabled={isLockedOut} />
                ))}
              </View>
              {/* Row 2 */}
              <View style={styles.numRow}>
                {[4, 5, 6].map(num => (
                  <NumPadButton key={num} digit={String(num)} onPress={handlePINDigit} disabled={isLockedOut} />
                ))}
              </View>
              {/* Row 3 */}
              <View style={styles.numRow}>
                {[7, 8, 9].map(num => (
                  <NumPadButton key={num} digit={String(num)} onPress={handlePINDigit} disabled={isLockedOut} />
                ))}
              </View>
              {/* Row 4 */}
              <View style={styles.numRow}>
                <View style={styles.numPadSpacer} />
                <NumPadButton digit="0" onPress={handlePINDigit} disabled={isLockedOut} />
                <Pressable
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={pin.length === 0 || isLockedOut}
                >
                  <Delete
                    size={24}
                    color={pin.length > 0 && !isLockedOut ? Colors.text : Colors.textTertiary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Switch to biometric */}
            {biometricEnabled && biometricType && (
              <Pressable
                style={styles.switchMethodButton}
                onPress={() => {
                  hapticLight();
                  setShowPIN(false);
                  setPin('');
                  setError(false);
                }}
              >
                <BiometricIcon size={18} color={Colors.primary} />
                <Text style={styles.switchMethodText}>
                  Use {biometricLabel}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Fallback if only PIN and showing PIN already handled above */}
        {!biometricEnabled && !pinEnabled && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.fallbackSection}>
            <Lock size={48} color={Colors.textTertiary} />
            <Text style={styles.fallbackText}>
              No unlock method configured.
            </Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// Number Pad Button Component
function NumPadButton({ digit, onPress, disabled = false }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.numPadButton,
        pressed && !disabled && styles.numPadButtonPressed,
        disabled && styles.numPadButtonDisabled,
      ]}
      onPress={() => onPress(digit)}
      disabled={disabled}
    >
      <LinearGradient
        colors={
          disabled
            ? ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
            : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']
        }
        style={styles.numPadButtonGradient}
      >
        <Text style={[styles.numPadDigit, disabled && styles.numPadDigitDisabled]}>
          {digit}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  appTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: 1,
  },
  lockSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Biometric
  biometricSection: {
    alignItems: 'center',
  },
  biometricButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  biometricGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.primaryGlow,
  },
  biometricGlass: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  biometricLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  // PIN Section
  pinSection: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinDotError: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  pinDotDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
    fontWeight: FontWeight.medium,
  },
  attemptWarning: {
    fontSize: FontSize.sm,
    color: Colors.warning || '#FFA500',
    marginBottom: Spacing.md,
    fontWeight: FontWeight.medium,
  },

  // Lockout banner
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  lockoutText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: FontWeight.semibold,
  },

  // Number Pad
  numPad: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  numPadDisabled: {
    opacity: 0.4,
  },
  numRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  numPadButton: {
    width: PAD_BUTTON_SIZE,
    height: PAD_BUTTON_SIZE,
    borderRadius: PAD_BUTTON_SIZE / 2,
    overflow: 'hidden',
  },
  numPadButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }],
  },
  numPadButtonDisabled: {
    opacity: 0.4,
  },
  numPadButtonGradient: {
    width: PAD_BUTTON_SIZE,
    height: PAD_BUTTON_SIZE,
    borderRadius: PAD_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  numPadDigit: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  numPadDigitDisabled: {
    color: Colors.textTertiary,
  },
  numPadSpacer: {
    width: PAD_BUTTON_SIZE,
    height: PAD_BUTTON_SIZE,
  },
  deleteButton: {
    width: PAD_BUTTON_SIZE,
    height: PAD_BUTTON_SIZE,
    borderRadius: PAD_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Switch method
  switchMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  switchMethodText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },

  // Fallback
  fallbackSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  fallbackText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
