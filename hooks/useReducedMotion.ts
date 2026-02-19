import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook that respects the user's reduced motion preference.
 * When reduced motion is enabled, animations should be minimized or disabled.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

/**
 * Get animation duration based on reduced motion preference
 */
export function getAnimationDuration(normalDuration: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : normalDuration;
}

/**
 * Get spring config based on reduced motion preference
 */
export function getSpringConfig(reduceMotion: boolean) {
  if (reduceMotion) {
    return { damping: 100, stiffness: 500, mass: 0.1 }; // Nearly instant
  }
  return { damping: 15, stiffness: 100, mass: 0.5 }; // Normal spring
}
