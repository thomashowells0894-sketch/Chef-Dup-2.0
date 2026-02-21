/**
 * FuelIQ Nutrition Intelligence Engine
 * Micronutrient tracking, glycemic index, meal timing optimization,
 * ingredient substitution, and nutrition periodization.
 */

// ============================================================================
// MICRONUTRIENT DATABASE
// ============================================================================

interface MicronutrientEntry {
  name: string;
  unit: string;
  male: number;
  female: number;
  ul: number | null;
}

interface MicronutrientRDAEntry extends MicronutrientEntry {
  recommended: number;
}

const MICRONUTRIENT_RDA: Record<string, MicronutrientEntry> = {
  vitaminA: { name: 'Vitamin A', unit: 'mcg', male: 900, female: 700, ul: 3000 },
  vitaminC: { name: 'Vitamin C', unit: 'mg', male: 90, female: 75, ul: 2000 },
  vitaminD: { name: 'Vitamin D', unit: 'mcg', male: 15, female: 15, ul: 100 },
  vitaminE: { name: 'Vitamin E', unit: 'mg', male: 15, female: 15, ul: 1000 },
  vitaminK: { name: 'Vitamin K', unit: 'mcg', male: 120, female: 90, ul: null },
  vitaminB1: { name: 'Thiamin (B1)', unit: 'mg', male: 1.2, female: 1.1, ul: null },
  vitaminB2: { name: 'Riboflavin (B2)', unit: 'mg', male: 1.3, female: 1.1, ul: null },
  vitaminB3: { name: 'Niacin (B3)', unit: 'mg', male: 16, female: 14, ul: 35 },
  vitaminB6: { name: 'Vitamin B6', unit: 'mg', male: 1.3, female: 1.3, ul: 100 },
  vitaminB12: { name: 'Vitamin B12', unit: 'mcg', male: 2.4, female: 2.4, ul: null },
  folate: { name: 'Folate', unit: 'mcg', male: 400, female: 400, ul: 1000 },
  calcium: { name: 'Calcium', unit: 'mg', male: 1000, female: 1000, ul: 2500 },
  iron: { name: 'Iron', unit: 'mg', male: 8, female: 18, ul: 45 },
  magnesium: { name: 'Magnesium', unit: 'mg', male: 420, female: 320, ul: 350 },
  zinc: { name: 'Zinc', unit: 'mg', male: 11, female: 8, ul: 40 },
  potassium: { name: 'Potassium', unit: 'mg', male: 3400, female: 2600, ul: null },
  sodium: { name: 'Sodium', unit: 'mg', male: 1500, female: 1500, ul: 2300 },
  fiber: { name: 'Fiber', unit: 'g', male: 38, female: 25, ul: null },
  omega3: { name: 'Omega-3', unit: 'g', male: 1.6, female: 1.1, ul: null },
};

/**
 * Get micronutrient RDA for a user
 */
function getMicronutrientRDA(gender: string = 'male', age: number = 30): Record<string, MicronutrientRDAEntry> {
  const rda: Record<string, MicronutrientRDAEntry> = {};
  for (const [key, nutrient] of Object.entries(MICRONUTRIENT_RDA)) {
    rda[key] = {
      ...nutrient,
      recommended: gender === 'female' ? nutrient.female : nutrient.male,
    };
  }
  return rda;
}

interface NutrientGapEntry {
  nutrient: string;
  key: string;
  consumed: number;
  recommended: number;
  unit: string;
  percentage: number;
  status: string;
}

interface MicronutrientGapResult {
  gaps: NutrientGapEntry[];
  adequate: NutrientGapEntry[];
  overallScore: number;
}

/**
 * Analyze micronutrient gaps
 */
function analyzeMicronutrientGaps(intake: Record<string, number>, gender: string = 'male'): MicronutrientGapResult {
  const rda: Record<string, MicronutrientRDAEntry> = getMicronutrientRDA(gender);
  const gaps: NutrientGapEntry[] = [];
  const adequate: NutrientGapEntry[] = [];

  for (const [key, nutrient] of Object.entries(rda)) {
    const consumed: number = intake[key] || 0;
    const percentage: number = nutrient.recommended > 0 ? (consumed / nutrient.recommended) * 100 : 0;

    const entry: NutrientGapEntry = {
      nutrient: nutrient.name,
      key,
      consumed: Math.round(consumed * 10) / 10,
      recommended: nutrient.recommended,
      unit: nutrient.unit,
      percentage: Math.round(percentage),
      status: percentage >= 90 ? 'adequate' : percentage >= 50 ? 'low' : 'deficient',
    };

    if (percentage < 90) gaps.push(entry);
    else adequate.push(entry);
  }

  gaps.sort((a: NutrientGapEntry, b: NutrientGapEntry) => a.percentage - b.percentage);
  return { gaps, adequate, overallScore: Math.round(adequate.length / (gaps.length + adequate.length) * 100) };
}

