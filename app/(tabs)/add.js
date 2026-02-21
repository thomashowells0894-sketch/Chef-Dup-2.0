import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import ScreenErrorBoundary from '../../components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Modal,
  Alert,
  ScrollView,
  Animated,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import OptimizedFlatList from '../../components/OptimizedFlatList';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Coffee,
  Sun,
  Sunset,
  Moon,
  Search,
  X,
  ScanBarcode,
  Camera,
  Plus,
  Utensils,
  Dumbbell,
  Clock,
  Flame,
  Check,
  ChefHat,
  BookOpen,
  Wand2,
  Mic,
  Square,
  Heart,
  Zap,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { parseVoiceFood } from '../../services/ai';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants/theme';
import { useFood } from '../../context/FoodContext';
import { useProfile } from '../../context/ProfileContext';
import { useFasting } from '../../context/FastingContext';
import { foodDatabase } from '../../data/foods';
import { EXERCISES, searchExercises, calculateCaloriesBurned } from '../../data/exercises';
import BarcodeScanner from '../../components/BarcodeScanner';
import ProductFoundModal from '../../components/ProductFoundModal';
import FoodDetailModal from '../../components/FoodDetailModal';
import RecipeBuilderModal from '../../components/RecipeBuilderModal';
import QuickLogSheet from '../../components/QuickLogSheet';
import QuickCalModal from '../../components/QuickCalModal';
import ExerciseDurationModal from '../../components/ExerciseDurationModal';
import VoiceRecordingModal from '../../components/VoiceRecordingModal';
import VoiceResultsSheet from '../../components/VoiceResultsSheet';
import { useFrequentFoods } from '../../hooks/useFrequentFoods';
import {
  fetchProductByBarcode,
  searchProducts,
  searchProductsGlobal,
  searchProductsWithUKPreference,
  productToFood,
} from '../../services/openFoodFacts';
import { searchAllSources } from '../../services/foodSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';
import { useIsPremium } from '../../context/SubscriptionContext';
import { hapticLight } from '../../lib/haptics';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Sun },
  { id: 'dinner', label: 'Dinner', icon: Sunset },
  { id: 'snacks', label: 'Snack', icon: Moon },
];

// API search result cache — avoids repeat network calls for common queries
const API_SEARCH_CACHE = new Map(); // key: query string, value: { products, sources, timestamp }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 20;

function getCachedSearch(query) {
  const entry = API_SEARCH_CACHE.get(query.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    API_SEARCH_CACHE.delete(query.toLowerCase());
    return null;
  }
  return entry;
}

function setCachedSearch(query, products, sources) {
  // Evict oldest if at capacity
  if (API_SEARCH_CACHE.size >= CACHE_MAX_SIZE) {
    const oldest = API_SEARCH_CACHE.keys().next().value;
    API_SEARCH_CACHE.delete(oldest);
  }
  API_SEARCH_CACHE.set(query.toLowerCase(), { products, sources, timestamp: Date.now() });
}

// Pre-indexed food search: build trigram index for O(1) lookup instead of O(n) filter
const FOOD_SEARCH_INDEX = (() => {
  const index = new Map();
  foodDatabase.forEach((food, i) => {
    const name = food.name.toLowerCase();
    // Index every 2-char substring for fast prefix/contains matching
    for (let j = 0; j <= name.length - 2; j++) {
      const bigram = name.substring(j, j + 2);
      if (!index.has(bigram)) index.set(bigram, []);
      index.get(bigram).push(i);
    }
  });
  return index;
})();

function searchFoodIndex(query, limit = 5) {
  const q = query.toLowerCase();
  if (q.length < 2) return [];
  const bigram = q.substring(0, 2);
  const candidates = FOOD_SEARCH_INDEX.get(bigram);
  if (!candidates) return [];
  const results = [];
  for (const idx of candidates) {
    if (foodDatabase[idx].name.toLowerCase().includes(q)) {
      results.push({ ...foodDatabase[idx], barcode: `local-${foodDatabase[idx].id}`, isLocal: true });
      if (results.length >= limit) break;
    }
  }
  return results;
}

const addModes = [
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'exercise', label: 'Exercise', icon: Dumbbell },
];

