import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Pill, AlertTriangle, CheckCircle } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useFood } from '../context/FoodContext';

const MICRONUTRIENTS = [
  { key: 'fiber', name: 'Fiber', unit: 'g', rdi: 28, color: '#8B5CF6', group: 'other' },
  { key: 'sodium', name: 'Sodium', unit: 'mg', rdi: 2300, color: '#F59E0B', isLimit: true, group: 'other' },
  { key: 'sugar', name: 'Sugar', unit: 'g', rdi: 50, color: '#EC4899', isLimit: true, group: 'other' },
  { key: 'calcium', name: 'Calcium', unit: 'mg', rdi: 1000, color: '#FFFFFF', group: 'mineral' },
  { key: 'iron', name: 'Iron', unit: 'mg', rdi: 18, color: '#EF4444', group: 'mineral' },
  { key: 'potassium', name: 'Potassium', unit: 'mg', rdi: 4700, color: '#F97316', group: 'mineral' },
  { key: 'vitaminA', name: 'Vitamin A', unit: '\u03BCg', rdi: 900, color: '#F59E0B', group: 'vitamin' },
  { key: 'vitaminC', name: 'Vitamin C', unit: 'mg', rdi: 90, color: '#F97316', group: 'vitamin' },
  { key: 'vitaminD', name: 'Vitamin D', unit: '\u03BCg', rdi: 20, color: '#FBBF24', group: 'vitamin' },
  { key: 'vitaminE', name: 'Vitamin E', unit: 'mg', rdi: 15, color: '#34D399', group: 'vitamin' },
  { key: 'vitaminK', name: 'Vitamin K', unit: '\u03BCg', rdi: 120, color: '#6EE7B7', group: 'vitamin' },
  { key: 'vitaminB12', name: 'Vitamin B12', unit: '\u03BCg', rdi: 2.4, color: '#F472B6', group: 'vitamin' },
  { key: 'magnesium', name: 'Magnesium', unit: 'mg', rdi: 420, color: '#A78BFA', group: 'mineral' },
  { key: 'zinc', name: 'Zinc', unit: 'mg', rdi: 11, color: '#94A3B8', group: 'mineral' },
  { key: 'folate', name: 'Folate', unit: '\u03BCg', rdi: 400, color: '#4ADE80', group: 'vitamin' },
];

const FOOD_SUGGESTIONS = {
  fiber: ['lentils', 'oats', 'broccoli'],
  calcium: ['yogurt', 'cheese', 'fortified milk'],
  iron: ['spinach', 'red meat', 'lentils'],
  potassium: ['bananas', 'potatoes', 'avocado'],
  vitaminA: ['carrots', 'sweet potatoes', 'spinach'],
  vitaminC: ['oranges', 'bell peppers', 'strawberries'],
  vitaminD: ['salmon', 'egg yolks', 'fortified milk'],
  vitaminE: ['almonds', 'sunflower seeds', 'avocado'],
  vitaminK: ['kale', 'spinach', 'broccoli'],
  vitaminB12: ['eggs', 'salmon', 'fortified cereals'],
  magnesium: ['dark chocolate', 'almonds', 'bananas'],
  zinc: ['beef', 'pumpkin seeds', 'chickpeas'],
  folate: ['leafy greens', 'beans', 'citrus fruits'],
  sodium: [],
  sugar: [],
};

function getBarColor(percentage, isLimit) {
  if (isLimit) {
    return percentage > 100 ? Colors.error : Colors.success;
  }
  if (percentage >= 80) return Colors.success;
  if (percentage >= 40) return Colors.warning;
  return Colors.error;
}

function NutrientRow({ nutrient, consumed }) {
  const percentage = nutrient.rdi > 0 ? (consumed / nutrient.rdi) * 100 : 0;
  const clampedWidth = Math.min(percentage, 100);
  const barColor = getBarColor(percentage, nutrient.isLimit);

  return (
    <View style={styles.nutrientRow}>
      <View style={styles.nutrientHeader}>
        <View style={styles.nutrientNameRow}>
          <View style={[styles.nutrientDot, { backgroundColor: nutrient.color }]} />
          <Text style={styles.nutrientName}>{nutrient.name}</Text>
          {nutrient.isLimit && (
            <Text style={styles.limitBadge}>limit</Text>
          )}
        </View>
        <Text style={styles.nutrientAmount}>
          {consumed % 1 === 0 ? consumed : consumed.toFixed(1)}{nutrient.unit}{' / '}
          {nutrient.rdi}{nutrient.unit}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${clampedWidth}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.percentageText, { color: barColor }]}>
        {Math.round(percentage)}% {nutrient.isLimit ? (percentage > 100 ? 'over limit' : 'of limit') : 'of RDI'}
      </Text>
    </View>
  );
}

