
import { UserProfile, Ingredient, MealPlanEntry, WorkoutSession, ShoppingItem, CustomFood, ProgressPhoto, MealType } from '../types';

// Helper to generate namespaced keys
const getKey = (userId: string, key: string) => `chefai_${userId}_${key}`;

const INITIAL_PROFILE: UserProfile = {
  name: 'Guest',
  hasCompletedOnboarding: false,
  
  // Default Biometrics
  age: 30,
  gender: 'male',
  heightCm: 175,
  weightKg: 75,
  activityLevel: 'moderate',
  goal: 'maintain',
  
  // Tracking
  waterIntakeMl: 0,
  waterGoalMl: 2500,
  weightHistory: [],

  // New Advanced Tracking
  fasting: {
      isFasting: false,
      startTime: null,
      targetHours: 16,
      history: []
  },
  streak: {
      currentStreak: 0,
      lastLoginDate: '',
      longestStreak: 0
  },

  // Preferences
  isVegan: false,
  isGlutenFree: false,
  isKeto: false,
  allergies: [],
  
  // Default Goals
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 150,
  dailyCarbGoal: 200,
  dailyFatGoal: 65,
  
  totalSaved: 0.0,
  freeScansRemaining: 3,
  isSubscribed: false,
  badges: [],
  savedRecipeIds: [],
  ratings: {},
  workoutSchedule: {
      'Mon': 'Strength',
      'Tue': 'Cardio',
      'Wed': 'Strength',
      'Thu': 'Rest',
      'Fri': 'Strength',
      'Sat': 'Active Recovery',
      'Sun': 'Rest'
  },
  connectedDevices: []
};

// --- Profile Methods ---

