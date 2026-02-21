/**
 * FuelIQ Biometric Intelligence Platform
 * Heart rate zones, GPS route tracking, real-time biometric dashboard,
 * smart notifications based on biometrics, and connected device management.
 */

// ============================================================================
// TYPES
// ============================================================================

interface HRZone {
  zone: number;
  name: string;
  minPercent: number;
  maxPercent: number;
  minBPM: number;
  maxBPM: number;
  color: string;
  description: string;
  benefits: string;
  feelDescription: string;
  calorieMultiplier: number;
}

interface VO2MaxCategory {
  max: number;
  level: string;
}

interface VO2MaxResult {
  level: string;
  vo2max: number;
  percentile: number;
}

interface WorkoutEntry {
  trimp?: number;
  load?: number;
}

interface TrainingLoadAnalysis {
  totalLoad: number;
  avgLoad: number;
  maxLoad?: number;
  minLoad?: number;
  distribution: string;
  recommendation: string;
  sessionCount?: number;
}

interface GPSPoint {
  lat: number;
  lon: number;
  elevation?: number;
  timestamp?: string | number | Date;
}

interface RouteStats {
  totalDistanceM: number;
  totalDistanceKm: number;
  totalDistanceMiles: number;
  totalElevationGain: number;
  totalElevationLoss: number;
  maxElevation: number | null;
  minElevation: number | null;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  durationSeconds: number;
  paceMinPerKm: number;
  paceFormatted: string;
  pointCount: number;
}

interface BiometricData {
  heartRate?: number;
  restingHR?: number;
  steps?: number;
  activeMinutes?: number;
  sleepHours?: number;
  weight?: number;
  previousWeight?: number;
  hydrationPercent?: number;
}

interface BiometricAlert {
  type: 'warning' | 'success' | 'info';
  category: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
}

interface SupportedDevice {
  id: string;
  name: string;
  platform: string;
  protocol: string;
  icon: string;
}

// ============================================================================
// HEART RATE ZONES
// ============================================================================

/**
 * Calculate heart rate zones using Karvonen method
 */
function calculateHRZones(age: number, restingHR: number = 60): HRZone[] {
  const maxHR: number = 220 - age;
  const hrReserve: number = maxHR - restingHR;

  return [
    {
      zone: 1,
      name: 'Recovery',
      minPercent: 50,
      maxPercent: 60,
      minBPM: Math.round(restingHR + hrReserve * 0.50),
      maxBPM: Math.round(restingHR + hrReserve * 0.60),
      color: '#64D2FF',
      description: 'Very light effort. Warm-up, cool-down, active recovery.',
      benefits: 'Improves overall health, recovery between intervals',
      feelDescription: 'Easy conversation, minimal exertion',
      calorieMultiplier: 0.6,
    },
    {
      zone: 2,
      name: 'Fat Burn',
      minPercent: 60,
      maxPercent: 70,
      minBPM: Math.round(restingHR + hrReserve * 0.60),
      maxBPM: Math.round(restingHR + hrReserve * 0.70),
      color: '#00E676',
      description: 'Light effort. Primary fat-burning zone.',
      benefits: 'Burns fat efficiently, builds aerobic base',
      feelDescription: 'Can hold conversation, breathing slightly elevated',
      calorieMultiplier: 0.8,
    },
    {
      zone: 3,
      name: 'Aerobic',
      minPercent: 70,
      maxPercent: 80,
      minBPM: Math.round(restingHR + hrReserve * 0.70),
      maxBPM: Math.round(restingHR + hrReserve * 0.80),
      color: '#FFB300',
      description: 'Moderate effort. Improves cardiovascular fitness.',
      benefits: 'Strengthens heart, improves endurance',
      feelDescription: 'Conversation becomes difficult, moderate breathing',
      calorieMultiplier: 1.0,
    },
    {
      zone: 4,
      name: 'Threshold',
      minPercent: 80,
      maxPercent: 90,
      minBPM: Math.round(restingHR + hrReserve * 0.80),
      maxBPM: Math.round(restingHR + hrReserve * 0.90),
      color: '#FF6B35',
      description: 'Hard effort. Lactate threshold training.',
      benefits: 'Increases speed endurance, raises lactate threshold',
      feelDescription: 'Can only speak in short phrases, heavy breathing',
      calorieMultiplier: 1.3,
    },
    {
      zone: 5,
      name: 'VO2 Max',
      minPercent: 90,
      maxPercent: 100,
      minBPM: Math.round(restingHR + hrReserve * 0.90),
      maxBPM: maxHR,
      color: '#FF5252',
      description: 'Maximum effort. Peak performance zone.',
      benefits: 'Develops speed and power, increases VO2 max',
      feelDescription: 'Cannot speak, all-out effort, gasping for breath',
      calorieMultiplier: 1.6,
    },
  ];
}

