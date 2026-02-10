import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticLight } from '../lib/haptics';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';

const RecipeContext = createContext(null);

const RECIPES_KEY = '@vibefit_recipes';

export function RecipeProvider({ children }) {
  const { user } = useAuth();
  const { checkOnline, showOfflineAlert } = useOffline();
  const [recipes, setRecipes] = useState([]);
  const [recentFoods, setRecentFoods] = useState([]);
  const [recentFoodsLoading, setRecentFoodsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ref for stable callbacks that don't re-create when recipes changes
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;

  // Haptic helper
  const triggerHaptic = useCallback(async (type = 'success') => {
    if (type === 'success') {
      await hapticSuccess();
    } else if (type === 'light') {
      await hapticLight();
    }
  }, []);

  // Load recipes from AsyncStorage on mount
  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setRecentFoods([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RECIPES_KEY);
        if (saved) setRecipes(JSON.parse(saved));
      } catch (error) {
        if (__DEV__) console.error('[Recipe] Failed to load cached recipes:', error.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const saveRecipe = useCallback(async (name, ingredients, servings, emoji = '🍳') => {
    if (!user || !user.id) {
      throw new Error('User not found. Please log in again.');
    }

    if (!(await checkOnline())) {
      showOfflineAlert('save recipe');
      throw new Error('No internet connection');
    }

    const totalMacros = ingredients.reduce(
      (acc, ingredient) => ({
        calories: acc.calories + (ingredient.calories || 0),
        protein: acc.protein + (ingredient.protein || 0),
        carbs: acc.carbs + (ingredient.carbs || 0),
        fat: acc.fat + (ingredient.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const servingCount = Math.max(1, servings);
    const perServing = {
      calories: Math.round(totalMacros.calories / servingCount),
      protein: Math.round(totalMacros.protein / servingCount),
      carbs: Math.round(totalMacros.carbs / servingCount),
      fat: Math.round(totalMacros.fat / servingCount),
    };

    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          name: name.trim(),
          emoji,
          servings: servingCount,
          total_calories: totalMacros.calories,
          total_protein: totalMacros.protein,
          total_carbs: totalMacros.carbs,
          total_fat: totalMacros.fat,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      const ingredientRows = ingredients.map((ing) => ({
        recipe_id: recipeData.id,
        food_name: ing.name,
        serving_size: ing.serving || '1 serving',
        calories: ing.calories || 0,
        protein: ing.protein || 0,
        carbs: ing.carbs || 0,
        fat: ing.fat || 0,
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientRows);

      if (ingredientsError) {
        await supabase.from('recipes').delete().eq('id', recipeData.id);
        throw ingredientsError;
      }

      const recipe = {
        id: recipeData.id,
        name,
        emoji,
        ingredients,
        servings: servingCount,
        totalMacros,
        ...perServing,
        serving: `1/${servingCount} recipe`,
        servingSize: 1,
        servingUnit: 'serving',
        isRecipe: true,
        createdAt: recipeData.created_at,
      };

      const updatedRecipes = [...recipesRef.current, recipe];
      setRecipes(updatedRecipes);

      try {
        await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(updatedRecipes));
      } catch (cacheError) {
        if (__DEV__) console.error('[Recipe] Failed to cache:', cacheError.message);
      }

      await triggerHaptic('success');
      return recipe;
    } catch (error) {
      if (__DEV__) console.error('[Recipe] Failed to save:', error.message);
      throw error;
    }
  }, [user, checkOnline, showOfflineAlert, triggerHaptic]);

  const updateRecipe = useCallback(async (recipeId, updates) => {
    const updatedRecipes = recipesRef.current.map((r) =>
      r.id === recipeId ? { ...r, ...updates } : r
    );
    setRecipes(updatedRecipes);

    try {
      await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(updatedRecipes));
    } catch (error) {
      if (__DEV__) console.error('[Recipe] Failed to update cache:', error.message);
    }

    await triggerHaptic('success');
  }, [triggerHaptic]);

  const deleteRecipe = useCallback(async (recipeId) => {
    const filtered = recipesRef.current.filter((r) => r.id !== recipeId);
    setRecipes(filtered);

    try {
      await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(filtered));
    } catch (error) {
      if (__DEV__) console.error('[Recipe] Failed to delete from cache:', error.message);
    }

    await triggerHaptic('light');
  }, [triggerHaptic]);

  const fetchRecentFoods = useCallback(async () => {
    if (!user) return;

    setRecentFoodsLoading(true);

    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('name, calories, protein, carbs, fat, serving, serving_size, serving_unit, created_at')
        .eq('user_id', user.id)
        .neq('name', 'Water')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (__DEV__) console.error('[Recipe] Error fetching recent foods:', error.message);
        setRecentFoods([]);
        setRecentFoodsLoading(false);
        return;
      }

      const seenNames = new Set();
      const uniqueFoods = [];

      for (const item of data || []) {
        const normalizedName = (item.name || '').toLowerCase().trim();
        if (normalizedName && !seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniqueFoods.push({
            id: `recent-${Date.now()}-${uniqueFoods.length}`,
            name: item.name,
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            serving: item.serving || '1 serving',
            servingSize: item.serving_size || 1,
            servingUnit: item.serving_unit || 'serving',
            isRecent: true,
          });

          if (uniqueFoods.length >= 50) break;
        }
      }

      setRecentFoods(uniqueFoods);
    } catch (error) {
      if (__DEV__) console.error('[Recipe] Failed to fetch recent foods:', error.message);
      setRecentFoods([]);
    } finally {
      setRecentFoodsLoading(false);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      recipes,
      recentFoods,
      recentFoodsLoading,
      isLoading,
      saveRecipe,
      updateRecipe,
      deleteRecipe,
      fetchRecentFoods,
    }),
    [recipes, recentFoods, recentFoodsLoading, isLoading, saveRecipe, updateRecipe, deleteRecipe, fetchRecentFoods]
  );

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}
