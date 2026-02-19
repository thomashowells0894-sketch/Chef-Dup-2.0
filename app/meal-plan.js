/**
 * VibeFit - AI Meal Plan Screen
 *
 * Full-screen meal plan viewer with Future Glass design.
 * Shows a multi-day AI-generated meal plan with day tabs,
 * meal cards, shopping list, and coach note.
 */

import React, { useState, useCallback, useMemo } from 'react';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import PremiumGate from '../components/PremiumGate';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
  Glass,
} from '../constants/theme';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  RefreshCw,
  ShoppingCart,
  ChefHat,
  Clock,
  ChevronDown,
  Users,
  Minus,
  Plus,
} from 'lucide-react-native';
import { useMeals } from '../context/MealContext';
import { useProfile } from '../context/ProfileContext';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { useMealPlan } from '../hooks/useMealPlan';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Skeleton Shimmer for Loading State
// ============================================================================

function SkeletonCard({ delay = 0 }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().damping(12)}
      style={styles.skeletonCard}
    >
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonEmoji} />
        <View style={styles.skeletonTextBlock}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>
      </View>
      <View style={styles.skeletonMacroRow}>
        <View style={styles.skeletonMacroPill} />
        <View style={styles.skeletonMacroPill} />
        <View style={styles.skeletonMacroPill} />
      </View>
    </ReAnimated.View>
  );
}

// ============================================================================
// Day Tab Pill
// ============================================================================

function DayTab({ label, isActive, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dayTab, isActive && styles.dayTabActive]}
    >
      {isActive ? (
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.dayTabGradient}
        >
          <Text style={[styles.dayTabText, styles.dayTabTextActive]}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={styles.dayTabText}>{label}</Text>
      )}
    </Pressable>
  );
}

// ============================================================================
// Meal Card
// ============================================================================

function MealCard({ meal, index, onAddToDiary }) {
  const [showIngredients, setShowIngredients] = useState(false);

  const toggleIngredients = useCallback(async () => {
    await hapticLight();
    setShowIngredients((prev) => !prev);
  }, []);

  const handleAdd = useCallback(async () => {
    await hapticSuccess();
    onAddToDiary(meal);
  }, [meal, onAddToDiary]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(index * 80).springify().damping(12)}
    >
      <View style={styles.mealCard}>
        <LinearGradient
          colors={Gradients.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.mealCardGradient}
        >
          {/* Card border */}
          <View style={styles.mealCardBorder} />

          {/* Header: Emoji + Name + Calorie Badge */}
          <View style={styles.mealCardHeader}>
            <Text style={styles.mealEmoji}>{meal.emoji}</Text>
            <View style={styles.mealInfo}>
              <Text style={styles.mealType}>
                {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
              </Text>
              <Text style={styles.mealName} numberOfLines={2}>
                {meal.name}
              </Text>
            </View>
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieBadgeText}>{meal.calories}</Text>
              <Text style={styles.calorieBadgeUnit}>kcal</Text>
            </View>
          </View>

          {/* Macro Mini Row */}
          <View style={styles.macroRow}>
            <View style={styles.macroPill}>
              <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
              <Text style={styles.macroText}>{meal.protein}g P</Text>
            </View>
            <View style={styles.macroPill}>
              <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
              <Text style={styles.macroText}>{meal.carbs}g C</Text>
            </View>
            <View style={styles.macroPill}>
              <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
              <Text style={styles.macroText}>{meal.fat}g F</Text>
            </View>
            <View style={styles.prepTimePill}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.prepTimeText}>{meal.prepTime}</Text>
            </View>
          </View>

          {/* Ingredients Toggle */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <Pressable onPress={toggleIngredients} style={styles.ingredientsToggle}>
              <Text style={styles.ingredientsToggleText}>
                {showIngredients ? 'Hide' : 'Show'} Ingredients ({meal.ingredients.length})
              </Text>
              <ChevronDown
                size={16}
                color={Colors.textTertiary}
                style={showIngredients ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </Pressable>
          )}

          {showIngredients && (
            <View style={styles.ingredientsList}>
              {meal.ingredients.map((ingredient, idx) => (
                <Text key={idx} style={styles.ingredientItem}>
                  {'\u2022'} {ingredient}
                </Text>
              ))}
            </View>
          )}

          {/* Add to Diary Button */}
          <Pressable onPress={handleAdd} style={styles.addButton}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <Text style={styles.addButtonText}>Add to Diary</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================================
// Shopping List Section
// ============================================================================

