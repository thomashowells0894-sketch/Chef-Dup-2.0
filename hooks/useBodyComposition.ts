import { useMemo } from 'react';
import { useProfile, ACTIVITY_LEVELS } from '../context/ProfileContext';
import useBodyMeasurements from './useBodyMeasurements';

/**
 * Body fat category thresholds by gender
 * Based on ACE (American Council on Exercise) body fat norms
 */
interface BodyFatCategory {
  max: number;
  label: string;
  color: string;
}

interface BMICategory {
  label: string;
  color: string;
}

interface MuscleGainLevel {
  min: number;
  max: number;
  label: string;
}

interface MuscleGainPotential {
  beginner: MuscleGainLevel;
  intermediate: MuscleGainLevel;
  advanced: MuscleGainLevel;
  maxLeanPotential: number;
}

interface IdealWeightRange {
  min: number;
  max: number;
}

interface BodyComposition {
  bmi: number | null;
  bmiCategory: BMICategory | null;
  bodyFatPercentage: number | null;
  bodyFatCategory: BodyFatCategory | null;
  leanBodyMass: number | null;
  fatMass: number | null;
  bmr: number | null;
  tdee: number | null;
  idealWeightRange: IdealWeightRange | null;
  muscleGainPotential: MuscleGainPotential | null;
  waterWeight: number | null;
  hasMeasurements: boolean;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: string | null;
  activityLevel: string | null;
}

const BODY_FAT_CATEGORIES_MALE: BodyFatCategory[] = [
  { max: 5, label: 'Essential', color: '#FF5252' },
  { max: 13, label: 'Athletic', color: '#00E676' },
  { max: 17, label: 'Fitness', color: '#00D4FF' },
  { max: 24, label: 'Average', color: '#FFB300' },
  { max: Infinity, label: 'Obese', color: '#FF5252' },
];

const BODY_FAT_CATEGORIES_FEMALE: BodyFatCategory[] = [
  { max: 13, label: 'Essential', color: '#FF5252' },
  { max: 20, label: 'Athletic', color: '#00E676' },
  { max: 24, label: 'Fitness', color: '#00D4FF' },
  { max: 31, label: 'Average', color: '#FFB300' },
  { max: Infinity, label: 'Obese', color: '#FF5252' },
];

/**
 * BMI category thresholds
 */
function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return { label: 'Underweight', color: '#64D2FF' };
  if (bmi < 25) return { label: 'Normal', color: '#00E676' };
  if (bmi < 30) return { label: 'Overweight', color: '#FFB300' };
  return { label: 'Obese', color: '#FF5252' };
}

/**
 * Get body fat category based on percentage and gender
 */
function getBodyFatCategory(bodyFat: number, gender: string | null): BodyFatCategory {
  const categories = gender === 'female' ? BODY_FAT_CATEGORIES_FEMALE : BODY_FAT_CATEGORIES_MALE;
  for (const cat of categories) {
    if (bodyFat <= cat.max) return cat;
  }
  return categories[categories.length - 1];
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * Male: (10 x weight_kg) + (6.25 x height_cm) - (5 x age) + 5
 * Female: (10 x weight_kg) + (6.25 x height_cm) - (5 x age) - 161
 */
function calculateBMR(weightLbs: number | null, heightInches: number | null, age: number | null, gender: string | null): number | null {
  if (!weightLbs || !heightInches || !age) return null;
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'male' ? baseBMR + 5 : baseBMR - 161);
}

/**
 * Calculate body fat percentage using US Navy method
 * Male: 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76
 * Female: 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387
 * All measurements in inches
 */
function calculateBodyFat(waist: number | null, neck: number | null, height: number | null, hip: number | null, gender: string | null): number | null {
  if (!waist || !neck || !height) return null;
  if (gender === 'female' && !hip) return null;

  const waistVal = parseFloat(waist as unknown as string);
  const neckVal = parseFloat(neck as unknown as string);
  const heightVal = parseFloat(height as unknown as string);
  const hipVal = hip ? parseFloat(hip as unknown as string) : 0;

  if (isNaN(waistVal) || isNaN(neckVal) || isNaN(heightVal)) return null;
  if (gender === 'female' && isNaN(hipVal)) return null;

  // Ensure valid values for logarithm
  if (gender === 'male') {
    const diff = waistVal - neckVal;
    if (diff <= 0 || heightVal <= 0) return null;
    const bf = 86.010 * Math.log10(diff) - 70.041 * Math.log10(heightVal) + 36.76;
    return Math.max(0, Math.min(60, parseFloat(bf.toFixed(1))));
  } else {
    const sum = waistVal + hipVal - neckVal;
    if (sum <= 0 || heightVal <= 0) return null;
    const bf = 163.205 * Math.log10(sum) - 97.684 * Math.log10(heightVal) - 78.387;
    return Math.max(0, Math.min(60, parseFloat(bf.toFixed(1))));
  }
}

/**
 * Alan Aragon model for muscle gain potential (lbs per month)
 * Beginner: 1-1.5% of body weight per month
 * Intermediate: 0.5-1% per month
 * Advanced: 0.25-0.5% per month
 */
