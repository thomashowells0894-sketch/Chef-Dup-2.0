/**
 * Cloud Sync Service
 * Handles data synchronization between local storage and Supabase cloud
 * Implements offline-first architecture with automatic sync
 */

import { supabase } from './cloudAuth';
import {
  UserProfile,
  Ingredient,
  MealPlanEntry,
  WorkoutSession,
  Recipe,
  CustomFood,
  ProgressPhoto,
  ShoppingItem
} from '../types';

// ==========================================
// TYPES
// ==========================================

interface SyncStatus {
  lastSyncedAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
  isSyncing: boolean;
}

interface PendingChange {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

// Local storage keys for offline queue
const PENDING_CHANGES_KEY = 'nutrichef_pending_sync';
const LAST_SYNC_KEY = 'nutrichef_last_sync';

// ==========================================
// SYNC STATUS MANAGEMENT
// ==========================================

let syncStatus: SyncStatus = {
  lastSyncedAt: null,
  pendingChanges: 0,
  isOnline: navigator.onLine,
  isSyncing: false,
};

const listeners: ((status: SyncStatus) => void)[] = [];

export const getSyncStatus = (): SyncStatus => syncStatus;

export const onSyncStatusChange = (callback: (status: SyncStatus) => void) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
};

const notifyListeners = () => {
  listeners.forEach((cb) => cb(syncStatus));
};

const updateSyncStatus = (updates: Partial<SyncStatus>) => {
  syncStatus = { ...syncStatus, ...updates };
  notifyListeners();
};

// Monitor online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateSyncStatus({ isOnline: true });
    processPendingChanges();
  });
  window.addEventListener('offline', () => {
    updateSyncStatus({ isOnline: false });
  });
}

// ==========================================
// OFFLINE QUEUE MANAGEMENT
// ==========================================

