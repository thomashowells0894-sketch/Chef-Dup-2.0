import React, { useState, useCallback, useMemo, memo } from 'react';
import ScreenErrorBoundary from '../../components/ScreenErrorBoundary';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, RefreshControl, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Coffee, Sun, Sunset, Moon, Trash2, Copy, Sparkles, Heart, Droplets, Zap, BoltIcon, Trophy, Share2, Mic, Loader } from 'lucide-react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import ScreenWrapper from '../../components/ScreenWrapper';
import GlassCard from '../../components/ui/GlassCard';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import AnimatedProgressRing from '../../components/AnimatedProgressRing';
import FoodSwapSheet from '../../components/FoodSwapSheet';
import QuickLogSheet from '../../components/QuickLogSheet';
import QuickLogBar from '../../components/QuickLogBar';
import DailyChallengeCard from '../../components/DailyChallengeCard';
import AIRecommendationCard from '../../components/AIRecommendationCard';
import StreakFreezeCard from '../../components/StreakFreezeCard';
import StreakRepairCard from '../../components/StreakRepairCard';
import useNutritionScore from '../../hooks/useNutritionScore';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Glass } from '../../constants/theme';
import { useMeals } from '../../context/MealContext';
import { useFavoriteFoods } from '../../hooks/useFavoriteFoods';
import { useFrequentFoods } from '../../hooks/useFrequentFoods';
import { useFasting } from '../../context/FastingContext';
import { useGamification } from '../../context/GamificationContext';
import { ListSkeleton } from '../../components/SkeletonLoader';
import QuickCalModal from '../../components/QuickCalModal';
import SwipeableMealItem from '../../components/SwipeableMealItem';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import { usePreload } from '../../hooks/usePreload';
import { useVoiceLogging } from '../../hooks/useVoiceLogging';
import VoiceRecordingModal from '../../components/VoiceRecordingModal';
import VoiceResultsSheet from '../../components/VoiceResultsSheet';
import CopyMealModal from '../../components/CopyMealModal';

const mealConfig = {
  breakfast: { icon: Coffee, name: 'Breakfast' },
  lunch: { icon: Sun, name: 'Lunch' },
  dinner: { icon: Sunset, name: 'Dinner' },
  snacks: { icon: Moon, name: 'Snacks' },
};

