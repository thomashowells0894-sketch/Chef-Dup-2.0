import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RotateCcw, Plus } from 'lucide-react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { hapticLight } from '../lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_MEALS_KEY = '@vibefit_quick_repeat';
const MAX_RECENT = 5;

export function recordMealForRepeat(food) {
  (async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_MEALS_KEY);
      let meals = raw ? JSON.parse(raw) : [];
      // Dedupe by name
      meals = meals.filter(m => m.name !== food.name);
      meals.unshift({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        serving: food.serving || food.servingSize ? `${food.servingSize} ${food.servingUnit}` : '1 serving',
        emoji: food.emoji || '',
        timestamp: Date.now(),
      });
      if (meals.length > MAX_RECENT) meals.length = MAX_RECENT;
      await AsyncStorage.setItem(RECENT_MEALS_KEY, JSON.stringify(meals));
    } catch {}
  })();
}

export default function QuickRepeatBar({ onRepeat, style }) {
  const [recentMeals, setRecentMeals] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_MEALS_KEY);
        if (raw) {
          const meals = JSON.parse(raw);
          // Only show meals from the last 3 days
          const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
          setRecentMeals(meals.filter(m => m.timestamp > threeDaysAgo));
        }
      } catch {}
    })();
  }, []);

  const handleRepeat = useCallback((meal) => {
    hapticLight();
    onRepeat?.({
      id: `repeat-${Date.now()}`,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      serving: meal.serving,
      servingSize: 1,
      servingUnit: 'serving',
      category: 'recent',
      isPerServing: true,
    });
  }, [onRepeat]);

  if (recentMeals.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(100)} style={style}>
      <View style={styles.header}>
        <RotateCcw size={14} color={Colors.textTertiary} />
        <Text style={styles.headerText}>Quick Repeat</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {recentMeals.map((meal, index) => (
          <Pressable
            key={`${meal.name}-${index}`}
            style={styles.chip}
            onPress={() => handleRepeat(meal)}
            accessibilityRole="button"
            accessibilityLabel={`Repeat ${meal.name}, ${meal.calories} calories`}
          >
            <Text style={styles.chipEmoji}>{meal.emoji || '\uD83C\uDF7D\uFE0F'}</Text>
            <View style={styles.chipInfo}>
              <Text style={styles.chipName} numberOfLines={1}>{meal.name}</Text>
              <Text style={styles.chipCal}>{meal.calories} cal</Text>
            </View>
            <View style={styles.chipAdd}>
              <Plus size={12} color={Colors.primary} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  headerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipEmoji: { fontSize: 20 },
  chipInfo: { maxWidth: 120 },
  chipName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  chipCal: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  chipAdd: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
