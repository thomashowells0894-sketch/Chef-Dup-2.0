// FuelIQ Premium Theme - Apple Design Award Level
// Dark mode with Electric Blue & Sunset Orange accents

export const Colors = {
  // Background colors - Premium dark grey (not pure black)
  background: '#0A0A0C',
  backgroundGradientStart: '#0A0A0C',
  backgroundGradientEnd: '#12121A',

  // Surface colors - Glass-like layers
  surface: '#16161A',
  surfaceElevated: '#1E1E24',
  surfaceBright: '#28282F',
  surfaceGlass: 'rgba(255, 255, 255, 0.05)',
  surfaceGlassLight: 'rgba(255, 255, 255, 0.08)',
  surfaceGlassDark: 'rgba(0, 0, 0, 0.3)',

  // Primary accent - Electric Blue
  primary: '#00D4FF',
  primaryText: '#33DDFF',   // ~5.0:1 on #0A0A0C — use when primary appears as text (WCAG AA)
  primaryDim: '#00A3CC',
  primaryGlow: 'rgba(0, 212, 255, 0.3)',
  primarySoft: 'rgba(0, 212, 255, 0.15)',

  // Secondary accent - Sunset Orange
  secondary: '#FF6B35',
  secondaryText: '#FF8855', // ~4.8:1 on #0A0A0C — use when secondary appears as text (WCAG AA)
  secondaryDim: '#E55A2B',
  secondaryGlow: 'rgba(255, 107, 53, 0.3)',
  secondarySoft: 'rgba(255, 107, 53, 0.15)',

  // Success - Vibrant Green
  success: '#00E676',
  successDim: '#00C853',
  successGlow: 'rgba(0, 230, 118, 0.3)',
  successSoft: 'rgba(0, 230, 118, 0.15)',

  // Warning - Amber
  warning: '#FFB300',
  warningDim: '#FFA000',
  warningGlow: 'rgba(255, 179, 0, 0.3)',
  warningSoft: 'rgba(255, 179, 0, 0.15)',

  // Error/Danger - Coral Red
  error: '#FF5252',
  errorDim: '#FF1744',
  errorGlow: 'rgba(255, 82, 82, 0.3)',
  errorSoft: 'rgba(255, 82, 82, 0.15)',
  danger: '#FF5252',

  // Macro colors - Vibrant gradients
  protein: '#FF6B9D',
  proteinEnd: '#FF8A80',
  proteinGlow: 'rgba(255, 107, 157, 0.3)',

  carbs: '#64D2FF',
  carbsEnd: '#5AC8FA',
  carbsGlow: 'rgba(100, 210, 255, 0.3)',

  fat: '#FFD93D',
  fatEnd: '#FFC107',
  fatGlow: 'rgba(255, 217, 61, 0.3)',

  // Text colors - High contrast
  text: '#FFFFFF',
  textSecondary: '#A0A0A8',
  textTertiary: '#8E8E93',  // iOS system gray — ~4.5:1 on #0A0A0C (WCAG AA)
  textMuted: '#6B6B80',     // Bumped from #4A4A52 — ~3.5:1 on #0A0A0C

  // Tab bar - Frosted glass
  tabBarBackground: 'rgba(22, 22, 26, 0.85)',
  tabBarActive: '#00D4FF',
  tabBarInactive: '#8E8E93',  // Matched to textTertiary for AA compliance

  // Borders - Subtle
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderAccent: 'rgba(0, 212, 255, 0.3)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Gold / XP / Streaks
  gold: '#FFD700',
  goldDim: '#DAA520',
  goldGlow: 'rgba(255, 215, 0, 0.3)',
  goldSoft: 'rgba(255, 215, 0, 0.15)',

  // Meal type colors
  mealBreakfast: '#FFD60A',
  mealLunch: '#30D158',
  mealDinner: '#BF5AF2',
  mealSnacks: '#FF9F0A',

  // Fasting
  fasting: '#FF9500',
  fastingLight: 'rgba(255, 149, 0, 0.15)',

  // Chef palette
  chef: '#1A0F0A',
  chefAccent: '#FF8C42',

  // Accent purple (calendar, age)
  accentPurple: '#BF5AF2',

  // Form inputs (dark mode)
  inputBackground: '#1A1A1E',
  inputBorder: '#2A2A2E',
  inputPlaceholder: '#666',
  inputIcon: '#888',

  // OAuth buttons
  oauthGoogleBg: '#FFFFFF',
  oauthGoogleText: '#000000',
  oauthAppleBg: '#000000',
  oauthAppleText: '#FFFFFF',
  oauthAppleBorder: '#333',

  // Accessibility — focus indicators
  focusRing: '#FFFFFF',         // Visible focus ring for keyboard/switch navigation
  focusRingOffset: '#000000',   // Offset behind focus ring for contrast on any surface
} as const;