const MealSection = memo(function MealSection({ mealType, items, onAddFood, onRemoveFood, onSwipeRemove, onFindSwap, onCopyYesterday, isCopying, onToggleFavorite, isFavoriteCheck, onQuickAdd, onQuickCal, onCopyMeal }) {
  const config = mealConfig[mealType];
  const Icon = config.icon;
  const totalCalories = useMemo(() => items.reduce((sum, item) => sum + item.calories, 0), [items]);
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
        <View style={styles.mealHeaderRight}>
          {items.length > 0 && (
            <Pressable
              style={styles.copyMealButton}
              onPress={() => onCopyMeal(mealType)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Copy ${config.name} to another day`}
              accessibilityRole="button"
            >
              <Copy size={14} color={Colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            style={styles.quickCalButton}
            onPress={() => onQuickCal(mealType)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Quick calorie entry for ${config.name}`}
            accessibilityRole="button"
          >
            <Zap size={14} color={Colors.warning} fill={Colors.warning} />
          </Pressable>
          <Pressable
            style={styles.quickAddButton}
            onPress={() => onQuickAdd(mealType)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Quick add to ${config.name}`}
            accessibilityRole="button"
          >
            <Zap size={14} color={Colors.primary} />
          </Pressable>
          <View style={styles.mealCaloriesRow}>
            <Text style={styles.mealCalories}>{totalCalories}</Text>
            <Text style={styles.mealCaloriesUnit}> kcal</Text>
          </View>
        </View>
      </View>

      {items.length > 0 && (
        <View style={styles.mealItems}>
          {items.map((item) => (
            <SwipeableMealItem
              key={item.id}
              item={item}
              mealType={mealType}
              onRemove={onSwipeRemove}
            >
              <View style={styles.mealItem}>
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
                </View>
              </View>
            </SwipeableMealItem>
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

function DiaryScreenInner() {
  usePreload('diary');
  const router = useRouter();
  const {
    meals, totals, goals, remaining, removeFood, addFood,
    selectedDate, selectedDateKey, changeDate, getDateLabel,
    copyMealFromYesterday,
    copyMeal,
    copyDay,
    waterProgress,
    isFetchingDay,
    refreshDate,
  } = useMeals();
  const { isFavorite, toggleFavorite } = useFavoriteFoods();
  const { recordFood } = useFrequentFoods();
  const { recordMealLogged } = useFasting();
  const { currentStreak, streakTier } = useGamification();
  const { dailyScore, grade, gradeColor, hasFood: hasNutritionData } = useNutritionScore();
  const [copyingMeal, setCopyingMeal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Food swap state
  const [swapSheetVisible, setSwapSheetVisible] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null); // { food, mealType }

  // Quick log sheet state
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [quickLogMeal, setQuickLogMeal] = useState('snacks');

  // Quick Cal modal state
  const [quickCalVisible, setQuickCalVisible] = useState(false);
  const [quickCalMeal, setQuickCalMeal] = useState('snacks');

  // Voice logging
  const currentMealType = useMemo(() => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 18) return 'snacks';
    return 'dinner';
  }, []);

  const handleVoiceFoodAdded = useCallback((food, mealType) => {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: food.name,
      emoji: food.emoji || '🎤',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      serving: food.serving || '1 serving',
      servingSize: 1,
      servingUnit: 'serving',
    };
    addFood(entry, mealType);
    recordMealLogged(mealType);
    recordFood(entry);
  }, [addFood, recordMealLogged, recordFood]);

  const {
    isRecording,
    isProcessing,
    showResults,
    transcript,
    detectedFoods,
    addedIndices,
    startRecording,
    stopRecording,
    closeResults,
    addSingleFood,
    addAllFoods,
  } = useVoiceLogging(handleVoiceFoodAdded);

  // Copy modal state
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copyModalMode, setCopyModalMode] = useState('meal'); // 'meal' | 'day'
  const [copyModalMealType, setCopyModalMealType] = useState(null);
  const [isCopyingModal, setIsCopyingModal] = useState(false);

  const copyModalItemCount = useMemo(() => {
    if (copyModalMode === 'day') {
      return meals.breakfast.length + meals.lunch.length + meals.dinner.length + meals.snacks.length;
    }
    if (copyModalMealType && meals[copyModalMealType]) {
      return meals[copyModalMealType].length;
    }
    return 0;
  }, [copyModalMode, copyModalMealType, meals]);

  const handleOpenCopyMeal = useCallback((mealType) => {
    hapticLight();
    setCopyModalMode('meal');
    setCopyModalMealType(mealType);
    setCopyModalVisible(true);
  }, []);

  const handleOpenCopyDay = useCallback(() => {
    hapticLight();
    setCopyModalMode('day');
    setCopyModalMealType(null);
    setCopyModalVisible(true);
  }, []);

  const handleCopyModalConfirm = useCallback(async (targetDateKey) => {
    setIsCopyingModal(true);
    try {
      if (copyModalMode === 'day') {
        await copyDay(selectedDateKey, targetDateKey);
      } else if (copyModalMealType) {
        await copyMeal(selectedDateKey, copyModalMealType, targetDateKey);
      }
    } catch (error) {
      Alert.alert('Copy Failed', 'Could not copy meals. Please try again.');
    } finally {
      setIsCopyingModal(false);
    }
  }, [copyModalMode, copyModalMealType, selectedDateKey, copyDay, copyMeal]);

  const handleAddFood = useCallback((mealType) => {
    hapticLight();
    router.navigate({ pathname: '/add', params: { meal: mealType } });
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

  // Swipe-to-delete — skip confirmation (the swipe IS the confirmation)
  const handleSwipeRemove = useCallback((logId, mealType) => {
    removeFood(logId, mealType);
  }, [removeFood]);

  const handleFindSwap = useCallback((item, mealType) => {
    hapticLight();
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
    hapticLight();
    toggleFavorite(food);
  }, [toggleFavorite]);

  const handleCopyYesterday = useCallback(async (mealType) => {
    hapticLight();
    setCopyingMeal(mealType);
    try {
      await copyMealFromYesterday(mealType);
      hapticSuccess();
    } catch (error) {
      Alert.alert('Copy Failed', 'Could not copy yesterday\'s meal. Please try again.');
    } finally {
      setCopyingMeal(null);
    }
  }, [copyMealFromYesterday]);

  const handleCopyAllYesterday = useCallback(async () => {
    hapticLight();
    setCopyingMeal('all');
    try {
      await copyMealFromYesterday('breakfast');
      await copyMealFromYesterday('lunch');
      await copyMealFromYesterday('dinner');
      await copyMealFromYesterday('snacks');
      hapticSuccess();
    } catch (error) {
      Alert.alert('Copy Failed', 'Could not copy yesterday\'s meals. Please try again.');
    } finally {
      setCopyingMeal(null);
    }
  }, [copyMealFromYesterday]);

  const handleQuickAdd = useCallback((mealType) => {
    hapticLight();
    setQuickLogMeal(mealType);
    setQuickLogVisible(true);
  }, []);

  const handleQuickCal = useCallback((mealType) => {
    hapticLight();
    setQuickCalMeal(mealType);
    setQuickCalVisible(true);
  }, []);

  const handleQuickCalLog = useCallback((food, mealType) => {
    addFood(food, mealType);
    recordMealLogged(mealType);
    recordFood(food);
  }, [addFood, recordMealLogged, recordFood]);

  const handleQuickLog = useCallback((food, mealType) => {
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
    addFood(foodEntry, mealType);
    recordMealLogged(mealType);
    recordFood(foodEntry);
  }, [addFood, recordMealLogged, recordFood]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDate();
    } finally {
      setRefreshing(false);
    }
  }, [refreshDate]);

  const handleShareDay = useCallback(async () => {
    hapticLight();
    try {
      await Share.share({
        message: `Today's VibeFit stats: ${totals.calories} cal eaten, ${totals.protein}g protein. ${remaining.calories} remaining! #VibeFit`,
      });
    } catch (e) {
      // user dismissed the share sheet — nothing to do
    }
  }, [totals.calories, totals.protein, remaining.calories]);

  const handleWaterPress = useCallback(() => {
    hapticLight();
    router.push('/water-tracker');
  }, [router]);

  return (
    <ScreenWrapper testID="diary-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header with streak badge */}
        <ReAnimated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Text style={styles.title}>Food Diary</Text>
            <Pressable
              style={[styles.voiceButton, isRecording && styles.voiceButtonActive, isProcessing && styles.voiceButtonProcessing]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={isRecording ? 'Stop voice recording' : 'Log food by voice'}
              accessibilityRole="button"
            >
              {isProcessing ? (
                <ActivityIndicator size={16} color={Colors.primary} />
              ) : (
                <Mic size={18} color={isRecording ? '#fff' : Colors.primary} />
              )}
            </Pressable>
            <Pressable
              style={styles.copyDayButton}
              onPress={handleOpenCopyDay}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Copy entire day to another date"
              accessibilityRole="button"
            >
              <Copy size={18} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.shareButton}
              onPress={handleShareDay}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Share today's stats"
              accessibilityRole="button"
            >
              <Share2 size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
          {currentStreak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: streakTier.glowColor }]}>
              <Text style={styles.streakBadgeText}>
                {currentStreak}d streak
              </Text>
            </View>
          )}
        </ReAnimated.View>

        {/* Quick Log Bar — 1-tap frequent food logging */}
        <ReAnimated.View entering={FadeInDown.delay(40).springify().mass(0.5).damping(10)}>
          <QuickLogBar
            onLog={handleQuickLog}
            mealType={new Date().getHours() < 10 ? 'breakfast' : new Date().getHours() < 14 ? 'lunch' : new Date().getHours() < 18 ? 'snacks' : 'dinner'}
          />
        </ReAnimated.View>

        {/* Date Picker */}
        <ReAnimated.View entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)} style={styles.datePicker}>
          <Pressable style={styles.dateArrow} onPress={() => { hapticLight(); changeDate('prev'); }}>
            <ChevronLeft size={24} color={Colors.textTertiary} />
          </Pressable>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>{getDateLabel(selectedDate)}</Text>
            <Text style={styles.dateSubtext}>{formatDate(selectedDate)}</Text>
          </View>
          <Pressable style={styles.dateArrow} onPress={() => { hapticLight(); changeDate('next'); }}>
            <ChevronRight size={24} color={Colors.textTertiary} />
          </Pressable>
        </ReAnimated.View>

        {/* Calorie Progress Ring + Summary */}
        <ReAnimated.View entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}>
          <GlassCard style={styles.progressSection}>
            <View style={styles.progressRingWrap}>
              <AnimatedProgressRing
                progress={goals.calories > 0 ? Math.min((totals.calories / goals.calories) * 100, 100) : 0}
                size={110}
                strokeWidth={10}
                color={remaining.calories >= 0 ? Colors.primary : Colors.danger}
                gradientEnd={remaining.calories >= 0 ? Colors.secondary : Colors.warning}
              >
                <View style={{ alignItems: 'center' }}>
                  <AnimatedCounter
                    value={Math.abs(remaining.calories)}
                    style={[styles.ringValue, { color: remaining.calories >= 0 ? Colors.primary : Colors.danger }]}
                    formatNumber
                  />
                  <Text style={styles.ringLabel}>
                    {remaining.calories >= 0 ? 'remaining' : 'over'}
                  </Text>
                </View>
              </AnimatedProgressRing>
              {/* Nutrition Score Badge */}
              {hasNutritionData && (
                <View style={[styles.nutritionBadge, { backgroundColor: gradeColor + '22', borderColor: gradeColor + '44' }]}>
                  <Text style={[styles.nutritionGrade, { color: gradeColor }]}>{grade}</Text>
                  <Text style={styles.nutritionLabel}>score</Text>
                </View>
              )}
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <AnimatedCounter
                  value={goals.calories}
                  style={styles.summaryValue}
                  formatNumber
                />
                <Text style={styles.summaryLabel}>Goal</Text>
              </View>
              <View style={styles.summaryDivider}>
                <Text style={styles.summaryOperator}>-</Text>
              </View>
              <View style={styles.summaryItem}>
                <AnimatedCounter
                  value={totals.calories}
                  style={styles.summaryValue}
                  formatNumber
                />
                <Text style={styles.summaryLabel}>Food</Text>
              </View>
              <View style={styles.summaryDivider}>
                <Text style={styles.summaryOperator}>=</Text>
              </View>
              <View style={styles.summaryItem}>
                <AnimatedCounter
                  value={Math.abs(remaining.calories)}
                  style={[styles.summaryValue, { color: remaining.calories >= 0 ? Colors.primary : Colors.danger }]}
                  formatNumber
                />
                <Text style={styles.summaryLabel}>
                  {remaining.calories >= 0 ? 'Left' : 'Over'}
                </Text>
              </View>
            </View>

            {/* Macro Progress Bars */}
            <View style={styles.macroBarSection}>
              <View style={styles.macroBarRow}>
                <Text style={styles.macroBarLabel}>P</Text>
                <View style={styles.macroBarTrack}>
                  <View style={[styles.macroBarFill, { width: `${Math.min((totals.protein / Math.max(goals.protein, 1)) * 100, 100)}%`, backgroundColor: Colors.primary }]} />
                </View>
                <AnimatedCounter value={totals.protein} style={styles.macroBarValue} suffix="g" />
              </View>
              <View style={styles.macroBarRow}>
                <Text style={styles.macroBarLabel}>C</Text>
                <View style={styles.macroBarTrack}>
                  <View style={[styles.macroBarFill, { width: `${Math.min((totals.carbs / Math.max(goals.carbs, 1)) * 100, 100)}%`, backgroundColor: Colors.warning }]} />
                </View>
                <AnimatedCounter value={totals.carbs} style={styles.macroBarValue} suffix="g" />
              </View>
              <View style={styles.macroBarRow}>
                <Text style={styles.macroBarLabel}>F</Text>
                <View style={styles.macroBarTrack}>
                  <View style={[styles.macroBarFill, { width: `${Math.min((totals.fat / Math.max(goals.fat, 1)) * 100, 100)}%`, backgroundColor: Colors.secondary }]} />
                </View>
                <AnimatedCounter value={totals.fat} style={styles.macroBarValue} suffix="g" />
              </View>
            </View>
          </GlassCard>
        </ReAnimated.View>

        {/* Water Intake Card */}
        <ReAnimated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
          <Pressable style={styles.waterCard} onPress={handleWaterPress}>
            <View style={styles.waterCardLeft}>
              <View style={styles.waterIconContainer}>
                <Droplets size={18} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.waterCardTitle}>Hydration</Text>
                <Text style={styles.waterCardSubtitle}>
                  {waterProgress.glasses} of {waterProgress.glassesGoal} glasses
                </Text>
              </View>
            </View>
            <View style={styles.waterCardRight}>
              <Text style={[
                styles.waterCardPercentage,
                waterProgress.percentage >= 100 && { color: Colors.success },
              ]}>
                {Math.round(waterProgress.percentage)}%
              </Text>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </View>
          </Pressable>
        </ReAnimated.View>

        {/* Streak Repair Card — appears when streak is broken */}
        <StreakRepairCard />

        {/* Streak Freeze Upsell — appears when streak is worth protecting */}
        <StreakFreezeCard />

        {/* Daily Challenges — gamification on the diary */}
        <ReAnimated.View entering={FadeInDown.delay(220).springify().mass(0.5).damping(10)}>
          <DailyChallengeCard />
        </ReAnimated.View>

        {/* AI Recommendation Card — proactive meal suggestions */}
        <AIRecommendationCard
          remainingCalories={remaining.calories}
          remainingProtein={remaining.protein}
          onAddFood={(food) => {
            const mealType = new Date().getHours() < 14 ? 'lunch' : 'dinner';
            addFood(food, mealType);
            recordMealLogged(mealType);
            recordFood(food);
          }}
        />

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
              <Pressable
                style={styles.copyAllButton}
                onPress={handleCopyAllYesterday}
                disabled={copyingMeal === 'all'}
              >
                {copyingMeal === 'all' ? (
                  <ActivityIndicator size={16} color={Colors.primary} />
                ) : (
                  <Copy size={16} color={Colors.primary} />
                )}
                <Text style={styles.copyAllText}>
                  {copyingMeal === 'all' ? 'Copying...' : 'Copy All From Yesterday'}
                </Text>
              </Pressable>
            </View>
          </ReAnimated.View>
        )}

        {/* Meal Sections */}
        {isFetchingDay ? (
          <ListSkeleton count={4} />
        ) : (
        <ReAnimated.View entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}>
        <MealSection
          mealType="breakfast"
          items={meals.breakfast}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onSwipeRemove={handleSwipeRemove}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'breakfast'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
          onQuickAdd={handleQuickAdd}
          onQuickCal={handleQuickCal}
          onCopyMeal={handleOpenCopyMeal}
        />
        <MealSection
          mealType="lunch"
          items={meals.lunch}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onSwipeRemove={handleSwipeRemove}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'lunch'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
          onQuickAdd={handleQuickAdd}
          onQuickCal={handleQuickCal}
          onCopyMeal={handleOpenCopyMeal}
        />
        <MealSection
          mealType="dinner"
          items={meals.dinner}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onSwipeRemove={handleSwipeRemove}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'dinner'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
          onQuickAdd={handleQuickAdd}
          onQuickCal={handleQuickCal}
          onCopyMeal={handleOpenCopyMeal}
        />
        <MealSection
          mealType="snacks"
          items={meals.snacks}
          onAddFood={handleAddFood}
          onRemoveFood={handleRemoveFood}
          onSwipeRemove={handleSwipeRemove}
          onFindSwap={handleFindSwap}
          onCopyYesterday={handleCopyYesterday}
          isCopying={copyingMeal === 'snacks'}
          onToggleFavorite={handleToggleFavorite}
          isFavoriteCheck={isFavorite}
          onQuickAdd={handleQuickAdd}
          onQuickCal={handleQuickCal}
          onCopyMeal={handleOpenCopyMeal}
        />
        </ReAnimated.View>
        )}

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

      {/* Quick Log Sheet (Frequent Foods) */}
      <QuickLogSheet
        visible={quickLogVisible}
        onClose={() => setQuickLogVisible(false)}
        mealType={quickLogMeal}
        onLog={handleQuickLog}
      />

      {/* Quick Cal Modal */}
      <QuickCalModal
        visible={quickCalVisible}
        onClose={() => setQuickCalVisible(false)}
        onLog={handleQuickCalLog}
        initialMealType={quickCalMeal}
      />

      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        visible={isRecording}
        onStop={stopRecording}
      />

      {/* Voice Results Sheet */}
      <VoiceResultsSheet
        visible={showResults}
        transcript={transcript}
        foods={detectedFoods}
        selectedMeal={currentMealType}
        onAddFood={addSingleFood}
        onAddAll={() => addAllFoods(currentMealType)}
        onClose={closeResults}
        addedIndices={addedIndices}
      />

      {/* Copy Meal / Copy Day Modal */}
      <CopyMealModal
        visible={copyModalVisible}
        onClose={() => setCopyModalVisible(false)}
        onCopy={handleCopyModalConfirm}
        sourceDate={selectedDate}
        mode={copyModalMode}
        mealType={copyModalMealType}
        isCopying={isCopyingModal}
        itemCount={copyModalItemCount}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  streakBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#fff',
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
  progressSection: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  progressRingWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  ringValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    padding: 0,
  },
  ringLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  nutritionBadge: {
    position: 'absolute',
    top: -4,
    right: -20,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionGrade: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  nutritionLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    marginTop: -1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    padding: 0,
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
  macroBarSection: {
    width: '100%',
    marginTop: Spacing.md,
    gap: 6,
  },
  macroBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroBarLabel: {
    width: 14,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  macroBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroBarValue: {
    width: 42,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textAlign: 'right',
    padding: 0,
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
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickCalButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
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
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySoft,
  },
  copyAllText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.12)',
  },
  waterCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  waterIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterCardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  waterCardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  waterCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  waterCardPercentage: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  voiceButtonActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  voiceButtonProcessing: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  copyDayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyMealButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 140,
  },
});

export default function DiaryScreen(props) {
  return (
    <ScreenErrorBoundary screenName="DiaryScreen">
      <DiaryScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}
