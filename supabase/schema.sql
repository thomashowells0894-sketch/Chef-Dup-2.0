-- NutriChef Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
-- Note: Supabase Auth handles the auth.users table automatically
-- This table extends user profiles with app-specific data

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'User',
    avatar_url TEXT,

    -- Biometrics
    age INTEGER DEFAULT 30,
    gender TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female')),
    height_cm NUMERIC(5,1) DEFAULT 175,
    weight_kg NUMERIC(5,1) DEFAULT 75,
    activity_level TEXT DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'athlete')),
    goal TEXT DEFAULT 'maintain' CHECK (goal IN ('lose_weight', 'build_muscle', 'maintain')),

    -- Dietary Preferences
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_keto BOOLEAN DEFAULT FALSE,
    allergies TEXT[] DEFAULT '{}',

    -- Goals
    daily_calorie_goal INTEGER DEFAULT 2000,
    daily_protein_goal INTEGER DEFAULT 150,
    daily_carb_goal INTEGER DEFAULT 200,
    daily_fat_goal INTEGER DEFAULT 65,
    water_goal_ml INTEGER DEFAULT 2500,

    -- Tracking
    water_intake_ml INTEGER DEFAULT 0,
    water_intake_date DATE DEFAULT CURRENT_DATE,
    total_saved NUMERIC(10,2) DEFAULT 0,

    -- Subscription
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    free_scans_remaining INTEGER DEFAULT 3,

    -- Streaks
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,

    -- Fasting State (stored as JSONB for flexibility)
    fasting_state JSONB DEFAULT '{"isFasting": false, "startTime": null, "targetHours": 16}'::JSONB,

    -- App Settings
    notifications_enabled BOOLEAN DEFAULT TRUE,
    theme TEXT DEFAULT 'light',
    connected_devices TEXT[] DEFAULT '{}',

    -- Metadata
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEIGHT HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5,1) NOT NULL,
    logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, logged_at)
);

-- ============================================
-- PANTRY ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 1.0,
    image_url TEXT,

    -- Nutritional info per 100g
    calories INTEGER,
    protein NUMERIC(5,1),
    carbs NUMERIC(5,1),
    fat NUMERIC(5,1),

    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at DATE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ============================================
