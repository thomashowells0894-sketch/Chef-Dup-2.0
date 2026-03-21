const ACTIVITY_OPTIONS = [
  { id: 'sedentary', multiplier: 1.2 },
  { id: 'light', multiplier: 1.375 },
  { id: 'moderate', multiplier: 1.55 },
  { id: 'active', multiplier: 1.725 },
  { id: 'extreme', multiplier: 1.9 },
];

export const ONBOARDING_STEP_COUNT = 3;

export function sanitizeIntegerInput(value, maxLength = 3) {
  return String(value || '')
    .replace(/[^0-9]/g, '')
    .slice(0, maxLength);
}

export function sanitizeDecimalInput(value, maxLength = 6) {
  const sanitized = String(value || '').replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  const whole = (parts[0] || '').slice(0, maxLength);

  if (parts.length === 1) {
    return whole;
  }

  const fraction = parts.slice(1).join('').replace(/\./g, '').slice(0, 1);
  return fraction.length > 0 ? `${whole}.${fraction}` : `${whole}.`;
}

export function canContinueOnboardingStep(step, data) {
  switch (step) {
    case 1:
      return !!data?.goal;
    case 2: {
      const hasAge = Number.parseInt(data?.ageStr || '', 10) >= 13;
      const hasWeight = Number.parseFloat(data?.weightRaw || '') > 0;
      const isMetric = data?.heightUnit === 'cm';
      const hasHeight = isMetric
        ? Number.parseInt(data?.heightCm || '', 10) > 0
        : Number.parseInt(data?.heightFt || '', 10) > 0;
      return hasAge && hasWeight && hasHeight;
    }
    case 3:
      return true;
    default:
      return false;
  }
}

function computeBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'male' ? base + 5 : base - 161);
}

function computeTDEE(bmr, activityId) {
  if (!bmr) return null;
  const option = ACTIVITY_OPTIONS.find((activity) => activity.id === activityId);
  return Math.round(bmr * (option?.multiplier || 1.55));
}

function computeCalorieTarget(tdee, goalId) {
  if (!tdee) return 2000;
  switch (goalId) {
    case 'lose':
      return Math.max(tdee - 500, 1200);
    case 'build':
      return tdee + 300;
    case 'athletic':
      return tdee + 200;
    default:
      return tdee;
  }
}

function computeMacros(calories, goalId) {
  let proteinPct = 0.3;
  let carbsPct = 0.4;
  let fatPct = 0.3;

  if (goalId === 'lose') {
    proteinPct = 0.4;
    carbsPct = 0.3;
  } else if (goalId === 'build') {
    proteinPct = 0.35;
    carbsPct = 0.4;
    fatPct = 0.25;
  } else if (goalId === 'athletic') {
    proteinPct = 0.25;
    carbsPct = 0.5;
    fatPct = 0.25;
  }

  return {
    protein: Math.round((calories * proteinPct) / 4),
    carbs: Math.round((calories * carbsPct) / 4),
    fat: Math.round((calories * fatPct) / 9),
    proteinPct: Math.round(proteinPct * 100),
    carbsPct: Math.round(carbsPct * 100),
    fatPct: Math.round(fatPct * 100),
  };
}

function goalToWeeklyGoal(goalId) {
  switch (goalId) {
    case 'lose':
      return 'lose1';
    case 'build':
      return 'gain05';
    default:
      return 'maintain';
  }
}

function goalToMacroPreset(goalId) {
  switch (goalId) {
    case 'lose':
    case 'build':
      return 'highProtein';
    case 'athletic':
      return 'athletic';
    default:
      return 'balanced';
  }
}

export function buildStarterPlan(data) {
  const isMetric = data?.heightUnit === 'cm';

  let weightKg;
  let heightCm;
  let goalWeightKg = null;

  if (isMetric) {
    weightKg = Number.parseFloat(data?.weightRaw || '') || 75;
    heightCm = Number.parseFloat(data?.heightCm || '') || 170;
    goalWeightKg = data?.goalWeightRaw ? Number.parseFloat(data.goalWeightRaw) || null : null;
  } else {
    const pounds = Number.parseFloat(data?.weightRaw || '') || 165;
    weightKg = pounds * 0.453592;
    const feet = Number.parseInt(data?.heightFt || '5', 10);
    const inches = Number.parseInt(data?.heightIn || '9', 10);
    heightCm = (feet * 12 + inches) * 2.54;
    goalWeightKg = data?.goalWeightRaw
      ? (Number.parseFloat(data.goalWeightRaw) || 0) * 0.453592
      : null;
  }

  const age = Number.parseInt(data?.ageStr || '30', 10);
  const gender = data?.gender === 'female' ? 'female' : 'male';
  const bmr = computeBMR(weightKg, heightCm, age, gender);
  const tdee = computeTDEE(bmr, data?.activityLevel || 'moderate');
  const calories = computeCalorieTarget(tdee, data?.goal || 'maintain');
  const macros = computeMacros(calories, data?.goal || 'maintain');
  const weeklyGoal = goalToWeeklyGoal(data?.goal);
  const macroPreset = goalToMacroPreset(data?.goal);
  const weightLbs = Math.round((weightKg / 0.453592) * 10) / 10;
  const heightInches = Math.round((heightCm / 2.54) * 10) / 10;
  const goalWeightLbs = goalWeightKg
    ? Math.round((goalWeightKg / 0.453592) * 10) / 10
    : null;

  return {
    bmr,
    tdee,
    calories,
    macros,
    weightKg,
    heightCm,
    age,
    gender,
    profileUpdates: {
      weight: weightLbs,
      height: heightInches,
      age,
      gender,
      activityLevel: data?.activityLevel || 'moderate',
      goalWeight: goalWeightLbs,
      weeklyGoal,
      macroPreset,
      weightUnit: isMetric ? 'kg' : 'lbs',
      dietaryRestrictions: [],
      equipment: [],
      customMacros: {
        protein: macros.proteinPct,
        carbs: macros.carbsPct,
        fat: macros.fatPct,
      },
    },
    onboardingData: {
      goal: data?.goal || 'maintain',
      activityLevel: data?.activityLevel || 'moderate',
      enableMealReminders: data?.enableMealReminders !== false,
      enableWorkoutReminders: data?.enableWorkoutReminders !== false,
      enableStreakWarnings: data?.enableStreakWarnings !== false,
      enableAI: data?.enableAI !== false,
      waterGoal: data?.waterGoal || 2500,
      deferredSetup: true,
      setupVersion: 'streamlined-v1',
    },
  };
}