// Mode Selector Component
const ModeSelector = memo(function ModeSelector({ mode, onModeChange }) {
  return (
    <View style={styles.modeSelectorContainer}>
      {addModes.map((m) => {
        const Icon = m.icon;
        const isSelected = mode === m.id;
        return (
          <Pressable
            key={m.id}
            style={[styles.modeSelectorButton, isSelected && styles.modeSelectorButtonActive]}
            onPress={() => { hapticLight(); onModeChange(m.id); }}
          >
            <Icon
              size={18}
              color={isSelected ? Colors.background : Colors.textSecondary}
            />
            <Text
              style={[
                styles.modeSelectorLabel,
                isSelected && styles.modeSelectorLabelActive,
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const MealTypeSelector = memo(function MealTypeSelector({ selected, onSelect }) {
  return (
    <View style={styles.mealTypeContainer}>
      {mealTypes.map((meal) => {
        const Icon = meal.icon;
        const isSelected = selected === meal.id;
        return (
          <Pressable
            key={meal.id}
            style={[styles.mealTypeButton, isSelected && styles.mealTypeButtonActive]}
            onPress={() => { hapticLight(); onSelect(meal.id); }}
          >
            <Icon
              size={16}
              color={isSelected ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.mealTypeLabel,
                isSelected && styles.mealTypeLabelActive,
              ]}
            >
              {meal.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// Search/Recent Toggle Component
const SearchRecentToggle = memo(function SearchRecentToggle({ activeTab, onTabChange, recentCount }) {
  return (
    <View style={styles.searchRecentToggle}>
      <Pressable
        style={[styles.toggleButton, activeTab === 'recent' && styles.toggleButtonActive]}
        onPress={() => onTabChange('recent')}
      >
        <Clock size={14} color={activeTab === 'recent' ? Colors.primary : Colors.textSecondary} />
        <Text style={[styles.toggleButtonText, activeTab === 'recent' && styles.toggleButtonTextActive]}>
          Recent {recentCount > 0 && `(${recentCount})`}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.toggleButton, activeTab === 'search' && styles.toggleButtonActive]}
        onPress={() => onTabChange('search')}
      >
        <Search size={14} color={activeTab === 'search' ? Colors.primary : Colors.textSecondary} />
        <Text style={[styles.toggleButtonText, activeTab === 'search' && styles.toggleButtonTextActive]}>
          Search
        </Text>
      </Pressable>
    </View>
  );
});

// Recent Food Item Component (for 1-tap adding)
const RecentFoodItem = memo(function RecentFoodItem({ item, onPress, index = 0 }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable style={styles.recentFoodItem} onPress={() => onPress(item)}>
        <View style={styles.recentFoodIcon}>
          <Text style={styles.recentFoodIconText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.recentFoodInfo}>
          <Text style={styles.recentFoodName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.recentFoodServing} numberOfLines={1}>
            {item.serving || '1 serving'}
          </Text>
        </View>
        <View style={styles.recentFoodCalories}>
          <Text style={styles.recentFoodCaloriesValue}>{item.calories}</Text>
          <Text style={styles.recentFoodCaloriesLabel}>kcal</Text>
        </View>
        <View style={styles.recentFoodAddButton}>
          <Plus size={16} color={Colors.background} />
        </View>
      </Pressable>
    </ReAnimated.View>
  );
});

const SearchResultItem = memo(function SearchResultItem({ item, onPress, onQuickAdd, index = 0 }) {
  const hasCalories = item.calories !== null && item.calories !== undefined;
  const canQuickAdd = hasCalories && item.calories > 0;

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 30).duration(300)}>
    <Pressable style={styles.resultItem} onPress={() => onPress(item)}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.resultImage} cachePolicy="memory-disk" transition={200} />
      ) : (
        <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
          <Text style={styles.resultImagePlaceholderText}>
            {item.name?.charAt(0) || '?'}
          </Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={styles.resultBrand} numberOfLines={1}>
            {item.brand}
          </Text>
        )}
        <View style={styles.resultMacros}>
          <Text style={styles.resultMacroText}>
            <Text style={{ color: Colors.protein }}>P</Text>{' '}
            {item.protein ?? 'N/A'}
          </Text>
          <Text style={styles.resultMacroDot}>·</Text>
          <Text style={styles.resultMacroText}>
            <Text style={{ color: Colors.carbs }}>C</Text>{' '}
            {item.carbs ?? 'N/A'}
          </Text>
          <Text style={styles.resultMacroDot}>·</Text>
          <Text style={styles.resultMacroText}>
            <Text style={{ color: Colors.fat }}>F</Text>{' '}
            {item.fat ?? 'N/A'}
          </Text>
        </View>
      </View>
      <View style={styles.resultCalories}>
        <Text style={[styles.resultCaloriesValue, !hasCalories && styles.resultCaloriesNA]}>
          {hasCalories ? item.calories : 'N/A'}
        </Text>
        {hasCalories && <Text style={styles.resultCaloriesLabel}>kcal</Text>}
      </View>
      {canQuickAdd ? (
        <Pressable
          style={styles.quickAddBtnInline}
          onPress={(e) => { e.stopPropagation?.(); onQuickAdd?.(item); }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Check size={14} color={Colors.background} />
        </Pressable>
      ) : (
        <View style={styles.resultAddButton}>
          <Plus size={16} color={Colors.background} />
        </View>
      )}
    </Pressable>
    </ReAnimated.View>
  );
});

const LocalFoodItem = memo(function LocalFoodItem({ item, onPress, index = 0 }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable style={styles.localFoodItem} onPress={() => onPress(item)}>
        <Text style={styles.localFoodName}>{item.name}</Text>
        <Text style={styles.localFoodCalories}>{item.calories} kcal</Text>
      </Pressable>
    </ReAnimated.View>
  );
});

// Exercise item component
const ExerciseItem = memo(function ExerciseItem({ exercise, onPress }) {
  return (
    <Pressable style={styles.exerciseItem} onPress={() => onPress(exercise)}>
      <View style={styles.exerciseIconContainer}>
        <Dumbbell size={20} color={Colors.primary} />
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseCategory}>{exercise.category}</Text>
      </View>
      <View style={styles.exerciseMet}>
        <Text style={styles.exerciseMetValue}>{exercise.met}</Text>
        <Text style={styles.exerciseMetLabel}>MET</Text>
      </View>
      <View style={styles.exerciseAddButton}>
        <Plus size={16} color={Colors.background} />
      </View>
    </Pressable>
  );
});

// Recipe item component
const RecipeItem = memo(function RecipeItem({ recipe, onPress }) {
  return (
    <Pressable style={styles.recipeItem} onPress={() => onPress(recipe)}>
      <View style={styles.recipeEmoji}>
        <Text style={styles.recipeEmojiText}>{recipe.emoji || '🍳'}</Text>
      </View>
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeName} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Text style={styles.recipeServings}>
          {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''} · Per serving
        </Text>
        <View style={styles.recipeMacroRow}>
          <Text style={[styles.recipeMacro, { color: Colors.protein }]}>
            P{recipe.protein}
          </Text>
          <Text style={styles.recipeMacroDot}>·</Text>
          <Text style={[styles.recipeMacro, { color: Colors.carbs }]}>
            C{recipe.carbs}
          </Text>
          <Text style={styles.recipeMacroDot}>·</Text>
          <Text style={[styles.recipeMacro, { color: Colors.fat }]}>
            F{recipe.fat}
          </Text>
        </View>
      </View>
      <View style={styles.recipeCalories}>
        <Text style={styles.recipeCaloriesValue}>{recipe.calories}</Text>
        <Text style={styles.recipeCaloriesLabel}>cal</Text>
      </View>
      <View style={styles.recipeAddButton}>
        <Plus size={16} color={Colors.background} />
      </View>
    </Pressable>
  );
});

// Favorite Food Item Component
const FavoriteFoodItem = memo(function FavoriteFoodItem({ item, onAdd, index }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 60).springify().mass(0.5).damping(10)}>
      <View style={styles.favoriteFoodItem}>
        <View style={styles.favoriteFoodEmoji}>
          <Text style={styles.favoriteFoodEmojiText}>{item.emoji || '?'}</Text>
        </View>
        <View style={styles.favoriteFoodInfo}>
          <Text style={styles.favoriteFoodName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.favoriteFoodMacros}>
            P: {item.protein}g  C: {item.carbs}g  F: {item.fat}g
          </Text>
        </View>
        <View style={styles.favoriteFoodCalories}>
          <Text style={styles.favoriteFoodCaloriesValue}>{item.calories}</Text>
          <Text style={styles.favoriteFoodCaloriesLabel}>kcal</Text>
        </View>
        <Pressable style={styles.favoriteFoodAddButton} onPress={() => onAdd(item)}>
          <Plus size={16} color={Colors.background} />
        </Pressable>
      </View>
    </ReAnimated.View>
  );
});


function AddScreenInner() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    addFood,
    addExercise,
    recentLogs,
    getDefaultMealType,
    recipes,
    recentFoods,
    recentFoodsLoading,
    fetchRecentFoods,
  } = useFood();
  const { profile } = useProfile();
  const { isPremium } = useIsPremium();
  const { recordMealLogged } = useFasting();
  const { favorites } = useFavoriteFoods();
  const { recordFood, getTopFoods } = useFrequentFoods();
  const [mode, setMode] = useState('food');
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [quickCalVisible, setQuickCalVisible] = useState(false);

  // Recipe builder state
  const [recipeBuilderVisible, setRecipeBuilderVisible] = useState(false);
  const [pendingIngredient, setPendingIngredient] = useState(null);
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);

  // Use meal from navigation params, or default based on time of day
  const initialMeal = params.meal || getDefaultMealType();
  const [selectedMeal, setSelectedMeal] = useState(initialMeal);

  // Food search state — MUST be declared before any useEffect that references them
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchSources, setSearchSources] = useState({ local: 0, openFoodFacts: 0, usda: 0, fatSecret: 0, nutritionix: 0 });
  const debouncedQuery = useDebounce(searchQuery, 80);

  // Tab state: 'recent' or 'search'
  const [activeTab, setActiveTab] = useState('recent');

  // Exercise search state
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState(EXERCISES);

  // Barcode scanner state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scanError, setScanError] = useState(null);

  // Food detail modal state
  const [foodDetailModalVisible, setFoodDetailModalVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);

  // Exercise modal state
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceResultsVisible, setVoiceResultsVisible] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFoods, setVoiceFoods] = useState([]);
  const [addedVoiceIndices, setAddedVoiceIndices] = useState(new Set());
  const recordingRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  // Cleanup recording on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  // Voice recording handlers
  const handleStopRecordingRef = useRef(null);

  const handleStartRecording = useCallback(async () => {
    if (isProcessingVoice) return;
    if (!isPremium) {
      Alert.alert(
        'Pro Feature',
        'Voice food logging requires FuelIQ Pro. Upgrade to unlock AI-powered voice logging and more.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    hapticLight();
    Keyboard.dismiss();
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            'Microphone Access Denied',
            'Voice food logging needs microphone access. Please enable it in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert('Permission Required', 'Microphone access is needed for voice food logging.');
        }
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);

      // Auto-stop after 15 seconds — use ref to avoid stale closure
      recordingTimeoutRef.current = setTimeout(() => {
        handleStopRecordingRef.current?.();
      }, 15000);
    } catch (error) {
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }, [isProcessingVoice]);

  const handleStopRecording = useCallback(async () => {
    hapticLight();
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // Grab and immediately null-out the ref to prevent double-stop
    const recording = recordingRef.current;
    recordingRef.current = null;

    if (!recording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(false);
    setIsProcessingVoice(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('No recording file found');
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up temp file
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      // Parse via AI
      const result = await parseVoiceFood(base64, 'audio/m4a');
      setVoiceTranscript(result.transcript || '');
      setVoiceFoods(result.foods || []);
      setAddedVoiceIndices(new Set());
      setVoiceResultsVisible(true);
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not process voice recording. Please try again.');
    } finally {
      // Always reset audio mode, even on error
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      setIsProcessingVoice(false);
    }
  }, []);

  // Keep ref in sync so auto-stop timeout calls the latest version
  handleStopRecordingRef.current = handleStopRecording;

  const handleAddVoiceFood = useCallback((food, mealType, foodIndex) => {
    const foodEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: food.name,
      emoji: food.emoji || '🍽️',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      serving: food.serving || '1 serving',
      servingSize: 1,
      servingUnit: 'serving',
    };

    addFood(foodEntry, mealType);
    recordMealLogged(mealType);
    recordFood(foodEntry);

    // Inline confirmation — button switches to checkmark
    setAddedVoiceIndices(prev => new Set(prev).add(foodIndex));
  }, [addFood, recordMealLogged, recordFood]);

  const handleAddAllVoiceFoods = useCallback(() => {
    if (voiceFoods.length === 0) return;

    voiceFoods.forEach((food, idx) => {
      if (addedVoiceIndices.has(idx)) return; // skip already added
      const foodEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: food.name,
        emoji: food.emoji || '🍽️',
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        serving: food.serving || '1 serving',
        servingSize: 1,
        servingUnit: 'serving',
      };
      addFood(foodEntry, selectedMeal);
      recordFood(foodEntry);
    });
    recordMealLogged(selectedMeal);

    setVoiceFoods([]);
    setAddedVoiceIndices(new Set());
    setVoiceResultsVisible(false);
  }, [voiceFoods, selectedMeal, addFood, recordMealLogged, recordFood, addedVoiceIndices]);

  // Quick-add a favorite food
  const handleAddFavorite = useCallback((food) => {
    const foodEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: food.name,
      emoji: food.emoji || '?',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      serving: food.serving || '1 serving',
      servingSize: 1,
      servingUnit: 'serving',
    };
    addFood(foodEntry, selectedMeal);
    recordMealLogged(selectedMeal);
    recordFood(foodEntry);
  }, [addFood, selectedMeal, recordMealLogged, recordFood]);

  // Quick-log a frequent food (from QuickLogSheet or horizontal scroll)
  const handleQuickLog = useCallback((food, mealType) => {
    hapticLight();
    const effectiveMeal = mealType || selectedMeal;
    const foodEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: food.name,
      emoji: food.emoji || '?',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      serving: food.serving || '1 serving',
      servingSize: 1,
      servingUnit: food.servingUnit || 'serving',
    };
    addFood(foodEntry, effectiveMeal);
    recordMealLogged(effectiveMeal);
    recordFood(foodEntry);
  }, [addFood, selectedMeal, recordMealLogged, recordFood]);

  // Quick Cal log handler
  const handleQuickCalLog = useCallback((food, mealType) => {
    addFood(food, mealType);
    recordMealLogged(mealType);
    recordFood(food);
  }, [addFood, recordMealLogged, recordFood]);

  // Frequent foods for horizontal quick-add strip
  const topFrequentFoods = useMemo(() => getTopFoods(5), [getTopFoods]);

  // Update selected meal when params change
  useEffect(() => {
    if (params.meal) {
      setSelectedMeal(params.meal);
    }
  }, [params.meal]);

  // Handle quickCal deep link
  useEffect(() => {
    if (params.quickCal === 'true') {
      setQuickCalVisible(true);
    }
  }, [params.quickCal]);

  // Fetch recent foods on mount
  useEffect(() => {
    fetchRecentFoods();
  }, []);

  // Only reset to recent tab when search is fully cleared (not while typing)
  useEffect(() => {
    if (mode === 'food' && searchQuery.length === 0) {
      setActiveTab('recent');
    }
  }, [searchQuery, mode]);

  // Filter exercises when query changes
  useEffect(() => {
    setFilteredExercises(searchExercises(exerciseQuery));
  }, [exerciseQuery]);

  // Track typing state - show indicator immediately while debouncing
  useEffect(() => {
    if (mode === 'food' && searchQuery.length >= 2 && searchQuery !== debouncedQuery) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [searchQuery, debouncedQuery, mode]);

  // Perform food search when debounced query changes
  // Strategy: show local results INSTANTLY, then merge API results when they arrive
  useEffect(() => {
    let cancelled = false;

    async function performSearch() {
      // Clear immediately if query is too short or empty
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        setIsTyping(false);
        return;
      }

      setIsTyping(false);
      setSearchError(null);

      // Phase 1: Show local matches INSTANTLY via pre-built index (O(1) vs O(n))
      const localMatches = searchFoodIndex(debouncedQuery, 5);

      // Render local results immediately -- user sees results in <50ms
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      }

      // Phase 2: Check cache first, then fetch API results
      const cached = getCachedSearch(debouncedQuery);
      if (cached) {
        if (!cancelled) {
          setSearchResults(cached.products);
          setSearchSources(cached.sources);
        }
        return;
      }

      setIsSearching(true);

      try {
        const results = await searchAllSources(debouncedQuery, localMatches, 25, 4000, isPremium);
        if (cancelled) return;

        if (!cancelled) {
          setSearchResults(results.products);
          setSearchSources(results.sources);
          setCachedSearch(debouncedQuery, results.products, results.sources);
        }
      } catch (error) {
        if (cancelled) return;
        if (localMatches.length === 0) {
          setSearchError('Could not reach food databases. Showing local foods only.');
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }

    if (mode === 'food') {
      performSearch();
    }

    return () => { cancelled = true; };
  }, [debouncedQuery, mode]);

  // Filter local foods based on search (for quick-add section when not searching API)
  const filteredLocalFoods = useMemo(() => {
    if (searchQuery.length < 2) return foodDatabase;
    return searchFoodIndex(searchQuery, 50);
  }, [searchQuery]);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!recipes || recipes.length === 0) return [];
    if (searchQuery.length === 0) return recipes;
    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recipes, searchQuery]);

  // Handle selecting a search result - open FoodDetailModal
  const handleSelectResult = useCallback((product) => {
    hapticLight();
    Keyboard.dismiss();
    const food = productToFood(product);
    setSelectedFood({
      ...food,
      image: product.image,
      brand: product.brand,
      serving: product.serving || '100g',
      servingSize: product.servingSize || 100,
      servingUnit: product.servingUnit || 'g',
    });
    setFoodDetailModalVisible(true);
  }, []);

  // Handle selecting a local food - open FoodDetailModal
  const handleSelectLocalFood = useCallback((food) => {
    hapticLight();
    Keyboard.dismiss();
    setSelectedFood({
      ...food,
      serving: '1 serving',
      servingSize: 1,
      servingUnit: 'serving',
    });
    setFoodDetailModalVisible(true);
  }, []);

  // Handle confirming food from FoodDetailModal
  const handleConfirmFoodDetail = useCallback((food, mealType) => {
    addFood(food, mealType);
    recordMealLogged(mealType);
    recordFood(food);
    setFoodDetailModalVisible(false);
    setSelectedFood(null);
    setSearchQuery('');
    router.navigate('/');
  }, [addFood, recordMealLogged, recordFood, router]);

  // Close food detail modal
  const handleCloseFoodDetail = useCallback(() => {
    setFoodDetailModalVisible(false);
    setSelectedFood(null);

    // If we were adding an ingredient, go back to recipe builder
    if (isAddingIngredient) {
      setIsAddingIngredient(false);
      setRecipeBuilderVisible(true);
    }
  }, [isAddingIngredient]);

  // Handle selecting a recipe - open FoodDetailModal with recipe as food
  const handleSelectRecipe = useCallback((recipe) => {
    hapticLight();
    Keyboard.dismiss();
    setSelectedFood({
      ...recipe,
      name: recipe.name,
      serving: `1 serving (1/${recipe.servings} recipe)`,
      servingSize: 1,
      servingUnit: 'serving',
    });
    setFoodDetailModalVisible(true);
  }, []);

  // Handle confirming food as ingredient for recipe
  const handleConfirmAsIngredient = useCallback((food) => {
    setPendingIngredient(food);
    setFoodDetailModalVisible(false);
    setSelectedFood(null);
    setIsAddingIngredient(false);
    setRecipeBuilderVisible(true);
  }, []);

  // Handle adding ingredient from recipe builder
  const handleAddIngredientFromBuilder = useCallback(() => {
    setRecipeBuilderVisible(false);
    setIsAddingIngredient(true);
  }, []);

  // Handle opening recipe builder - navigate to standalone screen
  const handleOpenRecipeBuilder = () => {
    hapticLight();
    Keyboard.dismiss();
    router.push('/create-recipe');
  };

  // Handle confirming product from modal
  const handleConfirmProduct = useCallback((mealType) => {
    if (selectedProduct) {
      const food = productToFood(selectedProduct);
      addFood(food, mealType);
      recordMealLogged(mealType); // Notify fasting tracker
      setProductModalVisible(false);
      setSelectedProduct(null);
      setSearchQuery('');
      router.navigate('/');
    }
  }, [selectedProduct, addFood, recordMealLogged, router]);

  // Exercise handlers
  const handleSelectExercise = useCallback((exercise) => {
    hapticLight();
    Keyboard.dismiss();
    setSelectedExercise(exercise);
    setExerciseModalVisible(true);
  }, []);

  const handleConfirmExercise = useCallback(async (exercise, duration, caloriesBurned) => {
    await addExercise(exercise, duration, caloriesBurned);
    setExerciseModalVisible(false);
    setSelectedExercise(null);
    setExerciseQuery('');
    router.navigate('/');
  }, [addExercise, router]);

  // Barcode scanner handlers
  const handleOpenScanner = () => {
    Keyboard.dismiss();
    // Navigate to standalone scanner screen for faster experience
    router.push({
      pathname: '/scanner',
      params: { meal: selectedMeal },
    });
  };

  // Barcode lookup screen (Open Food Facts)
  const handleOpenBarcodeLookup = () => {
    hapticLight();
    Keyboard.dismiss();
    router.push('/barcode');
  };

  // AI Food Lens handler
  const handleOpenFoodLens = () => {
    hapticLight();
    Keyboard.dismiss();
    router.push({
      pathname: '/scan',
      params: { meal: selectedMeal },
    });
  };

  // AI Workout Generator handler
  const handleOpenWorkoutGenerator = () => {
    hapticLight();
    Keyboard.dismiss();
    router.push('/generate-workout');
  };

  const handleCloseScanner = () => {
    setScannerVisible(false);
  };

  const handleBarcodeScanned = async (barcode) => {
    try {
      const product = await fetchProductByBarcode(barcode);

      if (product) {
        // If product has complete nutrition data, auto-log it (skip modal)
        if (product.calories > 0 && product.name) {
          const foodItem = {
            name: product.name,
            brand: product.brand || '',
            calories: product.calories,
            protein: product.protein || 0,
            carbs: product.carbs || 0,
            fat: product.fat || 0,
            serving: product.serving || '1 serving',
            barcode: product.barcode || barcode,
          };
          await addFood(foodItem, selectedMeal);
          await hapticSuccess();
          setScannerVisible(false);
          return;
        }
        // Incomplete data — show modal for user to review/edit
        setSelectedProduct(product);
        setScannerVisible(false);
        setProductModalVisible(true);
      } else {
        setScanError('Product not found in database');
        setScannerVisible(false);
        setProductModalVisible(true);
      }
    } catch (error) {
      setScanError('Failed to look up product. Please try again.');
      setScannerVisible(false);
      setProductModalVisible(true);
    }
  };

  const handleCloseProductModal = useCallback(() => {
    setProductModalVisible(false);
    setSelectedProduct(null);
    setScanError(null);
  }, []);

  const clearSearch = () => {
    if (mode === 'food') {
      setSearchQuery('');
      setSearchResults([]);
      setIsTyping(false);
      setIsSearching(false);
      setSearchError(null);
      setSearchSources({ local: 0, openFoodFacts: 0, usda: 0, fatSecret: 0, nutritionix: 0 });
    } else {
      setExerciseQuery('');
    }
    Keyboard.dismiss();
  };

  const currentQuery = mode === 'food' ? searchQuery : exerciseQuery;
  const setCurrentQuery = mode === 'food' ? setSearchQuery : setExerciseQuery;

  // 1-tap quick add: log food with 1 serving, skip FoodDetailModal
  const handleQuickAddResult = useCallback(async (product) => {
    hapticLight();
    Keyboard.dismiss();
    const food = productToFood(product);
    await addFood(food, selectedMeal);
  }, [addFood, selectedMeal]);

  // Stable renderItem and keyExtractor callbacks for FlatList optimization
  const renderSearchResult = useCallback(({ item, index }) => (
    <SearchResultItem item={item} index={index} onPress={handleSelectResult} onQuickAdd={handleQuickAddResult} />
  ), [handleSelectResult, handleQuickAddResult]);

  const renderRecentFood = useCallback(({ item, index }) => (
    <RecentFoodItem item={item} index={index} onPress={handleSelectLocalFood} />
  ), [handleSelectLocalFood]);

  const renderLocalFood = useCallback(({ item, index }) => (
    <LocalFoodItem item={item} index={index} onPress={handleSelectLocalFood} />
  ), [handleSelectLocalFood]);

  const renderExercise = useCallback(({ item }) => (
    <ExerciseItem exercise={item} onPress={handleSelectExercise} />
  ), [handleSelectExercise]);

  const searchKeyExtractor = useCallback((item) => item.barcode, []);
  const idKeyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="add-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add {mode === 'food' ? 'Food' : 'Exercise'}</Text>
      </View>

      {/* Mode Selector */}
      <ModeSelector mode={mode} onModeChange={setMode} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            testID="food-search-input"
            style={styles.searchInput}
            placeholder={mode === 'food' ? 'Search foods...' : 'Search exercises...'}
            placeholderTextColor={Colors.textTertiary}
            value={currentQuery}
            onChangeText={setCurrentQuery}
            returnKeyType="search"
            autoCorrect={false}
            maxLength={200}
          />
          {currentQuery.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>
        {mode === 'food' && (
          <>
            <Pressable
              style={styles.quickCalButton}
              onPress={() => setQuickCalVisible(true)}
            >
              <Zap size={22} color={Colors.warning} fill={Colors.warning} />
            </Pressable>
            <Pressable
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessingVoice}
            >
              {isProcessingVoice ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Mic size={22} color={isRecording ? '#fff' : Colors.primary} />
              )}
            </Pressable>
            <Pressable style={styles.aiScanButton} onPress={handleOpenFoodLens}>
              <Camera size={22} color="#fff" />
            </Pressable>
            <Pressable style={styles.scanButton} onPress={handleOpenBarcodeLookup}>
              <ScanBarcode size={22} color={Colors.primary} />
            </Pressable>
            <Pressable
              style={styles.customFoodButton}
              onPress={() => router.push({ pathname: '/create-food', params: { meal: selectedMeal } })}
            >
              <Plus size={22} color={Colors.success} />
            </Pressable>
          </>
        )}
      </View>

      {/* Food Mode Content */}
      {mode === 'food' && (
        <>
          {/* Quick Add Frequent Foods Strip */}
          {topFrequentFoods.length > 0 && (
            <ReAnimated.View entering={FadeInDown.delay(50).springify().mass(0.5).damping(10)}>
              <View style={styles.quickAddSection}>
                <View style={styles.quickAddHeader}>
                  <View style={styles.quickAddTitleRow}>
                    <Zap size={14} color={Colors.primary} />
                    <Text style={styles.quickAddTitle}>Quick Add</Text>
                  </View>
                  <Pressable onPress={() => setQuickLogVisible(true)} hitSlop={8}>
                    <Text style={styles.quickAddSeeAll}>See All</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickAddScroll}
                >
                  {topFrequentFoods.map((food) => (
                    <Pressable
                      key={food.id || food.name}
                      style={styles.quickAddCard}
                      onPress={() => handleQuickLog(food)}
                    >
                      <Text style={styles.quickAddCardEmoji}>{food.emoji || '?'}</Text>
                      <Text style={styles.quickAddCardName} numberOfLines={1}>
                        {food.name}
                      </Text>
                      <Text style={styles.quickAddCardCal}>{food.calories} kcal</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </ReAnimated.View>
          )}

          {/* Meal Type Selector */}
          <MealTypeSelector selected={selectedMeal} onSelect={setSelectedMeal} />

          {/* Search/Recent Toggle */}
          <SearchRecentToggle
            activeTab={activeTab}
            onTabChange={setActiveTab}
            recentCount={recentFoods.length}
          />

          {/* Content */}
          {activeTab === 'search' && searchQuery.length >= 2 ? (
            // Search Results
            <View style={styles.resultsContainer}>
              {(isTyping || isSearching) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>
                    {isTyping ? 'Typing...' : 'Searching...'}
                  </Text>
                </View>
              ) : searchError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No results found</Text>
                  <Text style={styles.emptySubtext}>
                    Try a different search term or scan a barcode
                  </Text>
                </View>
              ) : (
                <OptimizedFlatList
                  data={searchResults}
                  keyExtractor={searchKeyExtractor}
                  renderItem={renderSearchResult}
                  contentContainerStyle={styles.resultsList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={8}
                  maxToRenderPerBatch={5}
                  windowSize={5}
                  removeClippedSubviews={true}
                  ListHeaderComponent={
                    <Text style={styles.resultsHeader}>
                      {searchResults.length} results
                      {(searchSources.openFoodFacts > 0 || searchSources.usda > 0 || searchSources.fatSecret > 0 || searchSources.nutritionix > 0)
                        ? ` from ${[
                            searchSources.local > 0 && 'local',
                            searchSources.usda > 0 && 'USDA',
                            searchSources.fatSecret > 0 && 'FatSecret',
                            searchSources.openFoodFacts > 0 && 'OpenFoodFacts',
                            searchSources.nutritionix > 0 && 'Nutritionix',
                          ].filter(Boolean).join(' + ')}`
                        : ''}
                    </Text>
                  }
                />
              )}
            </View>
          ) : activeTab === 'recent' ? (
            // Recent Foods with Favorites section
            <View style={styles.resultsContainer}>
              {recentFoodsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading recent foods...</Text>
                </View>
              ) : (
                <OptimizedFlatList
                  data={recentFoods}
                  keyExtractor={idKeyExtractor}
                  renderItem={renderRecentFood}
                  contentContainerStyle={styles.resultsList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={8}
                  maxToRenderPerBatch={5}
                  windowSize={5}
                  removeClippedSubviews={true}
                  ListHeaderComponent={
                    <>
                      {/* Favorites Section */}
                      <View style={styles.favoritesSection}>
                        <View style={styles.favoritesSectionHeader}>
                          <Heart size={16} color={Colors.secondary} fill={Colors.secondary} />
                          <Text style={styles.sectionLabel}>Favorites</Text>
                        </View>
                        {favorites.length === 0 ? (
                          <View style={styles.favoritesEmptyCard}>
                            <Heart size={32} color={Colors.textTertiary} />
                            <Text style={styles.favoritesEmptyTitle}>No favorites yet</Text>
                            <Text style={styles.favoritesEmptyHint}>
                              Heart foods in your diary to see them here
                            </Text>
                          </View>
                        ) : (
                          favorites.map((fav, idx) => (
                            <FavoriteFoodItem
                              key={fav.name}
                              item={fav}
                              onAdd={handleAddFavorite}
                              index={idx}
                            />
                          ))
                        )}
                      </View>

                      {/* Recent header */}
                      {recentFoods.length > 0 && (
                        <Text style={styles.resultsHeader}>
                          {recentFoods.length} recently logged foods
                        </Text>
                      )}
                      {recentFoods.length === 0 && (
                        <View style={styles.favoritesEmptyCard}>
                          <Clock size={32} color={Colors.textTertiary} />
                          <Text style={styles.favoritesEmptyTitle}>No recent foods yet</Text>
                          <Text style={styles.favoritesEmptyHint}>
                            Foods you log will appear here for quick access
                          </Text>
                        </View>
                      )}
                    </>
                  }
                  ListFooterComponent={<View style={styles.bottomSpacer} />}
                />
              )}
            </View>
          ) : (
            // Local Foods & Quick Add
            <OptimizedFlatList
              data={filteredLocalFoods}
              keyExtractor={idKeyExtractor}
              renderItem={renderLocalFood}
              contentContainerStyle={styles.localFoodsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
              ListHeaderComponent={
                <>
                  {/* Create Recipe Button */}
                  {!isAddingIngredient && (
                    <Pressable style={styles.createRecipeButton} onPress={handleOpenRecipeBuilder}>
                      <View style={styles.createRecipeIcon}>
                        <ChefHat size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.createRecipeContent}>
                        <Text style={styles.createRecipeTitle}>Create Recipe</Text>
                        <Text style={styles.createRecipeSubtitle}>
                          Build custom meals with multiple ingredients
                        </Text>
                      </View>
                      <Plus size={20} color={Colors.primary} />
                    </Pressable>
                  )}

                  {/* My Recipes Section */}
                  {filteredRecipes.length > 0 && (
                    <View style={styles.recipesSection}>
                      <View style={styles.recipesSectionHeader}>
                        <BookOpen size={16} color={Colors.primary} />
                        <Text style={styles.sectionLabel}>My Recipes</Text>
                      </View>
                      {filteredRecipes.slice(0, 5).map((recipe) => (
                        <RecipeItem
                          key={recipe.id}
                          recipe={recipe}
                          onPress={handleSelectRecipe}
                        />
                      ))}
                      {recipes.length > 5 && searchQuery.length === 0 && (
                        <Text style={styles.moreRecipesHint}>
                          Search to find more recipes...
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Recent Foods */}
                  {recentLogs.length > 0 && (
                    <View style={styles.recentSection}>
                      <Text style={styles.sectionLabel}>Recent</Text>
                      <View style={styles.recentItems}>
                        {recentLogs.slice(0, 4).map((item, index) => (
                          <Pressable
                            key={`${item.id}-${index}`}
                            style={styles.recentItem}
                            onPress={() => handleSelectLocalFood(item)}
                          >
                            <Text style={styles.recentItemText} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Plus size={12} color={Colors.primary} />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                  <Text style={styles.sectionLabel}>Quick Add</Text>
                </>
              }
              ListFooterComponent={<View style={styles.bottomSpacer} />}
            />
          )}
        </>
      )}

      {/* Exercise Mode Content */}
      {mode === 'exercise' && (
        <OptimizedFlatList
          data={filteredExercises}
          keyExtractor={idKeyExtractor}
          renderItem={renderExercise}
          contentContainerStyle={styles.exerciseList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          ListHeaderComponent={
            <>
              {/* AI Workout Generator Button */}
              <Pressable style={styles.aiWorkoutButton} onPress={handleOpenWorkoutGenerator}>
                <View style={styles.aiWorkoutIcon}>
                  <Wand2 size={24} color="#fff" />
                </View>
                <View style={styles.aiWorkoutContent}>
                  <Text style={styles.aiWorkoutTitle}>Smart Trainer</Text>
                  <Text style={styles.aiWorkoutSubtitle}>
                    Generate a custom AI workout plan
                  </Text>
                </View>
                <View style={styles.aiWorkoutBadge}>
                  <Text style={styles.aiWorkoutBadgeText}>AI</Text>
                </View>
              </Pressable>

              <Text style={styles.exerciseListHeader}>
                {filteredExercises.length} exercises available
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
          ListFooterComponent={<View style={styles.bottomSpacer} />}
        />
      )}

      {/* Lazy-mounted modals — only render when visible to reduce memory */}

      {scannerVisible && (
        <BarcodeScanner
          visible={scannerVisible}
          onClose={handleCloseScanner}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      {productModalVisible && (
        <ProductFoundModal
          visible={productModalVisible}
          product={selectedProduct}
          error={scanError}
          onClose={handleCloseProductModal}
          onConfirm={handleConfirmProduct}
          defaultMeal={selectedMeal}
        />
      )}

      {foodDetailModalVisible && (
        <FoodDetailModal
          visible={foodDetailModalVisible}
          food={selectedFood}
          mealType={selectedMeal}
          onClose={handleCloseFoodDetail}
          onConfirm={isAddingIngredient ? handleConfirmAsIngredient : handleConfirmFoodDetail}
        />
      )}

      {recipeBuilderVisible && (
        <RecipeBuilderModal
          visible={recipeBuilderVisible}
          onClose={() => setRecipeBuilderVisible(false)}
          onAddIngredient={handleAddIngredientFromBuilder}
          pendingIngredient={pendingIngredient}
          onClearPendingIngredient={() => setPendingIngredient(null)}
        />
      )}

      {exerciseModalVisible && (
        <ExerciseDurationModal
          visible={exerciseModalVisible}
          exercise={selectedExercise}
          userWeight={profile?.weight}
          onClose={() => setExerciseModalVisible(false)}
          onConfirm={handleConfirmExercise}
        />
      )}

      {isRecording && (
        <VoiceRecordingModal
          visible={isRecording}
          onStop={handleStopRecording}
        />
      )}

      {voiceResultsVisible && (
        <VoiceResultsSheet
          visible={voiceResultsVisible}
          transcript={voiceTranscript}
          foods={voiceFoods}
          selectedMeal={selectedMeal}
          onAddFood={handleAddVoiceFood}
          onAddAll={handleAddAllVoiceFoods}
          onClose={() => {
            setVoiceResultsVisible(false);
            setAddedVoiceIndices(new Set());
          }}
          addedIndices={addedVoiceIndices}
        />
      )}

      {quickLogVisible && (
        <QuickLogSheet
          visible={quickLogVisible}
          onClose={() => setQuickLogVisible(false)}
          mealType={selectedMeal}
          onLog={handleQuickLog}
        />
      )}

      {quickCalVisible && (
        <QuickCalModal
          visible={quickCalVisible}
          onClose={() => setQuickCalVisible(false)}
          onLog={handleQuickCalLog}
          initialMealType={selectedMeal}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  modeSelectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modeSelectorButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeSelectorLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  modeSelectorLabelActive: {
    color: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    height: '100%',
  },
  aiScanButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  customFoodButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.success + '20',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  mealTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  mealTypeButtonActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  mealTypeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  mealTypeLabelActive: {
    color: Colors.primary,
  },
  // Search/Recent Toggle styles
  searchRecentToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  toggleButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  // Recent Food Item styles
  recentFoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recentFoodIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentFoodIconText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  recentFoodInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  recentFoodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  recentFoodServing: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentFoodCalories: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  recentFoodCaloriesValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  recentFoodCaloriesLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  recentFoodAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.danger,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  resultsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },
  resultsHeader: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
  },
  resultImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImagePlaceholderText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
  },
  resultInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  resultBrand: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  resultMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resultMacroText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  resultMacroDot: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginHorizontal: 4,
  },
  resultCalories: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  resultCaloriesValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  resultCaloriesNA: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  resultCaloriesLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  resultAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddBtnInline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localFoodsList: {
    paddingHorizontal: Spacing.md,
  },
  localFoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  localFoodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  localFoodCalories: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  recentSection: {
    marginBottom: Spacing.sm,
  },
  recentItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '48%',
  },
  recentItemText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    flexShrink: 1,
  },
  // Quick Add strip styles
  quickAddSection: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
  },
  quickAddHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: Spacing.md,
    marginBottom: Spacing.sm,
  },
  quickAddTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickAddTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickAddSeeAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  quickAddScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  quickAddCard: {
    width: 100,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAddCardEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickAddCardName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  quickAddCardCal: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  bottomSpacer: {
    height: 120,
  },
  // Exercise styles
  exerciseList: {
    paddingHorizontal: Spacing.md,
  },
  aiWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  aiWorkoutIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiWorkoutContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  aiWorkoutTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  aiWorkoutSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  aiWorkoutBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  aiWorkoutBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  exerciseListHeader: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  exerciseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  exerciseCategory: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  exerciseMet: {
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  exerciseMetValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  exerciseMetLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  exerciseAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Recipe styles
  createRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  createRecipeIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createRecipeContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  createRecipeTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  createRecipeSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recipesSection: {
    marginBottom: Spacing.md,
  },
  recipesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  moreRecipesHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recipeEmoji: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeEmojiText: {
    fontSize: 24,
  },
  recipeInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  recipeName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  recipeServings: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recipeMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recipeMacro: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  recipeMacroDot: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginHorizontal: 4,
  },
  recipeCalories: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  recipeCaloriesValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  recipeCaloriesLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  recipeAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quick Cal button
  quickCalButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.warning + '20',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  // Mic button
  micButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  micButtonRecording: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  // Favorites section styles
  favoritesSection: {
    marginBottom: Spacing.md,
  },
  favoritesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  favoritesEmptyCard: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  favoritesEmptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  favoritesEmptyHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  favoriteFoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  favoriteFoodEmoji: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteFoodEmojiText: {
    fontSize: 22,
  },
  favoriteFoodInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  favoriteFoodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  favoriteFoodMacros: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  favoriteFoodCalories: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  favoriteFoodCaloriesValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  favoriteFoodCaloriesLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  favoriteFoodAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function AddScreen(props) {
  return (
    <ScreenErrorBoundary screenName="AddScreen">
      <AddScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}