export default function MicronutrientsScreen() {
  const router = useRouter();
  const { meals } = useFood();

  const { totals, hasData, vitamins, minerals } = useMemo(() => {
    const allItems = [
      ...(meals.breakfast || []),
      ...(meals.lunch || []),
      ...(meals.dinner || []),
      ...(meals.snacks || []),
    ];

    const sums = {};
    let anyMicroData = false;

    MICRONUTRIENTS.forEach((n) => {
      sums[n.key] = 0;
    });

    allItems.forEach((item) => {
      const nut = item.nutriments || item.micronutrients || {};
      MICRONUTRIENTS.forEach((n) => {
        const val = nut[n.key];
        if (val !== undefined && val !== null && val > 0) {
          sums[n.key] += val;
          anyMicroData = true;
        }
      });
    });

    const vitaminList = MICRONUTRIENTS.filter((n) => n.group === 'vitamin');
    const mineralAndOtherList = MICRONUTRIENTS.filter((n) => n.group !== 'vitamin');

    return {
      totals: sums,
      hasData: anyMicroData,
      vitamins: vitaminList,
      minerals: mineralAndOtherList,
    };
  }, [meals]);

  const { meetingCount, deficiencies } = useMemo(() => {
    let count = 0;
    const defs = [];

    MICRONUTRIENTS.forEach((n) => {
      const consumed = totals[n.key] || 0;
      const pct = n.rdi > 0 ? (consumed / n.rdi) * 100 : 0;

      if (n.isLimit) {
        if (pct <= 100) count++;
      } else {
        if (pct >= 80) count++;
        if (pct < 40 && FOOD_SUGGESTIONS[n.key]?.length > 0) {
          defs.push(n);
        }
      }
    });

    return { meetingCount: count, deficiencies: defs };
  }, [totals]);

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.title}>Micronutrients</Text>
            <View style={[styles.headerIcon, { backgroundColor: Colors.primarySoft }]}>
              <Pill size={20} color={Colors.primary} />
            </View>
          </View>
        </Animated.View>

        {/* Summary Card */}
        <Animated.View
          entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}
        >
          <View style={styles.glassCard}>
            <View style={styles.summaryRow}>
              <View style={[styles.scoreCircle, {
                borderColor: meetingCount >= 10 ? Colors.success : meetingCount >= 5 ? Colors.warning : Colors.error,
              }]}>
                <Text style={styles.scoreNumber}>{meetingCount}</Text>
                <Text style={styles.scoreTotal}>/ {MICRONUTRIENTS.length}</Text>
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryTitle}>
                  {meetingCount} of {MICRONUTRIENTS.length} nutrients on track
                </Text>
                <Text style={styles.summarySubtitle}>
                  {hasData
                    ? 'Based on foods logged today'
                    : 'No micronutrient data available yet'}
                </Text>
              </View>
            </View>
            {!hasData && (
              <View style={styles.limitedDataBanner}>
                <AlertTriangle size={16} color={Colors.warning} />
                <Text style={styles.limitedDataText}>
                  Limited data -- scan more foods with barcodes for detailed micronutrient tracking
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Vitamins Section */}
        <Animated.View
          entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}
        >
          <Text style={styles.sectionTitle}>Vitamins</Text>
          <View style={styles.glassCard}>
            {vitamins.map((nutrient) => (
              <NutrientRow
                key={nutrient.key}
                nutrient={nutrient}
                consumed={totals[nutrient.key] || 0}
              />
            ))}
          </View>
        </Animated.View>

        {/* Minerals & Other Section */}
        <Animated.View
          entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}
        >
          <Text style={styles.sectionTitle}>Minerals & Other</Text>
          <View style={styles.glassCard}>
            {minerals.map((nutrient) => (
              <NutrientRow
                key={nutrient.key}
                nutrient={nutrient}
                consumed={totals[nutrient.key] || 0}
              />
            ))}
          </View>
        </Animated.View>

        {/* Tips Section */}
        {deficiencies.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(320).springify().mass(0.5).damping(10)}
          >
            <Text style={styles.sectionTitle}>Suggestions</Text>
            <View style={styles.glassCard}>
              {deficiencies.slice(0, 4).map((nutrient) => (
                <View key={nutrient.key} style={styles.tipRow}>
                  <AlertTriangle size={16} color={Colors.warning} />
                  <Text style={styles.tipText}>
                    You may be low on <Text style={styles.tipBold}>{nutrient.name}</Text>. Try{' '}
                    {FOOD_SUGGESTIONS[nutrient.key].join(', ')}.
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Good standing */}
        {deficiencies.length === 0 && hasData && (
          <Animated.View
            entering={FadeInDown.delay(320).springify().mass(0.5).damping(10)}
          >
            <View style={styles.glassCard}>
              <View style={styles.tipRow}>
                <CheckCircle size={16} color={Colors.success} />
                <Text style={styles.tipText}>
                  Looking good! Keep up the balanced diet to maintain your nutrient levels.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: { marginBottom: Spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  scoreNumber: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  scoreTotal: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: -2,
  },
  summaryText: { flex: 1 },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  summarySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  limitedDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.warningSoft,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  limitedDataText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.warning,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  nutrientRow: {
    marginBottom: Spacing.md,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  nutrientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  nutrientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nutrientName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  limitBadge: {
    fontSize: 9,
    color: Colors.warning,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  nutrientAmount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  barTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    marginTop: 3,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  bottomSpacer: { height: 100 },
});
