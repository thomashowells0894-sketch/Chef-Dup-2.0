import { Easing } from 'react-native-reanimated';

/**
 * Standardized animation configurations for consistent feel across the app.
 * All interactive elements should use these shared configs.
 */

// Spring configs
export const Springs = {
  /** Default interactive spring (buttons, cards) */
  gentle: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  /** Bouncy spring (celebrations, toasts) */
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 0.8,
  },
  /** Snappy spring (quick interactions) */
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  /** Smooth spring (modals, sheets) */
  smooth: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  },
} as const;

// Timing configs
export const Timing = {
  /** Fast transition (100ms) — toggles, micro-interactions */
  fast: {
    duration: 100,
    easing: Easing.out(Easing.cubic),
  },
  /** Normal transition (200ms) — most UI changes */
  normal: {
    duration: 200,
    easing: Easing.out(Easing.cubic),
  },
  /** Slow transition (400ms) — modals, overlays */
  slow: {
    duration: 400,
    easing: Easing.out(Easing.cubic),
  },
  /** Counter animation (600ms) — number rolling */
  counter: {
    duration: 600,
    easing: Easing.out(Easing.cubic),
  },
} as const;

// Press interaction configs
export const PressScale = {
  /** Subtle press (cards) */
  subtle: 0.98,
  /** Normal press (buttons) */
  normal: 0.95,
  /** Deep press (important actions) */
  deep: 0.92,
} as const;

// Stagger delay for list items
export const StaggerDelay = {
  /** Fast stagger (40ms between items) */
  fast: 40,
  /** Normal stagger (60ms between items) */
  normal: 60,
  /** Slow stagger (100ms between items) */
  slow: 100,
} as const;

// Shared entering/exiting animations for FlatList sections
export const ListAnimations = {
  /** Fade in from bottom with delay based on index */
  enteringDelay: (index: number) => Math.min(index * StaggerDelay.normal, 360),
} as const;

// Pulse/breathing animation timing
export const Pulse = {
  /** Slow pulse (ambient effects) */
  slow: 4000,
  /** Normal pulse (attention indicators) */
  normal: 2000,
  /** Fast pulse (urgent indicators) */
  fast: 1000,
} as const;