// Light mode colors - Premium light theme
export const LightColors = {
  // Background colors - Clean light grey
  background: '#FAFAFA',
  backgroundGradientStart: '#FAFAFA',
  backgroundGradientEnd: '#F5F5F7',

  // Surface colors - Clean white layers
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBright: '#F0F0F2',
  surfaceGlass: 'rgba(0, 0, 0, 0.03)',
  surfaceGlassLight: 'rgba(0, 0, 0, 0.05)',
  surfaceGlassDark: 'rgba(0, 0, 0, 0.08)',

  // Primary accent - Electric Blue (same hue, works on light)
  primary: '#00D4FF',
  primaryText: '#007A99',      // Darker for AA on white
  primaryDim: '#00A3CC',
  primaryGlow: 'rgba(0, 212, 255, 0.15)',
  primarySoft: 'rgba(0, 212, 255, 0.12)',

  // Secondary accent - Sunset Orange (same hue, works on light)
  secondary: '#FF6B35',
  secondaryText: '#C44D22',    // Darker for AA on white
  secondaryDim: '#E55A2B',
  secondaryGlow: 'rgba(255, 107, 53, 0.12)',
  secondarySoft: 'rgba(255, 107, 53, 0.10)',

  // Success - Deeper green for light backgrounds
  success: '#059669',
  successDim: '#047857',
  successGlow: 'rgba(5, 150, 105, 0.15)',
  successSoft: 'rgba(5, 150, 105, 0.10)',

  // Warning - Amber
  warning: '#D97706',
  warningDim: '#B45309',
  warningGlow: 'rgba(217, 119, 6, 0.15)',
  warningSoft: 'rgba(217, 119, 6, 0.10)',

  // Error/Danger - Red
  error: '#DC2626',
  errorDim: '#B91C1C',
  errorGlow: 'rgba(220, 38, 38, 0.15)',
  errorSoft: 'rgba(220, 38, 38, 0.10)',
  danger: '#DC2626',

  // Macro colors - Slightly deeper for readability on light
  protein: '#3B82F6',
  proteinEnd: '#2563EB',
  proteinGlow: 'rgba(59, 130, 246, 0.15)',

  carbs: '#F59E0B',
  carbsEnd: '#D97706',
  carbsGlow: 'rgba(245, 158, 11, 0.15)',

  fat: '#EF4444',
  fatEnd: '#DC2626',
  fatGlow: 'rgba(239, 68, 68, 0.15)',

  // Text colors - Dark text on light backgrounds
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textMuted: '#D1D5DB',

  // Tab bar - Light frosted glass
  tabBarBackground: 'rgba(255, 255, 255, 0.85)',
  tabBarActive: '#00D4FF',
  tabBarInactive: '#9CA3AF',

  // Borders - Subtle on light
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderAccent: 'rgba(0, 212, 255, 0.3)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  // Gold / XP / Streaks
  gold: '#D4A017',
  goldDim: '#B8860B',
  goldGlow: 'rgba(212, 160, 23, 0.15)',
  goldSoft: 'rgba(212, 160, 23, 0.10)',

  // Meal type colors
  mealBreakfast: '#D4A017',
  mealLunch: '#059669',
  mealDinner: '#9333EA',
  mealSnacks: '#D97706',

  // Fasting
  fasting: '#D97706',
  fastingLight: 'rgba(217, 119, 6, 0.10)',

  // Chef palette
  chef: '#FFF7ED',
  chefAccent: '#D97706',

  // Accent purple
  accentPurple: '#9333EA',

  // Card colors
  card: '#FFFFFF',
  cardHover: '#F0F0F2',
  cardBorder: 'rgba(0, 0, 0, 0.06)',

  // Form inputs (light mode)
  inputBackground: '#F3F4F6',
  inputBorder: '#E5E7EB',
  inputPlaceholder: '#9CA3AF',
  inputIcon: '#6B7280',

  // OAuth buttons
  oauthGoogleBg: '#FFFFFF',
  oauthGoogleText: '#000000',
  oauthAppleBg: '#000000',
  oauthAppleText: '#FFFFFF',
  oauthAppleBorder: '#000000',

  // Accessibility - focus indicators
  focusRing: '#1A1A1A',
  focusRingOffset: '#FFFFFF',

  // Extra light-mode keys
  textInverse: '#FFFFFF',
} as const;

