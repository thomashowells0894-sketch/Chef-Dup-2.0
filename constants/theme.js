// VibeFit Premium Theme - Apple Design Award Level
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
  primaryDim: '#00A3CC',
  primaryGlow: 'rgba(0, 212, 255, 0.3)',
  primarySoft: 'rgba(0, 212, 255, 0.15)',

  // Secondary accent - Sunset Orange
  secondary: '#FF6B35',
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
  textTertiary: '#6B6B73',
  textMuted: '#4A4A52',

  // Tab bar - Frosted glass
  tabBarBackground: 'rgba(22, 22, 26, 0.85)',
  tabBarActive: '#00D4FF',
  tabBarInactive: '#6B6B73',

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
};

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
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,      // Premium card radius
  xxl: 32,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 32,
  xxxl: 40,
  display: 56,
};

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
};

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
};

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
};

// Glass effect configuration
export const Glass = {
  blur: 20,
  opacity: 0.1,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
};

// Haptic feedback types
export const HapticType = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  success: 'success',
  warning: 'warning',
  error: 'error',
  selection: 'selection',
};
