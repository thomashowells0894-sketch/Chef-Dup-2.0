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
import { Zap, Plus, ScanBarcode, Search, Bookmark, Link } from 'lucide-react-native';
import { hapticImpact, hapticSuccess } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight } from '../constants/theme';
import { useFood } from '../context/FoodContext';
import { useFrequentFoods } from '../hooks/useFrequentFoods';
import { buildQuickLogItems } from '../lib/quickLogItems';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snack',
};

const ActionChip = memo(function ActionChip({ icon: Icon, label, onPress }) {
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.actionChip, { transform: [{ scale: scaleAnim }] }]}>
        <Icon size={18} color={Colors.primary} />
        <Text style={styles.actionChipText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});

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
          food.kind === 'saved_meal' && styles.savedMealChip,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.chipEmoji}>{food.emoji}</Text>
        <View style={styles.chipContent}>
          <Text style={styles.chipName} numberOfLines={1}>{food.name}</Text>
          <Text style={styles.chipCalories} numberOfLines={1}>
            {food.subtitle || `${food.calories} kcal`}
          </Text>
        </View>
        <View style={[styles.chipAction, food.kind === 'saved_meal' && styles.savedMealChipAction]}>
          {food.kind === 'saved_meal' ? (
            <Bookmark size={14} color={Colors.primary} />
          ) : (
            <Plus size={14} color={Colors.primary} />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

function QuickLog({ mealType = 'snacks' }) {
  const router = useRouter();
  const { addFood, recipes } = useFood();
  const { getTopFoods } = useFrequentFoods();
  const mealLabel = MEAL_LABELS[mealType] || 'Meal';

  const quickItems = useMemo(() => buildQuickLogItems({
    recipes,
    frequentFoods: getTopFoods(6),
    limit: 6,
  }), [getTopFoods, recipes]);

  const handleQuickAdd = useCallback(async (food) => {
    await addFood({
      ...food,
      id: undefined,
      clientRequestId: undefined,
    }, mealType);
  }, [addFood, mealType]);

  const handleOpenSearch = useCallback(async () => {
    await hapticImpact();
    router.push({
      pathname: '/add',
      params: {
        meal: mealType,
        source: 'home_quick_log_search',
      },
    });
  }, [mealType, router]);

  const handleOpenScanner = useCallback(() => {
    router.push({
      pathname: '/barcode',
      params: { meal: mealType },
    });
  }, [mealType, router]);

  const handleOpenGoToMeals = useCallback(async () => {
    await hapticImpact();
    router.push({
      pathname: '/add',
      params: {
        meal: mealType,
        focus: 'recent',
        source: 'home_quick_log_go_to',
      },
    });
  }, [mealType, router]);

  const handleOpenRecipeImport = useCallback(async () => {
    await hapticImpact();
    router.push({
      pathname: '/recipe-import',
      params: {
        meal: mealType,
        source: 'home_quick_log_import',
      },
    });
  }, [mealType, router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Zap size={16} color={Colors.primary} />
          <Text style={styles.title}>Quick Log</Text>
        </View>
        <Text style={styles.subtitle}>Go-to meals, repeat foods, and fast capture for {mealLabel.toLowerCase()}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ActionChip icon={Search} label="Search" onPress={handleOpenSearch} />
        <ScanChip onPress={handleOpenScanner} />
        <ActionChip icon={Bookmark} label="Go-To" onPress={handleOpenGoToMeals} />
        <ActionChip icon={Link} label="Import" onPress={handleOpenRecipeImport} />
        {quickItems.map((food, index) => (
          <QuickChip
            key={`${food.kind}-${food.name}-${index}`}
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
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '12',
    borderRadius: 24,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary + '26',
  },
  actionChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
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
  savedMealChip: {
    borderColor: Colors.primary + '35',
    backgroundColor: Colors.primary + '12',
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
  savedMealChipAction: {
    backgroundColor: Colors.surfaceElevated,
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