-- MEAL LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    meal_date DATE NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

    -- Food item details
    food_name TEXT NOT NULL,
    food_id TEXT, -- Reference to recipe or barcode
    food_source TEXT DEFAULT 'manual' CHECK (food_source IN ('manual', 'barcode', 'ai_scan', 'recipe', 'quick_add')),

    -- Serving info
    serving_size NUMERIC(8,2) DEFAULT 1,
    serving_unit TEXT DEFAULT 'serving',

    -- Nutritional values for this entry
    calories INTEGER NOT NULL DEFAULT 0,
    protein NUMERIC(6,1) DEFAULT 0,
    carbs NUMERIC(6,1) DEFAULT 0,
    fat NUMERIC(6,1) DEFAULT 0,
    fiber NUMERIC(6,1) DEFAULT 0,
    sugar NUMERIC(6,1) DEFAULT 0,
    sodium NUMERIC(8,1) DEFAULT 0,

    -- Micronutrients
    iron NUMERIC(6,2),
    calcium NUMERIC(8,1),
    vitamin_a NUMERIC(8,1),
    vitamin_c NUMERIC(8,1),
    potassium NUMERIC(8,1),

    -- Metadata
    is_completed BOOLEAN DEFAULT TRUE,
    notes TEXT,
    image_url TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RECIPES (User's saved/generated recipes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    source_url TEXT, -- For imported recipes

    -- Recipe details
    servings INTEGER DEFAULT 1,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,

    -- Nutritional values per serving
    calories INTEGER,
    protein NUMERIC(6,1),
    carbs NUMERIC(6,1),
    fat NUMERIC(6,1),
    fiber NUMERIC(6,1),
    sugar NUMERIC(6,1),
    sodium NUMERIC(8,1),

    -- Dietary flags
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_keto BOOLEAN DEFAULT FALSE,

    -- Recipe content (JSONB for flexibility)
    ingredients JSONB NOT NULL DEFAULT '[]'::JSONB,
    steps JSONB NOT NULL DEFAULT '[]'::JSONB,
    missing_ingredients TEXT[] DEFAULT '{}',

    -- User interaction
    is_favorite BOOLEAN DEFAULT FALSE,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    times_cooked INTEGER DEFAULT 0,

    -- Cost savings
    estimated_cost NUMERIC(8,2),
    savings NUMERIC(8,2) DEFAULT 0,

    -- Metadata
    is_public BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WORKOUT SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    workout_name TEXT,
    workout_type TEXT CHECK (workout_type IN ('Strength', 'Yoga', 'HIIT', 'Calisthenics', 'Cardio', 'Custom')),

    -- Session stats
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    total_volume NUMERIC(10,1) DEFAULT 0, -- For strength training

    -- Exercise details (JSONB array of exercises with sets/reps)
    exercises JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Metadata
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    completed BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FASTING HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.fasting_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    target_hours NUMERIC(4,1) NOT NULL,
    actual_hours NUMERIC(5,2),

    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PROGRESS PHOTOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.progress_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    photo_url TEXT NOT NULL, -- Supabase Storage URL
    weight_kg NUMERIC(5,1),
    notes TEXT,

    taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SHOPPING LIST
-- ============================================
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    quantity NUMERIC(8,2),
    unit TEXT,

    recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,

    is_checked BOOLEAN DEFAULT FALSE,
    category TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CUSTOM FOODS (User-created food entries)
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,

    serving_size NUMERIC(8,2) NOT NULL,
    serving_unit TEXT NOT NULL,

    calories INTEGER NOT NULL,
    protein NUMERIC(6,1),
    carbs NUMERIC(6,1),
    fat NUMERIC(6,1),
    fiber NUMERIC(6,1),
    sugar NUMERIC(6,1),
    sodium NUMERIC(8,1),

    category TEXT,
    is_verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BARCODE CACHE (Cache barcode lookups)
-- ============================================
CREATE TABLE IF NOT EXISTS public.barcode_cache (
    barcode TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    brand TEXT,

    serving_size NUMERIC(8,2),
    serving_unit TEXT,

    calories INTEGER,
    protein NUMERIC(6,1),
    carbs NUMERIC(6,1),
    fat NUMERIC(6,1),
    fiber NUMERIC(6,1),
    sugar NUMERIC(6,1),
    sodium NUMERIC(8,1),

    image_url TEXT,
    source TEXT DEFAULT 'openfoodfacts',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs(user_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON public.meal_logs(meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON public.workout_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_pantry_items_user ON public.pantry_items(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_fasting_logs_user ON public.fasting_logs(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user ON public.progress_photos(user_id, taken_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasting_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own weight logs" ON public.weight_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own pantry" ON public.pantry_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own meals" ON public.meal_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recipes" ON public.recipes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workouts" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own fasting" ON public.fasting_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own photos" ON public.progress_photos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own shopping" ON public.shopping_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own foods" ON public.custom_foods FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_logs_updated_at BEFORE UPDATE ON public.meal_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_foods_updated_at BEFORE UPDATE ON public.custom_foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reset daily water intake at midnight
CREATE OR REPLACE FUNCTION reset_daily_water()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET water_intake_ml = 0, water_intake_date = CURRENT_DATE
    WHERE water_intake_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily nutrition summary
CREATE OR REPLACE FUNCTION get_daily_nutrition(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_calories INTEGER,
    total_protein NUMERIC,
    total_carbs NUMERIC,
    total_fat NUMERIC,
    meal_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(calories), 0)::INTEGER AS total_calories,
        COALESCE(SUM(protein), 0) AS total_protein,
        COALESCE(SUM(carbs), 0) AS total_carbs,
        COALESCE(SUM(fat), 0) AS total_fat,
        COUNT(*)::INTEGER AS meal_count
    FROM public.meal_logs
    WHERE user_id = p_user_id AND meal_date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- Create these storage buckets in Supabase Dashboard:
-- 1. progress-photos (private, 5MB limit per file)
-- 2. recipe-images (public, 2MB limit per file)
-- 3. avatars (public, 1MB limit per file)

-- Storage policies (example for progress-photos):
-- INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
-- SELECT: auth.uid() = (storage.foldername(name))[1]::uuid
-- DELETE: auth.uid() = (storage.foldername(name))[1]::uuid