export const getProfile = (userId: string): UserProfile => {
  const stored = localStorage.getItem(getKey(userId, 'profile'));
  let profile = stored ? JSON.parse(stored) : { ...INITIAL_PROFILE };
  
  // Migration check: Ensure new fields exist if loading old data
  if (!profile.waterGoalMl) profile.waterGoalMl = 2500;
  if (!profile.waterIntakeMl) profile.waterIntakeMl = 0;
  if (!profile.weightHistory) profile.weightHistory = [];
  if (!profile.ratings) profile.ratings = {};
  
  // Fasting Migration
  if (!profile.fasting) {
      profile.fasting = {
          isFasting: false,
          startTime: null,
          targetHours: 16,
          history: []
      };
  }

  // Streak Migration & Logic
  if (!profile.streak) {
      profile.streak = {
          currentStreak: 1,
          lastLoginDate: new Date().toISOString().split('T')[0],
          longestStreak: 1
      };
  } else {
      // Check for streak update
      const today = new Date().toISOString().split('T')[0];
      if (profile.streak.lastLoginDate !== today) {
          const lastDate = new Date(profile.streak.lastLoginDate);
          const nowDate = new Date(today);
          const diffTime = Math.abs(nowDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

          if (diffDays === 1) {
              // Perfect streak
              profile.streak.currentStreak += 1;
              if (profile.streak.currentStreak > profile.streak.longestStreak) {
                  profile.streak.longestStreak = profile.streak.currentStreak;
              }
          } else if (diffDays > 1) {
              // Streak broken
              profile.streak.currentStreak = 1;
          }
          // If diffDays === 0, same day login, do nothing
          
          profile.streak.lastLoginDate = today;
          // Save immediately to persist streak update
          localStorage.setItem(getKey(userId, 'profile'), JSON.stringify(profile));
      }
  }
  
  return profile;
};

export const saveProfile = (userId: string, profile: UserProfile): void => {
  localStorage.setItem(getKey(userId, 'profile'), JSON.stringify(profile));
};

export const updateWaterIntake = (userId: string, amount: number): UserProfile => {
    const profile = getProfile(userId);
    profile.waterIntakeMl = Math.max(0, profile.waterIntakeMl + amount);
    saveProfile(userId, profile);
    return profile;
};

// --- Fasting Methods ---

export const toggleFasting = (userId: string): UserProfile => {
    const profile = getProfile(userId);
    const now = Date.now();

    if (profile.fasting.isFasting) {
        // End Fast
        if (profile.fasting.startTime) {
            const duration = (now - profile.fasting.startTime) / (1000 * 60 * 60);
            profile.fasting.history.unshift({
                startTime: profile.fasting.startTime,
                endTime: now,
                durationHours: duration
            });
            // Keep history limited to last 10
            if (profile.fasting.history.length > 10) profile.fasting.history.pop();
        }
        profile.fasting.isFasting = false;
        profile.fasting.startTime = null;
    } else {
        // Start Fast
        profile.fasting.isFasting = true;
        profile.fasting.startTime = now;
    }

    saveProfile(userId, profile);
    return profile;
};

export const setFastingTarget = (userId: string, hours: number): UserProfile => {
    const profile = getProfile(userId);
    profile.fasting.targetHours = hours;
    saveProfile(userId, profile);
    return profile;
};

export const logWeight = (userId: string, weight: number): UserProfile => {
    const profile = getProfile(userId);
    const today = new Date().toISOString().split('T')[0];
    
    // Update current weight
    profile.weightKg = weight;
    
    // Add history entry (overwrite if exists for today)
    const existingIdx = profile.weightHistory.findIndex(w => w.date === today);
    if (existingIdx >= 0) {
        profile.weightHistory[existingIdx].weight = weight;
    } else {
        profile.weightHistory.push({ date: today, weight });
    }
    
    saveProfile(userId, profile);
    return profile;
};

export const updateSavings = (userId: string, amount: number): UserProfile => {
  const profile = getProfile(userId);
  profile.totalSaved += amount;
  
  if (profile.totalSaved > 20 && !profile.badges.includes('Waste Warrior')) {
    profile.badges.push('Waste Warrior');
  }
  if (profile.totalSaved > 100 && !profile.badges.includes('Top Chef')) {
    profile.badges.push('Top Chef');
  }
  
  saveProfile(userId, profile);
  return profile;
};

export const decrementScans = (userId: string): UserProfile => {
  const profile = getProfile(userId);
  if (profile.freeScansRemaining > 0 && !profile.isSubscribed) {
    profile.freeScansRemaining -= 1;
    saveProfile(userId, profile);
  }
  return profile;
};

export const setSubscriptionStatus = (userId: string, isSubscribed: boolean): UserProfile => {
  const profile = getProfile(userId);
  profile.isSubscribed = isSubscribed;
  saveProfile(userId, profile);
  return profile;
};

export const toggleFavorite = (userId: string, recipeId: string): UserProfile => {
  const profile = getProfile(userId);
  if (profile.savedRecipeIds.includes(recipeId)) {
    profile.savedRecipeIds = profile.savedRecipeIds.filter(id => id !== recipeId);
  } else {
    profile.savedRecipeIds.push(recipeId);
  }
  saveProfile(userId, profile);
  return profile;
};

export const rateRecipe = (userId: string, recipeId: string, rating: number): UserProfile => {
  const profile = getProfile(userId);
  if (!profile.ratings) profile.ratings = {};
  profile.ratings[recipeId] = rating;
  saveProfile(userId, profile);
  return profile;
};

export const toggleVegan = (userId: string): UserProfile => {
  const profile = getProfile(userId);
  profile.isVegan = !profile.isVegan;
  saveProfile(userId, profile);
  return profile;
};

export const updatePreferences = (userId: string, updates: Partial<UserProfile>): UserProfile => {
  const profile = getProfile(userId);
  const newProfile = { ...profile, ...updates };
  saveProfile(userId, newProfile);
  return newProfile;
};

export const completeOnboarding = (userId: string, data: Partial<UserProfile>): UserProfile => {
  const profile = getProfile(userId);
  const updated = {
      ...profile,
      ...data,
      hasCompletedOnboarding: true
  };
  saveProfile(userId, updated);
  return updated;
};

// --- Pantry Methods ---

export const getPantry = (userId: string): Ingredient[] => {
    const stored = localStorage.getItem(getKey(userId, 'pantry'));
    return stored ? JSON.parse(stored) : [];
};

export const savePantry = (userId: string, ingredients: Ingredient[]): void => {
    localStorage.setItem(getKey(userId, 'pantry'), JSON.stringify(ingredients));
};

export const addToPantry = (userId: string, newItems: Ingredient[]): Ingredient[] => {
    const current = getPantry(userId);
    // Simple deduplication by name (case insensitive)
    const existingNames = new Set(current.map(i => i.name.toLowerCase()));
    
    const toAdd = newItems.filter(i => !existingNames.has(i.name.toLowerCase()));
    const updated = [...toAdd, ...current]; // Newest first
    
    savePantry(userId, updated);
    return updated;
};

export const removeFromPantry = (userId: string, id: string): Ingredient[] => {
    const current = getPantry(userId);
    const updated = current.filter(i => i.id !== id);
    savePantry(userId, updated);
    return updated;
};

// --- Custom Foods Methods (Feature 2) ---

export const getCustomFoods = (userId: string): CustomFood[] => {
    const stored = localStorage.getItem(getKey(userId, 'custom_foods'));
    return stored ? JSON.parse(stored) : [];
};

export const saveCustomFood = (userId: string, food: CustomFood): void => {
    const foods = getCustomFoods(userId);
    const updated = [...foods, food];
    localStorage.setItem(getKey(userId, 'custom_foods'), JSON.stringify(updated));
};

export const deleteCustomFood = (userId: string, foodId: string): void => {
    const foods = getCustomFoods(userId);
    const updated = foods.filter(f => f.id !== foodId);
    localStorage.setItem(getKey(userId, 'custom_foods'), JSON.stringify(updated));
};

// --- Progress Photos Methods (Feature 3) ---

export const getProgressPhotos = (userId: string): ProgressPhoto[] => {
    const stored = localStorage.getItem(getKey(userId, 'photos'));
    return stored ? JSON.parse(stored) : [];
};

export const saveProgressPhoto = (userId: string, photo: ProgressPhoto): void => {
    const photos = getProgressPhotos(userId);
    // Limit to 20 photos to prevent localStorage quota exceeded
    if (photos.length >= 20) {
        throw new Error("Gallery full. Delete some photos to add more.");
    }
    const updated = [photo, ...photos];
    localStorage.setItem(getKey(userId, 'photos'), JSON.stringify(updated));
};

export const deleteProgressPhoto = (userId: string, photoId: string): void => {
    const photos = getProgressPhotos(userId);
    const updated = photos.filter(p => p.id !== photoId);
    localStorage.setItem(getKey(userId, 'photos'), JSON.stringify(updated));
};

// --- Shopping List Methods ---

export const getShoppingList = (userId: string): ShoppingItem[] => {
    const stored = localStorage.getItem(getKey(userId, 'shopping_list'));
    return stored ? JSON.parse(stored) : [];
};

export const saveShoppingList = (userId: string, list: ShoppingItem[]): void => {
    localStorage.setItem(getKey(userId, 'shopping_list'), JSON.stringify(list));
};

export const addItemsToShoppingList = (userId: string, items: string[], recipeId?: string): ShoppingItem[] => {
    const current = getShoppingList(userId);
    const existingNames = new Set(current.map(i => i.name.toLowerCase()));
    
    const newItems: ShoppingItem[] = items
        .filter(name => !existingNames.has(name.toLowerCase()))
        .map(name => ({
            id: `shop_${Date.now()}_${Math.random()}`,
            name,
            checked: false,
            recipeId,
            addedAt: Date.now()
        }));

    const updated = [...current, ...newItems];
    saveShoppingList(userId, updated);
    return updated;
};

export const toggleShoppingItem = (userId: string, itemId: string): ShoppingItem[] => {
    const current = getShoppingList(userId);
    const updated = current.map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    saveShoppingList(userId, updated);
    return updated;
};

export const removeShoppingItem = (userId: string, itemId: string): ShoppingItem[] => {
    const current = getShoppingList(userId);
    const updated = current.filter(i => i.id !== itemId);
    saveShoppingList(userId, updated);
    return updated;
};

// --- Meal Planner Methods ---

export const getMealPlan = (userId: string): MealPlanEntry[] => {
  const stored = localStorage.getItem(getKey(userId, 'mealplan'));
  return stored ? JSON.parse(stored) : [];
};

export const saveMealPlan = (userId: string, plan: MealPlanEntry[]): void => {
  localStorage.setItem(getKey(userId, 'mealplan'), JSON.stringify(plan));
};

export const addToMealPlan = (userId: string, entry: MealPlanEntry): MealPlanEntry[] => {
  const current = getMealPlan(userId);
  // Do NOT remove existing entry for same time slot, allow duplicates (snacks)
  // Or if strict meal slots, filter. Current architecture supports multiple entries per day
  // but logic in some views might assume singular.
  // The old logic filtered by exact slot. Let's append to allow multiple items per meal.
  const updated = [...current, entry];
  saveMealPlan(userId, updated);
  return updated;
};

/**
 * Feature 2: Smart Copy
 * Copies all meals of a specific type from yesterday to today
 */
export const copyYesterdayMeal = (userId: string, mealType: MealType): MealPlanEntry[] => {
    const allMeals = getMealPlan(userId);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sourceMeals = allMeals.filter(m => m.date === yesterdayStr && m.mealType === mealType);
    
    if (sourceMeals.length === 0) return allMeals;

    const newEntries = sourceMeals.map(m => ({
        ...m,
        id: `copy_${Date.now()}_${Math.random()}`,
        date: todayStr,
        isCompleted: false // Reset completion status
    }));

    const updated = [...allMeals, ...newEntries];
    saveMealPlan(userId, updated);
    return updated;
};

/**
 * Feature 4: Export Data
 * Generates a CSV string of meal logs and weight history
 */
export const generateUserReportCSV = (userId: string): string => {
    const profile = getProfile(userId);
    const meals = getMealPlan(userId);
    
    let csv = "Date,Type,Item,Calories,Protein,Carbs,Fat\n";
    
    meals.sort((a,b) => b.date.localeCompare(a.date)).forEach(m => {
        csv += `${m.date},${m.mealType},"${m.recipe.title}",${m.recipe.calories},${m.recipe.protein},${m.recipe.carbs},${m.recipe.fat}\n`;
    });

    csv += "\nWeight History\nDate,Weight(kg)\n";
    profile.weightHistory.forEach(w => {
        csv += `${w.date},${w.weight}\n`;
    });

    return csv;
};

// --- Fitness Methods ---

export const getWorkoutLogs = (userId: string): WorkoutSession[] => {
  const stored = localStorage.getItem(getKey(userId, 'workouts'));
  return stored ? JSON.parse(stored) : [];
};

export const saveWorkoutLog = (userId: string, session: WorkoutSession): void => {
  const current = getWorkoutLogs(userId);
  const updated = [session, ...current];
  localStorage.setItem(getKey(userId, 'workouts'), JSON.stringify(updated));
};
