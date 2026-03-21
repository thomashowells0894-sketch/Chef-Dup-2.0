import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import * as Crypto from 'expo-crypto';
import ScreenErrorBoundary from '../../components/ScreenErrorBoundary';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import OptimizedFlatList from '../../components/OptimizedFlatList';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, isToday, isYesterday, parseISO, subDays } from 'date-fns';
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
  Check,
  ChefHat,
  BookOpen,
  Wand2,
  Mic,
  Heart,
  Zap,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { parseVoiceFood } from '../../services/ai';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants/theme';
import { useFood } from '../../context/FoodContext';
import { useProfile } from '../../context/ProfileContext';
import { useFasting } from '../../context/FastingContext';
import { foodDatabase } from '../../data/foods';
import { EXERCISES, searchExercises } from '../../data/exercises';
import FoodDetailModal from '../../components/FoodDetailModal';
import RecipeBuilderModal from '../../components/RecipeBuilderModal';
import QuickLogSheet from '../../components/QuickLogSheet';
import QuickCalModal from '../../components/QuickCalModal';
import ExerciseDurationModal from '../../components/ExerciseDurationModal';
import VoiceRecordingModal from '../../components/VoiceRecordingModal';
import VoiceResultsSheet from '../../components/VoiceResultsSheet';
import { useFrequentFoods } from '../../hooks/useFrequentFoods';
import { productToFood } from '../../services/openFoodFacts';
import {
  getRecentSearches,
  getTrendingTerms,
  searchAllSources,
} from '../../services/foodSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';
import { useIsPremium } from '../../context/SubscriptionContext';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import {
  recordAddOpened,
  recordSearchCompleted,
  recordQuickAddUsed,
  recordRepeatLogUsed,
  recordSearchResultSelected,
  recordSearchStarted,
} from '../../lib/activationTracker';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import UndoToast from '../../components/UndoToast';
import { useRecentMealSnapshots } from '../../lib/recentMeals';
import MyFitnessPalImportCard from '../../components/MyFitnessPalImportCard';
import { searchLocalFoodDatabase } from '../../lib/localFoodSearch';

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Sun },
  { id: 'dinner', label: 'Dinner', icon: Sunset },
  { id: 'snacks', label: 'Snack', icon: Moon },
];

const VALID_MEAL_TYPES = new Set(mealTypes.map((meal) => meal.id));

const STARTER_FOOD_IDS_BY_MEAL = {
  breakfast: ['eggs', 'greek-yogurt', 'oatmeal', 'banana', 'whole-wheat-bread', 'whey-protein'],
  lunch: ['chicken-breast', 'brown-rice', 'avocado', 'apple', 'whole-wheat-bread', 'protein-shake'],
  dinner: ['salmon', 'chicken-breast', 'brown-rice', 'avocado', 'apple', 'whole-wheat-bread'],
  snacks: ['greek-yogurt', 'protein-shake', 'banana', 'apple', 'peanut-butter', 'rice-cakes'],
};

function getQualityBadgeTheme(tag) {
  switch (tag) {
    case 'verified':
      return {
        backgroundColor: Colors.success + '14',
        borderColor: Colors.success + '30',
        textColor: Colors.success,
      };
    case 'curated':
      return {
        backgroundColor: Colors.primary + '14',
        borderColor: Colors.primary + '30',
        textColor: Colors.primary,
      };
    case 'restaurant':
      return {
        backgroundColor: Colors.warning + '14',
        borderColor: Colors.warning + '30',
        textColor: Colors.warning,
      };
    default:
      return {
        backgroundColor: Colors.surfaceElevated,
        borderColor: Colors.border,
        textColor: Colors.textSecondary,
      };
  }
}

function getConfidenceTextColor(level) {
  if (level === 'high') return Colors.success;
  if (level === 'medium') return Colors.textSecondary;
  return Colors.warning;
}

function getParamValue(param) {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}

function normalizeMealParam(param) {
  const value = getParamValue(param);
  if (typeof value !== 'string') {
    return null;
  }

  let normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('meal-')) {
    normalized = normalized.slice(5);
  }

  if (normalized === 'snack') {
    normalized = 'snacks';
  }

  return VALID_MEAL_TYPES.has(normalized) ? normalized : null;
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesSearchText(query, ...values) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return false;
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  return values.some((value) => {
    const normalizedValue = normalizeSearchText(value);
    if (!normalizedValue) {
      return false;
    }

    return (
      normalizedValue.includes(normalizedQuery) ||
      tokens.every((token) => normalizedValue.includes(token))
    );
  });
}

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

// Recent/Library Toggle Component
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
        style={[styles.toggleButton, activeTab === 'browse' && styles.toggleButtonActive]}
        onPress={() => onTabChange('browse')}
      >
        <BookOpen size={14} color={activeTab === 'browse' ? Colors.primary : Colors.textSecondary} />
        <Text style={[styles.toggleButtonText, activeTab === 'browse' && styles.toggleButtonTextActive]}>
          Library
        </Text>
      </Pressable>
    </View>
  );
});