/**
 * Determine current HR zone from heart rate
 */
function getCurrentHRZone(heartRate: number, age: number, restingHR: number = 60): HRZone {
  const zones: HRZone[] = calculateHRZones(age, restingHR);
  for (let i = zones.length - 1; i >= 0; i--) {
    if (heartRate >= zones[i].minBPM) return zones[i];
  }
  return zones[0];
}

/**
 * Calculate calories burned using HR
 */
function calculateCaloriesFromHR(heartRate: number, duration: number, weight: number, age: number, gender: string): number {
  if (!heartRate || !duration || !weight || !age) return 0;
  const weightKg: number = weight * 0.453592;
  const durationHours: number = duration / 60;

  if (gender === 'male') {
    return Math.round(((-55.0969 + (0.6309 * heartRate) + (0.1988 * weightKg) + (0.2017 * age)) / 4.184) * 60 * durationHours);
  }
  return Math.round(((-20.4022 + (0.4472 * heartRate) + (0.1263 * weightKg) + (0.074 * age)) / 4.184) * 60 * durationHours);
}

// ============================================================================
// VO2 MAX ESTIMATION
// ============================================================================

/**
 * Estimate VO2 Max from resting heart rate (Uth et al. method)
 */
function estimateVO2Max(maxHR: number, restingHR: number): number | null {
  if (!maxHR || !restingHR) return null;
  const vo2max: number = 15.3 * (maxHR / restingHR);
  return Math.round(vo2max * 10) / 10;
}

/**
 * Get VO2 Max fitness level
 */
function getVO2MaxLevel(vo2max: number, age: number, gender: string): VO2MaxResult | null {
  if (!vo2max) return null;

  // Simplified Cooper categories
  const categories: VO2MaxCategory[] = gender === 'male'
    ? [
        { max: 25, level: 'Very Poor' },
        { max: 33, level: 'Poor' },
        { max: 42, level: 'Fair' },
        { max: 52, level: 'Good' },
        { max: 58, level: 'Excellent' },
        { max: 999, level: 'Superior' },
      ]
    : [
        { max: 24, level: 'Very Poor' },
        { max: 30, level: 'Poor' },
        { max: 38, level: 'Fair' },
        { max: 45, level: 'Good' },
        { max: 52, level: 'Excellent' },
        { max: 999, level: 'Superior' },
      ];

  const category: VO2MaxCategory = categories.find((c: VO2MaxCategory) => vo2max <= c.max) || categories[categories.length - 1];
  return { level: category.level, vo2max, percentile: Math.min(99, Math.round((vo2max / 60) * 100)) };
}

// ============================================================================
// TRAINING LOAD & READINESS
// ============================================================================

/**
 * Calculate training load (TRIMP - Training Impulse)
 */
function calculateTRIMP(avgHR: number, duration: number, restingHR: number, maxHR: number, gender: string): number {
  if (!avgHR || !duration || !restingHR || !maxHR) return 0;
  const hrReserve: number = (avgHR - restingHR) / (maxHR - restingHR);
  const genderFactor: number = gender === 'male' ? 1.92 : 1.67;
  const exponent: number = gender === 'male' ? 1.92 : 1.67;
  return Math.round(duration * hrReserve * 0.64 * Math.exp(exponent * hrReserve));
}

/**
 * Analyze weekly training load distribution
 */
