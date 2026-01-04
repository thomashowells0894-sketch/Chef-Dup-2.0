
import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Recipe, Ingredient, User, MealPlanEntry, WorkoutPlan, WorkoutSession, RecipeIngredient, MealType, CustomFood, ProgressPhoto, MenuItem, FoodItem } from './types';
import * as StorageService from './services/storage';
import * as AIService from './services/aiService';
import * as AuthService from './services/auth';

import CameraView from './components/CameraView';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import CookingSession from './components/CookingSession';
import ShoppingList from './components/ShoppingList';
import PaywallScreen from './components/PaywallScreen';
import ShareCard from './components/ShareCard';
import PantryScreen from './components/PantryScreen';
import ProfileSettings from './components/ProfileSettings'; 
import OnboardingScreen from './components/OnboardingScreen';
import AuthScreen from './components/AuthScreen';
import MealPlanner from './components/MealPlanner'; 
import FitnessScreen from './components/FitnessScreen';
import ActiveWorkoutScreen from './components/ActiveWorkoutScreen';
import FastTimer from './components/FastTimer'; 
import { TrendsScreen } from './components/TrendsScreen';
import CustomFoodCreator from './components/CustomFoodCreator'; 
import ProgressGallery from './components/ProgressGallery'; 
import RestaurantMenuScreen from './components/RestaurantMenuScreen'; 
import RecipeImporter from './components/RecipeImporter'; 
import FoodLogModal from './components/FoodLogModal'; 
import IngredientEditor from './components/IngredientEditor'; 
import CoachTip from './components/CoachTip';

