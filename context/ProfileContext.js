import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticHeavy } from '../lib/haptics';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const PROFILE_CACHE_KEY = '@vibefit_profile_cache';

const ProfileContext = createContext(null);

// Activity level multipliers for TDEE calculation
export const ACTIVITY_LEVELS = {
  sedentary: {
    label: 'Sedentary',
    description: 'Little or no exercise',
    multiplier: 1.2,
  },
  light: {
    label: 'Lightly Active',
    description: 'Light exercise 1-3 days/week',
    multiplier: 1.375,
  },
  moderate: {
    label: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
    multiplier: 1.55,
  },
  active: {
    label: 'Very Active',
    description: 'Hard exercise 6-7 days/week',
    multiplier: 1.725,
  },
  extreme: {
    label: 'Extremely Active',
    description: 'Very hard exercise & physical job',
    multiplier: 1.9,
  },
};

const initialProfile = {
  name: '',
  weight: null, // in lbs (stored internally as lbs)
  height: null, // in inches
  age: null,
  gender: 'male', // 'male' or 'female'
  activityLevel: 'moderate',
  // Calculated values
  bmr: null,
  tdee: null,
  // Goal adjustments
  goalWeight: null,
  weeklyGoal: 'maintain', // 'lose2', 'lose1', 'lose05', 'maintain', 'gain05', 'gain1'
  // Macro split
  macroPreset: 'balanced', // Key from MACRO_PRESETS
  customMacros: { protein: 30, carbs: 40, fat: 30 }, // Only used when macroPreset is 'custom'
  // Unit preferences
  weightUnit: 'lbs', // 'lbs' or 'kg'
  // Training Context - for AI Trainer personalization
  injuries: '', // e.g., "bad knees, lower back pain"
  equipment: [], // e.g., ["dumbbells", "resistance bands", "pull-up bar"]
  dietaryRestrictions: [], // e.g., ["vegan", "gluten-free", "dairy-free"]
};

// Goal type presets for quick switching
export const GOAL_TYPES = {
  cut: {
    label: 'Cut',
    description: 'Lose fat, preserve muscle',
    weeklyGoal: 'lose1',
    macroPreset: 'highProtein',
    icon: 'TrendingDown',
    color: '#FF6B35',
  },
  maintain: {
    label: 'Maintain',
    description: 'Stay at current weight',
    weeklyGoal: 'maintain',
    macroPreset: 'balanced',
    icon: 'Minus',
    color: '#00D4FF',
  },
  bulk: {
    label: 'Bulk',
    description: 'Build muscle, gain strength',
    weeklyGoal: 'gain05',
    macroPreset: 'highProtein',
    icon: 'TrendingUp',
    color: '#00E676',
  },
};

// Weekly goal calorie adjustments
const WEEKLY_GOALS = {
  lose2: { label: 'Lose 2 lbs/week', adjustment: -1000 },
  lose1: { label: 'Lose 1 lb/week', adjustment: -500 },
  lose05: { label: 'Lose 0.5 lbs/week', adjustment: -250 },
  maintain: { label: 'Maintain weight', adjustment: 0 },
  gain05: { label: 'Gain 0.5 lbs/week', adjustment: 250 },
  gain1: { label: 'Gain 1 lb/week', adjustment: 500 },
};

// Macro split presets
export const MACRO_PRESETS = {
  bodyweight: {
    label: 'Bodyweight-Based',
    description: '2g protein/kg, 0.8g fat/kg, fill carbs',
    protein: 0, // Calculated dynamically
    carbs: 0,
    fat: 0,
    isBodyweightBased: true,
  },
  balanced: {
    label: 'Balanced',
    description: 'Standard healthy diet',
    protein: 30,
    carbs: 40,
    fat: 30,
  },
  highProtein: {
    label: 'High Protein',
    description: 'Muscle building & recovery',
    protein: 40,
    carbs: 30,
    fat: 30,
  },
  lowCarb: {
    label: 'Low Carb',
    description: 'Reduced carbohydrate intake',
    protein: 35,
    carbs: 25,
    fat: 40,
  },
  keto: {
    label: 'Keto',
    description: 'Very low carb, high fat',
    protein: 25,
    carbs: 5,
    fat: 70,
  },
  athletic: {
    label: 'Athletic',
    description: 'High carb for performance',
    protein: 25,
    carbs: 50,
    fat: 25,
  },
  custom: {
    label: 'Custom',
    description: 'Your own split',
    protein: 30,
    carbs: 40,
    fat: 30,
  },
};

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * For men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
 * For women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161
 */