function getMuscleGainPotential(weightLbs: number | null, heightInches: number | null): MuscleGainPotential | null {
  if (!weightLbs || !heightInches) return null;

  // Approximate potential based on height (taller = more lean mass potential)
  const heightCm = heightInches * 2.54;
  // Casey Butt's maximum muscular potential simplified
  const maxLeanMass = (heightCm - 100) * 2.2; // rough max lean mass in lbs

  return {
    beginner: { min: parseFloat((weightLbs * 0.01).toFixed(1)), max: parseFloat((weightLbs * 0.015).toFixed(1)), label: 'Beginner (0-1 yr)' },
    intermediate: { min: parseFloat((weightLbs * 0.005).toFixed(1)), max: parseFloat((weightLbs * 0.01).toFixed(1)), label: 'Intermediate (1-3 yr)' },
    advanced: { min: parseFloat((weightLbs * 0.0025).toFixed(1)), max: parseFloat((weightLbs * 0.005).toFixed(1)), label: 'Advanced (3+ yr)' },
    maxLeanPotential: Math.round(maxLeanMass),
  };
}

export default function useBodyComposition(): BodyComposition {
  const { profile } = useProfile();
  const bodyMeasurements = useBodyMeasurements();

  // Extract latest measurements if available
  let measurements: { waist: number | undefined; hip: number | undefined; neck: number | undefined; unit: string } | null = null;
  try {
    const latest = bodyMeasurements.getLatest();
    if (latest && latest.measurements) {
      measurements = {
        waist: latest.measurements.waist,
        hip: latest.measurements.hips,
        neck: latest.measurements.neck,
        unit: bodyMeasurements.unit,
      };
    }
  } catch {
    // Measurements not available
  }

  const composition = useMemo((): BodyComposition => {
    const { weight, height, age, gender, activityLevel } = profile;

    // Convert measurements to inches if they are in cm
    let waistInches: number | null = measurements?.waist ? parseFloat(measurements.waist as unknown as string) : null;
    let hipInches: number | null = measurements?.hip ? parseFloat(measurements.hip as unknown as string) : null;
    let neckInches: number | null = measurements?.neck ? parseFloat(measurements.neck as unknown as string) : null;

    if (measurements?.unit === 'cm') {
      if (waistInches) waistInches = waistInches * 0.393701;
      if (hipInches) hipInches = hipInches * 0.393701;
      if (neckInches) neckInches = neckInches * 0.393701;
    }

    // -- BMI --
    let bmi: number | null = null;
    let bmiCategory: BMICategory | null = null;
    if (weight && height) {
      // weight is in lbs, height is in inches
      const weightKg = weight * 0.453592;
      const heightM = height * 0.0254;
      bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
      bmiCategory = getBMICategory(bmi);
    }

    // -- Body Fat Percentage (US Navy Method) --
    const bodyFatPercentage = calculateBodyFat(waistInches, neckInches, height, hipInches, gender);

    // -- Body Fat Category --
    const bodyFatCategory: BodyFatCategory | null = bodyFatPercentage !== null
      ? getBodyFatCategory(bodyFatPercentage, gender)
      : null;

    // -- Lean Body Mass & Fat Mass --
    let leanBodyMass: number | null = null;
    let fatMass: number | null = null;
    if (weight && bodyFatPercentage !== null) {
      fatMass = parseFloat((weight * (bodyFatPercentage / 100)).toFixed(1));
      leanBodyMass = parseFloat((weight * (1 - bodyFatPercentage / 100)).toFixed(1));
    }

    // -- BMR (Mifflin-St Jeor) --
    const bmr = calculateBMR(weight, height, age, gender);

    // -- TDEE --
    let tdee: number | null = null;
    if (bmr) {
      const multiplier = ACTIVITY_LEVELS[activityLevel as string]?.multiplier || 1.55;
      tdee = Math.round(bmr * multiplier);
    }

    // -- Ideal Weight Range (based on BMI 18.5 - 24.9) --
    let idealWeightRange: IdealWeightRange | null = null;
    if (height) {
      const heightM = height * 0.0254;
      const minKg = 18.5 * heightM * heightM;
      const maxKg = 24.9 * heightM * heightM;
      idealWeightRange = {
        min: Math.round(minKg / 0.453592),
        max: Math.round(maxKg / 0.453592),
      };
    }

    // -- Muscle Gain Potential --
    const muscleGainPotential = getMuscleGainPotential(weight, height);

    // -- Water Weight (estimated total body water) --
    let waterWeight: number | null = null;
    if (leanBodyMass !== null) {
      // ~60% of lean mass for males, ~55% for females
      const waterFraction = gender === 'male' ? 0.60 : 0.55;
      waterWeight = parseFloat((leanBodyMass * waterFraction).toFixed(1));
    } else if (weight) {
      // Fallback: ~60% of total weight for males, ~55% for females (rough)
      const waterFraction = gender === 'male' ? 0.60 : 0.55;
      waterWeight = parseFloat((weight * waterFraction).toFixed(1));
    }

    // -- Has measurements --
    const hasMeasurements = bodyFatPercentage !== null;

    return {
      bmi,
      bmiCategory,
      bodyFatPercentage,
      bodyFatCategory,
      leanBodyMass,
      fatMass,
      bmr,
      tdee,
      idealWeightRange,
      muscleGainPotential,
      waterWeight,
      hasMeasurements,
      weight,
      height,
      age,
      gender,
      activityLevel,
    };
  }, [profile, measurements]);

  return composition;
}
