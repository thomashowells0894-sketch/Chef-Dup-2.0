import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Plus, Coffee, Sun, Sunset, Cookie, Trash2, Copy, RotateCcw } from 'lucide-react-native';
import { hapticImpact, hapticLight } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';

const MEAL_CONFIG = {
  breakfast: {
    icon: Coffee,
    label: 'Breakfast',
    color: Colors.mealBreakfast,
    emoji: '🌅',
    timeLabel: '6am - 11am',
  },
  lunch: {
    icon: Sun,
    label: 'Lunch',
    color: Colors.mealLunch,
    emoji: '☀️',
    timeLabel: '11am - 3pm',
  },
  dinner: {
    icon: Sunset,
    label: 'Dinner',
    color: Colors.mealDinner,
    emoji: '🌙',
    timeLabel: '3pm - 8pm',
  },
  snacks: {
    icon: Cookie,
    label: 'Snacks',
    color: Colors.mealSnacks,
    emoji: '🍪',
    timeLabel: 'Anytime',
  },
};

// Memoized FoodItem - only re-renders when item or mealType changes
const FoodItem = memo(function FoodItem({ item, onRemove, mealType, openSwipeableRef }) {
  const scale = useSharedValue(1);
  const swipeableRef = useRef(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }, []);

  const handleRemove = useCallback(async () => {
    await hapticImpact();
    onRemove(item.id, mealType);
  }, [item.id, mealType, onRemove]);

  const handleSwipeOpen = useCallback(() => {
    if (openSwipeableRef.current && openSwipeableRef.current !== swipeableRef.current) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = swipeableRef.current;
  }, [openSwipeableRef]);

  const handleSwipeClose = useCallback(() => {
    if (openSwipeableRef.current === swipeableRef.current) {
      openSwipeableRef.current = null;
    }
  }, [openSwipeableRef]);

  const renderRightActions = useCallback(() => {
    return (
      <Pressable
        style={styles.swipeDeleteAction}
        onPress={handleRemove}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
        accessibilityHint="Swipe left to delete this food item"
      >
        <Trash2 size={20} color={Colors.text} />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </Pressable>
    );
  }, [handleRemove]);

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={handleSwipeOpen}
      onSwipeableClose={handleSwipeClose}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          handleRemove();
        }
      }}
      overshootRight={false}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <ReAnimated.View style={[styles.foodItem, styles.foodItemSwipeable, animatedStyle]}>
          <View style={styles.foodEmoji}>
            <Text style={styles.foodEmojiText}>{item.emoji || '🍽️'}</Text>
          </View>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.foodMacros}>
              P {item.protein}g · C {item.carbs}g · F {item.fat}g
            </Text>
          </View>
          <View style={styles.foodRight}>
            <Text style={styles.foodCalories}>{item.calories}</Text>
            <Text style={styles.foodCaloriesLabel}>kcal</Text>
          </View>
          <Pressable
            style={styles.removeButton}
            onPress={handleRemove}
            hitSlop={8}
            accessibilityLabel={`Remove ${item.name}`}
            accessibilityRole="button"
          >
            <Trash2 size={14} color={Colors.textTertiary} />
          </Pressable>
        </ReAnimated.View>
      </Pressable>
    </Swipeable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if item content actually changed
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.calories === nextProps.item.calories &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.mealType === nextProps.mealType
  );
});

// Memoized MealSection - prevents unnecessary re-renders when other meals change
const MealSection = memo(function MealSection({ mealType, items, calories, onAddPress, onRemoveFood, onCopyMeal, onRepeatYesterday, isCopyingRepeat }) {
  const config = MEAL_CONFIG[mealType];
  const Icon = config.icon;
  const addScale = useSharedValue(1);
  const openSwipeableRef = useRef(null);

  const addAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  const handleAddPressIn = useCallback(() => {
    addScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  }, []);

  const handleAddPressOut = useCallback(() => {
    addScale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }, []);

  const handleAddPress = useCallback(async () => {
    await hapticLight();
    onAddPress(mealType);
  }, [mealType, onAddPress]);

  return (
    <View style={styles.container}>
      {/* Glass blur layer */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      )}

      {/* Card Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
            <Icon size={18} color={config.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.mealLabel} maxFontSizeMultiplier={1.5}>{config.label}</Text>
            {calories > 0 && (
              <Text style={styles.calorieLabel} maxFontSizeMultiplier={1.5}>{calories} kcal</Text>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          {items.length > 0 && onCopyMeal && (
            <Pressable
              style={styles.copyButton}
              onPress={() => {
                hapticLight();
                onCopyMeal(mealType);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Copy ${config.label} to another day`}
            >
              <Copy size={16} color={Colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={handleAddPress}
            onPressIn={handleAddPressIn}
            onPressOut={handleAddPressOut}
            accessibilityRole="button"
            accessibilityLabel={`Add food to ${config.label}`}
            accessibilityHint="Opens food search to add to this meal"
          >
            <ReAnimated.View
              style={[
                styles.addButton,
                { backgroundColor: config.color + '20' },
                addAnimatedStyle,
              ]}
            >
              <Plus size={18} color={config.color} />
            </ReAnimated.View>
          </Pressable>
        </View>
      </View>

      {/* Food Items */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Pressable onPress={handleAddPress} style={styles.emptyStateInner}>
            <Text style={styles.emptyEmoji}>{config.emoji}</Text>
            <Text style={styles.emptyText}>No {config.label.toLowerCase()} logged</Text>
            <View style={styles.emptyAddHint}>
              <Plus size={12} color={Colors.textTertiary} />
              <Text style={styles.emptyAddText}>Tap to add</Text>
            </View>
          </Pressable>
          {onRepeatYesterday && (
            <Pressable
              style={styles.repeatYesterdayButton}
              onPress={() => onRepeatYesterday(mealType)}
              disabled={isCopyingRepeat}
            >
              {isCopyingRepeat ? (
                <View style={styles.repeatButtonInner}>
                  <Text style={styles.repeatYesterdayText}>Copying...</Text>
                </View>
              ) : (
                <View style={styles.repeatButtonInner}>
                  <RotateCcw size={13} color={Colors.textSecondary} />
                  <Text style={styles.repeatYesterdayText}>Repeat yesterday</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.foodList}>
          {items.map((item) => (
            <FoodItem
              key={item.id}
              item={item}
              mealType={mealType}
              onRemove={onRemoveFood}
              openSwipeableRef={openSwipeableRef}
            />
          ))}
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render when this meal's data changes
  return (
    prevProps.mealType === nextProps.mealType &&
    prevProps.calories === nextProps.calories &&
    prevProps.isCopyingRepeat === nextProps.isCopyingRepeat &&
    prevProps.items.length === nextProps.items.length &&
    prevProps.items.every((item, idx) =>
      item.id === nextProps.items[idx]?.id &&
      item.calories === nextProps.items[idx]?.calories
    )
  );
});

export default MealSection;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '60',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    gap: 2,
  },
  mealLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  calorieLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  emptyStateInner: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  repeatYesterdayButton: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  repeatButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  repeatYesterdayText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  emptyAddHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  emptyAddText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  foodList: {
    paddingVertical: Spacing.xs,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  foodEmoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodEmojiText: {
    fontSize: 18,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  foodMacros: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  foodRight: {
    alignItems: 'flex-end',
    marginRight: Spacing.xs,
  },
  foodCalories: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  foodCaloriesLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodItemSwipeable: {
    backgroundColor: Colors.surface,
  },
  swipeDeleteAction: {
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    flexDirection: 'column',
    gap: 4,
  },
  swipeDeleteText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