function calculateBMR(weightLbs, heightInches, age, gender) {
  if (!weightLbs || !heightInches || !age) return null;

  // Convert to metric
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;

  // Mifflin-St Jeor Equation
  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === 'male') {
    return Math.round(baseBMR + 5);
  } else {
    return Math.round(baseBMR - 161);
  }
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR × Activity Multiplier
 */
function calculateTDEE(bmr, activityLevel) {
  if (!bmr) return null;
  const multiplier = ACTIVITY_LEVELS[activityLevel]?.multiplier || 1.55;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate daily calorie goal based on TDEE and weight goal
 */
function calculateDailyCalorieGoal(tdee, weeklyGoal) {
  if (!tdee) return 2000; // Default fallback
  const adjustment = WEEKLY_GOALS[weeklyGoal]?.adjustment || 0;
  const goal = tdee + adjustment;
  // Ensure minimum safe calorie intake
  return Math.max(goal, 1200);
}

/**
 * Calculate macro goals based on bodyweight
 * Protein: 2.0g per kg bodyweight
 * Fat: 0.8g per kg bodyweight
 * Carbs: Fill remaining calories
 * @param {number} calorieGoal - Daily calorie target
 * @param {number} weightLbs - Weight in pounds
 * @returns {object} - { protein, carbs, fat } in grams
 */
function calculateBodyweightMacros(calorieGoal, weightLbs) {
  if (!weightLbs || !calorieGoal) {
    return { protein: 150, carbs: 200, fat: 65 }; // Defaults
  }

  const weightKg = weightLbs * 0.453592;

  // Protein: 2.0g per kg
  const protein = Math.round(weightKg * 2.0);
  const proteinCals = protein * 4;

  // Fat: 0.8g per kg
  const fat = Math.round(weightKg * 0.8);
  const fatCals = fat * 9;

  // Carbs: Fill remaining calories
  const remainingCals = Math.max(calorieGoal - proteinCals - fatCals, 0);
  const carbs = Math.round(remainingCals / 4);

  return { protein, carbs, fat };
}

/**
 * Calculate macro goals based on calorie goal and macro split
 * @param {number} calorieGoal - Daily calorie target
 * @param {string} macroPreset - Key from MACRO_PRESETS
 * @param {object} customMacros - Custom percentages when preset is 'custom'
 * @param {number} weightLbs - Weight in pounds (needed for bodyweight-based)
 * @returns {object} - { protein, carbs, fat } in grams
 */
function calculateMacroGoals(calorieGoal, macroPreset = 'balanced', customMacros = null, weightLbs = null) {
  // Handle bodyweight-based calculation
  if (macroPreset === 'bodyweight') {
    return calculateBodyweightMacros(calorieGoal, weightLbs);
  }

  // Get the split percentages
  let split;
  if (macroPreset === 'custom' && customMacros) {
    split = customMacros;
  } else {
    split = MACRO_PRESETS[macroPreset] || MACRO_PRESETS.balanced;
  }

  // Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
  return {
    protein: Math.round((calorieGoal * (split.protein / 100)) / 4),
    carbs: Math.round((calorieGoal * (split.carbs / 100)) / 4),
    fat: Math.round((calorieGoal * (split.fat / 100)) / 9),
  };
}

// Get today's date string
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Get date string for N days ago
function getDateString(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Get day label (Mon, Tue, etc.) for a date string
function getDayLabel(dateString) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get the last N days of weight data for charts
 * @param {Array} weightHistory - Array of { date, weight } entries
 * @param {number} currentWeight - Current weight from profile
 * @param {number} days - Number of days to retrieve
 * @returns {Array} - Array of { date, day, weight }
 */
function getWeeklyWeightData(weightHistory, currentWeight, days = 7) {
  const result = [];
  const historyMap = {};

  // Create a map for quick lookup
  weightHistory.forEach((entry) => {
    historyMap[entry.date] = entry.weight;
  });

  // Add today's weight
  const today = getTodayString();
  if (currentWeight && !historyMap[today]) {
    historyMap[today] = currentWeight;
  }

  for (let i = days - 1; i >= 0; i--) {
    const dateStr = getDateString(i);
    const dayLabel = getDayLabel(dateStr);
    const weight = historyMap[dateStr] || null;

    result.push({
      date: dateStr,
      day: dayLabel,
      weight: weight,
      isToday: i === 0,
    });
  }

  // Interpolate missing values for smoother chart
  let lastKnownWeight = null;
  for (let i = 0; i < result.length; i++) {
    if (result[i].weight !== null) {
      lastKnownWeight = result[i].weight;
    } else if (lastKnownWeight !== null) {
      result[i].weight = lastKnownWeight;
      result[i].interpolated = true;
    }
  }

  // Fill backwards for any remaining nulls at the start
  lastKnownWeight = null;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].weight !== null && !result[i].interpolated) {
      lastKnownWeight = result[i].weight;
    } else if (result[i].weight === null && lastKnownWeight !== null) {
      result[i].weight = lastKnownWeight;
      result[i].interpolated = true;
    }
  }

  return result;
}

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(initialProfile);
  const [weightHistory, setWeightHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Fetch profile from Supabase - extracted so it can be called externally
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(initialProfile);
      setWeightHistory([]);
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        if (__DEV__) {
          console.error('Error fetching profile:', profileError.code, profileError.message, profileError.details);
        }
      }

      if (profileData) {
        const loadedProfile = {
          ...initialProfile,
          name: profileData.name || '',
          weight: profileData.weight,
          height: profileData.height,
          age: profileData.age,
          gender: profileData.gender || 'male',
          activityLevel: profileData.activity_level || 'moderate',
          goalWeight: profileData.goal_weight,
          weeklyGoal: profileData.weekly_goal || 'maintain',
          macroPreset: profileData.macro_preset || 'balanced',
          customMacros: profileData.custom_macros || { protein: 30, carbs: 40, fat: 30 },
          weightUnit: profileData.weight_unit || 'lbs',
          injuries: profileData.injuries || '',
          equipment: profileData.equipment || [],
          dietaryRestrictions: profileData.dietary_restrictions || [],
        };

        const bmr = calculateBMR(
          loadedProfile.weight,
          loadedProfile.height,
          loadedProfile.age,
          loadedProfile.gender
        );
        const tdee = calculateTDEE(bmr, loadedProfile.activityLevel);

        setProfile({ ...loadedProfile, bmr, tdee });

        if (profileData.weight_history) {
          setWeightHistory(profileData.weight_history);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to load profile:', error.message);
      }
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, [user]);

  // Fetch profile from Supabase when user changes
  useEffect(() => {
    if (!user) {
      setProfile(initialProfile);
      setWeightHistory([]);
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    async function fetchProfileInternal() {
      setIsLoading(true);
      try {
        // Try loading from AsyncStorage cache first for faster startup
        try {
          const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
          if (cached) {
            const { profile: cachedProfile, weightHistory: cachedWeightHistory } = JSON.parse(cached);
            if (cachedProfile) {
              const bmr = calculateBMR(
                cachedProfile.weight,
                cachedProfile.height,
                cachedProfile.age,
                cachedProfile.gender
              );
              const tdee = calculateTDEE(bmr, cachedProfile.activityLevel);
              setProfile({ ...cachedProfile, bmr, tdee });
              if (cachedWeightHistory) {
                setWeightHistory(cachedWeightHistory);
              }
              setIsLoading(false);
              setIsHydrated(true);
            }
          }
        } catch (cacheError) {
          // Cache read failed, fall through to Supabase fetch
          if (__DEV__) {
            console.warn('Failed to read profile cache:', cacheError.message);
          }
        }

        // Fetch profile from Supabase
        // Security: Only select columns we actually need (avoid exposing unnecessary data)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows found (new user)
          if (__DEV__) {
            console.error('Error fetching profile:', profileError.code, profileError.message, profileError.details);
          }
        }

        if (profileData) {
          // Map Supabase columns to local state
          const loadedProfile = {
            ...initialProfile,
            name: profileData.name || '',
            weight: profileData.weight,
            height: profileData.height,
            age: profileData.age,
            gender: profileData.gender || 'male',
            activityLevel: profileData.activity_level || 'moderate',
            goalWeight: profileData.goal_weight,
            weeklyGoal: profileData.weekly_goal || 'maintain',
            macroPreset: profileData.macro_preset || 'balanced',
            customMacros: profileData.custom_macros || { protein: 30, carbs: 40, fat: 30 },
            weightUnit: profileData.weight_unit || 'lbs',
            // Training Context
            injuries: profileData.injuries || '',
            equipment: profileData.equipment || [],
            dietaryRestrictions: profileData.dietary_restrictions || [],
          };

          // Recalculate BMR and TDEE
          const bmr = calculateBMR(
            loadedProfile.weight,
            loadedProfile.height,
            loadedProfile.age,
            loadedProfile.gender
          );
          const tdee = calculateTDEE(bmr, loadedProfile.activityLevel);

          setProfile({ ...loadedProfile, bmr, tdee });

          // Load weight history from profile
          if (profileData.weight_history) {
            setWeightHistory(profileData.weight_history);
          }

          // Write fetched profile to AsyncStorage cache
          try {
            await AsyncStorage.setItem(
              PROFILE_CACHE_KEY,
              JSON.stringify({
                profile: loadedProfile,
                weightHistory: profileData.weight_history || [],
              })
            );
          } catch (cacheWriteError) {
            if (__DEV__) {
              console.warn('Failed to write profile cache:', cacheWriteError.message);
            }
          }
        } else {
          // Create initial profile for new user
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
            })
            .select();

          if (insertError && __DEV__) {
            if (__DEV__) console.error('Error creating profile:', insertError.code);
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Failed to load profile:', error.message);
        }
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    }

    fetchProfileInternal();
  }, [user]);

  // Update profile and recalculate BMR/TDEE
  const updateProfile = useCallback(async (updates) => {
    if (!user) return;

    const today = getTodayString();
    let newWeightHistory = weightHistory;

    // If weight changed, update weight history
    if (updates.weight) {
      const filtered = weightHistory.filter((entry) => entry.date !== today);
      newWeightHistory = [...filtered, { date: today, weight: updates.weight }]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-90);
      setWeightHistory(newWeightHistory);
    }

    // Update local state
    setProfile((prev) => {
      const newProfile = { ...prev, ...updates };

      // Recalculate BMR and TDEE if biometric data changed
      const bmr = calculateBMR(
        newProfile.weight,
        newProfile.height,
        newProfile.age,
        newProfile.gender
      );

      const tdee = calculateTDEE(bmr, newProfile.activityLevel);

      return {
        ...newProfile,
        bmr,
        tdee,
      };
    });

    // Save to Supabase
    try {
      const supabaseUpdates = {};

      // Map local keys to Supabase column names
      // Note: 'name' column may not exist in DB, skip it
      if (updates.weight !== undefined) supabaseUpdates.weight = updates.weight;
      if (updates.height !== undefined) supabaseUpdates.height = updates.height;
      if (updates.age !== undefined) supabaseUpdates.age = updates.age;
      if (updates.gender !== undefined) supabaseUpdates.gender = updates.gender;
      if (updates.activityLevel !== undefined) supabaseUpdates.activity_level = updates.activityLevel;
      if (updates.goalWeight !== undefined) supabaseUpdates.goal_weight = updates.goalWeight;
      if (updates.weeklyGoal !== undefined) supabaseUpdates.weekly_goal = updates.weeklyGoal;
      if (updates.macroPreset !== undefined) supabaseUpdates.macro_preset = updates.macroPreset;
      if (updates.customMacros !== undefined) supabaseUpdates.custom_macros = updates.customMacros;
      if (updates.weightUnit !== undefined) supabaseUpdates.weight_unit = updates.weightUnit;
      // Training Context fields
      if (updates.injuries !== undefined) supabaseUpdates.injuries = updates.injuries;
      if (updates.equipment !== undefined) supabaseUpdates.equipment = updates.equipment;
      if (updates.dietaryRestrictions !== undefined) supabaseUpdates.dietary_restrictions = updates.dietaryRestrictions;

      // Always update weight history if weight changed
      if (updates.weight !== undefined) {
        supabaseUpdates.weight_history = newWeightHistory;
      }

      supabaseUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update(supabaseUpdates)
        .eq('user_id', user.id)
        .select();

      if (error && __DEV__) {
        if (__DEV__) console.error('Error updating profile:', error.code);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to save profile to Supabase:', error.message);
      }
    }

    // Update AsyncStorage cache with the merged profile
    try {
      const updatedProfile = { ...profile, ...updates };
      await AsyncStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify({
          profile: updatedProfile,
          weightHistory: newWeightHistory,
        })
      );
    } catch (cacheError) {
      if (__DEV__) {
        console.warn('Failed to update profile cache:', cacheError.message);
      }
    }

    // Haptic feedback
    await hapticSuccess();
  }, [user, profile, weightHistory]);

  // Quick switch goal type (Cut/Maintain/Bulk)
  const switchGoalType = useCallback(async (goalType) => {
    const goalConfig = GOAL_TYPES[goalType];
    if (!goalConfig) return;

    await updateProfile({
      weeklyGoal: goalConfig.weeklyGoal,
      macroPreset: goalConfig.macroPreset,
    });

    // Heavy haptic for mode switch
    await hapticHeavy();
  }, [updateProfile]);

  // Get current goal type based on weeklyGoal
  const currentGoalType = useMemo(() => {
    const { weeklyGoal } = profile;
    if (weeklyGoal.startsWith('lose')) return 'cut';
    if (weeklyGoal.startsWith('gain')) return 'bulk';
    return 'maintain';
  }, [profile.weeklyGoal]);

  // Computed values
  const calculatedGoals = useMemo(() => {
    const calorieGoal = calculateDailyCalorieGoal(profile.tdee, profile.weeklyGoal);
    const macros = calculateMacroGoals(
      calorieGoal,
      profile.macroPreset,
      profile.customMacros,
      profile.weight // Pass weight for bodyweight-based calculations
    );

    return {
      calories: calorieGoal,
      ...macros,
    };
  }, [profile.tdee, profile.weeklyGoal, profile.macroPreset, profile.customMacros, profile.weight]);

  // Get current macro split percentages
  const currentMacroSplit = useMemo(() => {
    if (profile.macroPreset === 'custom' && profile.customMacros) {
      return profile.customMacros;
    }
    return MACRO_PRESETS[profile.macroPreset] || MACRO_PRESETS.balanced;
  }, [profile.macroPreset, profile.customMacros]);

  // Weekly weight data for charts
  const weeklyWeightData = useMemo(() => {
    return getWeeklyWeightData(weightHistory, profile.weight, 7);
  }, [weightHistory, profile.weight]);

  // Smart water goal calculation: weight(lbs) * 35ml / 2.205 ≈ weight(kg) * 35ml
  // Or simply: weight(lbs) * 15.87ml for a simpler approximation
  // We'll use weight(kg) * 35ml which is a common recommendation
  const calculatedWaterGoal = useMemo(() => {
    if (!profile.weight) return 2500; // Default 2500ml
    const weightKg = profile.weight * 0.453592;
    const goal = Math.round(weightKg * 35);
    // Round to nearest 50ml and ensure minimum of 1500ml
    return Math.max(1500, Math.round(goal / 50) * 50);
  }, [profile.weight]);

  // Weight stats
  const weightStats = useMemo(() => {
    if (!profile.weight || weightHistory.length === 0) {
      return {
        currentWeight: profile.weight || null,
        weeklyChange: null,
        startWeight: null,
        totalChange: null,
        goalWeight: profile.goalWeight || null,
        toGoal: null,
      };
    }

    // Find oldest weight in history
    const sortedHistory = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date));
    const startWeight = sortedHistory[0]?.weight || profile.weight;

    // Find weight from 7 days ago if available
    const weekAgo = getDateString(7);
    const weekAgoEntry = weightHistory.find((e) => e.date <= weekAgo);
    const weeklyChange = weekAgoEntry ? profile.weight - weekAgoEntry.weight : null;

    return {
      currentWeight: profile.weight,
      weeklyChange: weeklyChange !== null ? Math.round(weeklyChange * 10) / 10 : null,
      startWeight,
      totalChange: Math.round((profile.weight - startWeight) * 10) / 10,
      goalWeight: profile.goalWeight || null,
      toGoal: profile.goalWeight ? Math.round((profile.weight - profile.goalWeight) * 10) / 10 : null,
    };
  }, [profile.weight, profile.goalWeight, weightHistory]);

  // Check if essential profile data exists (for onboarding redirect)
  const isProfileComplete = useMemo(() => {
    return !!(profile.weight && profile.height && profile.age);
  }, [profile.weight, profile.height, profile.age]);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      isHydrated,
      updateProfile,
      fetchProfile,
      calculatedGoals,
      activityLevels: ACTIVITY_LEVELS,
      weeklyGoals: WEEKLY_GOALS,
      macroPresets: MACRO_PRESETS,
      goalTypes: GOAL_TYPES,
      currentMacroSplit,
      // Quick goal switching
      switchGoalType,
      currentGoalType,
      // Helper to check if profile is complete (has essential data for calculations)
      isProfileComplete,
      // Weight tracking
      weightHistory,
      weeklyWeightData,
      weightStats,
      // Hydration
      calculatedWaterGoal,
    }),
    [profile, isLoading, isHydrated, updateProfile, fetchProfile, calculatedGoals, currentMacroSplit, switchGoalType, currentGoalType, isProfileComplete, weightHistory, weeklyWeightData, weightStats, calculatedWaterGoal]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