function ShoppingListSection({ items }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(async () => {
    await hapticLight();
    setExpanded((prev) => !prev);
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <ReAnimated.View entering={FadeInDown.delay(400).springify().damping(12)}>
      <Pressable onPress={toggleExpanded} style={styles.shoppingHeader}>
        <View style={styles.shoppingHeaderLeft}>
          <ShoppingCart size={20} color="#10B981" />
          <Text style={styles.shoppingTitle}>Shopping List</Text>
          <View style={styles.shoppingBadge}>
            <Text style={styles.shoppingBadgeText}>{items.length}</Text>
          </View>
        </View>
        <ChevronDown
          size={20}
          color={Colors.textTertiary}
          style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined}
        />
      </Pressable>

      {expanded && (
        <View style={styles.shoppingList}>
          {items.map((item, idx) => (
            <ReAnimated.View
              key={idx}
              entering={FadeInDown.delay(idx * 30).springify().damping(12)}
              style={styles.shoppingItem}
            >
              <View style={styles.shoppingCheckbox} />
              <Text style={styles.shoppingItemText}>{item}</Text>
            </ReAnimated.View>
          ))}
        </View>
      )}
    </ReAnimated.View>
  );
}

// ============================================================================
// Coach Note Card
// ============================================================================

function CoachNoteCard({ note }) {
  if (!note) return null;

  return (
    <ReAnimated.View entering={FadeInDown.delay(480).springify().damping(12)}>
      <View style={styles.coachCard}>
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.coachCardGradient}
        >
          <View style={styles.coachCardBorder} />
          <View style={styles.coachHeader}>
            <ChefHat size={20} color="#10B981" />
            <Text style={styles.coachTitle}>Coach Note</Text>
          </View>
          <Text style={styles.coachText}>{note}</Text>
        </LinearGradient>
      </View>
    </ReAnimated.View>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

function MealPlanScreenInner() {
  const router = useRouter();
  const { addFood } = useMeals();
  const { profile } = useProfile();
  const { mealPlan, isGenerating, generatePlan, householdSize, updateHouseholdSize } = useMealPlan();

  const [selectedDay, setSelectedDay] = useState(0);

  const days = mealPlan?.days || [];
  const currentDay = days[selectedDay] || null;

  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handleRefresh = useCallback(async () => {
    await hapticLight();
    Alert.alert(
      'Regenerate Meal Plan',
      'This will create a new AI-powered meal plan based on your current goals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => generatePlan(),
        },
      ]
    );
  }, [generatePlan]);

  const handleDaySelect = useCallback(async (index) => {
    await hapticLight();
    setSelectedDay(index);
  }, []);

  const handleAddToDiary = useCallback(
    (meal) => {
      const foodItem = {
        name: meal.name,
        emoji: meal.emoji,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        serving: '1 serving',
      };

      // Map meal type to diary meal type
      const mealTypeMap = {
        breakfast: 'breakfast',
        lunch: 'lunch',
        dinner: 'dinner',
        snack: 'snacks',
      };

      const diaryMealType = mealTypeMap[meal.type] || 'snacks';
      addFood(foodItem, diaryMealType);

      Alert.alert(
        'Added!',
        `${meal.name} has been added to your ${meal.type} diary.`,
        [{ text: 'OK' }]
      );
    },
    [addFood]
  );

  // Empty state
  const showEmptyState = !isGenerating && (!mealPlan || days.length === 0);

  return (
    <ScreenWrapper>
      {/* Header */}
      <ReAnimated.View
        entering={FadeInDown.delay(0).springify().damping(12)}
        style={styles.header}
      >
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Meal Plan</Text>
        <Pressable
          onPress={handleRefresh}
          style={[styles.headerButton, isGenerating && styles.headerButtonDisabled]}
          disabled={isGenerating}
        >
          <RefreshCw size={22} color={isGenerating ? Colors.textTertiary : Colors.text} />
        </Pressable>
      </ReAnimated.View>

      {/* Loading State */}
      {isGenerating && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ReAnimated.View
            entering={FadeInDown.delay(0).springify().damping(12)}
            style={styles.loadingHeader}
          >
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.loadingText}>
              Generating your personalized meal plan...
            </Text>
          </ReAnimated.View>
          <SkeletonCard delay={80} />
          <SkeletonCard delay={160} />
          <SkeletonCard delay={240} />
          <SkeletonCard delay={320} />
        </ScrollView>
      )}

      {/* Empty State */}
      {showEmptyState && (
        <View style={styles.emptyState}>
          <ReAnimated.View
            entering={FadeInDown.delay(0).springify().damping(12)}
            style={styles.emptyContent}
          >
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.emptyIcon}
              >
                <ChefHat size={48} color="#000" strokeWidth={1.5} />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>
              Generate Your Personalized Meal Plan
            </Text>
            <Text style={styles.emptySubtitle}>
              AI will create a {profile?.dietaryRestrictions?.length > 0 ? profile.dietaryRestrictions.join(', ') + ' ' : ''}
              3-day meal plan tailored to your macro targets and fitness goals.
            </Text>
            <Pressable onPress={() => generatePlan()} style={styles.generateButton}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateButtonGradient}
              >
                <ChefHat size={20} color="#000" />
                <Text style={styles.generateButtonText}>Generate Meal Plan</Text>
              </LinearGradient>
            </Pressable>
          </ReAnimated.View>
        </View>
      )}

      {/* Meal Plan Content */}
      {!isGenerating && !showEmptyState && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Household Size Selector */}
          <ReAnimated.View
            entering={FadeInDown.delay(0).springify().damping(12)}
            style={styles.householdRow}
          >
            <View style={styles.householdLeft}>
              <Users size={16} color={Colors.textSecondary} />
              <Text style={styles.householdLabel}>Household</Text>
            </View>
            <View style={styles.householdControls}>
              <Pressable
                style={styles.householdBtn}
                onPress={async () => { await hapticLight(); updateHouseholdSize(householdSize - 1); }}
                disabled={householdSize <= 1}
              >
                <Minus size={14} color={householdSize <= 1 ? Colors.textTertiary : Colors.text} />
              </Pressable>
              <Text style={styles.householdValue}>
                {householdSize} {householdSize === 1 ? 'person' : 'people'}
              </Text>
              <Pressable
                style={styles.householdBtn}
                onPress={async () => { await hapticLight(); updateHouseholdSize(householdSize + 1); }}
                disabled={householdSize >= 8}
              >
                <Plus size={14} color={householdSize >= 8 ? Colors.textTertiary : Colors.text} />
              </Pressable>
            </View>
          </ReAnimated.View>

          {/* Day Tabs */}
          <ReAnimated.View
            entering={FadeInDown.delay(0).springify().damping(12)}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabsContainer}
            >
              {days.map((day, index) => (
                <DayTab
                  key={day.dayNumber}
                  label={`Day ${day.dayNumber}`}
                  isActive={selectedDay === index}
                  onPress={() => handleDaySelect(index)}
                />
              ))}
            </ScrollView>
          </ReAnimated.View>

          {/* Day Summary */}
          {currentDay && (
            <ReAnimated.View
              entering={FadeInDown.delay(80).springify().damping(12)}
              style={styles.daySummary}
            >
              <View style={styles.daySummaryRow}>
                <Text style={styles.daySummaryLabel}>Day {currentDay.dayNumber} Totals</Text>
                <Text style={styles.daySummaryCalories}>
                  {currentDay.totalCalories} kcal
                </Text>
              </View>
              <View style={styles.daySummaryMacros}>
                <Text style={styles.daySummaryMacro}>
                  <Text style={{ color: Colors.protein }}>
                    {currentDay.totalProtein}g
                  </Text>{' '}
                  protein
                </Text>
              </View>
            </ReAnimated.View>
          )}

          {/* Meal Cards */}
          {currentDay?.meals?.map((meal, index) => (
            <MealCard
              key={`${currentDay.dayNumber}-${meal.type}-${index}`}
              meal={meal}
              index={index}
              onAddToDiary={handleAddToDiary}
            />
          ))}

          {/* Shopping List */}
          <ShoppingListSection items={mealPlan?.shoppingList} />

          {/* Coach Note */}
          <CoachNoteCard note={mealPlan?.coachNote} />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Household Size
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  householdLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  householdLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  householdControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  householdBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  householdValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    minWidth: 70,
    textAlign: 'center',
  },

  // Day Tabs
  dayTabsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  dayTab: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dayTabActive: {
    borderColor: '#10B981',
    borderWidth: 0,
  },
  dayTabGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dayTabText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dayTabTextActive: {
    color: '#000',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  // Day Summary
  daySummary: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  daySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daySummaryLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  daySummaryCalories: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#10B981',
  },
  daySummaryMacros: {
    marginTop: Spacing.xs,
  },
  daySummaryMacro: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Meal Card
  mealCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  mealCardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    position: 'relative',
  },
  mealCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mealEmoji: {
    fontSize: 36,
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  mealName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  calorieBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  calorieBadgeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#10B981',
  },
  calorieBadgeUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },

  // Macro Row
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  prepTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  prepTimeText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },

  // Ingredients
  ingredientsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ingredientsToggleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  ingredientsList: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  ingredientItem: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Add to Diary Button
  addButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  addButtonGradient: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  addButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#000',
  },

  // Shopping List
  shoppingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  shoppingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shoppingTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  shoppingBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  shoppingBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#10B981',
  },
  shoppingList: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.sm,
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shoppingCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  shoppingItemText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    flex: 1,
  },

  // Coach Note
  coachCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  coachCardGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    position: 'relative',
  },
  coachCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  coachTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#10B981',
  },
  coachText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Loading State
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Skeleton
  skeletonCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.lg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skeletonEmoji: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skeletonTextBlock: {
    flex: 1,
    gap: 6,
  },
  skeletonTitle: {
    width: '60%',
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skeletonSubtitle: {
    width: '40%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  skeletonMacroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  skeletonMacroPill: {
    width: 60,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  generateButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.glowSuccess,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  generateButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#000',
  },

  // Bottom
  bottomSpacer: {
    height: 100,
  },
});

export default function MealPlanScreen(props) {
  return (
    <ScreenErrorBoundary screenName="MealPlanScreen">
      <PremiumGate>
        <MealPlanScreenInner {...props} />
      </PremiumGate>
    </ScreenErrorBoundary>
  );
}