// ============================================================================
// GLYCEMIC INDEX & LOAD
// ============================================================================

interface GIEntry {
  gi: number;
  gl_per_serving: number;
  category: string;
}

interface GILookupResult extends GIEntry {
  food: string;
  matchedTo?: string;
}

const GI_DATABASE: Record<string, GIEntry> = {
  // Low GI (<55)
  'apple': { gi: 36, gl_per_serving: 5, category: 'low' },
  'oatmeal': { gi: 55, gl_per_serving: 13, category: 'low' },
  'sweet potato': { gi: 54, gl_per_serving: 12, category: 'low' },
  'brown rice': { gi: 50, gl_per_serving: 16, category: 'low' },
  'lentils': { gi: 32, gl_per_serving: 5, category: 'low' },
  'greek yogurt': { gi: 11, gl_per_serving: 3, category: 'low' },
  'chickpeas': { gi: 28, gl_per_serving: 8, category: 'low' },
  'quinoa': { gi: 53, gl_per_serving: 13, category: 'low' },
  'berries': { gi: 25, gl_per_serving: 3, category: 'low' },
  // Medium GI (55-69)
  'banana': { gi: 62, gl_per_serving: 16, category: 'medium' },
  'white rice': { gi: 73, gl_per_serving: 23, category: 'high' },
  'whole wheat bread': { gi: 69, gl_per_serving: 9, category: 'medium' },
  'orange juice': { gi: 66, gl_per_serving: 12, category: 'medium' },
  // High GI (>70)
  'white bread': { gi: 75, gl_per_serving: 11, category: 'high' },
  'potato': { gi: 78, gl_per_serving: 15, category: 'high' },
  'cornflakes': { gi: 81, gl_per_serving: 21, category: 'high' },
  'watermelon': { gi: 76, gl_per_serving: 4, category: 'high' },
  'glucose': { gi: 100, gl_per_serving: 10, category: 'high' },
};

function lookupGI(foodName: string): GILookupResult | null {
  if (!foodName) return null;
  const key: string = foodName.toLowerCase().trim();
  // Exact match
  if (GI_DATABASE[key]) return { ...GI_DATABASE[key], food: foodName };
  // Partial match
  for (const [name, data] of Object.entries(GI_DATABASE)) {
    if (key.includes(name) || name.includes(key)) return { ...data, food: foodName, matchedTo: name };
  }
  return null;
}

interface AnalyzedFood {
  name?: string;
  gi: number;
  gl: number;
  category: string;
}

interface DailyGlycemicLoadResult {
  totalGL: number;
  category: string;
  analyzedFoods: AnalyzedFood[];
  recommendation: string;
}

function calculateDailyGlycemicLoad(foods: Array<{ name: string }> | null): DailyGlycemicLoadResult {
  let totalGL: number = 0;
  const analyzed: AnalyzedFood[] = [];
  for (const food of (foods || [])) {
    const gi: GILookupResult | null = lookupGI(food.name);
    if (gi) {
      totalGL += gi.gl_per_serving;
      analyzed.push({ ...food, gi: gi.gi, gl: gi.gl_per_serving, category: gi.category });
    }
  }
  return {
    totalGL,
    category: totalGL < 80 ? 'low' : totalGL < 120 ? 'moderate' : 'high',
    analyzedFoods: analyzed,
    recommendation: totalGL > 120 ? 'Consider swapping high-GI foods for lower-GI alternatives to stabilize blood sugar.' : 'Your glycemic load is within a healthy range.',
  };
}

// ============================================================================
// MEAL TIMING OPTIMIZATION
// ============================================================================

interface MealTimingParams {
  goal?: string;
  workoutTime?: string | null;
  wakeTime?: string;
  sleepTime?: string;
  mealsPerDay?: number;
}

interface MealScheduleEntry {
  meal: string;
  time: string;
  macroFocus: string;
  calPercent: number;
  isOptional?: boolean;
}

interface MealTimingResult {
  schedule: MealScheduleEntry[];
  advice: string[];
}

/**
 * Optimize meal timing based on goals and activity
 */