const SearchSuggestionChips = memo(function SearchSuggestionChips({
  recentSearches,
  trendingTerms,
  onSelect,
}) {
  if (recentSearches.length === 0 && trendingTerms.length === 0) {
    return null;
  }

  return (
    <View style={styles.searchSuggestionSection}>
      {recentSearches.length > 0 && (
        <View style={styles.searchSuggestionBlock}>
          <View style={styles.searchSuggestionHeader}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.searchSuggestionLabel}>Recent Searches</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.searchSuggestionScroll}
          >
            {recentSearches.slice(0, 8).map((item) => (
              <Pressable
                key={`recent-${item.query}`}
                style={styles.searchSuggestionChip}
                onPress={() => onSelect(item.query)}
              >
                <Text style={styles.searchSuggestionChipText}>{item.query}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {trendingTerms.length > 0 && (
        <View style={styles.searchSuggestionBlock}>
          <View style={styles.searchSuggestionHeader}>
            <TrendingUp size={14} color={Colors.primary} />
            <Text style={styles.searchSuggestionLabel}>Your Top Searches</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.searchSuggestionScroll}
          >
            {trendingTerms.slice(0, 6).map((item) => (
              <Pressable
                key={`trend-${item.term}`}
                style={[styles.searchSuggestionChip, styles.searchSuggestionChipTrending]}
                onPress={() => onSelect(item.term)}
              >
                <Text
                  style={[
                    styles.searchSuggestionChipText,
                    styles.searchSuggestionChipTextTrending,
                  ]}
                >
                  {item.term}
                </Text>
                <Text style={styles.searchSuggestionCount}>{item.count}x</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
});

const FastCaptureAction = memo(function FastCaptureAction({
  icon: Icon,
  label,
  hint,
  tone = 'default',
  onPress,
}) {
  const toneStyles = {
    default: {
      backgroundColor: Colors.surface,
      borderColor: Colors.border,
      iconColor: Colors.primary,
    },
    primary: {
      backgroundColor: Colors.primary + '18',
      borderColor: Colors.primary + '45',
      iconColor: Colors.primary,
    },
    success: {
      backgroundColor: Colors.success + '14',
      borderColor: Colors.success + '35',
      iconColor: Colors.success,
    },
  };

  const activeTone = toneStyles[tone] || toneStyles.default;

  return (
    <Pressable
      style={[
        styles.fastCaptureAction,
        {
          backgroundColor: activeTone.backgroundColor,
          borderColor: activeTone.borderColor,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.fastCaptureActionIcon}>
        <Icon size={18} color={activeTone.iconColor} strokeWidth={2.4} />
      </View>
      <Text style={styles.fastCaptureActionLabel}>{label}</Text>
      <Text style={styles.fastCaptureActionHint}>{hint}</Text>
    </Pressable>
  );
});

const FastCapturePanel = memo(function FastCapturePanel({
  selectedMeal,
  onOpenBarcodeLookup,
  onOpenQuickCal,
  onOpenCustomFood,
  onOpenFoodLens,
  onOpenVoice,
  isRecording,
  isProcessingVoice,
}) {
  const activeMeal = mealTypes.find((meal) => meal.id === selectedMeal);
  const mealLabel = activeMeal?.label || 'Meal';

  return (
    <View style={styles.fastCapturePanel}>
      <View style={styles.fastCaptureHeader}>
        <View>
          <Text style={styles.fastCaptureEyebrow}>Fast Capture</Text>
          <Text style={styles.fastCaptureTitle}>2 taps to log {mealLabel.toLowerCase()}</Text>
        </View>
        <View style={styles.fastCaptureMealBadge}>
          <Text style={styles.fastCaptureMealBadgeText}>{mealLabel}</Text>
        </View>
      </View>

      <View style={styles.fastCaptureGrid}>
        <FastCaptureAction
          icon={ScanBarcode}
          label="Barcode"
          hint="Best for packaged food"
          tone="primary"
          onPress={onOpenBarcodeLookup}
        />
        <FastCaptureAction
          icon={Zap}
          label="Quick Cals"
          hint="Log calories fast"
          tone="success"
          onPress={onOpenQuickCal}
        />
        <FastCaptureAction
          icon={Plus}
          label="Custom Food"
          hint="Add your own item"
          onPress={onOpenCustomFood}
        />
      </View>

      <View style={styles.fastCaptureSecondaryRow}>
        <Pressable style={styles.fastCaptureSecondaryButton} onPress={onOpenFoodLens}>
          <Camera size={16} color={Colors.textSecondary} />
          <Text style={styles.fastCaptureSecondaryText}>Photo</Text>
        </Pressable>
        <Pressable
          style={[
            styles.fastCaptureSecondaryButton,
            isRecording && styles.fastCaptureSecondaryButtonActive,
          ]}
          onPress={onOpenVoice}
          disabled={isProcessingVoice}
        >
          {isProcessingVoice ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Mic size={16} color={isRecording ? Colors.background : Colors.textSecondary} />
          )}
          <Text
            style={[
              styles.fastCaptureSecondaryText,
              isRecording && styles.fastCaptureSecondaryTextActive,
            ]}
          >
            {isRecording ? 'Recording' : 'Voice'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

// Recent Food Item Component (for 1-tap adding)
const RecentFoodItem = memo(function RecentFoodItem({ item, onPress, onQuickAdd, index = 0 }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable style={styles.recentFoodItem} onPress={() => onPress(item)}>
        <View style={styles.recentFoodIcon}>
          <Text style={styles.recentFoodIconText}>
            {item.emoji || item.name?.charAt(0)?.toUpperCase() || '?'}
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
        <Pressable
          style={styles.recentFoodAddButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onQuickAdd(item);
          }}
          hitSlop={8}
        >
          <Plus size={16} color={Colors.background} />
        </Pressable>
      </Pressable>
    </ReAnimated.View>
  );
});

const SearchResultItem = memo(function SearchResultItem({ item, onPress, onQuickAdd, onReport, index = 0 }) {
  const hasCalories = item.calories !== null && item.calories !== undefined;
  const canQuickAdd = hasCalories && item.calories > 0;
  const badgeTheme = getQualityBadgeTheme(item.qualityTag);
  const trustNote =
    item.confidenceLevel === 'review' && item.qualityIssues?.length
      ? item.qualityIssues[0]
      : item.confidenceReason;

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
        {(item.qualityLabel || trustNote) && (
          <View style={styles.resultTrustRow}>
            {item.qualityLabel && (
              <View
                style={[
                  styles.resultQualityBadge,
                  {
                    backgroundColor: badgeTheme.backgroundColor,
                    borderColor: badgeTheme.borderColor,
                  },
                ]}
              >
                <Text style={[styles.resultQualityBadgeText, { color: badgeTheme.textColor }]}>
                  {item.qualityLabel}
                </Text>
              </View>
            )}
            {trustNote && (
              <Text
                style={[
                  styles.resultConfidenceText,
                  { color: getConfidenceTextColor(item.confidenceLevel) },
                ]}
                numberOfLines={1}
              >
                {trustNote}
              </Text>
            )}
          </View>
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
      <View style={styles.resultTrailing}>
        <View style={styles.resultCalories}>
          <Text style={[styles.resultCaloriesValue, !hasCalories && styles.resultCaloriesNA]}>
            {hasCalories ? item.calories : 'N/A'}
          </Text>
          {hasCalories && <Text style={styles.resultCaloriesLabel}>kcal</Text>}
        </View>
        <View style={styles.resultActionRow}>
          {item.reportable && (
            <Pressable
              style={styles.resultReportButton}
              onPress={(e) => { e.stopPropagation?.(); onReport?.(item); }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <AlertTriangle size={13} color={Colors.warning} />
            </Pressable>
          )}
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
        </View>
      </View>
    </Pressable>
    </ReAnimated.View>
  );
});

const SearchSectionHeader = memo(function SearchSectionHeader({ title, subtitle }) {
  return (
    <View style={styles.searchSectionHeader}>
      <Text style={styles.searchSectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.searchSectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
});

const LocalFoodItem = memo(function LocalFoodItem({ item, onPress, onQuickAdd, index = 0 }) {
  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable style={styles.localFoodItem} onPress={() => onPress(item)}>
        <View style={styles.localFoodInfo}>
          <Text style={styles.localFoodName}>{item.name}</Text>
          <Text style={styles.localFoodCalories}>{item.calories} kcal</Text>
        </View>
        <Pressable
          style={styles.localFoodQuickAdd}
          onPress={(e) => {
            e.stopPropagation?.();
            onQuickAdd(item);
          }}
          hitSlop={8}
        >
          <Plus size={16} color={Colors.background} />
        </Pressable>
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
const RecipeItem = memo(function RecipeItem({ recipe, onPress, onQuickAdd }) {
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
      <Pressable
        style={styles.recipeAddButton}
        onPress={(e) => {
          e.stopPropagation?.();
          onQuickAdd(recipe);
        }}
        hitSlop={8}
      >
        <Plus size={16} color={Colors.background} />
      </Pressable>
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

function formatRecentMealDate(dateKey) {
  const date = parseISO(dateKey);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

const RecentMealCard = memo(function RecentMealCard({ snapshot, selectedMeal, onPress, index = 0 }) {
  const mealLabel = mealTypes.find((meal) => meal.id === snapshot.mealType)?.label || 'Meal';
  const targetMealLabel = mealTypes.find((meal) => meal.id === selectedMeal)?.label || 'Meal';
  const preview = snapshot.items.slice(0, 2).map((item) => item.name).join(' • ');
  const remainingCount = Math.max(snapshot.itemCount - 2, 0);

  return (
    <ReAnimated.View entering={FadeInDown.delay(index * 40).duration(280)}>
      <Pressable style={styles.recentMealCard} onPress={() => onPress(snapshot)}>
        <View style={styles.recentMealHeader}>
          <View>
            <Text style={styles.recentMealDate}>{formatRecentMealDate(snapshot.dateKey)}</Text>
            <Text style={styles.recentMealTitle}>{mealLabel}</Text>
          </View>
          <View style={styles.recentMealBadge}>
            <Text style={styles.recentMealBadgeText}>Log to {targetMealLabel}</Text>
          </View>
        </View>
        <Text style={styles.recentMealPreview} numberOfLines={2}>
          {preview}
          {remainingCount > 0 ? ` +${remainingCount} more` : ''}
        </Text>
        <View style={styles.recentMealFooter}>
          <Text style={styles.recentMealMeta}>
            {snapshot.itemCount} item{snapshot.itemCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.recentMealCalories}>{snapshot.totals.calories} kcal</Text>
        </View>
      </Pressable>
    </ReAnimated.View>
  );
});

const RepeatYesterdayChip = memo(function RepeatYesterdayChip({
  mealType,
  itemCount,
  disabled,
  onPress,
}) {
  const meal = mealTypes.find((entry) => entry.id === mealType);
  const Icon = meal?.icon || Coffee;

  return (
    <Pressable
      style={[styles.repeatChip, disabled && styles.repeatChipDisabled]}
      onPress={() => onPress(mealType)}
      disabled={disabled}
    >
      <Icon size={15} color={disabled ? Colors.textTertiary : Colors.primary} />
      <Text style={[styles.repeatChipLabel, disabled && styles.repeatChipLabelDisabled]}>
        {meal?.label || mealType}
      </Text>
      <Text style={[styles.repeatChipCount, disabled && styles.repeatChipCountDisabled]}>
        {itemCount}
      </Text>
    </Pressable>
  );
});


function AddScreenInner() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealParam = normalizeMealParam(params.meal);
  const queryParam = getParamValue(params.query);
  const focusParam = getParamValue(params.focus);
  const sourceParam = getParamValue(params.source);
  const isOnboardingHandoff = sourceParam === 'onboarding_complete';
  const {
    addFood,
    addExercise,
    dayData,
    removeFood,
    recentLogs,
    refreshDate,
    selectedDateKey,
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
  const { frequentFoods, getTopFoods, getRecentFoods } = useFrequentFoods();
  const { recentMeals } = useRecentMealSnapshots(7);
  const [mode, setMode] = useState('food');
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [quickCalVisible, setQuickCalVisible] = useState(false);
  const [undoToast, setUndoToast] = useState({
    visible: false,
    message: '',
    mealType: 'snacks',
    entryIds: [],
  });

  // Recipe builder state
  const [recipeBuilderVisible, setRecipeBuilderVisible] = useState(false);
  const [pendingIngredient, setPendingIngredient] = useState(null);
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);

  // Use meal from navigation params, or default based on time of day
  const initialMeal = mealParam || getDefaultMealType();
  const [selectedMeal, setSelectedMeal] = useState(initialMeal);
  const selectedMealLabel = mealTypes.find((meal) => meal.id === selectedMeal)?.label || 'Meal';
  const yesterdayKey = useMemo(
    () => format(subDays(parseISO(selectedDateKey), 1), 'yyyy-MM-dd'),
    [selectedDateKey]
  );

  // Food search state — MUST be declared before any useEffect that references them
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchSources, setSearchSources] = useState({
    local: 0,
    restaurant: 0,
    openFoodFacts: 0,
    usda: 0,
    fatSecret: 0,
    nutritionix: 0,
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingTerms, setTrendingTerms] = useState([]);
  const debouncedQuery = useDebounce(searchQuery, 80);
  const lastTrackedSearchRef = useRef('');

  // Tab state: 'recent' or 'browse'
  const [activeTab, setActiveTab] = useState('recent');

  // Exercise search state
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState(EXERCISES);

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
  const searchInputRef = useRef(null);
  const hasAutoFocusedSearchRef = useRef(false);
  const recordingRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  const loadSearchMetadata = useCallback(async () => {
    try {
      const [recent, trending] = await Promise.all([
        getRecentSearches(8),
        getTrendingTerms(6),
      ]);
      setRecentSearches(recent);
      setTrendingTerms(trending);
    } catch (error) {
      if (__DEV__) {
        console.warn('[add] Failed to load search metadata:', error);
      }
    }
  }, []);

  // Cleanup recording on unmount to prevent resource leaks
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch((e) => { if (__DEV__) console.warn('[add] Failed to stop recording on cleanup:', e); });
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
          {
            text: 'Upgrade',
            onPress: () => router.push({
              pathname: '/paywall',
              params: { source: 'voice_logging', trigger: 'feature_gate' },
            }),
          },
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
    } catch {
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch((e) => { if (__DEV__) console.warn('[add] Failed to reset audio mode:', e); });
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }, [isPremium, isProcessingVoice, router]);

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
        encoding: 'base64',
      });

      // Clean up temp file
      FileSystem.deleteAsync(uri, { idempotent: true }).catch((e) => { if (__DEV__) console.warn('[add] Failed to delete temp audio file:', e); });

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
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch((e) => { if (__DEV__) console.warn('[add] Failed to reset audio mode after processing:', e); });
      setIsProcessingVoice(false);
    }
  }, []);

  // Keep ref in sync so auto-stop timeout calls the latest version
  handleStopRecordingRef.current = handleStopRecording;

  const hideUndoToast = useCallback(() => {
    setUndoToast((current) => ({ ...current, visible: false }));
  }, []);

  const handleUndoLastLog = useCallback(async () => {
    const { entryIds, mealType } = undoToast;
    for (const entryId of entryIds) {
      await removeFood(entryId, mealType);
    }
  }, [removeFood, undoToast]);

  const toLoggedFoodEntry = useCallback((food, options = {}) => ({
    id: Crypto.randomUUID(),
    clientRequestId: Crypto.randomUUID(),
    name: food.name,
    emoji: food.emoji || '🍽️',
    calories: food.calories || 0,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0,
    serving: food.serving || '1 serving',
    servingSize: food.servingSize || 1,
    servingUnit: food.servingUnit || 'serving',
    image: food.image || null,
    brand: food.brand || '',
    barcode: food.barcode || '',
    skipHaptic: options.skipHaptic || false,
  }), []);

  const logFoodsInstant = useCallback(async (foods, mealType = selectedMeal, message) => {
    const normalizedFoods = Array.isArray(foods) ? foods : [foods];
    if (normalizedFoods.length === 0) return [];

    const shouldBatchHaptic = normalizedFoods.length > 1;
    const entries = normalizedFoods.map((food) => toLoggedFoodEntry(food, { skipHaptic: shouldBatchHaptic }));
    await Promise.all(entries.map((entry) => addFood(entry, mealType)));
    if (shouldBatchHaptic) {
      await hapticSuccess();
    }
    recordMealLogged(mealType);
    const mealLabel = mealTypes.find((meal) => meal.id === mealType)?.label || 'meal';
    setUndoToast({
      visible: true,
      message: message || (
        entries.length === 1
          ? `${entries[0].name} logged`
          : `${entries.length} items logged to ${mealLabel.toLowerCase()}`
      ),
      mealType,
      entryIds: entries.map((entry) => entry.clientRequestId || entry.id),
    });
    return entries;
  }, [addFood, recordMealLogged, selectedMeal, toLoggedFoodEntry]);

  const logFoodInstant = useCallback(
    async (food, mealType = selectedMeal, message) => {
      const [entry] = await logFoodsInstant([food], mealType, message);
      return entry;
    },
    [logFoodsInstant, selectedMeal]
  );

  const handleAddVoiceFood = useCallback((food, mealType, foodIndex) => {
    logFoodInstant(food, mealType);

    // Inline confirmation — button switches to checkmark
    setAddedVoiceIndices(prev => new Set(prev).add(foodIndex));
  }, [logFoodInstant]);

  const handleAddAllVoiceFoods = useCallback(() => {
    if (voiceFoods.length === 0) return;

    const foodsToLog = voiceFoods.filter((_, idx) => !addedVoiceIndices.has(idx));
    if (foodsToLog.length === 0) return;

    logFoodsInstant(foodsToLog, selectedMeal, `${foodsToLog.length} voice foods logged`);

    setVoiceFoods([]);
    setAddedVoiceIndices(new Set());
    setVoiceResultsVisible(false);
  }, [voiceFoods, addedVoiceIndices, logFoodsInstant, selectedMeal]);

  // Quick-add a favorite food
  const handleAddFavorite = useCallback((food) => {
    recordQuickAddUsed({
      source: 'favorite_food',
      mealType: selectedMeal,
    });
    logFoodInstant(food, selectedMeal);
  }, [logFoodInstant, selectedMeal]);

  // Quick-log a frequent food (from QuickLogSheet or horizontal scroll)
  const handleQuickLog = useCallback((food, mealType) => {
    const effectiveMeal = mealType || selectedMeal;
    recordQuickAddUsed({
      source: 'frequent_food',
      mealType: effectiveMeal,
    });
    recordRepeatLogUsed({
      source: 'frequent_food',
      mealType: effectiveMeal,
    }).catch(() => {});
    logFoodInstant(food, effectiveMeal);
  }, [logFoodInstant, selectedMeal]);

  // Quick Cal log handler
  const handleQuickCalLog = useCallback((food, mealType) => {
    recordQuickAddUsed({
      source: 'quick_cal',
      mealType,
    });
    logFoodInstant(food, mealType);
  }, [logFoodInstant]);

  const handleQuickAddLocalFood = useCallback((food) => {
    recordQuickAddUsed({
      source: 'local_food',
      mealType: selectedMeal,
    });
    logFoodInstant(food, selectedMeal);
  }, [logFoodInstant, selectedMeal]);

  const handleStarterFoodAdd = useCallback((food) => {
    recordQuickAddUsed({
      source: 'starter_pick',
      mealType: selectedMeal,
    });
    logFoodInstant(food, selectedMeal);
  }, [logFoodInstant, selectedMeal]);

  const handleQuickAddRecipe = useCallback((recipe) => {
    recordQuickAddUsed({
      source: 'recipe',
      mealType: selectedMeal,
    });
    logFoodInstant({
      ...recipe,
      serving: `1 serving (1/${recipe.servings} recipe)`,
      servingSize: 1,
      servingUnit: 'serving',
    }, selectedMeal);
  }, [logFoodInstant, selectedMeal]);

  // Frequent foods for horizontal quick-add strip
  const topFrequentFoods = useMemo(() => getTopFoods(5), [frequentFoods, getTopFoods]);
  const lastTwentyFoods = useMemo(() => {
    const localRecentFoods = getRecentFoods(20);
    const seenNames = new Set(localRecentFoods.map((food) => food.name?.toLowerCase().trim()));
    const fallbackFoods = (recentFoods || [])
      .filter((food) => {
        const normalizedName = food.name?.toLowerCase().trim();
        return normalizedName && !seenNames.has(normalizedName);
      })
      .slice(0, 20);

    return [...localRecentFoods, ...fallbackFoods].slice(0, 20);
  }, [frequentFoods, getRecentFoods, recentFoods]);
  const recentMealSnapshots = useMemo(
    () => recentMeals.filter((snapshot) => snapshot.items?.length > 0).slice(0, 7),
    [recentMeals]
  );
  const starterFoods = useMemo(() => {
    const ids = STARTER_FOOD_IDS_BY_MEAL[selectedMeal] || STARTER_FOOD_IDS_BY_MEAL.snacks;
    return ids
      .map((id) => foodDatabase.find((food) => food.id === id))
      .filter(Boolean);
  }, [selectedMeal]);
  const yesterdayMeals = useMemo(
    () => dayData?.[yesterdayKey]?.meals || null,
    [dayData, yesterdayKey]
  );
  const repeatYesterdayOptions = useMemo(
    () =>
      mealTypes.map((meal) => ({
        ...meal,
        itemCount: yesterdayMeals?.[meal.id]?.length || 0,
      })),
    [yesterdayMeals]
  );

  // Update selected meal when params change
  useEffect(() => {
    if (mealParam) {
      setSelectedMeal(mealParam);
    }
  }, [mealParam]);

  useEffect(() => {
    if (focusParam === 'browse') {
      setActiveTab('browse');
      return;
    }

    if (focusParam === 'recent') {
      setActiveTab('recent');
    }
  }, [focusParam]);

  useEffect(() => {
    if (typeof queryParam === 'string' && queryParam.length > 0) {
      setMode('food');
      setSearchQuery(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    if (!isOnboardingHandoff || mode !== 'food' || hasAutoFocusedSearchRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      searchInputRef.current?.focus();
      hasAutoFocusedSearchRef.current = true;
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [isOnboardingHandoff, mode]);

  useEffect(() => {
    const source = typeof sourceParam === 'string' && sourceParam.length > 0
      ? sourceParam
      : typeof queryParam === 'string' && queryParam.length > 0
        ? 'search_handoff'
        : params.quickCal === 'true'
          ? 'quick_cal'
          : mealParam
            ? 'meal_shortcut'
            : 'tab';

    recordAddOpened(source, initialMeal);
  }, [initialMeal, mealParam, params.quickCal, queryParam, sourceParam]);

  // Handle quickCal deep link
  useEffect(() => {
    if (params.quickCal === 'true') {
      setQuickCalVisible(true);
    }
  }, [params.quickCal]);

  // Fetch recent foods on mount
  useEffect(() => {
    fetchRecentFoods();
  }, [fetchRecentFoods]);

  useEffect(() => {
    loadSearchMetadata();
  }, [loadSearchMetadata]);

  useEffect(() => {
    if (!dayData?.[yesterdayKey]) {
      refreshDate(yesterdayKey);
    }
  }, [dayData, refreshDate, yesterdayKey]);

  // Keep browsing simple: typing always searches, clearing returns to recents.
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
        lastTrackedSearchRef.current = '';
        return;
      }

      setIsTyping(false);
      setSearchError(null);
      const startedAt = Date.now();
      const normalizedQuery = debouncedQuery.trim().toLowerCase();
      if (lastTrackedSearchRef.current !== normalizedQuery) {
        lastTrackedSearchRef.current = normalizedQuery;
        recordSearchStarted({
          query: debouncedQuery,
          meal: selectedMeal,
        });
      }

      // Phase 1: Show local matches INSTANTLY via pre-built index (O(1) vs O(n))
      const localMatches = searchLocalFoodDatabase(debouncedQuery, 5);

      // Render local results immediately -- user sees results in <50ms
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      }

      // Phase 2: Check cache first, then fetch API results
      const cached = getCachedSearch(debouncedQuery);
      if (cached) {
        if (cancelled) return;
        setSearchResults(cached.products);
        setSearchSources(cached.sources);
        recordSearchCompleted({
          query: debouncedQuery,
          meal: selectedMeal,
          resultCount: cached.products.length,
          latencyMs: Date.now() - startedAt,
          fromCache: true,
        });
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
        recordSearchCompleted({
          query: debouncedQuery,
          meal: selectedMeal,
          resultCount: results.products.length,
          latencyMs: Date.now() - startedAt,
        });
        loadSearchMetadata();
      } catch {
        if (cancelled) return;
        if (localMatches.length === 0) {
          setSearchError('Could not reach food databases. Showing local foods only.');
        }
        recordSearchCompleted({
          query: debouncedQuery,
          meal: selectedMeal,
          resultCount: localMatches.length,
          latencyMs: Date.now() - startedAt,
          degraded: true,
        });
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
  }, [debouncedQuery, isPremium, loadSearchMetadata, mode, selectedMeal]);

  // Filter local foods based on search (for quick-add section when not searching API)
  const filteredLocalFoods = useMemo(() => {
    if (searchQuery.length < 2) return foodDatabase;
    return searchLocalFoodDatabase(searchQuery, 50);
  }, [searchQuery]);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!recipes || recipes.length === 0) return [];
    if (searchQuery.length === 0) return recipes;
    return recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recipes, searchQuery]);

  const queryMatchedRecentFoods = useMemo(() => {
    if (searchQuery.trim().length < 2) {
      return [];
    }

    const seen = new Set();
    return [...topFrequentFoods, ...lastTwentyFoods]
      .filter((food) => matchesSearchText(searchQuery, food.name, food.brand))
      .filter((food) => {
        const key = normalizeSearchText(food.canonicalId || food.id || food.name);
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [lastTwentyFoods, searchQuery, topFrequentFoods]);

  const bestSearchMatches = useMemo(() => searchResults.slice(0, 8), [searchResults]);
  const additionalSearchMatches = useMemo(() => searchResults.slice(8, 20), [searchResults]);

  const searchMatchSourcesLabel = useMemo(() => {
    const labels = [
      searchSources.local > 0 ? 'FuelIQ' : null,
      searchSources.restaurant > 0 ? 'Restaurant' : null,
      searchSources.usda > 0 ? 'USDA' : null,
      searchSources.fatSecret > 0 ? 'FatSecret' : null,
      searchSources.openFoodFacts > 0 ? 'Open Food Facts' : null,
      searchSources.nutritionix > 0 ? 'Nutritionix' : null,
    ].filter(Boolean);

    return labels.join(' + ');
  }, [searchSources]);

  // Handle selecting a search result - open FoodDetailModal
  const handleSelectResult = useCallback((product) => {
    hapticLight();
    Keyboard.dismiss();
    recordSearchResultSelected({
      meal: selectedMeal,
      name: product.name,
      sourceLabel: product.sourceLabel,
      confidenceLevel: product.confidenceLevel,
      quickAdd: false,
    });
    const food = productToFood(product);
    setSelectedFood({
      ...food,
      image: product.image,
      brand: product.brand,
      serving: product.serving || '100g',
      servingSize: product.servingSize || 100,
      servingUnit: product.servingUnit || 'g',
      source: product.source,
      sourceLabel: product.sourceLabel,
      qualityTag: product.qualityTag,
      qualityLabel: product.qualityLabel,
      trustScore: product.trustScore,
      confidenceScore: product.confidenceScore,
      confidenceLevel: product.confidenceLevel,
      confidenceReason: product.confidenceReason,
      qualityIssues: product.qualityIssues,
      reportable: product.reportable,
    });
    setFoodDetailModalVisible(true);
  }, [selectedMeal]);

  const handleSearchSuggestionPress = useCallback((query) => {
    hapticLight();
    setMode('food');
    setActiveTab('recent');
    setSearchQuery(query);
  }, []);

  // Handle selecting a local food - open FoodDetailModal
  const handleSelectLocalFood = useCallback((food) => {
    hapticLight();
    Keyboard.dismiss();
    setSelectedFood({
      ...food,
      serving: food.serving || '1 serving',
      servingSize: food.servingSize || 1,
      servingUnit: food.servingUnit || 'serving',
      qualityTag: food.qualityTag || (food.isLocal ? 'curated' : undefined),
      qualityLabel: food.qualityLabel || (food.isLocal ? 'Curated' : undefined),
      confidenceReason: food.confidenceReason || (food.isLocal ? 'Curated nutrition data' : undefined),
      sourceLabel: food.sourceLabel || (food.isLocal ? 'FuelIQ' : undefined),
      reportable: food.reportable ?? Boolean(food.isLocal),
    });
    setFoodDetailModalVisible(true);
  }, []);

  // Handle confirming food from FoodDetailModal
  const handleConfirmFoodDetail = useCallback((food, mealType) => {
    logFoodInstant(food, mealType);
    setFoodDetailModalVisible(false);
    setSelectedFood(null);
    setSearchQuery('');
    setActiveTab('recent');
  }, [logFoodInstant]);

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
  }, [addExercise]);

  const handleRecentMealRepeat = useCallback((snapshot) => {
    recordQuickAddUsed({
      source: 'recent_meal',
      mealType: selectedMeal,
      itemCount: snapshot.itemCount,
    });
    recordRepeatLogUsed({
      source: 'recent_meal',
      mealType: selectedMeal,
      itemCount: snapshot.itemCount,
    }).catch(() => {});
    logFoodsInstant(
      snapshot.items,
      selectedMeal,
      `${snapshot.itemCount} items repeated to ${mealTypes.find((meal) => meal.id === selectedMeal)?.label?.toLowerCase() || 'meal'}`
    );
  }, [logFoodsInstant, selectedMeal]);

  const handleRepeatYesterday = useCallback((mealType) => {
    const foods = (yesterdayMeals?.[mealType] || []).map((food) => ({
      ...food,
      id: undefined,
    }));
    if (foods.length === 0) return;

    recordQuickAddUsed({
      source: 'repeat_yesterday',
      mealType: selectedMeal,
      itemCount: foods.length,
    });
    recordRepeatLogUsed({
      source: 'repeat_yesterday',
      mealType: selectedMeal,
      itemCount: foods.length,
    }).catch(() => {});
    logFoodsInstant(
      foods,
      selectedMeal,
      `Repeated yesterday's ${mealTypes.find((meal) => meal.id === mealType)?.label?.toLowerCase() || 'meal'}`
    );
  }, [logFoodsInstant, selectedMeal, yesterdayMeals]);

  const handleReportFood = useCallback((food) => {
    Keyboard.dismiss();
    setFoodDetailModalVisible(false);
    setSelectedFood(null);
    const normalizedName = food.brand
      ? food.name.replace(new RegExp(`\\s*\\(${food.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`, 'i'), '')
      : food.name;
    router.push({
      pathname: '/submit-food',
      params: {
        report: 'true',
        source: food.source || '',
        sourceLabel: food.sourceLabel || 'Search',
        qualityLabel: food.qualityLabel || '',
        name: normalizedName || '',
        brand: food.brand || '',
        barcode: food.barcode || '',
        calories: String(food.calories || 0),
        protein: String(food.protein || 0),
        carbs: String(food.carbs || 0),
        fat: String(food.fat || 0),
        servingSize: String(food.servingSize || 1),
        servingUnit: food.servingUnit || 'serving',
      },
    });
  }, [router]);

  // Barcode lookup screen (Open Food Facts + manual fallback)
  const handleOpenBarcodeLookup = () => {
    hapticLight();
    Keyboard.dismiss();
    router.push({
      pathname: '/barcode',
      params: { meal: selectedMeal },
    });
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

  const handleOpenImportSwitcher = useCallback(async () => {
    await hapticLight();
    Keyboard.dismiss();
    router.push({
      pathname: '/import-myfitnesspal',
      params: {
        source: isOnboardingHandoff ? 'onboarding_add_empty_state' : 'add_empty_state',
      },
    });
  }, [isOnboardingHandoff, router]);

  const clearSearch = () => {
    if (mode === 'food') {
      setSearchQuery('');
      setSearchResults([]);
      setIsTyping(false);
      setIsSearching(false);
      setSearchError(null);
      setSearchSources({
        local: 0,
        restaurant: 0,
        openFoodFacts: 0,
        usda: 0,
        fatSecret: 0,
        nutritionix: 0,
      });
    } else {
      setExerciseQuery('');
    }
    Keyboard.dismiss();
  };

  const currentQuery = mode === 'food' ? searchQuery : exerciseQuery;
  const setCurrentQuery = mode === 'food' ? setSearchQuery : setExerciseQuery;

  // 1-tap quick add: log food with 1 serving, skip FoodDetailModal
  const handleQuickAddResult = useCallback(async (product) => {
    Keyboard.dismiss();
    recordSearchResultSelected({
      meal: selectedMeal,
      name: product.name,
      sourceLabel: product.sourceLabel,
      confidenceLevel: product.confidenceLevel,
      quickAdd: true,
    });
    recordQuickAddUsed({
      source: 'search_result',
      mealType: selectedMeal,
    });
    const food = productToFood(product);
    await logFoodInstant(food, selectedMeal);
  }, [logFoodInstant, selectedMeal]);

  // Stable renderItem and keyExtractor callbacks for FlatList optimization
  const renderRecentFood = useCallback(({ item, index }) => (
    <RecentFoodItem
      item={item}
      index={index}
      onPress={handleSelectLocalFood}
      onQuickAdd={handleQuickAddLocalFood}
    />
  ), [handleQuickAddLocalFood, handleSelectLocalFood]);

  const renderLocalFood = useCallback(({ item, index }) => (
    <LocalFoodItem
      item={item}
      index={index}
      onPress={handleSelectLocalFood}
      onQuickAdd={handleQuickAddLocalFood}
    />
  ), [handleQuickAddLocalFood, handleSelectLocalFood]);

  const renderExercise = useCallback(({ item }) => (
    <ExerciseItem exercise={item} onPress={handleSelectExercise} />
  ), [handleSelectExercise]);

  const searchKeyExtractor = useCallback(
    (item) => item.barcode || item.canonicalId || item.id || item.name,
    []
  );
  const idKeyExtractor = useCallback((item) => String(item.id || item.name), []);
  const isShowingSearchResults = mode === 'food' && searchQuery.trim().length >= 2;
  const showFirstLogPrompt = (
    isOnboardingHandoff &&
    mode === 'food' &&
    searchQuery.trim().length === 0 &&
    frequentFoods.length === 0 &&
    recentMeals.length === 0
  );
  const hasAddScreenHistory = (
    topFrequentFoods.length > 0 ||
    recentMealSnapshots.length > 0 ||
    lastTwentyFoods.length > 0 ||
    favorites.length > 0
  );
  const showImportSwitcherCard = (
    mode === 'food' &&
    searchQuery.trim().length === 0 &&
    !recentFoodsLoading &&
    !hasAddScreenHistory &&
    !isOnboardingHandoff
  );
  const showStarterPicks = showFirstLogPrompt && starterFoods.length > 0;
  const searchPlaceholder = mode === 'food'
    ? isOnboardingHandoff
      ? `Search your first ${selectedMealLabel.toLowerCase()}...`
      : 'Search foods...'
    : 'Search exercises...';

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="add-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{mode === 'food' ? 'Log Fast' : 'Add Exercise'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'food'
            ? 'Search, scan, or quick-add without leaving the logging flow.'
            : 'Search and log movement with minimal friction.'}
        </Text>
      </View>

      {/* Mode Selector */}
      <ModeSelector mode={mode} onModeChange={setMode} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            testID="food-search-input"
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={searchPlaceholder}
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
      </View>

      {/* Food Mode Content */}
      {mode === 'food' && (
        <>
          <MealTypeSelector selected={selectedMeal} onSelect={setSelectedMeal} />

          {showFirstLogPrompt && (
            <View style={styles.firstLogPrompt}>
              <View style={styles.firstLogPromptIcon}>
                <Utensils size={18} color={Colors.primary} strokeWidth={2.3} />
              </View>
              <View style={styles.firstLogPromptCopy}>
                <Text style={styles.firstLogPromptEyebrow}>First win</Text>
                <Text style={styles.firstLogPromptTitle}>
                  Log your first {selectedMealLabel.toLowerCase()} now
                </Text>
                <Text style={styles.firstLogPromptBody}>
                  Search something you actually ate. If search feels slow, use Scan or Quick Cal just below.
                </Text>
              </View>
            </View>
          )}

          {showImportSwitcherCard && (
            <MyFitnessPalImportCard
              eyebrow={isOnboardingHandoff ? 'Switch Instead' : 'Have History Elsewhere?'}
              title="Already logged meals in MyFitnessPal?"
              body="Import your diary first, then use repeat meals and quick add from day one."
              buttonLabel="Import MyFitnessPal diary"
              onPress={handleOpenImportSwitcher}
              style={styles.importSwitcherCard}
            />
          )}

          <FastCapturePanel
            selectedMeal={selectedMeal}
            onOpenBarcodeLookup={handleOpenBarcodeLookup}
            onOpenQuickCal={() => setQuickCalVisible(true)}
            onOpenCustomFood={() => router.push({ pathname: '/create-food', params: { meal: selectedMeal } })}
            onOpenFoodLens={handleOpenFoodLens}
            onOpenVoice={isRecording ? handleStopRecording : handleStartRecording}
            isRecording={isRecording}
            isProcessingVoice={isProcessingVoice}
          />

          {showStarterPicks && (
            <View style={styles.favoritesSection}>
              <View style={styles.favoritesSectionHeader}>
                <Wand2 size={16} color={Colors.primary} />
                <Text style={styles.sectionLabel}>Starter Picks</Text>
              </View>
              {starterFoods.map((food, index) => (
                <FavoriteFoodItem
                  key={food.id || food.name}
                  item={food}
                  onAdd={handleStarterFoodAdd}
                  index={index}
                />
              ))}
            </View>
          )}

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

          {/* Search/Recent Toggle */}
          <SearchRecentToggle
            activeTab={activeTab}
            onTabChange={setActiveTab}
            recentCount={lastTwentyFoods.length}
          />

          {/* Content */}
          {isShowingSearchResults ? (
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
                  <Text style={styles.emptyText}>No strong matches yet</Text>
                  <Text style={styles.emptySubtext}>
                    Try steak, eggs, toast, or use Scan / Quick Cal below.
                  </Text>
                  <View style={styles.searchFallbackActions}>
                    <FastCaptureAction
                      icon={ScanBarcode}
                      label="Scan Barcode"
                      hint="Best for packaged foods"
                      onPress={handleOpenBarcodeLookup}
                    />
                    <FastCaptureAction
                      icon={Plus}
                      label="Quick Add"
                      hint="Log calories and macros manually"
                      onPress={() => setQuickCalVisible(true)}
                    />
                  </View>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.resultsList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <SearchSectionHeader
                    title={`Best Matches (${bestSearchMatches.length})`}
                    subtitle={searchMatchSourcesLabel ? `Trusted from ${searchMatchSourcesLabel}` : 'Trusted picks for this search'}
                  />
                  {bestSearchMatches.map((item, index) => (
                    <SearchResultItem
                      key={searchKeyExtractor(item)}
                      item={item}
                      index={index}
                      onPress={handleSelectResult}
                      onQuickAdd={handleQuickAddResult}
                      onReport={handleReportFood}
                    />
                  ))}

                  {queryMatchedRecentFoods.length > 0 && (
                    <>
                      <SearchSectionHeader
                        title="Recent for this search"
                        subtitle={`Foods you've already used for ${selectedMealLabel.toLowerCase()}`}
                      />
                      {queryMatchedRecentFoods.map((item, index) => (
                        <RecentFoodItem
                          key={`recent-${item.id || item.name}`}
                          item={item}
                          index={index}
                          onPress={handleSelectLocalFood}
                          onQuickAdd={handleQuickAddLocalFood}
                        />
                      ))}
                    </>
                  )}

                  {additionalSearchMatches.length > 0 && (
                    <>
                      <SearchSectionHeader
                        title="More Results"
                        subtitle="Branded and secondary matches"
                      />
                      {additionalSearchMatches.map((item, index) => (
                        <SearchResultItem
                          key={`${searchKeyExtractor(item)}-more`}
                          item={item}
                          index={index}
                          onPress={handleSelectResult}
                          onQuickAdd={handleQuickAddResult}
                          onReport={handleReportFood}
                        />
                      ))}
                    </>
                  )}

                  <SearchSectionHeader
                    title="Fast fallback"
                    subtitle="Stay in the logging flow if search is not the fastest option"
                  />
                  <View style={styles.searchFallbackActions}>
                    <FastCaptureAction
                      icon={Plus}
                      label="Quick Add"
                      hint="Calories and macros in seconds"
                      tone="primary"
                      onPress={() => setQuickCalVisible(true)}
                    />
                    <FastCaptureAction
                      icon={ScanBarcode}
                      label="Scan"
                      hint="Packaged foods"
                      onPress={handleOpenBarcodeLookup}
                    />
                    <FastCaptureAction
                      icon={Wand2}
                      label="Create Food"
                      hint="Save a custom item"
                      onPress={() => router.push({ pathname: '/create-food', params: { meal: selectedMeal } })}
                    />
                  </View>
                  <View style={styles.bottomSpacer} />
                </ScrollView>
              )}
            </View>
          ) : activeTab === 'recent' ? (
            // Logging speed surfaces: repeat, recent meals, favorites, last 20 foods
            <View style={styles.resultsContainer}>
              {recentFoodsLoading && lastTwentyFoods.length === 0 && recentMealSnapshots.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading recent foods...</Text>
                </View>
              ) : (
                <OptimizedFlatList
                  data={lastTwentyFoods}
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
                      <View style={styles.focusSection}>
                        <View style={styles.focusSectionHeader}>
                          <RotateCcw size={16} color={Colors.primary} />
                          <Text style={styles.focusSectionLabel}>Repeat Yesterday</Text>
                        </View>
                        <View style={styles.repeatChipRow}>
                          {repeatYesterdayOptions.map((meal) => (
                            <RepeatYesterdayChip
                              key={meal.id}
                              mealType={meal.id}
                              itemCount={meal.itemCount}
                              disabled={meal.itemCount === 0}
                              onPress={handleRepeatYesterday}
                            />
                          ))}
                        </View>
                      </View>

                      <SearchSuggestionChips
                        recentSearches={recentSearches}
                        trendingTerms={trendingTerms}
                        onSelect={handleSearchSuggestionPress}
                      />

                      <View style={styles.focusSection}>
                        <View style={styles.focusSectionHeader}>
                          <Clock size={16} color={Colors.primary} />
                          <Text style={styles.focusSectionLabel}>Last 7 Meals</Text>
                        </View>
                        {recentMealSnapshots.length === 0 ? (
                          <View style={styles.focusEmptyCard}>
                            <Text style={styles.focusEmptyTitle}>No recent meals yet</Text>
                            <Text style={styles.focusEmptyHint}>
                              Full meals you log will appear here for 1-tap repeats
                            </Text>
                          </View>
                        ) : (
                          recentMealSnapshots.map((snapshot, index) => (
                            <RecentMealCard
                              key={snapshot.id}
                              snapshot={snapshot}
                              selectedMeal={selectedMeal}
                              onPress={handleRecentMealRepeat}
                              index={index}
                            />
                          ))
                        )}
                      </View>

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

                      {/* Last 20 foods header */}
                      {lastTwentyFoods.length > 0 && (
                        <Text style={styles.resultsHeader}>
                          {lastTwentyFoods.length} recently logged foods
                        </Text>
                      )}
                      {lastTwentyFoods.length === 0 && (
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
                          onQuickAdd={handleQuickAddRecipe}
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
      {foodDetailModalVisible && (
        <FoodDetailModal
          visible={foodDetailModalVisible}
          food={selectedFood}
          mealType={selectedMeal}
          onClose={handleCloseFoodDetail}
          onConfirm={isAddingIngredient ? handleConfirmAsIngredient : handleConfirmFoodDetail}
          onReport={handleReportFood}
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

      <UndoToast
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndoLastLog}
        onDismiss={hideUndoToast}
      />
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
  subtitle: {
    marginTop: Spacing.xs,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
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
  firstLogPrompt: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '2A',
    backgroundColor: Colors.primary + '12',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  firstLogPromptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  firstLogPromptCopy: {
    flex: 1,
  },
  firstLogPromptEyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  firstLogPromptTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  firstLogPromptBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  importSwitcherCard: {
    marginHorizontal: Spacing.md,
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
  fastCapturePanel: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  fastCaptureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  fastCaptureEyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fastCaptureTitle: {
    marginTop: 4,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  fastCaptureMealBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '16',
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  fastCaptureMealBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  fastCaptureGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fastCaptureAction: {
    flex: 1,
    minHeight: 92,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  fastCaptureActionIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  fastCaptureActionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  fastCaptureActionHint: {
    marginTop: 4,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  fastCaptureSecondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fastCaptureSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    flex: 1,
    minHeight: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fastCaptureSecondaryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  fastCaptureSecondaryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  fastCaptureSecondaryTextActive: {
    color: Colors.background,
    fontWeight: FontWeight.semibold,
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
  searchSuggestionSection: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchSuggestionBlock: {
    gap: Spacing.xs,
  },
  searchSuggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  searchSuggestionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  searchSuggestionScroll: {
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  searchSuggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchSuggestionChipTrending: {
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary + '28',
  },
  searchSuggestionChipText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  searchSuggestionChipTextTrending: {
    color: Colors.primary,
  },
  searchSuggestionCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
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
  focusSection: {
    marginBottom: Spacing.md,
  },
  focusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  focusSectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  repeatChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  repeatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  repeatChipDisabled: {
    opacity: 0.55,
  },
  repeatChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  repeatChipLabelDisabled: {
    color: Colors.textSecondary,
  },
  repeatChipCount: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '16',
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  repeatChipCountDisabled: {
    backgroundColor: Colors.surfaceElevated,
    color: Colors.textTertiary,
  },
  focusEmptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  focusEmptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  focusEmptyHint: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  recentMealCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  recentMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  recentMealDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: FontWeight.semibold,
  },
  recentMealTitle: {
    marginTop: 4,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  recentMealBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '16',
  },
  recentMealBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  recentMealPreview: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  recentMealFooter: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentMealMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  recentMealCalories: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
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
  searchFallbackActions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  resultsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },
  searchSectionHeader: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  searchSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  searchSectionSubtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
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
  resultTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 6,
    marginBottom: 2,
  },
  resultQualityBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resultQualityBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultConfidenceText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
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
  },
  resultTrailing: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: Spacing.sm,
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
  resultActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultReportButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.warning + '16',
    borderWidth: 1,
    borderColor: Colors.warning + '30',
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
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  localFoodInfo: {
    flex: 1,
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
  localFoodQuickAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
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