const getPendingChanges = (): PendingChange[] => {
  try {
    const stored = localStorage.getItem(PENDING_CHANGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const savePendingChanges = (changes: PendingChange[]) => {
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
  updateSyncStatus({ pendingChanges: changes.length });
};

const addPendingChange = (change: Omit<PendingChange, 'id' | 'timestamp'>) => {
  const changes = getPendingChanges();
  changes.push({
    ...change,
    id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  });
  savePendingChanges(changes);
};

const removePendingChange = (changeId: string) => {
  const changes = getPendingChanges().filter((c) => c.id !== changeId);
  savePendingChanges(changes);
};

// ==========================================
// PROCESS PENDING CHANGES (SYNC)
// ==========================================

export const processPendingChanges = async (): Promise<void> => {
  if (!syncStatus.isOnline || syncStatus.isSyncing) return;

  updateSyncStatus({ isSyncing: true });

  const changes = getPendingChanges();
  const errors: string[] = [];

  for (const change of changes) {
    try {
      let result;

      switch (change.action) {
        case 'insert':
          result = await supabase.from(change.table).insert(change.data);
          break;
        case 'update':
          result = await supabase
            .from(change.table)
            .update(change.data)
            .eq('id', change.data.id);
          break;
        case 'delete':
          result = await supabase
            .from(change.table)
            .delete()
            .eq('id', change.data.id);
          break;
      }

      if (result?.error) {
        errors.push(`${change.table}: ${result.error.message}`);
      } else {
        removePendingChange(change.id);
      }
    } catch (e) {
      console.error('Sync error for change:', change, e);
      errors.push(`${change.table}: Network error`);
    }
  }

  updateSyncStatus({
    isSyncing: false,
    lastSyncedAt: new Date().toISOString(),
  });

  if (errors.length > 0) {
    console.error('Sync errors:', errors);
  }

  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
};

// ==========================================
// PROFILE SYNC
// ==========================================

export const syncProfile = async (userId: string, profile: Partial<UserProfile>): Promise<void> => {
  // Transform to DB format
  const dbData = {
    id: userId,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    activity_level: profile.activityLevel,
    goal: profile.goal,
    is_vegan: profile.isVegan,
    is_gluten_free: profile.isGlutenFree,
    is_keto: profile.isKeto,
    allergies: profile.allergies,
    daily_calorie_goal: profile.dailyCalorieGoal,
    daily_protein_goal: profile.dailyProteinGoal,
    daily_carb_goal: profile.dailyCarbGoal,
    daily_fat_goal: profile.dailyFatGoal,
    water_goal_ml: profile.waterGoalMl,
    water_intake_ml: profile.waterIntakeMl,
    is_subscribed: profile.isSubscribed,
    free_scans_remaining: profile.freeScansRemaining,
    has_completed_onboarding: profile.hasCompletedOnboarding,
    fasting_state: profile.fasting,
    current_streak: profile.streak?.currentStreak,
    longest_streak: profile.streak?.longestStreak,
  };

  if (syncStatus.isOnline) {
    const { error } = await supabase.from('profiles').upsert(dbData);
    if (error) {
      console.error('Profile sync error:', error);
      addPendingChange({ table: 'profiles', action: 'update', data: dbData });
    }
  } else {
    addPendingChange({ table: 'profiles', action: 'update', data: dbData });
  }
};

export const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    // Transform from DB format to app format
    return {
      name: data.name,
      hasCompletedOnboarding: data.has_completed_onboarding,
      age: data.age,
      gender: data.gender,
      heightCm: data.height_cm,
      weightKg: data.weight_kg,
      activityLevel: data.activity_level,
      goal: data.goal,
      waterIntakeMl: data.water_intake_ml || 0,
      waterGoalMl: data.water_goal_ml || 2500,
      weightHistory: [], // Fetched separately
      fasting: data.fasting_state || { isFasting: false, startTime: null, targetHours: 16, history: [] },
      streak: {
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
        lastLoginDate: data.last_active_date || new Date().toISOString().split('T')[0],
      },
      isVegan: data.is_vegan,
      isGlutenFree: data.is_gluten_free,
      isKeto: data.is_keto,
      allergies: data.allergies || [],
      dailyCalorieGoal: data.daily_calorie_goal,
      dailyProteinGoal: data.daily_protein_goal,
      dailyCarbGoal: data.daily_carb_goal,
      dailyFatGoal: data.daily_fat_goal,
      totalSaved: parseFloat(data.total_saved) || 0,
      freeScansRemaining: data.free_scans_remaining,
      isSubscribed: data.is_subscribed,
      badges: [],
      savedRecipeIds: [],
      ratings: {},
      workoutSchedule: {},
      connectedDevices: data.connected_devices || [],
    };
  } catch (e) {
    console.error('Fetch profile error:', e);
    return null;
  }
};

// ==========================================
// MEAL LOG SYNC
// ==========================================

export const syncMealLog = async (userId: string, entry: MealPlanEntry): Promise<void> => {
  const dbData = {
    id: entry.id,
    user_id: userId,
    meal_date: entry.date,
    meal_type: entry.mealType,
    food_name: entry.recipe.title,
    food_id: entry.recipe.id,
    food_source: entry.isQuickAdd ? 'quick_add' : 'recipe',
    calories: entry.recipe.calories,
    protein: entry.recipe.protein,
    carbs: entry.recipe.carbs,
    fat: entry.recipe.fat,
    fiber: entry.recipe.fiber,
    sugar: entry.recipe.sugar,
    sodium: entry.recipe.sodium,
    is_completed: entry.isCompleted,
  };

  if (syncStatus.isOnline) {
    const { error } = await supabase.from('meal_logs').upsert(dbData);
    if (error) {
      console.error('Meal log sync error:', error);
      addPendingChange({ table: 'meal_logs', action: 'insert', data: dbData });
    }
  } else {
    addPendingChange({ table: 'meal_logs', action: 'insert', data: dbData });
  }
};

export const fetchMealLogs = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<MealPlanEntry[]> => {
  try {
    let query = supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .order('meal_date', { ascending: false });

    if (startDate) query = query.gte('meal_date', startDate);
    if (endDate) query = query.lte('meal_date', endDate);

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      date: row.meal_date,
      mealType: row.meal_type,
      isCompleted: row.is_completed,
      isQuickAdd: row.food_source === 'quick_add',
      recipe: {
        id: row.food_id,
        title: row.food_name,
        description: '',
        ingredients: [],
        missingIngredients: [],
        steps: [],
        imageUrl: row.image_url || '',
        isVegan: false,
        isGlutenFree: false,
        isKeto: false,
        servings: 1,
        calories: row.calories,
        protein: row.protein,
        carbs: row.carbs,
        fat: row.fat,
        sugar: row.sugar || 0,
        fiber: row.fiber || 0,
        sodium: row.sodium || 0,
        prepTimeMinutes: 0,
        savings: 0,
      },
    }));
  } catch (e) {
    console.error('Fetch meal logs error:', e);
    return [];
  }
};

// ==========================================
// WEIGHT LOG SYNC
// ==========================================

export const syncWeightLog = async (
  userId: string,
  weight: number,
  date: string
): Promise<void> => {
  const dbData = {
    user_id: userId,
    weight_kg: weight,
    logged_at: date,
  };

  if (syncStatus.isOnline) {
    const { error } = await supabase.from('weight_logs').upsert(dbData, {
      onConflict: 'user_id,logged_at',
    });
    if (error) {
      console.error('Weight sync error:', error);
      addPendingChange({ table: 'weight_logs', action: 'insert', data: dbData });
    }
  } else {
    addPendingChange({ table: 'weight_logs', action: 'insert', data: dbData });
  }
};

export const fetchWeightHistory = async (
  userId: string,
  limit: number = 30
): Promise<{ date: string; weight: number }[]> => {
  try {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('logged_at, weight_kg')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => ({
      date: row.logged_at,
      weight: parseFloat(row.weight_kg),
    }));
  } catch (e) {
    console.error('Fetch weight history error:', e);
    return [];
  }
};

// ==========================================
// WORKOUT SESSION SYNC
// ==========================================

