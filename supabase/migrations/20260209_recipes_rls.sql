-- ============================================================================
-- FuelIQ Recipes RLS Migration
-- Date: 2026-02-09
-- Purpose: Add RLS policies for recipes and recipe_ingredients tables
-- ============================================================================

-- Enable RLS on recipes tables
ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RECIPES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "recipes_select_own" ON recipes;
DROP POLICY IF EXISTS "recipes_insert_own" ON recipes;
DROP POLICY IF EXISTS "recipes_update_own" ON recipes;
DROP POLICY IF EXISTS "recipes_delete_own" ON recipes;

CREATE POLICY "recipes_select_own" ON recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "recipes_insert_own" ON recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes_update_own" ON recipes
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipes_delete_own" ON recipes
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RECIPE_INGREDIENTS TABLE POLICIES
-- Secured via join to recipes table (user owns parent recipe)
-- ============================================================================

DROP POLICY IF EXISTS "recipe_ingredients_select_own" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_insert_own" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_update_own" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_delete_own" ON recipe_ingredients;

CREATE POLICY "recipe_ingredients_select_own" ON recipe_ingredients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid())
    );

CREATE POLICY "recipe_ingredients_insert_own" ON recipe_ingredients
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid())
    );

CREATE POLICY "recipe_ingredients_update_own" ON recipe_ingredients
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "recipe_ingredients_delete_own" ON recipe_ingredients
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid())
    );

-- Revoke public access
REVOKE ALL ON recipes FROM anon;
REVOKE ALL ON recipe_ingredients FROM anon;

-- Grant authenticated user access
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_ingredients TO authenticated;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
