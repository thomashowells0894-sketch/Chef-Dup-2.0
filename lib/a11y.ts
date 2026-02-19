import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Check if screen reader is active
 */
export async function isScreenReaderActive(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
}

/**
 * Announce a message to screen readers
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Format a number for screen reader (e.g., 1500 -> "1,500")
 */
export function a11yNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format calories for screen reader
 */
export function a11yCalories(cal: number): string {
  return `${a11yNumber(Math.round(cal))} calories`;
}

/**
 * Format macro for screen reader
 */
export function a11yMacro(value: number, unit: string = 'grams'): string {
  return `${a11yNumber(Math.round(value))} ${unit}`;
}

/**
 * Format percentage for screen reader
 */
export function a11yPercent(value: number): string {
  return `${Math.round(value)} percent`;
}

/**
 * Generate progress description for screen readers
 */
export function a11yProgress(current: number, target: number, label: string): string {
  const percent = target > 0 ? Math.round((current / target) * 100) : 0;
  return `${label}: ${a11yNumber(Math.round(current))} of ${a11yNumber(Math.round(target))}, ${percent} percent`;
}
