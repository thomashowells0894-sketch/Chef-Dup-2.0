
import { createClient } from '@supabase/supabase-js';
import { UserProfile, Ingredient, MealPlanEntry, WorkoutSession } from '../types';

// NOTE: In a real app, use import.meta.env or process.env
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * PRODUCTION BACKEND SERVICE
 * 
 * To use this instead of local storage:
 * 1. Replace calls in App.tsx from StorageService.* to CloudService.*
 * 2. Update App.tsx to handle Promises (async/await) since DB calls are not synchronous.
 */

// --- Profile ---

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) return null;

    // Transform DB snake_case to App camelCase if needed, or use specific types
    // For now, mapping manually for safety:
    return {
        ...data,
        weightKg: data.weight_kg,
        heightCm: data.height_cm,
        dailyCalorieGoal: data.daily_calorie_goal,
        // ... map rest of fields
        fasting: data.fasting_state,
        streak: {
            currentStreak: data.streak_current,
            longestStreak: data.streak_longest,
            lastLoginDate: data.last_login
        }
    } as UserProfile;
};

export const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
    // Map Frontend types to DB columns
    const dbUpdates: any = {};
    if (updates.weightKg) dbUpdates.weight_kg = updates.weightKg;
    if (updates.dailyCalorieGoal) dbUpdates.daily_calorie_goal = updates.dailyCalorieGoal;
    if (updates.fasting) dbUpdates.fasting_state = updates.fasting;
    // ... etc

    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);
        
    if (error) throw error;
};

// --- Pantry ---

export const getPantry = async (userId: string): Promise<Ingredient[]> => {
    const { data } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId);
        
    return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        confidence: item.confidence,
        addedAt: item.added_at,
        imageUrl: item.image_url,
        // ... macros
    }));
};

export const addToPantry = async (userId: string, items: Ingredient[]) => {
    const dbItems = items.map(i => ({
        user_id: userId,
        name: i.name,
        confidence: i.confidence,
        image_url: i.imageUrl,
        added_at: Date.now()
    }));

    const { error } = await supabase.from('pantry_items').insert(dbItems);
    if (error) console.error("Cloud Error", error);
};

export const removeFromPantry = async (id: string) => {
    await supabase.from('pantry_items').delete().eq('id', id);
};

// --- Meals ---

export const logMeal = async (userId: string, entry: MealPlanEntry) => {
    const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: entry.date,
        meal_type: entry.mealType,
        recipe_data: entry.recipe,
        is_completed: entry.isCompleted,
        is_quick_add: entry.isQuickAdd
    });
    if (error) console.error(error);
};

export const getMealHistory = async (userId: string): Promise<MealPlanEntry[]> => {
    const { data } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId);

    return (data || []).map(row => ({
        id: row.id,
        date: row.date,
        mealType: row.meal_type,
        recipe: row.recipe_data,
        isCompleted: row.is_completed,
        isQuickAdd: row.is_quick_add
    }));
};