function analyzeTrainingLoad(weeklyWorkouts: WorkoutEntry[]): TrainingLoadAnalysis {
  if (!weeklyWorkouts || weeklyWorkouts.length === 0) {
    return { totalLoad: 0, avgLoad: 0, distribution: 'none', recommendation: 'Start with 2-3 moderate sessions per week' };
  }

  const loads: number[] = weeklyWorkouts.map((w: WorkoutEntry) => w.trimp || w.load || 0);
  const totalLoad: number = loads.reduce((s: number, l: number) => s + l, 0);
  const avgLoad: number = Math.round(totalLoad / loads.length);
  const maxLoad: number = Math.max(...loads);
  const minLoad: number = Math.min(...loads);
  const loadVariance: number = maxLoad - minLoad;

  let distribution: string, recommendation: string;
  if (loadVariance < avgLoad * 0.3) {
    distribution = 'polarized';
    recommendation = 'Consider adding variety with one hard session and more easy sessions (80/20 rule)';
  } else if (loads.filter((l: number) => l > avgLoad * 1.5).length > loads.length * 0.5) {
    distribution = 'overloaded';
    recommendation = 'High intensity too frequent. Add more recovery days to prevent burnout';
  } else {
    distribution = 'balanced';
    recommendation = 'Good training load distribution. Keep it up!';
  }

  return { totalLoad, avgLoad, maxLoad, minLoad, distribution, recommendation, sessionCount: weeklyWorkouts.length };
}

// ============================================================================
// GPS & ROUTE TRACKING
// ============================================================================

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R: number = 6371000; // Earth radius in meters
  const dLat: number = toRad(lat2 - lat1);
  const dLon: number = toRad(lon2 - lon1);
  const a: number = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number { return deg * Math.PI / 180; }

/**
 * Calculate route statistics from GPS points
 */
function calculateRouteStats(gpsPoints: GPSPoint[]): RouteStats | null {
  if (!gpsPoints || gpsPoints.length < 2) return null;

  let totalDistance: number = 0;
  let totalElevationGain: number = 0;
  let totalElevationLoss: number = 0;
  let maxSpeed: number = 0;
  let maxElevation: number = -Infinity;
  let minElevation: number = Infinity;
  const speeds: number[] = [];

  for (let i = 1; i < gpsPoints.length; i++) {
    const prev: GPSPoint = gpsPoints[i - 1];
    const curr: GPSPoint = gpsPoints[i];

    const dist: number = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    totalDistance += dist;

    if (curr.elevation !== undefined && prev.elevation !== undefined) {
      const elevDiff: number = curr.elevation - prev.elevation;
      if (elevDiff > 0) totalElevationGain += elevDiff;
      else totalElevationLoss += Math.abs(elevDiff);
      maxElevation = Math.max(maxElevation, curr.elevation);
      minElevation = Math.min(minElevation, curr.elevation);
    }

    if (curr.timestamp && prev.timestamp) {
      const timeDiff: number = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      if (timeDiff > 0) {
        const speed: number = (dist / timeDiff) * 3.6; // km/h
        speeds.push(speed);
        maxSpeed = Math.max(maxSpeed, speed);
      }
    }
  }

  const avgSpeed: number = speeds.length > 0 ? speeds.reduce((s: number, v: number) => s + v, 0) / speeds.length : 0;
  const duration: number = gpsPoints.length >= 2 && gpsPoints[0].timestamp && gpsPoints[gpsPoints.length - 1].timestamp
    ? (new Date(gpsPoints[gpsPoints.length - 1].timestamp!).getTime() - new Date(gpsPoints[0].timestamp!).getTime()) / 1000
    : 0;

  // Pace (min/km)
  const paceMinPerKm: number = totalDistance > 0 && duration > 0 ? (duration / 60) / (totalDistance / 1000) : 0;

  return {
    totalDistanceM: Math.round(totalDistance),
    totalDistanceKm: Math.round(totalDistance / 100) / 10,
    totalDistanceMiles: Math.round(totalDistance / 1609.34 * 100) / 100,
    totalElevationGain: Math.round(totalElevationGain),
    totalElevationLoss: Math.round(totalElevationLoss),
    maxElevation: maxElevation === -Infinity ? null : Math.round(maxElevation),
    minElevation: minElevation === Infinity ? null : Math.round(minElevation),
    avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
    maxSpeedKmh: Math.round(maxSpeed * 10) / 10,
    durationSeconds: Math.round(duration),
    paceMinPerKm: Math.round(paceMinPerKm * 100) / 100,
    paceFormatted: formatPace(paceMinPerKm),
    pointCount: gpsPoints.length,
  };
}

