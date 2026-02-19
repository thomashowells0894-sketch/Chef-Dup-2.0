/**
 * FoodContext - Backward-compatible wrapper
 *
 * This file now delegates to the focused contexts (MealContext + RecipeContext).
 * All existing `useFood()` consumers continue to work without any import changes.
 *
 * New code should import from MealContext or RecipeContext directly for
 * narrower subscriptions and fewer re-renders.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { MealProvider, useMeals } from './MealContext';
import { RecipeProvider, useRecipes } from './RecipeContext';

type FoodContextValue = ReturnType<typeof useMeals> & {
  recipes: ReturnType<typeof useRecipes>['recipes'];
  recentFoods: ReturnType<typeof useRecipes>['recentFoods'];
  recentFoodsLoading: ReturnType<typeof useRecipes>['recentFoodsLoading'];
  saveRecipe: ReturnType<typeof useRecipes>['saveRecipe'];
  updateRecipe: ReturnType<typeof useRecipes>['updateRecipe'];
  deleteRecipe: ReturnType<typeof useRecipes>['deleteRecipe'];
  fetchRecentFoods: ReturnType<typeof useRecipes>['fetchRecentFoods'];
};

const FoodContext = createContext<FoodContextValue | null>(null);

/**
 * Inner component that merges MealContext + RecipeContext values
 * into a single object matching the original useFood() shape.
 */
function FoodBridge({ children }: { children: React.ReactNode }) {
  const meals = useMeals();
  const recipes = useRecipes();

  const value = useMemo<FoodContextValue>(
    () => ({
      // Everything from MealContext (bulk of the API)
      ...meals,

      // Recipe fields (overlay onto meals)
      recipes: recipes.recipes,
      recentFoods: recipes.recentFoods,
      recentFoodsLoading: recipes.recentFoodsLoading,

      // Recipe actions
      saveRecipe: recipes.saveRecipe,
      updateRecipe: recipes.updateRecipe,
      deleteRecipe: recipes.deleteRecipe,
      fetchRecentFoods: recipes.fetchRecentFoods,
    }),
    [meals, recipes]
  );

  return <FoodContext.Provider value={value}>{children}</FoodContext.Provider>;
}

/**
 * FoodProvider - wraps MealProvider + RecipeProvider and bridges them.
 * Drop-in replacement for the original FoodProvider.
 */
export function FoodProvider({ children }: { children: React.ReactNode }) {
  return (
    <MealProvider>
      <RecipeProvider>
        <FoodBridge>{children}</FoodBridge>
      </RecipeProvider>
    </MealProvider>
  );
}

/**
 * useFood - backward-compatible hook.
 * Returns merged MealContext + RecipeContext values.
 */
export function useFood(): FoodContextValue {
  const context = useContext(FoodContext);
  if (!context) {
    throw new Error('useFood must be used within a FoodProvider');
  }
  return context;
}
