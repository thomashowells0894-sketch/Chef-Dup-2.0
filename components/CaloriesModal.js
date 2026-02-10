import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Trash2, Coffee, UtensilsCrossed, Moon, Cookie } from 'lucide-react-native';
import { hapticLight, hapticWarning } from '../lib/haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { useFood } from '../context/FoodContext';

const MEAL_CONFIG = {
  breakfast: { icon: Coffee, label: 'Breakfast', color: '#FFD60A' },
  lunch: { icon: UtensilsCrossed, label: 'Lunch', color: '#30D158' },
  dinner: { icon: Moon, label: 'Dinner', color: '#BF5AF2' },
  snacks: { icon: Cookie, label: 'Snacks', color: '#FF9F0A' },
};

function MealSection({ mealType, items, onRemove }) {
  const config = MEAL_CONFIG[mealType];
  const Icon = config.icon;
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);

  if (items.length === 0) return null;

  return (
    <View style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <View style={[styles.mealIconContainer, { backgroundColor: config.color + '20' }]}>
          <Icon size={18} color={config.color} />
        </View>
        <Text style={styles.mealLabel}>{config.label}</Text>
        <Text style={styles.mealCalories}>{totalCalories} kcal</Text>
      </View>
      <View style={styles.mealItems}>
        {items.map((item) => (
          <View key={item.id} style={styles.foodItem}>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.foodMacros}>
                P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g
              </Text>
            </View>
            <View style={styles.foodRight}>
              <Text style={styles.foodCalories}>{item.calories}</Text>
              <Pressable
                style={styles.deleteButton}
                onPress={() => onRemove(item.id, mealType)}
                hitSlop={8}
              >
                <Trash2 size={16} color={Colors.danger} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CaloriesModal({ visible, onClose }) {
  const { meals, totals, goals, remaining, removeFood } = useFood();

  const handleClose = async () => {
    await hapticLight();
    onClose();
  };

  const handleRemove = async (logId, mealType) => {
    await hapticWarning();

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
  };

  const totalItems = Object.values(meals).flat().length;
  const percentage = goals.calories > 0 ? Math.round((totals.calories / goals.calories) * 100) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Today's Food Log</Text>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryCalories}>{totals.calories}</Text>
            <Text style={styles.summaryLabel}>of {goals.calories} kcal</Text>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{percentage}%</Text>
              <Text style={styles.summaryStatLabel}>consumed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[
                styles.summaryStatValue,
                remaining.calories < 0 && { color: Colors.danger }
              ]}>
                {Math.abs(remaining.calories)}
              </Text>
              <Text style={styles.summaryStatLabel}>
                {remaining.calories >= 0 ? 'remaining' : 'over'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{totalItems}</Text>
              <Text style={styles.summaryStatLabel}>items</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {totalItems === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No food logged yet</Text>
              <Text style={styles.emptySubtitle}>
                Use Quick Log or tap + to add your first meal
              </Text>
            </View>
          ) : (
            <>
              <MealSection mealType="breakfast" items={meals.breakfast} onRemove={handleRemove} />
              <MealSection mealType="lunch" items={meals.lunch} onRemove={handleRemove} />
              <MealSection mealType="dinner" items={meals.dinner} onRemove={handleRemove} />
              <MealSection mealType="snacks" items={meals.snacks} onRemove={handleRemove} />
            </>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryMain: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryCalories: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summaryStatLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  mealSection: {
    marginBottom: Spacing.lg,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  mealIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  mealCalories: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  mealItems: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  foodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  foodCalories: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