function formatPace(minPerKm: number): string {
  if (!minPerKm || minPerKm <= 0) return '--:--';
  const minutes: number = Math.floor(minPerKm);
  const seconds: number = Math.round((minPerKm - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// ============================================================================
// SMART BIOMETRIC ALERTS
// ============================================================================

/**
 * Generate smart alerts based on biometric data
 */
function generateBiometricAlerts(data: BiometricData | null): BiometricAlert[] {
  const alerts: BiometricAlert[] = [];
  const { heartRate, restingHR, steps, activeMinutes, sleepHours, weight, previousWeight, hydrationPercent } = data || {};

  // Elevated resting HR
  if (restingHR && restingHR > 80) {
    alerts.push({ type: 'warning', category: 'heart', title: 'Elevated Resting HR', body: `Your resting HR is ${restingHR} bpm. This may indicate stress, dehydration, or insufficient recovery.`, priority: 'medium' });
  }

  // Step goal
  if (steps !== undefined) {
    if (steps >= 10000) {
      alerts.push({ type: 'success', category: 'activity', title: 'Step Goal Achieved!', body: `You've hit ${steps.toLocaleString()} steps today. Great job staying active!`, priority: 'low' });
    } else if (steps < 3000) {
      alerts.push({ type: 'info', category: 'activity', title: 'Get Moving', body: `Only ${steps.toLocaleString()} steps so far. Try a 15-minute walk to boost your step count.`, priority: 'medium' });
    }
  }

  // Sleep
  if (sleepHours !== undefined && sleepHours < 6) {
    alerts.push({ type: 'warning', category: 'sleep', title: 'Sleep Deficit', body: `Only ${sleepHours} hours of sleep. Consider lighter training today and prioritize sleep tonight.`, priority: 'high' });
  }

  // Weight change
  if (weight && previousWeight) {
    const change: number = Math.abs(weight - previousWeight);
    if (change > 3) {
      alerts.push({ type: 'info', category: 'weight', title: 'Significant Weight Change', body: `${change.toFixed(1)} lbs change detected. This may be water retention. Stay hydrated and consistent.`, priority: 'medium' });
    }
  }

  // Hydration
  if (hydrationPercent !== undefined && hydrationPercent < 50) {
    alerts.push({ type: 'warning', category: 'hydration', title: 'Low Hydration', body: 'You\'re below 50% of your water goal. Dehydration impacts performance and recovery.', priority: 'high' });
  }

  return alerts.sort((a: BiometricAlert, b: BiometricAlert) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });
}

// ============================================================================
// DEVICE MANAGEMENT
// ============================================================================

const SUPPORTED_DEVICES: SupportedDevice[] = [
  { id: 'apple_watch', name: 'Apple Watch', platform: 'ios', protocol: 'healthkit', icon: '\u231A' },
  { id: 'google_fit', name: 'Google Fit', platform: 'android', protocol: 'google_fit', icon: '\uD83D\uDCF1' },
  { id: 'fitbit', name: 'Fitbit', platform: 'both', protocol: 'oauth2', icon: '\u231A' },
  { id: 'garmin', name: 'Garmin', platform: 'both', protocol: 'oauth2', icon: '\u231A' },
  { id: 'whoop', name: 'WHOOP', platform: 'both', protocol: 'oauth2', icon: '\uD83D\uDCAA' },
  { id: 'oura', name: 'Oura Ring', platform: 'both', protocol: 'oauth2', icon: '\uD83D\uDC8D' },
  { id: 'polar', name: 'Polar', platform: 'both', protocol: 'oauth2', icon: '\u231A' },
  { id: 'samsung_health', name: 'Samsung Health', platform: 'android', protocol: 'samsung_health', icon: '\uD83D\uDCF1' },
];

function getSupportedDevices(platform: string = 'both'): SupportedDevice[] {
  return SUPPORTED_DEVICES.filter((d: SupportedDevice) => d.platform === 'both' || d.platform === platform);
}

export {
  calculateHRZones,
  getCurrentHRZone,
  calculateCaloriesFromHR,
  estimateVO2Max,
  getVO2MaxLevel,
  calculateTRIMP,
  analyzeTrainingLoad,
  calculateDistance,
  calculateRouteStats,
  generateBiometricAlerts,
  SUPPORTED_DEVICES,
  getSupportedDevices,
};
