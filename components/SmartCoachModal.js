import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { X, Sparkles, Target, Leaf, Zap, ChevronRight } from 'lucide-react-native';
import { hapticImpact, hapticLight } from '../lib/haptics';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getRecommendations, getCoachMessage, mealToFood, getSuggestedMealType } from '../services/mealRecommendation';
import { useMealTotals } from '../context/MealContext';

function RecommendationCard({ meal, type, icon: Icon, label, sublabel, onPress }) {
  if (!meal) return null;

  const handlePress = async () => {
    await hapticImpact();
    onPress(meal);
  };

  const getTypeColor = () => {
    switch (type) {
      case 'protein': return Colors.protein;
      case 'filling': return Colors.carbs;
      case 'quick': return Colors.warning;
      default: return Colors.primary;
    }
  };

  const color = getTypeColor();

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardType, { color }]}>{label}</Text>
          <Text style={styles.cardSublabel}>{sublabel}</Text>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>{meal.name}</Text>
        <View style={styles.cardMacros}>
          <Text style={styles.cardCalories}>{meal.calories} kcal</Text>
          <View style={styles.cardMacroDot} />
          <Text style={styles.cardMacroText}>{meal.protein}g protein</Text>
          <View style={styles.cardMacroDot} />
          <Text style={styles.cardMacroText}>{meal.prepTime} min</Text>
        </View>
        <View style={styles.cardTags}>
          {meal.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.cardTag}>
              <Text style={styles.cardTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <ChevronRight size={20} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function SmartCoachModal({
  visible,
  onClose,
  onSelectMeal,
}) {
  const { remaining, goals } = useMealTotals();

  const recommendations = useMemo(() => {
    const remainingCals = remaining?.calories ?? goals?.calories ?? 2000;
    const remainingProt = remaining?.protein ?? goals?.protein ?? 150;
    return getRecommendations(remainingCals, remainingProt);
  }, [remaining, goals]);

  const coachMessage = useMemo(() => {
    const remainingCals = remaining?.calories ?? goals?.calories ?? 2000;
    const remainingProt = remaining?.protein ?? goals?.protein ?? 150;
    return getCoachMessage(remainingCals, remainingProt);
  }, [remaining, goals]);

  const handleSelectMeal = (meal) => {
    const food = mealToFood(meal);
    const suggestedMealType = getSuggestedMealType();
    onSelectMeal(food, suggestedMealType);
  };

  const handleClose = async () => {
    await hapticLight();
    onClose();
  };

  const remainingCalories = remaining?.calories ?? goals?.calories ?? 2000;
  const remainingProtein = remaining?.protein ?? goals?.protein ?? 150;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container} accessibilityViewIsModal={true} accessibilityLabel="Smart coach recommendations">
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.sparklesBadge}>
              <Sparkles size={18} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Smart Coach</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Overview */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Your Remaining Budget</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{remainingCalories}</Text>
                <Text style={styles.statLabel}>calories</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.protein }]}>{remainingProtein}g</Text>
                <Text style={styles.statLabel}>protein</Text>
              </View>
            </View>
          </View>

          {/* Coach Message */}
          <View style={styles.messageContainer}>
            <Sparkles size={16} color={Colors.primary} />
            <Text style={styles.messageText}>{coachMessage}</Text>
          </View>

          {/* Title */}
          <Text style={styles.sectionTitle}>Recommended for You</Text>

          {/* Recommendation Cards */}
          <View style={styles.cardsContainer}>
            <RecommendationCard
              meal={recommendations.bestForProtein}
              type="protein"
              icon={Target}
              label="Best for Protein"
              sublabel={`${recommendations.bestForProtein?.protein || 0}g`}
              onPress={handleSelectMeal}
            />

            <RecommendationCard
              meal={recommendations.mostFilling}
              type="filling"
              icon={Leaf}
              label="Most Filling"
              sublabel="High volume"
              onPress={handleSelectMeal}
            />

            <RecommendationCard
              meal={recommendations.quickEasy}
              type="quick"
              icon={Zap}
              label="Quick & Easy"
              sublabel={`${recommendations.quickEasy?.prepTime || 0} min`}
              onPress={handleSelectMeal}
            />
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Showing {recommendations.totalEligible} meals that fit your remaining {remainingCalories} calorie budget
            </Text>
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sparklesBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  statsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 42,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  messageText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  cardType: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSublabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  cardName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  cardMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCalories: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  cardMacroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
    marginHorizontal: Spacing.xs,
  },
  cardMacroText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  cardTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  cardTag: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  cardTagText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  infoContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
