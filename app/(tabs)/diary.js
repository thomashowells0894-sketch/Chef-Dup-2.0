import React, { useState, useCallback, memo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Coffee, Sun, Sunset, Moon, Trash2, Copy, Sparkles, Heart } from 'lucide-react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import ScreenWrapper from '../../components/ScreenWrapper';
import FoodSwapSheet from '../../components/FoodSwapSheet';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Glass } from '../../constants/theme';
import { useFood } from '../../context/FoodContext';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';

const mealConfig = {
  breakfast: { icon: Coffee, name: 'Breakfast' },
  lunch: { icon: Sun, name: 'Lunch' },
  dinner: { icon: Sunset, name: 'Dinner' },
  snacks: { icon: Moon, name: 'Snacks' },
};

const MealSection = memo(function MealSection({ mealType, items, onAddFood, onRemoveFood, onFindSwap, onCopyYesterday, isCopying, onToggleFavorite, isFavoriteCheck }) {
  const config = mealConfig[mealType];
  const Icon = config.icon;
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
  const isEmpty = items.length === 0;

  return (
    <View style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleRow}>
          <View style={styles.mealIconContainer}>
            <Icon size={18} color={Colors.primary} />
          </View>
          <Text style={styles.mealTitle}>{config.name}</Text>
        </View>
        <View style={styles.mealCaloriesRow}>
          <Text style={styles.mealCalories}>{totalCalories}</Text>
          <Text style={styles.mealCaloriesUnit}> kcal</Text>
        </View>
      </View>

      {items.length > 0 && (
        <View style={styles.mealItems}>
          {items.map((item) => (
            <View key={item.id} style={styles.mealItem}>
              <View style={styles.mealItemInfo}>
                <Text style={styles.mealItemName}>{item.name}</Text>
                <Text style={styles.mealItemMacros}>
                  P: {item.protein}g  C: {item.carbs}g  F: {item.fat}g
                </Text>
              </View>
              <View style={styles.mealItemRight}>
                <Text style={styles.mealItemCalories}>{item.calories}</Text>
                <Pressable
                  style={styles.favoriteButton}
                  onPress={() => onToggleFavorite(item)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={isFavoriteCheck(item.name) ? 'Remove from favorites' : 'Add to favorites'}
                  accessibilityRole="button"
                >
                  <Heart
                    size={16}
                    color={isFavoriteCheck(item.name) ? Colors.secondary : Colors.textTertiary}
                    fill={isFavoriteCheck(item.name) ? Colors.secondary : 'none'}
                  />
                </Pressable>
                <Pressable
                  style={styles.swapIconButton}
                  onPress={() => onFindSwap(item, mealType)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="Find smarter swap"
                  accessibilityRole="button"
                >
                  <Sparkles size={15} color={Colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => onRemoveFood(item.id, mealType)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="Remove food item"
                  accessibilityRole="button"
                >
                  <Trash2 size={16} color={Colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.mealActions}>
        <Pressable style={styles.addItemButton} onPress={() => onAddFood(mealType)}>
          <Plus size={18} color={Colors.primary} />
          <Text style={styles.addItemText}>Add Food</Text>
        </Pressable>

        {isEmpty && (
          <Pressable
            style={styles.copyYesterdayButton}
            onPress={() => onCopyYesterday(mealType)}
            disabled={isCopying}
          >
            {isCopying ? (
              <ActivityIndicator size={14} color={Colors.textSecondary} />
            ) : (
              <Copy size={14} color={Colors.textSecondary} />
            )}
            <Text style={styles.copyYesterdayText}>
              {isCopying ? 'Copying...' : 'Copy Yesterday'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DiaryScreen() {
  const router = useRouter();
  const {
    meals, totals, goals, remaining, removeFood, addFood,
    selectedDate, changeDate, getDateLabel,
    copyMealFromYesterday,
  } = useFood();
  const { isFavorite, toggleFavorite } = useFavoriteFoods();
  const [copyingMeal, setCopyingMeal] = useState(null);

  // Food swap state
  const [swapSheetVisible, setSwapSheetVisible] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null); // { food, mealType }

  const handleAddFood = useCallback((mealType) => {
    router.navigate('/add');
  }, [router]);

  const handleRemoveFood = useCallback((logId, mealType) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFood(logId, mealType),
        },
      ]
    );
  }, [removeFood]);

  const handleFindSwap = useCallback((item, mealType) => {
    setSwapTarget({ food: item, mealType });
    setSwapSheetVisible(true);
  }, []);

  const handleSwapFood = useCallback(async (swapItem) => {
    if (!swapTarget) return;

    const { food: originalFood, mealType } = swapTarget;

    // Remove old food and add the new swap
    try {
      await removeFood(originalFood.id, mealType);
      await addFood({
        name: swapItem.name,
        emoji: swapItem.emoji,
        calories: swapItem.calories,
        protein: swapItem.protein,
        carbs: swapItem.carbs,
        fat: swapItem.fat,
        serving: swapItem.serving,
      }, mealType);
    } catch (err) {
      Alert.alert('Swap Failed', 'Could not complete the food swap. Please try again.');
    }
  }, [swapTarget, removeFood, addFood]);

  const handleToggleFavorite = useCallback((food) => {
    toggleFavorite(food);
  }, [toggleFavorite]);

  const handleCopyYesterday = useCallback(async (mealType) => {
    setCopyingMeal(mealType);
    try {
      await copyMealFromYesterday(mealType);
    } catch (error) {
      Alert.alert('Copy Failed', 'Could not copy yesterday\'s meal. Please try again.');
    } finally {
      setCopyingMeal(null);
    }
  }, [copyMealFromYesterday]);

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <Text style={styles.title}>Food Diary</Text>
        </ReAnimated.View>

        {/* Date Picker - now functional */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)} style={styles.datePicker}>
          <Pressable style={styles.dateArrow} onPress={() => changeDate('prev')}>
            <ChevronLeft size={24} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>{getDateLabel(selectedDate)}</Text>
            <Text style={styles.dateSubtext}>{formatDate(selectedDate)}</Text>
          </View>
          <Pressable style={styles.dateArrow} onPress={() => changeDate('next')}>
            <ChevronRight size={24} color={Colors.textTertiary} />
          </Pressable>
        </ReAnimated.View>

        {/* Daily Summary */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)} style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{goals.calories.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Goal</Text>
          </View>
          <View style={styles.summaryDivider}>
            <Text style={styles.summaryOperator}>-</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totals.calories.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Food</Text>
          </View>
          <View style={styles.summaryDivider}>
            <Text style={styles.summaryOperator}>=</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryValue,
                { color: remaining.calories >= 0 ? Colors.primary : Colors.danger },
              ]}
            >
              {Math.abs(remaining.calories).toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>
              {remaining.calories >= 0 ? 'Remaining' : 'Over'}
            </Text>
          </View>
        </ReAnimated.View>

        {/* Empty State */}
        {meals.breakfast.length === 0 && meals.lunch.length === 0 && meals.dinner.length === 0 && meals.snacks.length === 0 && (
          <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
            <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
              <Text style={{ fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm }}>
                Nothing logged yet
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.lg }}>
                Start logging to see your meals here, or copy from yesterday.
              </Text>
            </View>
          </ReAnimated.View>
        )}

        {/* Meal Sections */}
        <ReAnimated.View entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}>
        <MealSection
          mealType="breakfast"
          items={meals.breakfast}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'breakfast'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
        />
        <MealSection
          mealType="lunch"
          items={meals.lunch}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'lunch'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
        />
        <MealSection
          mealType="dinner"
          items={meals.dinner}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'dinner'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
        />
        <MealSection
          mealType="snacks"
          items={meals.snacks}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'snacks'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
        />
        </ReAnimated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Food Swap Sheet */}
      <FoodSwapSheet
        visible={swapSheetVisible}
        onClose={() => {
          setSwapSheetVisible(false);
          setSwapTarget(null);
        }}
        food={swapTarget ? {
          name: swapTarget.food.name,
          emoji: swapTarget.food.emoji || swapTarget.food.name?.charAt(0) || '?',
          calories: swapTarget.food.calories || 0,
          protein: swapTarget.food.protein || 0,
          carbs: swapTarget.food.carbs || 0,
          fat: swapTarget.food.fat || 0,
          serving: swapTarget.food.serving || '1 serving',
        } : null}
        onSwap={handleSwapFood}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateArrow: {
    padding: Spacing.xs,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  dateSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  summaryDivider: {
    paddingHorizontal: Spacing.xs,
  },
  summaryOperator: {
    fontSize: FontSize.lg,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  mealSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mealIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  mealCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mealCalories: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  mealCaloriesUnit: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  mealItems: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mealItemInfo: {
    flex: 1,
  },
  mealItemName: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: 2,
  },
  mealItemMacros: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  mealItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mealItemCalories: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  favoriteButton: {
    padding: Spacing.xs,
  },
  swapIconButton: {
    padding: Spacing.xs,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  mealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  addItemText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  copyYesterdayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  copyYesterdayText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  bottomSpacer: {
    height: 140,
  },
});
