/**
 * Accessibility helpers for FuelIQ
 * Provides consistent a11y props across the app
 */

interface ButtonA11yProps {
  accessible: true;
  accessibilityRole: 'button';
  accessibilityLabel: string;
  accessibilityHint?: string;
}

interface HeaderA11yProps {
  accessible: true;
  accessibilityRole: 'header';
  accessibilityLabel: string;
}

interface ImageA11yProps {
  accessible: true;
  accessibilityRole: 'image';
  accessibilityLabel: string;
}

interface ProgressA11yProps {
  accessible: true;
  accessibilityRole: 'progressbar';
  accessibilityLabel: string;
  accessibilityValue: {
    min: number;
    max: number;
    now: number;
    text: string;
  };
}

interface ToggleA11yProps {
  accessible: true;
  accessibilityRole: 'switch';
  accessibilityLabel: string;
  accessibilityState: { checked: boolean };
}

interface TabA11yProps {
  accessible: true;
  accessibilityRole: 'tab';
  accessibilityLabel: string;
  accessibilityState: { selected: boolean };
}

interface LinkA11yProps {
  accessible: true;
  accessibilityRole: 'link';
  accessibilityLabel: string;
}

interface SummaryA11yProps {
  accessible: true;
  accessibilityRole: 'summary';
  accessibilityLabel: string;
}

interface HiddenA11yProps {
  accessible: false;
  importantForAccessibility: 'no-hide-descendants';
}

interface LiveA11yProps {
  accessible: true;
  accessibilityLiveRegion: 'polite';
  accessibilityLabel: string;
}

export const a11y = {
  // Button accessibility
  button: (label: string, hint?: string): ButtonA11yProps => ({
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    ...(hint ? { accessibilityHint: hint } : {}),
  }),

  // Header
  header: (text: string): HeaderA11yProps => ({
    accessible: true,
    accessibilityRole: 'header',
    accessibilityLabel: text,
  }),

  // Image
  image: (label: string): ImageA11yProps => ({
    accessible: true,
    accessibilityRole: 'image',
    accessibilityLabel: label,
  }),

  // Progress indicator
  progress: (label: string, value: number, max?: number): ProgressA11yProps => ({
    accessible: true,
    accessibilityRole: 'progressbar',
    accessibilityLabel: label,
    accessibilityValue: {
      min: 0,
      max: max || 100,
      now: value,
      text: `${Math.round(value)} of ${max || 100}`,
    },
  }),

  // Toggle/Switch
  toggle: (label: string, isOn: boolean): ToggleA11yProps => ({
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: label,
    accessibilityState: { checked: isOn },
  }),

  // Tab
  tab: (label: string, isSelected: boolean): TabA11yProps => ({
    accessible: true,
    accessibilityRole: 'tab',
    accessibilityLabel: label,
    accessibilityState: { selected: isSelected },
  }),

  // Link
  link: (label: string): LinkA11yProps => ({
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
  }),

  // Summary text for screen readers
  summary: (text: string): SummaryA11yProps => ({
    accessible: true,
    accessibilityRole: 'summary',
    accessibilityLabel: text,
  }),

  // Hidden from screen reader
  hidden: (): HiddenA11yProps => ({
    accessible: false,
    importantForAccessibility: 'no-hide-descendants',
  }),

  // Live region (announces changes)
  live: (label: string): LiveA11yProps => ({
    accessible: true,
    accessibilityLiveRegion: 'polite',
    accessibilityLabel: label,
  }),
};

// Format numbers for screen readers
export function formatA11yNumber(num: number, unit?: string): string {
  if (unit === 'kcal') return `${num} calories`;
  if (unit === 'g') return `${num} grams`;
  if (unit === 'ml') return `${num} milliliters`;
  if (unit === '%') return `${num} percent`;
  return `${num} ${unit || ''}`.trim();
}

// Generate progress description
export function describeProgress(current: number, goal: number, metric: string): string {
  const percentage: number = Math.round((current / goal) * 100);
  return `${metric}: ${current} of ${goal}, ${percentage} percent complete`;
}

// Helper functions for consistent accessibility labels

export function formatCaloriesLabel(calories: number): string {
  return `${calories} calories`;
}

export function formatMacroLabel(protein: number, carbs: number, fat: number): string {
  return `${protein} grams protein, ${carbs} grams carbs, ${fat} grams fat`;
}

export function formatProgressLabel(current: number, total: number, unit: string): string {
  const percentage: number = Math.round((current / total) * 100);
  return `${current} of ${total} ${unit}, ${percentage} percent`;
}

export function formatDateLabel(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export function formatStreakLabel(days: number): string {
  return `${days} day streak`;
}