// Gradient presets for LinearGradient
export const Gradients = {
  // Background gradients
  background: ['#0A0A0C', '#12121A'],
  backgroundRadial: ['#1A1A22', '#0A0A0C'],

  // Card gradients (glass effect)
  card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
  cardHover: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.04)'],
  cardDark: ['rgba(22, 22, 26, 0.9)', 'rgba(16, 16, 20, 0.95)'],

  // Accent gradients
  primary: ['#00D4FF', '#0099CC'],
  primarySoft: ['rgba(0, 212, 255, 0.2)', 'rgba(0, 212, 255, 0.05)'],

  secondary: ['#FF6B35', '#FF8F5A'],
  secondarySoft: ['rgba(255, 107, 53, 0.2)', 'rgba(255, 107, 53, 0.05)'],

  success: ['#00E676', '#00C853'],
  successSoft: ['rgba(0, 230, 118, 0.2)', 'rgba(0, 230, 118, 0.05)'],

  warning: ['#FFB300', '#FF8F00'],
  warningSoft: ['rgba(255, 179, 0, 0.2)', 'rgba(255, 179, 0, 0.05)'],

  error: ['#FF5252', '#FF1744'],
  errorSoft: ['rgba(255, 82, 82, 0.2)', 'rgba(255, 82, 82, 0.05)'],

  // Macro gradients
  protein: ['#FF6B9D', '#FF8A80'],
  carbs: ['#64D2FF', '#5AC8FA'],
  fat: ['#FFD93D', '#FFC107'],

  // Disabled state
  disabled: ['#555555', '#444444'],

  // Special gradients
  electric: ['#00D4FF', '#7B61FF'],
  sunset: ['#FF6B35', '#FFB347'],
  fire: ['#FF6B35', '#FF453A'],
  ocean: ['#00D4FF', '#00E676'],

  // Header/navigation
  header: ['rgba(10, 10, 12, 0.95)', 'rgba(10, 10, 12, 0.8)'],
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,      // Premium card radius
  xxl: 32,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 32,
  xxxl: 40,
  display: 56,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;

// Font families — loaded via expo-font in _layout.js
// Falls back to system fonts if not loaded yet
import { Platform } from 'react-native';

export const FontFamily = {
  regular: Platform.select({ ios: 'Inter_400Regular', android: 'Inter_400Regular', default: 'System' }),
  medium: Platform.select({ ios: 'Inter_500Medium', android: 'Inter_500Medium', default: 'System' }),
  semibold: Platform.select({ ios: 'Inter_600SemiBold', android: 'Inter_600SemiBold', default: 'System' }),
  bold: Platform.select({ ios: 'Inter_700Bold', android: 'Inter_700Bold', default: 'System' }),
  heavy: Platform.select({ ios: 'Inter_800ExtraBold', android: 'Inter_800ExtraBold', default: 'System' }),
  black: Platform.select({ ios: 'Inter_900Black', android: 'Inter_900Black', default: 'System' }),
} as const;