export const syncWorkoutSession = async (
  userId: string,
  session: WorkoutSession
): Promise<void> => {
  const dbData = {
    id: session.id,
    user_id: userId,
    session_date: session.date,
    workout_name: session.exercises.length > 0 ? 'Workout Session' : 'Quick Workout',
    workout_type: 'Custom',
    duration_seconds: session.durationSeconds,
    calories_burned: session.caloriesBurned,
    total_volume: session.totalVolume,
    exercises: session.exercises,
  };

  if (syncStatus.isOnline) {
    const { error } = await supabase.from('workout_sessions').insert(dbData);
    if (error) {
      console.error('Workout sync error:', error);
      addPendingChange({ table: 'workout_sessions', action: 'insert', data: dbData });
    }
  } else {
    addPendingChange({ table: 'workout_sessions', action: 'insert', data: dbData });
  }
};

export const fetchWorkoutSessions = async (
  userId: string,
  limit: number = 50
): Promise<WorkoutSession[]> => {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      date: row.session_date,
      exercises: row.exercises || [],
      totalVolume: parseFloat(row.total_volume) || 0,
      durationSeconds: row.duration_seconds,
      caloriesBurned: row.calories_burned,
    }));
  } catch (e) {
    console.error('Fetch workout sessions error:', e);
    return [];
  }
};

// ==========================================
// PANTRY SYNC
// ==========================================

export const syncPantryItem = async (
  userId: string,
  item: Ingredient,
  action: 'add' | 'remove'
): Promise<void> => {
  if (action === 'add') {
    const dbData = {
      id: item.id,
      user_id: userId,
      name: item.name,
      confidence: item.confidence,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      image_url: item.imageUrl,
    };

    if (syncStatus.isOnline) {
      const { error } = await supabase.from('pantry_items').insert(dbData);
      if (error && !error.message.includes('duplicate')) {
        addPendingChange({ table: 'pantry_items', action: 'insert', data: dbData });
      }
    } else {
      addPendingChange({ table: 'pantry_items', action: 'insert', data: dbData });
    }
  } else {
    if (syncStatus.isOnline) {
      const { error } = await supabase
        .from('pantry_items')
        .update({ is_deleted: true })
        .eq('id', item.id);
      if (error) {
        addPendingChange({ table: 'pantry_items', action: 'update', data: { id: item.id, is_deleted: true } });
      }
    } else {
      addPendingChange({ table: 'pantry_items', action: 'update', data: { id: item.id, is_deleted: true } });
    }
  }
};

export const fetchPantryItems = async (userId: string): Promise<Ingredient[]> => {
  try {
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('added_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      confidence: parseFloat(row.confidence) || 1.0,
      addedAt: new Date(row.added_at).getTime(),
      imageUrl: row.image_url,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
    }));
  } catch (e) {
    console.error('Fetch pantry error:', e);
    return [];
  }
};

// ==========================================
// FULL DATA SYNC
// ==========================================

export const performFullSync = async (userId: string): Promise<{
  profile: UserProfile | null;
  mealLogs: MealPlanEntry[];
  workoutSessions: WorkoutSession[];
  pantryItems: Ingredient[];
  weightHistory: { date: string; weight: number }[];
}> => {
  updateSyncStatus({ isSyncing: true });

  try {
    const [profile, mealLogs, workoutSessions, pantryItems, weightHistory] = await Promise.all([
      fetchProfile(userId),
      fetchMealLogs(userId),
      fetchWorkoutSessions(userId),
      fetchPantryItems(userId),
      fetchWeightHistory(userId),
    ]);

    updateSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
    });

    return { profile, mealLogs, workoutSessions, pantryItems, weightHistory };
  } catch (e) {
    console.error('Full sync error:', e);
    updateSyncStatus({ isSyncing: false });
    return {
      profile: null,
      mealLogs: [],
      workoutSessions: [],
      pantryItems: [],
      weightHistory: [],
    };
  }
};

// ==========================================
// BARCODE CACHE
// ==========================================

export const cacheBarcodeLookup = async (
  barcode: string,
  productData: {
    name: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }
): Promise<void> => {
  if (!syncStatus.isOnline) return;

  try {
    await supabase.from('barcode_cache').upsert({
      barcode,
      product_name: productData.name,
      calories: productData.calories,
      protein: productData.protein,
      carbs: productData.carbs,
      fat: productData.fat,
    });
  } catch (e) {
    console.error('Cache barcode error:', e);
  }
};

export const getCachedBarcode = async (barcode: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('barcode_cache')
      .select('*')
      .eq('barcode', barcode)
      .single();

    return error ? null : data;
  } catch {
    return null;
  }
};

// ==========================================
// REAL-TIME SUBSCRIPTIONS
// ==========================================

export const subscribeToProfileChanges = (
  userId: string,
  callback: (profile: any) => void
) => {
  return supabase
    .channel(`profile:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
};

export default {
  getSyncStatus,
  onSyncStatusChange,
  processPendingChanges,
  syncProfile,
  fetchProfile,
  syncMealLog,
  fetchMealLogs,
  syncWeightLog,
  fetchWeightHistory,
  syncWorkoutSession,
  fetchWorkoutSessions,
  syncPantryItem,
  fetchPantryItems,
  performFullSync,
  cacheBarcodeLookup,
  getCachedBarcode,
  subscribeToProfileChanges,
};
