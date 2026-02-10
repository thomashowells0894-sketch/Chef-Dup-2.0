import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
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
import {
  fetchProductByBarcode,
  searchProducts,
  searchProductsGlobal,
  searchProductsWithUKPreference,
  productToFood,
} from '../../services/openFoodFacts';
import { useDebounce } from '../../hooks/useDebounce';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';

const mealTypes = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Sun },
  { id: 'dinner', label: 'Dinner', icon: Sunset },
  { id: 'snacks', label: 'Snack', icon: Moon },
];

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
            onPress={() => onModeChange(m.id)}
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
            onPress={() => onSelect(meal.id)}
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
const RecentFoodItem = memo(function RecentFoodItem({ item, onPress }) {
  return (
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
  );
});

const SearchResultItem = memo(function SearchResultItem({ item, onPress }) {
  const hasCalories = item.calories !== null && item.calories !== undefined;

  return (
    <Pressable style={styles.resultItem} onPress={() => onPress(item)}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.resultImage} />
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
      <View style={styles.resultAddButton}>
        <Plus size={16} color={Colors.background} />
      </View>
    </Pressable>
  );
});

const LocalFoodItem = memo(function LocalFoodItem({ item, onPress }) {
  return (
    <Pressable style={styles.localFoodItem} onPress={() => onPress(item)}>
      <Text style={styles.localFoodName}>{item.name}</Text>
      <Text style={styles.localFoodCalories}>{item.calories} kcal</Text>
    </Pressable>
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

// Exercise Duration Modal
function ExerciseDurationModal({ visible, exercise, userWeight, onClose, onConfirm }) {
  const [duration, setDuration] = useState('30');

  if (!exercise) return null;

  const durationNum = parseInt(duration, 10) || 0;
  const caloriesBurned = calculateCaloriesBurned(exercise.met, userWeight || 150, durationNum);

  const handleConfirm = () => {
    if (durationNum > 0) {
      onConfirm(exercise, durationNum, caloriesBurned);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={styles.modalExerciseIcon}>
              <Dumbbell size={24} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{exercise.name}</Text>
            <Text style={styles.modalSubtitle}>{exercise.category} · MET {exercise.met}</Text>
          </View>

          <View style={styles.durationInputContainer}>
            <Clock size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.durationInput}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={Colors.textTertiary}
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={styles.durationLabel}>minutes</Text>
          </View>

          <View style={styles.caloriesPreview}>
            <Flame size={24} color={Colors.primary} />
            <View style={styles.caloriesPreviewText}>
              <Text style={styles.caloriesPreviewValue}>{caloriesBurned}</Text>
              <Text style={styles.caloriesPreviewLabel}>calories burned</Text>
            </View>
          </View>

          <Text style={styles.formulaText}>
            ({exercise.met} × 3.5 × {((userWeight || 150) * 0.453592).toFixed(1)}kg) / 200 × {durationNum}min
          </Text>

          <View style={styles.modalButtons}>
            <Pressable style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalConfirmButton, durationNum === 0 && styles.modalConfirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={durationNum === 0}
            >
              <Check size={18} color={Colors.background} />
              <Text style={styles.modalConfirmButtonText}>Log Exercise</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Voice Recording Overlay Modal with animated waveform
const WAVE_BAR_COUNT = 12;
function VoiceRecordingModal({ visible, onStop }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef(
    Array.from({ length: WAVE_BAR_COUNT }, () => new Animated.Value(0.3))
  ).current;
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!visible) {
      setSeconds(0);
      return;
    }

    // Pulse animation for red dot
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Staggered waveform bar animations — each bar bounces at different speed/phase
    const waveLoops = waveAnims.map((anim, i) => {
      const speed = 300 + (i % 3) * 150; // 300ms, 450ms, 600ms cycle
      const delay = i * 80; // stagger start
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 0.5 + Math.random() * 0.5, duration: speed, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15 + Math.random() * 0.25, duration: speed, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });

    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => {
      pulse.stop();
      waveLoops.forEach(l => l.stop());
      clearInterval(interval);
    };
  }, [visible]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStop}>
      <View style={styles.voiceOverlay}>
        <View style={styles.voiceRecordingCard}>
          <Animated.View style={[styles.voicePulseDot, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.voiceRedDot} />
          </Animated.View>
          <Text style={styles.voiceListeningText}>Listening...</Text>
          <Text style={styles.voiceTimerText}>{formatTime(seconds)}</Text>

          {/* Animated waveform bars */}
          <View style={styles.voiceWaveform}>
            {waveAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.voiceWaveBar,
                  {
                    transform: [{ scaleY: anim }],
                    opacity: Animated.add(0.4, Animated.multiply(anim, 0.6)),
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.voiceHintText}>Describe what you ate</Text>

          <Pressable style={styles.voiceStopButton} onPress={onStop}>
            <Square size={20} color={Colors.text} fill={Colors.text} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Voice Results Sheet
function VoiceResultsSheet({ visible, transcript, foods, selectedMeal, onAddFood, onAddAll, onClose, addedIndices }) {
  if (!visible) return null;

  const mealLabel = mealTypes.find(m => m.id === selectedMeal)?.label || 'Meal';
  const remainingFoods = foods.filter((_, i) => !addedIndices.has(i));
  const remainingCalories = remainingFoods.reduce((sum, f) => sum + (f.calories || 0), 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.voiceResultsOverlay}>
        <View style={styles.voiceResultsCard}>
          <View style={styles.voiceResultsHandle} />

          <View style={styles.voiceResultsHeader}>
            <Text style={styles.voiceResultsTitle}>Voice Results</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {transcript ? (
            <View style={styles.voiceTranscriptBox}>
              <Mic size={14} color={Colors.textSecondary} />
              <Text style={styles.voiceTranscriptText}>"{transcript}"</Text>
            </View>
          ) : null}

          {foods.length === 0 ? (
            <View style={styles.voiceNoFoods}>
              <Text style={styles.voiceNoFoodsText}>
                No foods detected. Try speaking more clearly.
              </Text>
            </View>
          ) : (
            <>
              {/* Add All button — only for remaining un-added foods */}
              {remainingFoods.length > 1 && (
                <Pressable style={styles.voiceAddAllBtn} onPress={onAddAll}>
                  <Plus size={18} color={Colors.background} />
                  <Text style={styles.voiceAddAllText}>
                    Add All {remainingFoods.length} Items to {mealLabel}
                  </Text>
                  <Text style={styles.voiceAddAllCalories}>{remainingCalories} kcal</Text>
                </Pressable>
              )}

              <ScrollView style={styles.voiceFoodsList} showsVerticalScrollIndicator={false}>
                {foods.map((food, idx) => {
                  const isAdded = addedIndices.has(idx);
                  return (
                    <View key={idx} style={styles.voiceFoodCard}>
                      <Text style={styles.voiceFoodEmoji}>{food.emoji || '🍽️'}</Text>
                      <View style={styles.voiceFoodInfo}>
                        <Text style={styles.voiceFoodName}>{food.name}</Text>
                        <Text style={styles.voiceFoodMacros}>
                          {food.calories} kcal · P{food.protein}g · C{food.carbs}g · F{food.fat}g
                        </Text>
                        <Text style={styles.voiceFoodServing}>{food.serving}</Text>
                      </View>
                      <Pressable
                        style={[styles.voiceFoodAddBtn, isAdded && styles.voiceFoodAddedBtn]}
                        onPress={() => !isAdded && onAddFood(food, selectedMeal, idx)}
                        disabled={isAdded}
                      >
                        {isAdded ? (
                          <>
                            <Check size={16} color={Colors.primary} />
                            <Text style={[styles.voiceFoodAddText, { color: Colors.primary }]}>Added</Text>
                          </>
                        ) : (
                          <>
                            <Plus size={16} color={Colors.background} />
                            <Text style={styles.voiceFoodAddText}>Add</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function AddScreen() {
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
  const { recordMealLogged } = useFasting();
  const { favorites } = useFavoriteFoods();
  const [mode, setMode] = useState('food');

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
  const debouncedQuery = useDebounce(searchQuery, 300);

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

    // Inline confirmation — button switches to checkmark
    setAddedVoiceIndices(prev => new Set(prev).add(foodIndex));
  }, [addFood, recordMealLogged]);

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
    });
    recordMealLogged(selectedMeal);

    setVoiceFoods([]);
    setAddedVoiceIndices(new Set());
    setVoiceResultsVisible(false);
  }, [voiceFoods, selectedMeal, addFood, recordMealLogged, addedVoiceIndices]);

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
  }, [addFood, selectedMeal, recordMealLogged]);

  // Update selected meal when params change
  useEffect(() => {
    if (params.meal) {
      setSelectedMeal(params.meal);
    }
  }, [params.meal]);

  // Fetch recent foods on mount
  useEffect(() => {
    fetchRecentFoods();
  }, []);

  // Auto-switch tab based on search query
  useEffect(() => {
    if (mode === 'food') {
      if (searchQuery.length >= 2) {
        setActiveTab('search');
      } else if (searchQuery.length === 0) {
        setActiveTab('recent');
      }
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
  useEffect(() => {
    async function performSearch() {
      // Clear immediately if query is too short or empty
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        setIsTyping(false);
        return;
      }

      setIsTyping(false);
      setIsSearching(true);
      setSearchError(null);

      // Get matching local foods first (instant, no network needed)
      const localMatches = foodDatabase
        .filter((food) => food.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
        .slice(0, 5)
        .map((food) => ({
          ...food,
          barcode: `local-${food.id}`,
          isLocal: true,
        }));

      try {
        // Use global OpenFoodFacts search (covers US + UK + EU markets)
        // Built-in 8 second timeout for resilience
        const results = await searchProductsGlobal(debouncedQuery, 30);

        // Combine local + API results, deduplicate by name
        const seenNames = new Set();
        const combinedResults = [];

        // Add local matches first (they're faster/more reliable)
        for (const item of localMatches) {
          const normalizedName = item.name.toLowerCase().trim();
          if (!seenNames.has(normalizedName)) {
            seenNames.add(normalizedName);
            combinedResults.push(item);
          }
        }

        // Add API results, avoiding duplicates
        for (const item of results.products || []) {
          const normalizedName = item.name.toLowerCase().trim();
          if (!seenNames.has(normalizedName)) {
            seenNames.add(normalizedName);
            combinedResults.push(item);
          }
        }

        setSearchResults(combinedResults);
      } catch (error) {
        // If API fails, silently return local results only (don't crash)
        if (localMatches.length > 0) {
          setSearchResults(localMatches);
        } else {
          // Only show error if we have no results at all
          setSearchError('Could not reach food database. Showing local foods only.');
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }

    if (mode === 'food') {
      performSearch();
    }
  }, [debouncedQuery, mode]);

  // Filter local foods based on search (for quick-add section when not searching API)
  const filteredLocalFoods = useMemo(() => {
    if (searchQuery.length === 0) return foodDatabase;
    const lower = searchQuery.toLowerCase();
    return foodDatabase.filter((food) =>
      food.name.toLowerCase().includes(lower)
    );
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
    setFoodDetailModalVisible(false);
    setSelectedFood(null);
    setSearchQuery('');
    router.navigate('/');
  }, [addFood, recordMealLogged, router]);

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
    Keyboard.dismiss();
    router.push('/barcode');
  };

  // AI Food Lens handler
  const handleOpenFoodLens = () => {
    Keyboard.dismiss();
    router.push({
      pathname: '/scan',
      params: { meal: selectedMeal },
    });
  };

  // AI Workout Generator handler
  const handleOpenWorkoutGenerator = () => {
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
        setSelectedProduct(product);
        setScannerVisible(false);
        setProductModalVisible(true);
      } else {
        setScanError('Product not found in database');
        setScannerVisible(false);
        setProductModalVisible(true);
      }
    } catch (error) {
      if (__DEV__) console.error('Barcode scan error:', error);
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
    } else {
      setExerciseQuery('');
    }
    Keyboard.dismiss();
  };

  const currentQuery = mode === 'food' ? searchQuery : exerciseQuery;
  const setCurrentQuery = mode === 'food' ? setSearchQuery : setExerciseQuery;

  // Stable renderItem and keyExtractor callbacks for FlatList optimization
  const renderSearchResult = useCallback(({ item }) => (
    <SearchResultItem item={item} onPress={handleSelectResult} />
  ), [handleSelectResult]);

  const renderRecentFood = useCallback(({ item }) => (
    <RecentFoodItem item={item} onPress={handleSelectLocalFood} />
  ), [handleSelectLocalFood]);

  const renderLocalFood = useCallback(({ item }) => (
    <LocalFoodItem item={item} onPress={handleSelectLocalFood} />
  ), [handleSelectLocalFood]);

  const renderExercise = useCallback(({ item }) => (
    <ExerciseItem exercise={item} onPress={handleSelectExercise} />
  ), [handleSelectExercise]);

  const searchKeyExtractor = useCallback((item) => item.barcode, []);
  const idKeyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            style={styles.searchInput}
            placeholder={mode === 'food' ? 'Search foods...' : 'Search exercises...'}
            placeholderTextColor={Colors.textTertiary}
            value={currentQuery}
            onChangeText={setCurrentQuery}
            returnKeyType="search"
            autoCorrect={false}
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
                <FlatList
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
                      {searchResults.length} results from OpenFoodFacts
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
                <FlatList
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
            <FlatList
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
        <FlatList
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

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={handleCloseScanner}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Product Found Modal (for barcode scans) */}
      <ProductFoundModal
        visible={productModalVisible}
        product={selectedProduct}
        error={scanError}
        onClose={handleCloseProductModal}
        onConfirm={handleConfirmProduct}
        defaultMeal={selectedMeal}
      />

      {/* Food Detail Modal (for search results) */}
      <FoodDetailModal
        visible={foodDetailModalVisible}
        food={selectedFood}
        mealType={selectedMeal}
        onClose={handleCloseFoodDetail}
        onConfirm={isAddingIngredient ? handleConfirmAsIngredient : handleConfirmFoodDetail}
      />

      {/* Recipe Builder Modal */}
      <RecipeBuilderModal
        visible={recipeBuilderVisible}
        onClose={() => setRecipeBuilderVisible(false)}
        onAddIngredient={handleAddIngredientFromBuilder}
        pendingIngredient={pendingIngredient}
        onClearPendingIngredient={() => setPendingIngredient(null)}
      />

      {/* Exercise Duration Modal */}
      <ExerciseDurationModal
        visible={exerciseModalVisible}
        exercise={selectedExercise}
        userWeight={profile?.weight}
        onClose={() => setExerciseModalVisible(false)}
        onConfirm={handleConfirmExercise}
      />

      {/* Voice Recording Overlay */}
      <VoiceRecordingModal
        visible={isRecording}
        onStop={handleStopRecording}
      />

      {/* Voice Results Sheet */}
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalExerciseIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  durationInput: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  durationLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  caloriesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  caloriesPreviewText: {
    alignItems: 'center',
  },
  caloriesPreviewValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  caloriesPreviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  formulaText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
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
  // Voice Recording Overlay
  voiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  voiceRecordingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '85%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  voicePulseDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  voiceRedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
  },
  voiceListeningText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  voiceTimerText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 48,
    marginBottom: Spacing.lg,
  },
  voiceWaveBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  voiceHintText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
  },
  voiceStopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  // Voice Results Sheet
  voiceResultsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  voiceResultsCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
  },
  voiceResultsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  voiceResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  voiceResultsTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  voiceTranscriptBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  voiceTranscriptText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  voiceAddAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  voiceAddAllText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.background,
    flex: 1,
  },
  voiceAddAllCalories: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
    opacity: 0.8,
  },
  voiceNoFoods: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  voiceNoFoodsText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  voiceFoodsList: {
    flexGrow: 0,
  },
  voiceFoodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  voiceFoodEmoji: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  voiceFoodInfo: {
    flex: 1,
  },
  voiceFoodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  voiceFoodMacros: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  voiceFoodServing: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  voiceFoodAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  voiceFoodAddedBtn: {
    backgroundColor: Colors.primary + '20',
  },
  voiceFoodAddText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
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