// Premium shadows with colored glow
export const Shadows = {
  // Standard card shadow
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  // Elevated card shadow
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },

  // Primary colored glow
  glowPrimary: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  // Secondary colored glow
  glowSecondary: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  // Success glow
  glowSuccess: {
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  // Warning glow
  glowWarning: {
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  // Error glow
  glowError: {
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  // Subtle inner shadow effect (for pressed states)
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  // Button shadow
  button: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  // Floating action button
  fab: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

// Light mode shadows - softer, realistic shadows for light backgrounds
export const LightShadows = {
  // Standard card shadow
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Elevated card shadow
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  // Primary colored glow (subtle on light)
  glowPrimary: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Secondary colored glow (subtle on light)
  glowSecondary: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Success glow
  glowSuccess: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Warning glow
  glowWarning: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Error glow
  glowError: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Subtle inner shadow effect (for pressed states)
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },

  // Button shadow
  button: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },

  // Floating action button
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// Animation presets
export const Animation = {
  // Spring configurations
  spring: {
    gentle: { friction: 10, tension: 100 },
    bouncy: { friction: 6, tension: 150 },
    stiff: { friction: 20, tension: 200 },
    slow: { friction: 12, tension: 40 },
  },

  // Timing configurations (in ms)
  timing: {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
  },
} as const;

// Glass effect configuration
export const Glass = {
  blur: 20,
  opacity: 0.1,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
} as const;

// Haptic feedback types
export const HapticType = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  success: 'success',
  warning: 'warning',
  error: 'error',
  selection: 'selection',
} as const;

// ---------------------------------------------------------------------------
// WCAG AAA High Contrast Color Set (all text colors at 7:1+ on #0A0A0C)
// Use this palette when the user enables high-contrast / accessibility mode.
// Mirrors the shape of Colors so it can be swapped in as a drop-in override.
// ---------------------------------------------------------------------------
export const HighContrastColors = {
  ...Colors,

  // Text — all 7:1+ on #0A0A0C for WCAG AAA
  text: '#FFFFFF',              // 19.3:1
  textSecondary: '#C8C8CC',     // ~10.5:1
  textTertiary: '#AEAEB2',     // ~7.8:1
  textMuted: '#8E8E93',        // ~4.5:1 (decorative/non-essential — still AA)

  // Accent colors boosted for text usage at AAA
  primary: '#66E5FF',           // ~8.2:1 on #0A0A0C
  primaryText: '#66E5FF',       // Same — always safe for text
  secondary: '#FFB088',         // ~7.6:1 on #0A0A0C
  secondaryText: '#FFB088',     // Same

  // Semantic colors — AAA-safe on dark bg
  success: '#66FFAA',           // ~9.5:1
  warning: '#FFD166',           // ~9.2:1
  error: '#FF8A8A',             // ~7.1:1

  // Tab bar
  tabBarInactive: '#AEAEB2',   // ~7.8:1

  // Accessibility — focus indicators (unchanged, already max contrast)
  focusRing: '#FFFFFF',
  focusRingOffset: '#000000',
} as const;

// ---------------------------------------------------------------------------
// Reduced motion configuration
// Accessibility code can check this to skip or simplify animations.
// Set disableAnimations to true at runtime when the OS prefers-reduced-motion.
// ---------------------------------------------------------------------------
export const ReducedMotionConfig = {
  disableAnimations: false,
} as { disableAnimations: boolean };

// ---------------------------------------------------------------------------
// Reduced motion animation config helper
// Returns zero-duration animations when the user prefers reduced motion.
// ---------------------------------------------------------------------------
export function getAnimationConfig(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      spring: { duration: 0 },
      timing: { fast: 0, normal: 0, slow: 0, verySlow: 0 },
    };
  }
  return {
    spring: Animation.spring,
    timing: Animation.timing,
  };
}