import { 
  Camera, ChefHat, User as UserIcon, Calendar, Dumbbell, 
  Home, Search, Plus, PieChart, Check, X, Flame, Zap, Droplet, Wheat, Settings,
  Sunrise, Sun, Moon, Coffee, ArrowRight, Minus, Scale, ChevronRight, BarChart2, RotateCcw
} from 'lucide-react';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>(Screen.AUTH); 
  const [user, setUser] = useState<User | null>(null);
  
  // Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutSession[]>([]);
  
  // UI State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeWorkoutPlan, setActiveWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItem, setScannedItem] = useState<RecipeIngredient | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false); 
  const [analyzedMenuItems, setAnalyzedMenuItems] = useState<MenuItem[]>([]);
  
  // New Food Logger State
  const [showFoodLogger, setShowFoodLogger] = useState(false);
  const [logMealType, setLogMealType] = useState<MealType>('breakfast');

  // Initial Auth Check
  useEffect(() => {
    const session = AuthService.getSession();
    if (session) {
      setUser(session);
      loadUserData(session.id);
    } else {
      setScreen(Screen.AUTH);
    }
  }, []);

  const loadUserData = (userId: string) => {
    const loadedProfile = StorageService.getProfile(userId);
    setProfile(loadedProfile);
    setPantry(StorageService.getPantry(userId));
    setMealPlan(StorageService.getMealPlan(userId));
    setWorkoutLogs(StorageService.getWorkoutLogs(userId));

    if (!loadedProfile.hasCompletedOnboarding) {
        setScreen(Screen.ONBOARDING);
    } else {
        setScreen(Screen.HOME);
    }
  };

  // --- Auth Handlers ---

  const handleAuthSuccess = () => {
    const session = AuthService.getSession();
    if (session) {
      setUser(session);
      loadUserData(session.id);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setProfile(null);
    setPantry([]);
    setRecipes([]);
    setWorkoutLogs([]);
    setScreen(Screen.AUTH);
  };

  // --- App Handlers ---

  const handleOnboardingComplete = (name: string, diet: { isVegan: boolean, isKeto: boolean, isGlutenFree: boolean }, biometrics?: Partial<UserProfile>) => {
      if (!user) return;
      const fullProfile = {
          name,
          isVegan: diet.isVegan,
          isKeto: diet.isKeto,
          isGlutenFree: diet.isGlutenFree,
          ...biometrics
      };
      const updated = StorageService.completeOnboarding(user.id, fullProfile);
      setProfile(updated);
      setScreen(Screen.HOME);
  };

  const handleStartScan = () => {
    if (!profile) return;
    if (profile.freeScansRemaining <= 0 && !profile.isSubscribed) {
      setScreen(Screen.PAYWALL);
    } else {
      setScreen(Screen.CAMERA);
    }
  };

  const handleOpenPantry = () => {
    if (!user) return;
    setPantry(StorageService.getPantry(user.id));
    setScreen(Screen.PANTRY);
  };

  const handleOpenLogger = (type: MealType) => {
      setLogMealType(type);
      setShowFoodLogger(true);
  };

  const handleAddDirectFood = (item: FoodItem) => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const entry: MealPlanEntry = {
          id: `log_${Date.now()}`,
          date: today,
          mealType: logMealType,
          isCompleted: true,
          isQuickAdd: true,
          recipe: {
              id: item.id,
              title: item.name,
              description: '',
              ingredients: [],
              missingIngredients: [],
              steps: [],
              imageUrl: '',
              isVegan: false, isGlutenFree: false, isKeto: false,
              servings: 1,
              calories: item.calories,
              protein: item.protein, carbs: item.carbs, fat: item.fat,
              sugar: 0, fiber: 0, sodium: 0,
              prepTimeMinutes: 0, savings: 0,
              iron: item.iron,
              calcium: item.calcium,
              vitaminA: item.vitaminA,
              vitaminC: item.vitaminC
          }
      };
      const updated = StorageService.addToMealPlan(user.id, entry);
      setMealPlan(updated);
      setShowFoodLogger(false);
  };

  const handleUpdatePantry = (updatedIngredients: Ingredient[]) => {
      if (!user) return;
      setPantry(updatedIngredients);
      StorageService.savePantry(user.id, updatedIngredients);
  };

  const handleGenerateRecipes = async (ingredients: Ingredient[]) => {
    if (!profile) return;
    setIsProcessing(true);
    const generatedRecipes = await AIService.generateRecipes(ingredients, profile);
    setRecipes(generatedRecipes);
    setIsProcessing(false);
    setScreen(Screen.RECIPES);
  };

  const handleImageCaptured = async (imageData: string) => {
    if (!user || !profile) return;
    setIsProcessing(true);
    const detectedIngredients = await AIService.analyzeFridge(imageData);
    const updatedPantry = StorageService.addToPantry(user.id, detectedIngredients);
    setPantry(updatedPantry);
    const updatedProfile = StorageService.decrementScans(user.id);
    setProfile(updatedProfile);
    const generatedRecipes = await AIService.generateRecipes(updatedPantry, updatedProfile);
    setRecipes(generatedRecipes);
    setIsProcessing(false);
    setScreen(Screen.RECIPES);
  };

  const handleMenuScan = async (imageData: string) => {
      if (!profile) return;
      setIsProcessing(true);
      const items = await AIService.analyzeMenu(imageData, profile);
      setAnalyzedMenuItems(items);
      setIsProcessing(false);
      setScreen(Screen.RESTAURANT_MENU);
  };

  const handleLogMenuItem = (item: MenuItem) => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const entry: MealPlanEntry = {
          id: `rest_${Date.now()}`,
          date: today,
          mealType: 'lunch',
          isCompleted: true,
          isQuickAdd: true,
          recipe: {
              id: item.id,
              title: item.name,
              description: item.description,
              ingredients: [],
              missingIngredients: [],
              steps: [],
              imageUrl: '',
              isVegan: false, isGlutenFree: false, isKeto: false,
              servings: 1,
              calories: item.calories,
              protein: item.protein, carbs: item.carbs, fat: item.fat,
              sugar: 0, fiber: 0, sodium: 0,
              prepTimeMinutes: 0, savings: 0
          }
      };
      const updated = StorageService.addToMealPlan(user.id, entry);
      setMealPlan(updated);
      setScreen(Screen.HOME);
  };

  const handleBarcodeScanned = async (barcode: string) => {
      if (!user || !profile) return;
      setIsProcessing(true);
      try {
          const item = await AIService.lookupBarcode(barcode);
          setScannedItem(item);
          setScreen(Screen.HOME); 
      } catch (e) {
          alert("Product not found");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAddScannedToPantry = () => {
      if (!user || !scannedItem) return;
      const newIng: Ingredient = {
          id: `scan_${Date.now()}`,
          name: scannedItem.name,
          confidence: 1.0,
          addedAt: Date.now()
      };
      const updated = StorageService.addToPantry(user.id, [newIng]);
      setPantry(updated);
      setScannedItem(null);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setScreen(Screen.RECIPE_DETAIL);
  };

  const handleStartCooking = () => {
      setScreen(Screen.COOKING);
  };

  const handleGoToShop = () => {
      setScreen(Screen.SHOPPING);
  };

  const handleAddToShoppingList = (items: string[]) => {
      if(!user) return;
      StorageService.addItemsToShoppingList(user.id, items, selectedRecipe?.id);
  };

  const handleFinishCooking = () => {
    if (selectedRecipe && user) {
      const updatedProfile = StorageService.updateSavings(user.id, selectedRecipe.savings);
      setProfile(updatedProfile);
      setScreen(Screen.SHARE);
    }
  };

  const handleSubscribe = () => {
    if (!user) return;
    const updated = StorageService.setSubscriptionStatus(user.id, true);
    setProfile(updated);
    setScreen(Screen.CAMERA);
  };

  const handleToggleVegan = () => {
    if (!user || !profile) return;
    const updated = StorageService.toggleVegan(user.id);
    setProfile(updated);
    if (pantry.length > 0) {
        setIsProcessing(true);
        AIService.generateRecipes(pantry, updated).then(res => {
            setRecipes(res);
            setIsProcessing(false);
        });
    }
  };
  
  const handleToggleFavorite = (id: string) => {
      if (!user) return;
      const updated = StorageService.toggleFavorite(user.id, id);
      setProfile(updated);
  };

  const handleRateRecipe = (rating: number) => {
    if (user && selectedRecipe) {
        const updated = StorageService.rateRecipe(user.id, selectedRecipe.id, rating);
        setProfile(updated);
    }
  };
  
  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
      if (!user) return;
      const updated = StorageService.updatePreferences(user.id, updates);
      setProfile(updated);
  };

  const handleWaterUpdate = (amount: number) => {
      if (!user || !profile) return;
      const updated = StorageService.updateWaterIntake(user.id, amount);
      setProfile(updated);
  };

  const handleWeightUpdate = (newWeight: number) => {
      if (!user) return;
      const updated = StorageService.logWeight(user.id, newWeight);
      setProfile(updated);
      setShowWeightModal(false);
  };

  const handleToggleFasting = () => {
      if (!user || !profile) return;
      const updated = StorageService.toggleFasting(user.id);
      setProfile(updated);
  };

  const handleSetFastingTarget = (hours: number) => {
      if (!user || !profile) return;
      const updated = StorageService.setFastingTarget(user.id, hours);
      setProfile(updated);
  };

  const handleQuickAddCalories = (calories: number, type: MealType = 'snack') => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const entry: MealPlanEntry = {
          id: `quick_${Date.now()}`,
          date: today,
          mealType: type,
          isCompleted: true,
          isQuickAdd: true,
          recipe: {
              id: 'quick_add_mock',
              title: 'Quick Add',
              description: '',
              ingredients: [],
              missingIngredients: [],
              steps: [],
              imageUrl: '',
              isVegan: true, isGlutenFree: true, isKeto: true,
              servings: 1,
              calories: calories,
              protein: 0, carbs: 0, fat: 0,
              sugar: 0, fiber: 0, sodium: 0,
              prepTimeMinutes: 0,
              savings: 0
          }
      };
      const updated = StorageService.addToMealPlan(user.id, entry);
      setMealPlan(updated);
      setShowQuickAddModal(false);
  };

  const handleCopyYesterday = (type: MealType) => {
      if (!user) return;
      const updated = StorageService.copyYesterdayMeal(user.id, type);
      setMealPlan(updated);
      alert(`Yesterday's ${type} copied!`);
  };

  const handleSaveCustomFood = (food: CustomFood) => {
      if (!user) return;
      StorageService.saveCustomFood(user.id, food);
      const newIng: Ingredient = {
          id: food.id,
          name: food.name,
          confidence: 1.0,
          addedAt: Date.now()
      };
      const updated = StorageService.addToPantry(user.id, [newIng]);
      setPantry(updated);
      setScreen(Screen.PANTRY);
  };

  const handleAddProgressPhoto = (photo: ProgressPhoto) => {
      if (!user) return;
      try {
          StorageService.saveProgressPhoto(user.id, photo);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleDeleteProgressPhoto = (photoId: string) => {
      if (!user) return;
      StorageService.deleteProgressPhoto(user.id, photoId);
  };

  const handleImportRecipe = (recipe: Recipe) => {
      setRecipes(prev => [recipe, ...prev]);
      setSelectedRecipe(recipe);
      setScreen(Screen.RECIPE_DETAIL);
  };

  const handleAddToPlan = (recipe: Recipe) => {
      if(!user) return;
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      let type: MealType = 'snack';
      if (hour >= 4 && hour < 11) type = 'breakfast';
      else if (hour >= 11 && hour < 16) type = 'lunch';
      else if (hour >= 16 && hour < 22) type = 'dinner';

      const entry: MealPlanEntry = {
          id: `manual_${Date.now()}`,
          date: today, 
          mealType: type,
          recipe: recipe,
          isCompleted: false
      };
      const updated = StorageService.addToMealPlan(user.id, entry);
      setMealPlan(updated);
      alert(`Added to today's ${type}!`);
  };

  const handleAutoGeneratePlan = async () => {
      if(!user || !profile) return;
      setIsProcessing(true);
      const plan = await AIService.generateWeeklyPlan(pantry, profile);
      StorageService.saveMealPlan(user.id, plan);
      setMealPlan(plan);
      setIsProcessing(false);
  };

  const handleStartWorkoutPlan = (plan: WorkoutPlan | null) => {
      setActiveWorkoutPlan(plan);
      setScreen(Screen.ACTIVE_WORKOUT);
  };

  const handleFinishWorkout = (session: WorkoutSession) => {
      if (!user) return;
      StorageService.saveWorkoutLog(user.id, session);
      setWorkoutLogs(prev => [session, ...prev]);
      setScreen(Screen.FITNESS_HOME);
  };

  const handleBulkEditSave = (ingredients: Ingredient[]) => {
      handleUpdatePantry(ingredients);
      handleGenerateRecipes(ingredients);
  };

  const handleExportData = () => {
      if (!user) return;
      const csv = StorageService.generateUserReportCSV(user.id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrichef_data_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
  };

  const getDashboardData = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysMeals = mealPlan.filter(p => p.date === todayStr);
    const todaysWorkouts = workoutLogs.filter(w => w.date.startsWith(todayStr));
    
    const consumed = todaysMeals.reduce((acc, m) => acc + m.recipe.calories, 0);
    // Add mock calories from wearables if connected
    const wearableBurn = (profile?.connectedDevices?.length || 0) > 0 ? 350 : 0;
    const burned = todaysWorkouts.reduce((acc, w) => acc + w.caloriesBurned, 0) + wearableBurn;
    
    const goal = profile?.dailyCalorieGoal || 2000;
    const remaining = goal - consumed + burned;

    const macros = todaysMeals.reduce((acc, m) => {
        acc.p += m.recipe.protein;
        acc.c += m.recipe.carbs;
        acc.f += m.recipe.fat;
        return acc;
    }, { p: 0, c: 0, f: 0 });

    const mealsByType = {
        breakfast: todaysMeals.filter(m => m.mealType === 'breakfast'),
        lunch: todaysMeals.filter(m => m.mealType === 'lunch'),
        dinner: todaysMeals.filter(m => m.mealType === 'dinner'),
        snack: todaysMeals.filter(m => m.mealType === 'snack')
    };

    return { consumed, burned, goal, remaining, mealsByType, macros };
  };

  const MealCard = ({ title, icon: Icon, entries, target, color, onAdd, onSelect, onCopyYesterday }: any) => {
    const totalCals = entries.reduce((acc: number, m: any) => acc + m.recipe.calories, 0);
    const theme = {
        amber: 'from-amber-400 to-orange-500',
        orange: 'from-orange-400 to-red-500',
        indigo: 'from-blue-500 to-indigo-600',
        purple: 'from-purple-400 to-fuchsia-600',
    }[color] || 'from-slate-400 to-slate-500';

    return (
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100/50 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme} flex items-center justify-center text-white shadow-md`}>
                        <Icon size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{title}</h3>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {totalCals} / {target} kcal
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCopyYesterday}
                        className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 flex items-center justify-center transition-all"
                    >
                        <RotateCcw size={16} strokeWidth={2} />
                    </button>
                    <button 
                        onClick={onAdd} 
                        className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-all"
                    >
                        <Plus size={16} strokeWidth={3} />
                    </button>
                </div>
            </div>
            <div className="space-y-3">
                {entries.length > 0 ? (
                    entries.map((entry: any) => (
                        <div 
                            key={entry.id} 
                            onClick={entry.isQuickAdd ? undefined : () => onSelect(entry)}
                            className={`flex gap-3 items-center group p-1.5 -mx-1.5 hover:bg-slate-50 rounded-xl transition-colors ${entry.isQuickAdd ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            {entry.isQuickAdd ? (
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">Quick</div>
                            ) : (
                                <img 
                                    src={entry.recipe.imageUrl} 
                                    className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" 
                                    alt={entry.recipe.title}
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-700 leading-tight truncate">
                                    {entry.recipe.title}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                    <span className="font-medium text-slate-500">{entry.recipe.calories} cal</span>
                                    {!entry.isQuickAdd && (
                                        <>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-emerald-600 font-bold">{entry.recipe.protein}g Prot</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {!entry.isQuickAdd && <ChevronRight size={16} className="text-slate-300" />}
                        </div>
                    ))
                ) : (
                    <div onClick={onAdd} className="h-12 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center text-slate-300 gap-2 text-xs font-bold hover:border-slate-300 hover:text-slate-400 cursor-pointer transition-all">
                        Tap to log {title}
                    </div>
                )}
            </div>
        </div>
    );
  };

  const BottomNav = () => (
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe pt-2 px-4 flex justify-between items-center z-40 h-[88px]">
          <button onClick={() => setScreen(Screen.HOME)} className={`flex flex-col items-center gap-1 transition-colors p-2 ${screen === Screen.HOME ? 'text-slate-900' : 'text-slate-400'}`}>
              <Home size={22} strokeWidth={screen === Screen.HOME ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Today</span>
          </button>
          <button onClick={() => setScreen(Screen.PLANNER)} className={`flex flex-col items-center gap-1 transition-colors p-2 ${screen === Screen.PLANNER ? 'text-slate-900' : 'text-slate-400'}`}>
              <Calendar size={22} strokeWidth={screen === Screen.PLANNER ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Plan</span>
          </button>
          <div className="relative -top-6">
              <button 
                onClick={handleStartScan}
                className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-2xl shadow-slate-900/40 hover:scale-105 active:scale-95 transition-all border-4 border-slate-50"
              >
                  <Camera size={26} />
              </button>
          </div>
          <button onClick={() => setScreen(Screen.PROFILE)} className={`flex flex-col items-center gap-1 transition-colors p-2 ${screen === Screen.PROFILE ? 'text-slate-900' : 'text-slate-400'}`}>
              <UserIcon size={22} strokeWidth={screen === Screen.PROFILE ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Me</span>
          </button>
      </div>
  );

  const HealthRing = ({ size = 140, stroke = 8, progress, color, children }: any) => {
    const radius = size / 2;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg height={size} width={size} className="rotate-[-90deg] absolute inset-0">
                <circle stroke={color} strokeWidth={stroke} strokeOpacity="0.15" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                <circle 
                    stroke={color} 
                    strokeWidth={stroke} 
                    strokeDasharray={circumference + ' ' + circumference} 
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out', strokeLinecap: 'round' }} 
                    fill="transparent" 
                    r={normalizedRadius} 
                    cx={radius} 
                    cy={radius} 
                />
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
                {children}
            </div>
        </div>
    );
  };

  const MiniMacroRing = ({ percentage, color, label, value, unit, icon: Icon }: any) => (
      <div className="flex flex-col items-center gap-2">
           <div className="relative">
                <HealthRing size={56} stroke={4} progress={percentage} color={color}>
                    <Icon size={16} style={{ color }} />
                </HealthRing>
           </div>
           <div className="text-center">
                <div className="text-sm font-black text-slate-800">{value}<span className="text-[10px] text-slate-400 font-bold ml-0.5">{unit}</span></div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
           </div>
      </div>
  );

  const DashboardHero = ({ consumed, goal, remaining, burned, macros, profile }: any) => {
      const calorieProgress = Math.min((consumed / goal) * 100, 100);
      return (
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div 
                    onClick={() => setScreen(Screen.TRENDS)}
                    className="cursor-pointer group"
                >
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                        <Flame size={20} className="text-orange-500 fill-orange-500" /> Daily Summary <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600" />
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mt-1">Today's Progress</p>
                </div>
                <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100 text-xs font-bold text-slate-500">
                    {Math.round(remaining)} kcal left
                </div>
            </div>
            <div className="flex items-center justify-between gap-6 relative z-10">
                <div className="shrink-0">
                    <HealthRing size={130} stroke={10} progress={calorieProgress} color="#F97316">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{consumed}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">kcal eaten</div>
                    </HealthRing>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                    <MiniMacroRing percentage={(macros.p / profile.dailyProteinGoal) * 100} color="#10B981" label="Protein" value={macros.p} unit="g" icon={Zap} />
                    <MiniMacroRing percentage={(macros.c / profile.dailyCarbGoal) * 100} color="#F59E0B" label="Carbs" value={macros.c} unit="g" icon={Wheat} />
                    <MiniMacroRing percentage={(macros.f / profile.dailyFatGoal) * 100} color="#F43F5E" label="Fat" value={macros.f} unit="g" icon={Droplet} />
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg"><Flame size={12} /></div>
                    <span>Activity Burn</span>
                </div>
                <span className="font-black text-slate-900">{burned} <span className="text-xs text-slate-400 font-bold">kcal</span></span>
            </div>
        </div>
      );
  };

  if (screen === Screen.AUTH) return <AuthScreen onSuccess={handleAuthSuccess} />;
  if (!user || !profile) return null;
  if (screen === Screen.ONBOARDING) return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  if (screen === Screen.CAMERA) {
      return (
          <CameraView 
            onCapture={handleImageCaptured} 
            onBarcodeScan={handleBarcodeScanned}
            onMenuScan={handleMenuScan}
            onClose={() => setScreen(Screen.HOME)} 
          />
      );
  }

  if (screen === Screen.PANTRY) {
      return (
          <PantryScreen 
            initialIngredients={pantry}
            onUpdatePantry={handleUpdatePantry}
            onGenerateRecipes={handleGenerateRecipes}
            onBack={() => setScreen(Screen.HOME)}
            onCreateCustomFood={() => setScreen(Screen.CUSTOM_FOOD)}
            onOpenBulkEdit={() => setScreen(Screen.INGREDIENT_EDITOR)}
          />
      );
  }

  if (screen === Screen.INGREDIENT_EDITOR) {
      return (
          <IngredientEditor
            initialIngredients={pantry}
            onSave={handleBulkEditSave}
            onCancel={() => setScreen(Screen.PANTRY)}
          />
      );
  }

  if (screen === Screen.RECIPES) {
      return (
          <RecipeList 
            recipes={recipes} 
            userProfile={profile} 
            onSelectRecipe={handleSelectRecipe}
            onToggleVegan={handleToggleVegan}
            onScanNew={() => setScreen(Screen.CAMERA)}
            onEditIngredients={() => setScreen(Screen.PANTRY)}
            onToggleFavorite={handleToggleFavorite}
            onImport={() => setScreen(Screen.RECIPE_IMPORT)}
            onAddToPlan={handleAddToPlan}
          />
      );
  }

  if (screen === Screen.RECIPE_IMPORT) {
      return (
          <RecipeImporter 
            onBack={() => setScreen(Screen.RECIPES)}
            onImportComplete={handleImportRecipe}
          />
      );
  }

  if (screen === Screen.RECIPE_DETAIL && selectedRecipe) {
      return (
          <RecipeDetail 
            recipe={selectedRecipe} 
            isSaved={profile.savedRecipeIds.includes(selectedRecipe.id)}
            userRating={profile.ratings[selectedRecipe.id] || 0}
            onBack={() => setScreen(Screen.RECIPES)}
            onCook={handleStartCooking}
            onShop={handleGoToShop}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlan={handleAddToPlan}
            onRate={handleRateRecipe}
            onAddToShoppingList={handleAddToShoppingList}
          />
      );
  }

  if (screen === Screen.COOKING && selectedRecipe) {
      return (
          <CookingSession 
            recipe={selectedRecipe} 
            onFinish={handleFinishCooking}
            onExit={() => setScreen(Screen.RECIPE_DETAIL)}
          />
      );
  }

  if (screen === Screen.SHOPPING && selectedRecipe) {
      return (
          <ShoppingList 
            recipe={selectedRecipe}
            userId={user.id}
            onContinue={handleStartCooking}
            onBack={() => setScreen(Screen.RECIPE_DETAIL)}
          />
      );
  }

  if (screen === Screen.PAYWALL) {
      return (
          <PaywallScreen 
            onSubscribe={handleSubscribe} 
            onClose={() => setScreen(Screen.HOME)}
          />
      );
  }

  if (screen === Screen.SHARE && selectedRecipe) {
      return (
          <ShareCard 
            recipe={selectedRecipe} 
            savings={selectedRecipe.savings} 
            onHome={() => setScreen(Screen.HOME)} 
          />
      );
  }

  if (screen === Screen.PROFILE) {
      return (
          <>
            <ProfileSettings 
                profile={profile} 
                workoutLogs={workoutLogs}
                onUpdate={handleUpdateProfile} 
                onBack={() => setScreen(Screen.HOME)}
                onLogout={handleLogout}
            />
            <BottomNav />
          </>
      );
  }

  if (screen === Screen.PLANNER) {
      return (
          <>
            <MealPlanner 
                plan={mealPlan} 
                onAutoGenerate={handleAutoGeneratePlan}
                onSelectRecipe={handleSelectRecipe}
                onBack={() => setScreen(Screen.HOME)}
                isLoading={isProcessing}
            />
            <BottomNav />
          </>
      );
  }

  if (screen === Screen.FITNESS_HOME) {
      return (
          <FitnessScreen 
            onBack={() => setScreen(Screen.HOME)}
            onStartPlan={handleStartWorkoutPlan}
            recentLogs={workoutLogs}
          />
      );
  }

  if (screen === Screen.ACTIVE_WORKOUT) {
      return (
          <ActiveWorkoutScreen 
            plan={activeWorkoutPlan}
            onFinish={handleFinishWorkout}
            onExit={() => setScreen(Screen.FITNESS_HOME)}
          />
      );
  }

  if (screen === Screen.TRENDS) {
      return (
          <TrendsScreen 
            profile={profile}
            mealHistory={mealPlan}
            onBack={() => setScreen(Screen.HOME)}
            onOpenGallery={() => setScreen(Screen.PROGRESS_GALLERY)}
            onExportData={handleExportData}
          />
      );
  }

  if (screen === Screen.PROGRESS_GALLERY) {
      return (
          <ProgressGallery 
            photos={StorageService.getProgressPhotos(user.id)}
            onAddPhoto={handleAddProgressPhoto}
            onDeletePhoto={handleDeleteProgressPhoto}
            onBack={() => setScreen(Screen.TRENDS)}
          />
      );
  }

  if (screen === Screen.CUSTOM_FOOD) {
      return (
          <CustomFoodCreator 
            onSave={handleSaveCustomFood}
            onBack={() => setScreen(Screen.PANTRY)}
          />
      );
  }

  if (screen === Screen.RESTAURANT_MENU) {
      return (
          <RestaurantMenuScreen 
            items={analyzedMenuItems}
            onBack={() => setScreen(Screen.HOME)}
            onLogItem={handleLogMenuItem}
          />
      );
  }

  // --- HOME SCREEN ---
  if (screen === Screen.HOME) {
    const { consumed, burned, goal, remaining, mealsByType, macros } = getDashboardData();
    return (
      <div className="h-screen bg-slate-50 flex flex-col relative overflow-hidden">
        {showWeightModal && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Log Weight</h3>
                        <button onClick={() => setShowWeightModal(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                    </div>
                    <div className="flex justify-center mb-6">
                        <div className="text-5xl font-black text-slate-900 flex items-baseline gap-2">
                           <input type="number" defaultValue={profile.weightKg} className="w-32 text-center bg-transparent focus:outline-none border-b-2 border-slate-200 focus:border-blue-600" autoFocus id="weightInput"/>
                           <span className="text-lg font-bold text-slate-400">kg</span>
                        </div>
                    </div>
                    <button onClick={() => { const val = parseFloat((document.getElementById('weightInput') as HTMLInputElement).value); handleWeightUpdate(val); }} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-xl">Update Weight</button>
                </div>
            </div>
        )}
        {showQuickAddModal && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Quick Add Calories</h3>
                        <button onClick={() => setShowQuickAddModal(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {[100, 250, 500, 750].map(c => (
                            <button key={c} onClick={() => handleQuickAddCalories(c)} className="py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100">{c} kcal</button>
                        ))}
                    </div>
                    <div className="relative mb-6">
                        <input type="number" placeholder="Or enter amount" id="customCalInput" className="w-full bg-slate-100 p-4 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <button onClick={() => { const val = parseFloat((document.getElementById('customCalInput') as HTMLInputElement).value); if (val > 0) handleQuickAddCalories(val); }} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-xl">Add Custom Amount</button>
                </div>
            </div>
        )}
        <FoodLogModal 
            isOpen={showFoodLogger}
            onClose={() => setShowFoodLogger(false)}
            mealType={logMealType}
            onAddFood={handleAddDirectFood}
            onScanBarcode={() => { setShowFoodLogger(false); setScreen(Screen.CAMERA); }}
            onScanFridge={() => { setShowFoodLogger(false); setScreen(Screen.CAMERA); }}
        />
        {scannedItem && (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Nutrition Found!</h2>
                        <button onClick={() => setScannedItem(null)} className="p-1 bg-slate-100 rounded-full"><X size={20} /></button>
                    </div>
                    <div className="mb-6">
                        <div className="text-2xl font-bold text-slate-900 mb-1">{scannedItem.name}</div>
                        <div className="text-slate-500 font-medium">{scannedItem.amount} {scannedItem.unit}</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                            <span className="font-bold text-slate-500">Calories</span>
                            <span className="font-black text-2xl text-slate-900">{scannedItem.calories}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div><div className="text-xs font-bold text-emerald-600 uppercase mb-1">Protein</div><div className="font-bold text-slate-900">{scannedItem.protein}g</div></div>
                            <div><div className="text-xs font-bold text-amber-600 uppercase mb-1">Carbs</div><div className="font-bold text-slate-900">{scannedItem.carbs}g</div></div>
                            <div><div className="text-xs font-bold text-red-600 uppercase mb-1">Fat</div><div className="font-bold text-slate-900">{scannedItem.fat}g</div></div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setScannedItem(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancel</button>
                        <button onClick={handleAddScannedToPantry} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200">Add to Pantry</button>
                    </div>
                </div>
            </div>
        )}
        <div className="px-6 pt-10 pb-4 flex justify-between items-center z-10 bg-slate-50">
             <div>
                <div className="text-sm font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    Good Morning 
                    {profile.streak.currentStreak > 1 && (
                        <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5"><Flame size={10} fill="currentColor" /> {profile.streak.currentStreak} Day Streak</span>
                    )}
                </div>
                <h1 className="text-2xl font-black text-slate-900">{profile.name.split(' ')[0]}</h1>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowWeightModal(true)} className="h-10 px-4 bg-white border border-slate-200 rounded-full text-slate-600 font-bold text-xs flex items-center gap-2 shadow-sm">
                    <Scale size={14} /> {profile.weightKg}kg
                </button>
                <button onClick={handleOpenPantry} className="w-10 h-10 bg-slate-900 rounded-full text-white flex items-center justify-center shadow-lg shadow-slate-900/20 active:scale-95 transition-all">
                    <ChefHat size={18} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32 space-y-6 px-6">
            <DashboardHero consumed={consumed} burned={burned} goal={goal} remaining={remaining} macros={macros} profile={profile} />
            
            <CoachTip profile={profile} remainingCalories={remaining} />

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                <button onClick={() => setScreen(Screen.FITNESS_HOME)} className="flex items-center gap-3 pl-4 pr-6 py-4 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all whitespace-nowrap border border-slate-800">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Dumbbell size={20} /></div>
                    <div className="text-left">
                        <div className="font-bold text-sm">Start Workout</div>
                        <div className="text-[10px] opacity-60 uppercase font-bold tracking-wide">Get Moving</div>
                    </div>
                </button>
                <button onClick={() => setShowQuickAddModal(true)} className="flex items-center gap-3 pl-4 pr-6 py-4 bg-white text-slate-900 rounded-3xl shadow-sm border border-slate-100 active:scale-95 transition-all whitespace-nowrap">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><Plus size={20} /></div>
                    <div className="text-left">
                        <div className="font-bold text-sm">Quick Add</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Log Snack</div>
                    </div>
                </button>
            </div>

            <FastTimer 
                fastingState={profile.fasting}
                onToggle={handleToggleFasting}
                onSetTarget={handleSetFastingTarget}
            />

            <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-slate-400" /> Today's Meals
                </h2>
                <div className="space-y-3">
                    <MealCard title="Breakfast" icon={Sunrise} color="amber" entries={mealsByType.breakfast} target={Math.round(goal * 0.25)} onAdd={() => handleOpenLogger('breakfast')} onSelect={(e: any) => { if(!e.isQuickAdd) { setSelectedRecipe(e.recipe); setScreen(Screen.RECIPE_DETAIL); }}} onCopyYesterday={() => handleCopyYesterday('breakfast')} />
                    <MealCard title="Lunch" icon={Sun} color="orange" entries={mealsByType.lunch} target={Math.round(goal * 0.35)} onAdd={() => handleOpenLogger('lunch')} onSelect={(e: any) => { if(!e.isQuickAdd) { setSelectedRecipe(e.recipe); setScreen(Screen.RECIPE_DETAIL); }}} onCopyYesterday={() => handleCopyYesterday('lunch')} />
                    <MealCard title="Dinner" icon={Moon} color="indigo" entries={mealsByType.dinner} target={Math.round(goal * 0.30)} onAdd={() => handleOpenLogger('dinner')} onSelect={(e: any) => { if(!e.isQuickAdd) { setSelectedRecipe(e.recipe); setScreen(Screen.RECIPE_DETAIL); }}} onCopyYesterday={() => handleCopyYesterday('dinner')} />
                    <MealCard title="Snacks" icon={Coffee} color="purple" entries={mealsByType.snack} target={Math.round(goal * 0.10)} onAdd={() => handleOpenLogger('snack')} onSelect={(e: any) => { if(!e.isQuickAdd) { setSelectedRecipe(e.recipe); setScreen(Screen.RECIPE_DETAIL); }}} onCopyYesterday={() => handleCopyYesterday('snack')} />
                </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-5 flex items-center justify-between border border-blue-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <Droplet size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 text-sm">Hydration</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{profile.waterIntakeMl} / {profile.waterGoalMl} ml</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleWaterUpdate(250)} className="w-8 h-8 bg-white text-blue-500 rounded-lg shadow-sm border border-blue-100 font-bold text-xs flex items-center justify-center active:scale-95 transition-all">+250</button>
                    <button onClick={() => handleWaterUpdate(500)} className="w-8 h-8 bg-blue-500 text-white rounded-lg shadow-sm font-bold text-xs flex items-center justify-center active:scale-95 transition-all">+500</button>
                </div>
            </div>
        </div>
        
        <BottomNav />
      </div>
    );
  };

  return null;
};

export default App;