function optimizeMealTiming(params: MealTimingParams): MealTimingResult {
  const { goal = 'maintain', workoutTime = null, wakeTime = '07:00', sleepTime = '23:00', mealsPerDay = 4 } = params;

  const schedule: MealScheduleEntry[] = [];
  const wakeHour: number = parseInt(wakeTime.split(':')[0], 10);
  const sleepHour: number = parseInt(sleepTime.split(':')[0], 10) || 23;
  const activeHours: number = sleepHour > wakeHour ? sleepHour - wakeHour : (24 - wakeHour) + sleepHour;
  const mealInterval: number = Math.floor(activeHours / mealsPerDay);

  for (let i: number = 0; i < mealsPerDay; i++) {
    const hour: number = (wakeHour + 1 + (i * mealInterval)) % 24;
    const mealType: string = i === 0 ? 'Breakfast' : i === mealsPerDay - 1 ? 'Dinner' : i === 1 ? 'Lunch' : 'Snack';
    const macroFocus: string = getMacroFocus(goal, i, mealsPerDay, workoutTime, hour);

    schedule.push({
      meal: mealType,
      time: `${String(hour).padStart(2, '0')}:00`,
      macroFocus,
      calPercent: getCalorieDistribution(goal, i, mealsPerDay),
    });
  }

  // Add pre/post workout if workout time specified
  if (workoutTime) {
    const workoutHour: number = parseInt(workoutTime.split(':')[0], 10);
    schedule.push({
      meal: 'Pre-Workout',
      time: `${String(Math.max(0, workoutHour - 1)).padStart(2, '0')}:30`,
      macroFocus: 'Carbs + moderate protein for energy',
      calPercent: 10,
      isOptional: true,
    });
    schedule.push({
      meal: 'Post-Workout',
      time: `${String((workoutHour + 1) % 24).padStart(2, '0')}:00`,
      macroFocus: 'Protein + fast carbs for recovery',
      calPercent: 15,
      isOptional: true,
    });
  }

  schedule.sort((a: MealScheduleEntry, b: MealScheduleEntry) => a.time.localeCompare(b.time));
  return { schedule, advice: getMealTimingAdvice(goal) };
}

function getMacroFocus(goal: string, mealIndex: number, totalMeals: number, workoutTime: string | null, hour: number): string {
  if (goal === 'lose') {
    if (mealIndex === 0) return 'High protein + healthy fats for satiety';
    if (mealIndex === totalMeals - 1) return 'Lean protein + vegetables';
    return 'Balanced with emphasis on protein';
  }
  if (goal === 'gain') {
    if (mealIndex === 0) return 'High carbs + protein for energy';
    if (mealIndex === totalMeals - 1) return 'Protein + slow carbs + fats';
    return 'Calorie-dense with protein priority';
  }
  return 'Balanced macros';
}

function getCalorieDistribution(goal: string, mealIndex: number, totalMeals: number): number {
  if (totalMeals === 3) return mealIndex === 0 ? 30 : mealIndex === 1 ? 40 : 30;
  if (totalMeals === 4) return mealIndex === 0 ? 25 : mealIndex === 1 ? 30 : mealIndex === 2 ? 10 : 35;
  return Math.round(100 / totalMeals);
}

function getMealTimingAdvice(goal: string): string[] {
  const advice: string[] = [];
  advice.push('Eat within 1 hour of waking to kickstart metabolism');
  advice.push('Stop eating 2-3 hours before bedtime for better sleep');
  if (goal === 'lose') advice.push('Front-load calories earlier in the day');
  if (goal === 'gain') advice.push('Distribute calories evenly, eat a larger dinner');
  advice.push('Consume protein within 2 hours of training for optimal recovery');
  return advice;
}

// ============================================================================
// INGREDIENT SUBSTITUTIONS
// ============================================================================

interface SubstitutionEntry {
  name: string;
  calories: number;
  protein: number;
  reason: string;
  tags: string[];
}

