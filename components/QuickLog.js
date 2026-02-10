import React, { memo, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, Plus, ScanBarcode } from 'lucide-react-native';
import { hapticImpact, hapticSuccess } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { useFood } from '../context/FoodContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Default quick foods if no history
const DEFAULT_QUICK_FOODS = [
  { name: 'Coffee', emoji: '☕', calories: 5, protein: 0, carbs: 0, fat: 0 },
  { name: 'Eggs (2)', emoji: '🥚', calories: 140, protein: 12, carbs: 1, fat: 10 },
  { name: 'Banana', emoji: '🍌', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Greek Yogurt', emoji: '🥛', calories: 100, protein: 17, carbs: 6, fat: 1 },
  { name: 'Apple', emoji: '🍎', calories: 95, protein: 0, carbs: 25, fat: 0 },
];

const ScanChip = memo(function ScanChip({ onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await hapticImpact();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.scanChip,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <ScanBarcode size={22} color={Colors.primary} />
        <Text style={styles.scanChipText}>Scan</Text>
      </Animated.View>
    </Pressable>
  );
});

const QuickChip = memo(function QuickChip({ food, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        friction: 8,
        tension: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = async () => {
    // Strong haptic feedback for instant action
    await hapticSuccess();

    // Trigger layout animation for smooth UI update
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    onPress(food);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.chipEmoji}>{food.emoji}</Text>
        <View style={styles.chipContent}>
          <Text style={styles.chipName} numberOfLines={1}>{food.name}</Text>
          <Text style={styles.chipCalories}>{food.calories} kcal</Text>
        </View>
        <View style={styles.chipAction}>
          <Plus size={14} color={Colors.primary} />
        </View>
      </Animated.View>
    </Pressable>
  );
});

function QuickLog() {
  const router = useRouter();
  const { recentLogs, addFood } = useFood();

  // Calculate most frequent foods from recent logs
  const frequentFoods = useMemo(() => {
    if (!recentLogs || recentLogs.length === 0) {
      return DEFAULT_QUICK_FOODS;
    }

    // Count occurrences of each food by name
    const foodCounts = {};
    recentLogs.forEach((log) => {
      const key = log.name;
      if (!foodCounts[key]) {
        foodCounts[key] = {
          name: log.name,
          emoji: log.emoji || '🍽️',
          calories: log.calories,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat,
          count: 0,
        };
      }
      foodCounts[key].count++;
    });

    // Sort by count and take top 5
    const sorted = Object.values(foodCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // If we have less than 5 from history, fill with defaults
    if (sorted.length < 5) {
      const existingNames = new Set(sorted.map(f => f.name));
      const additional = DEFAULT_QUICK_FOODS.filter(f => !existingNames.has(f.name));
      return [...sorted, ...additional].slice(0, 5);
    }

    return sorted;
  }, [recentLogs]);

  const handleQuickAdd = useCallback(async (food) => {
    // Add to snacks by default for quick logging
    await addFood(
      {
        name: food.name,
        emoji: food.emoji,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      },
      'snacks'
    );
  }, [addFood]);

  const handleOpenScanner = useCallback(() => {
    router.push('/scanner');
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Zap size={16} color={Colors.primary} />
          <Text style={styles.title}>Quick Log</Text>
        </View>
        <Text style={styles.subtitle}>Tap to add instantly</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ScanChip onPress={handleOpenScanner} />
        {frequentFoods.map((food, index) => (
          <QuickChip
            key={`${food.name}-${index}`}
            food={food}
            onPress={handleQuickAdd}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(QuickLog);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  scrollContent: {
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipEmoji: {
    fontSize: 24,
  },
  chipContent: {
    minWidth: 60,
  },
  chipName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  chipCalories: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  chipAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 24,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  scanChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
