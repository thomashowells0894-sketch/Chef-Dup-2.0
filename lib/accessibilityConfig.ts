import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState } from 'react';

// Hook to detect if screen reader is active
export function useScreenReader() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsActive);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setIsActive);
    return () => sub.remove();
  }, []);

  return isActive;
}

// Hook to detect if reduce motion is preferred
export function useReducedMotion() {
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReduced);
    return () => sub.remove();
  }, []);

  return isReduced;
}

// Standard max font size multiplier to prevent layout breaking
export const MAX_FONT_MULTIPLIER = 1.5;

// Minimum touch target size (WCAG 2.5.8)
export const MIN_TOUCH_TARGET = 44;
