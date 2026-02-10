import React, { useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus, Coffee, Sun, Sunset, Cookie, Trash2 } from 'lucide-react-native';
import { hapticImpact, hapticLight } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';

const MEAL_CONFIG = {
  breakfast: {
    icon: Coffee,
    label: 'Breakfast',
    color: '#FFD60A',
    emoji: '🌅',
    timeLabel: '6am - 11am',
  },
  lunch: {
    icon: Sun,
    label: 'Lunch',
    color: '#30D158',
    emoji: '☀️',
    timeLabel: '11am - 3pm',
  },
  dinner: {
    icon: Sunset,
    label: 'Dinner',
    color: '#BF5AF2',
    emoji: '🌙',
    timeLabel: '3pm - 8pm',
  },
  snacks: {
    icon: Cookie,
    label: 'Snacks',
    color: '#FF9F0A',
    emoji: '🍪',
    timeLabel: 'Anytime',
  },
};

// Memoized FoodItem - only re-renders when item or mealType changes
const FoodItem = memo(function FoodItem({ item, onRemove, mealType }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleRemove = useCallback(async () => {
    await hapticImpact();
    onRemove(item.id, mealType);
  }, [item.id, mealType, onRemove]);

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.foodItem, { transform: [{ scale: scaleAnim }] }]}>
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
        <Pressable style={styles.removeButton} onPress={handleRemove} hitSlop={8}>
          <Trash2 size={14} color={Colors.textTertiary} />
        </Pressable>
      </Animated.View>
    </Pressable>
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
const MealSection = memo(function MealSection({ mealType, items, calories, onAddPress, onRemoveFood }) {
  const config = MEAL_CONFIG[mealType];
  const Icon = config.icon;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleAddPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleAddPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

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
            <Text style={styles.mealLabel}>{config.label}</Text>
            {calories > 0 && (
              <Text style={styles.calorieLabel}>{calories} kcal</Text>
            )}
          </View>
        </View>
        <Pressable
          onPress={handleAddPress}
          onPressIn={handleAddPressIn}
          onPressOut={handleAddPressOut}
        >
          <Animated.View
            style={[
              styles.addButton,
              { backgroundColor: config.color + '20', transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Plus size={18} color={config.color} />
          </Animated.View>
        </Pressable>
      </View>

      {/* Food Items */}
      {items.length === 0 ? (
        <Pressable style={styles.emptyState} onPress={handleAddPress}>
          <Text style={styles.emptyEmoji}>{config.emoji}</Text>
          <Text style={styles.emptyText}>No {config.label.toLowerCase()} logged</Text>
          <View style={styles.emptyAddHint}>
            <Plus size={12} color={Colors.textTertiary} />
            <Text style={styles.emptyAddText}>Tap to add</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.foodList}>
          {items.map((item) => (
            <FoodItem
              key={item.id}
              item={item}
              mealType={mealType}
              onRemove={onRemoveFood}
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
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
});