const SUBSTITUTIONS: Record<string, SubstitutionEntry[]> = {
  'white rice': [
    { name: 'Cauliflower Rice', calories: -180, protein: 0, reason: '80% fewer calories', tags: ['low-carb', 'keto'] },
    { name: 'Quinoa', calories: -30, protein: +4, reason: 'Complete protein, more fiber', tags: ['high-protein'] },
    { name: 'Brown Rice', calories: 0, protein: 0, reason: 'More fiber and nutrients', tags: ['whole-grain'] },
  ],
  'white bread': [
    { name: 'Ezekiel Bread', calories: -20, protein: +2, reason: 'Sprouted grains, more protein', tags: ['whole-grain'] },
    { name: 'Lettuce Wrap', calories: -90, protein: 0, reason: 'Minimal calories', tags: ['low-carb', 'keto'] },
    { name: 'Whole Wheat Bread', calories: -10, protein: +1, reason: 'More fiber', tags: ['whole-grain'] },
  ],
  'pasta': [
    { name: 'Zucchini Noodles', calories: -170, protein: 0, reason: '80% fewer calories', tags: ['low-carb', 'keto'] },
    { name: 'Chickpea Pasta', calories: -20, protein: +8, reason: 'Double the protein and fiber', tags: ['high-protein', 'gluten-free'] },
    { name: 'Whole Wheat Pasta', calories: -10, protein: +2, reason: 'More fiber and nutrients', tags: ['whole-grain'] },
  ],
  'sugar': [
    { name: 'Stevia', calories: -16, protein: 0, reason: 'Zero calories', tags: ['sugar-free', 'keto'] },
    { name: 'Monk Fruit', calories: -16, protein: 0, reason: 'Zero calories, natural', tags: ['sugar-free', 'natural'] },
    { name: 'Honey', calories: -1, protein: 0, reason: 'Natural antioxidants', tags: ['natural'] },
  ],
  'butter': [
    { name: 'Avocado', calories: -30, protein: 0, reason: 'Heart-healthy fats', tags: ['heart-healthy'] },
    { name: 'Greek Yogurt', calories: -80, protein: +5, reason: 'Fewer calories, more protein', tags: ['high-protein'] },
    { name: 'Ghee', calories: 0, protein: 0, reason: 'Lactose-free, higher smoke point', tags: ['lactose-free'] },
  ],
  'sour cream': [
    { name: 'Greek Yogurt', calories: -40, protein: +8, reason: 'Half the calories, 4x protein', tags: ['high-protein'] },
    { name: 'Cottage Cheese', calories: -30, protein: +10, reason: 'Much more protein', tags: ['high-protein'] },
  ],
  'mayo': [
    { name: 'Avocado', calories: -50, protein: 0, reason: 'Heart-healthy fats', tags: ['heart-healthy'] },
    { name: 'Greek Yogurt', calories: -70, protein: +5, reason: '75% fewer calories', tags: ['low-fat'] },
    { name: 'Hummus', calories: -50, protein: +2, reason: 'Fewer calories, more fiber', tags: ['plant-based'] },
  ],
};

function getSubstitutions(ingredient: string): SubstitutionEntry[] {
  if (!ingredient) return [];
  const key: string = ingredient.toLowerCase().trim();
  return SUBSTITUTIONS[key] || [];
}

// ============================================================================
// NUTRITION PERIODIZATION
// ============================================================================

interface CalorieCyclingDay {
  day: string;
  dayIndex: number;
  isTraining: boolean;
  calories: number;
  macroFocus: string;
  type: string;
}

interface CalorieCyclingPlan {
  weekPlan: CalorieCyclingDay[];
  totalWeekly: number;
  weeklyAvg: number;
  baseCalories: number;
}

/**
 * Generate calorie cycling plan
 */
function generateCalorieCyclingPlan(baseCalories: number, goal: string, trainingDays: number[] = [1, 3, 5]): CalorieCyclingPlan {
  const weekPlan: CalorieCyclingDay[] = [];
  const dayNames: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let day: number = 0; day < 7; day++) {
    const isTraining: boolean = trainingDays.includes(day);
    let calories: number;
    let macroFocus: string;

    if (goal === 'lose') {
      calories = isTraining ? baseCalories : Math.round(baseCalories * 0.8);
      macroFocus = isTraining ? 'Higher carbs for performance' : 'Higher fats, lower carbs';
    } else if (goal === 'gain') {
      calories = isTraining ? Math.round(baseCalories * 1.15) : baseCalories;
      macroFocus = isTraining ? 'Surplus carbs for growth' : 'Maintenance with moderate carbs';
    } else {
      calories = baseCalories;
      macroFocus = 'Balanced';
    }

    weekPlan.push({
      day: dayNames[day],
      dayIndex: day,
      isTraining,
      calories,
      macroFocus,
      type: isTraining ? 'training' : 'rest',
    });
  }

  const totalWeekly: number = weekPlan.reduce((s: number, d: CalorieCyclingDay) => s + d.calories, 0);
  const weeklyAvg: number = Math.round(totalWeekly / 7);

  return { weekPlan, totalWeekly, weeklyAvg, baseCalories };
}

export {
  MICRONUTRIENT_RDA,
  getMicronutrientRDA,
  analyzeMicronutrientGaps,
  GI_DATABASE,
  lookupGI,
  calculateDailyGlycemicLoad,
  optimizeMealTiming,
  SUBSTITUTIONS,
  getSubstitutions,
  generateCalorieCyclingPlan,
};
