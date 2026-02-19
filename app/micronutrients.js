import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Pill, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import GlassCard from '../components/ui/GlassCard';
import AnimatedProgressRing from '../components/AnimatedProgressRing';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { MICRONUTRIENTS } from '../data/micronutrients';
import { useMicronutrients } from '../hooks/useMicronutrients';
import { useProfile } from '../context/ProfileContext';
import { useMeals } from '../context/MealContext';
import { useDailyMicronutrients } from '../hooks/useDailyMicronutrients';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'vitamin', label: 'Vitamins' },
  { key: 'mineral', label: 'Minerals' },
  { key: 'other', label: 'Other' },
];

function getProgressColor(percent) {
  if (percent >= 75) return Colors.success;
  if (percent >= 50) return Colors.warning;
  if (percent >= 25) return '#FF9500'; // orange
  return Colors.error;
}

function getStatusBadgeColor(status) {
  switch (status) {
    case 'excellent': return { bg: Colors.successSoft, text: Colors.success };
    case 'good': return { bg: Colors.successSoft, text: Colors.success };
    case 'low': return { bg: Colors.warningSoft, text: Colors.warning };
    case 'warning': return { bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500' };
    case 'critical': return { bg: Colors.errorSoft, text: Colors.error };
    default: return { bg: Colors.surfaceGlass, text: Colors.textSecondary };
  }
}

function getGradeColor(grade) {
  if (grade.startsWith('A')) return Colors.success;
  if (grade.startsWith('B')) return Colors.primary;
  if (grade.startsWith('C')) return Colors.warning;
  if (grade.startsWith('D')) return '#FF9500';
  return Colors.error;
}

// ---------------------------------------------------------------------------
// NutrientRow — individual nutrient with expandable detail
// ---------------------------------------------------------------------------
function NutrientRow({ item, isExpanded, onToggle }) {
  const progressColor = getProgressColor(item.percent);
  const badgeColors = getStatusBadgeColor(item.status);
  const clampedWidth = Math.min(item.percent, 100);

  return (
    <Pressable onPress={onToggle} style={styles.nutrientRow}>
      <View style={styles.nutrientTopRow}>
        <Text style={styles.nutrientEmoji}>{item.emoji}</Text>
        <View style={styles.nutrientInfo}>
          <Text style={styles.nutrientName}>{item.name}</Text>
          <View style={styles.nutrientBarRow}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${clampedWidth}%`, backgroundColor: progressColor },
                ]}
              />
            </View>
          </View>
        </View>
        <View style={styles.nutrientRight}>
          <Text style={styles.nutrientAmountText}>
            {item.current % 1 === 0 ? item.current : item.current.toFixed(1)}
            <Text style={styles.nutrientUnitDivider}> / </Text>
            {item.rda}{item.unit}
          </Text>
          <View style={[styles.percentBadge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.percentBadgeText, { color: badgeColors.text }]}>
              {item.percent}%
            </Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={16} color={Colors.textTertiary} />
        ) : (
          <ChevronDown size={16} color={Colors.textTertiary} />
        )}
      </View>

      {isExpanded && (
        <View style={styles.expandedSection}>
          <Text style={styles.expandedDescription}>{item.description}</Text>

          <View style={styles.expandedRow}>
            <Text style={styles.expandedLabel}>Top sources</Text>
            <Text style={styles.expandedValue}>{item.topSources.join(', ')}</Text>
          </View>

          <View style={styles.expandedRow}>
            <Text style={styles.expandedLabel}>If deficient</Text>
            <Text style={[styles.expandedValue, { color: Colors.warning }]}>
              {item.deficiencyRisk}
            </Text>
          </View>

          {item.upperLimit && (
            <View style={styles.expandedRow}>
              <Text style={styles.expandedLabel}>Upper limit</Text>
              <Text style={styles.expandedValue}>{item.upperLimit} {item.unit}/day</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function MicronutrientsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const gender = (profile.gender === 'female') ? 'female' : 'male';

  // Pull real food data from today's meals
  const { meals } = useMeals();
  const allFoods = useMemo(() => {
    const foods = [];
    for (const mealType of ['breakfast', 'lunch', 'dinner', 'snacks']) {
      for (const item of (meals[mealType] || [])) {
        foods.push({ name: item.name || '', calories: item.calories || 0 });
      }
    }
    return foods;
  }, [meals]);

  const { intake: dailyIntake, matchedFoods, totalFoods } = useDailyMicronutrients(allFoods);
  const hasRealData = totalFoods > 0;

  const {
    nutrients,
    deficiencyAlerts,
    overallScore,
    grade,
    vitaminScore,
    mineralScore,
    topDeficiencies,
    topStrengths,
  } = useMicronutrients(dailyIntake, gender);

  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filteredNutrients = useMemo(() => {
    if (activeTab === 'all') return nutrients;
    return nutrients.filter((n) => n.category === activeTab);
  }, [nutrients, activeTab]);

  const criticalAndWarningAlerts = useMemo(() => {
    return deficiencyAlerts.filter((a) => a.severity === 'critical' || a.severity === 'warning');
  }, [deficiencyAlerts]);

  const handleToggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleTabPress = useCallback((key) => {
    setActiveTab(key);
    setExpandedId(null);
  }, []);

  const gradeColor = getGradeColor(grade);

  const renderNutrientItem = useCallback(({ item }) => (
    <NutrientRow
      item={item}
      isExpanded={expandedId === item.id}
      onToggle={() => handleToggleExpand(item.id)}
    />
  ), [expandedId, handleToggleExpand]);

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = useMemo(() => (
    <View>
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

      {/* Overall Score Ring */}
      <Animated.View
        entering={FadeInDown.delay(80).springify().mass(0.5).damping(10)}
      >
        <GlassCard style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <AnimatedProgressRing
              progress={overallScore}
              size={100}
              strokeWidth={8}
              color={gradeColor}
              gradientEnd={Colors.primary}
            >
              <View style={styles.scoreRingContent}>
                <AnimatedCounter
                  value={overallScore}
                  suffix="%"
                  style={[styles.scoreRingValue, { color: gradeColor }]}
                />
                <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '22' }]}>
                  <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
                </View>
              </View>
            </AnimatedProgressRing>

            <View style={styles.scoreTextArea}>
              <Text style={styles.scoreTitle}>Nutrition Score</Text>
              <Text style={styles.scoreSubtitle}>
                Based on {nutrients.length} tracked micronutrients
              </Text>
              <View style={styles.strengthsRow}>
                {topStrengths.slice(0, 2).map((n) => (
                  <View key={n.id} style={styles.strengthChip}>
                    <Text style={styles.strengthChipText}>{n.emoji} {n.name.split(' ')[0]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </GlassCard>
      </Animated.View>

      {/* Category Tabs */}
      <Animated.View
        entering={FadeInDown.delay(160).springify().mass(0.5).damping(10)}
      >
        <View style={styles.tabsRow}>
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
                style={[
                  styles.tab,
                  isActive && styles.tabActive,
                ]}
              >
                <Text style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Deficiency Alerts */}
      {criticalAndWarningAlerts.length > 0 && (
        <Animated.View
          entering={FadeInDown.delay(240).springify().mass(0.5).damping(10)}
        >
          {criticalAndWarningAlerts.slice(0, 3).map((alert) => {
            const isCritical = alert.severity === 'critical';
            const bannerBg = isCritical ? Colors.errorSoft : Colors.warningSoft;
            const bannerBorderColor = isCritical ? 'rgba(255, 82, 82, 0.3)' : 'rgba(255, 179, 0, 0.3)';
            const textColor = isCritical ? Colors.error : Colors.warning;
            return (
              <View
                key={alert.nutrient.id}
                style={[styles.alertBanner, { backgroundColor: bannerBg, borderColor: bannerBorderColor }]}
              >
                <View style={styles.alertHeader}>
                  <AlertTriangle size={16} color={textColor} />
                  <Text style={[styles.alertTitle, { color: textColor }]}>
                    {alert.nutrient.emoji} {alert.nutrient.name} — {Math.round(alert.percent)}% of RDA
                  </Text>
                </View>
                <Text style={styles.alertSuggestion}>
                  Try: {alert.nutrient.topSources.join(', ')}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      )}

      {/* Section label */}
      <Text style={styles.sectionTitle}>
        {activeTab === 'all' ? 'All Nutrients' : CATEGORY_TABS.find(t => t.key === activeTab)?.label}
      </Text>
    </View>
  ), [
    router, overallScore, gradeColor, grade, nutrients.length, topStrengths,
    activeTab, handleTabPress, criticalAndWarningAlerts,
  ]);

  const ListFooter = useMemo(() => (
    <View>
      {/* Summary Cards */}
      <Animated.View
        entering={FadeIn.delay(400)}
      >
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.summaryRow}>
          <GlassCard style={styles.summaryCard} variant="accent">
            <View style={styles.summaryCardInner}>
              <AnimatedProgressRing
                progress={vitaminScore}
                size={56}
                strokeWidth={5}
                color="#64D2FF"
                gradientEnd="#5AC8FA"
                showPercentage
              />
              <Text style={styles.summaryCardLabel}>Vitamins</Text>
              <AnimatedCounter
                value={vitaminScore}
                suffix="%"
                style={styles.summaryCardValue}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.summaryCard} variant="success">
            <View style={styles.summaryCardInner}>
              <AnimatedProgressRing
                progress={mineralScore}
                size={56}
                strokeWidth={5}
                color={Colors.success}
                gradientEnd="#00C853"
                showPercentage
              />
              <Text style={styles.summaryCardLabel}>Minerals</Text>
              <AnimatedCounter
                value={mineralScore}
                suffix="%"
                style={styles.summaryCardValue}
              />
            </View>
          </GlassCard>
        </View>
      </Animated.View>

      {/* Top Deficiencies */}
      {topDeficiencies.length > 0 && topDeficiencies[0].percent < 75 && (
        <Animated.View entering={FadeIn.delay(500)}>
          <Text style={styles.sectionTitle}>Focus Areas</Text>
          <GlassCard style={styles.focusCard} variant="warning">
            {topDeficiencies.filter(n => n.percent < 75).map((n) => (
              <View key={n.id} style={styles.focusRow}>
                <Text style={styles.focusEmoji}>{n.emoji}</Text>
                <View style={styles.focusInfo}>
                  <Text style={styles.focusName}>{n.name}</Text>
                  <Text style={styles.focusSources}>
                    Eat more: {n.topSources.join(', ')}
                  </Text>
                </View>
                <View style={[styles.percentBadge, {
                  backgroundColor: getStatusBadgeColor(n.status).bg,
                }]}>
                  <Text style={[styles.percentBadgeText, {
                    color: getStatusBadgeColor(n.status).text,
                  }]}>
                    {n.percent}%
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      {/* Top Strengths */}
      {topStrengths.length > 0 && topStrengths[0].percent >= 75 && (
        <Animated.View entering={FadeIn.delay(600)}>
          <Text style={styles.sectionTitle}>Strengths</Text>
          <GlassCard style={styles.focusCard} variant="success">
            {topStrengths.filter(n => n.percent >= 75).map((n) => (
              <View key={n.id} style={styles.focusRow}>
                <Text style={styles.focusEmoji}>{n.emoji}</Text>
                <View style={styles.focusInfo}>
                  <Text style={styles.focusName}>{n.name}</Text>
                  <Text style={[styles.focusSources, { color: Colors.success }]}>
                    {n.percent}% of daily target
                  </Text>
                </View>
                <Sparkles size={16} color={Colors.success} />
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      {/* Data source notice */}
      <View style={styles.noticeBanner}>
        <AlertTriangle size={14} color={Colors.textTertiary} />
        <Text style={styles.noticeText}>
          {hasRealData
            ? `Estimated from ${matchedFoods} of ${totalFoods} logged foods. Log more foods for better accuracy.`
            : 'No foods logged today. Log meals to see your micronutrient breakdown.'}
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </View>
  ), [vitaminScore, mineralScore, topDeficiencies, topStrengths, hasRealData, matchedFoods, totalFoods]);

  return (
    <ScreenWrapper>
      <FlatList
        data={filteredNutrients}
        renderItem={renderNutrientItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
      />
    </ScreenWrapper>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Header
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

  // Score card
  scoreCard: { marginBottom: Spacing.md },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  scoreRingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginTop: 2,
  },
  gradeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.heavy,
  },
  scoreTextArea: { flex: 1 },
  scoreTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  scoreSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  strengthsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  strengthChip: {
    backgroundColor: Colors.surfaceGlassLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  strengthChipText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceGlass,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.borderAccent,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Alert banners
  alertBanner: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  alertSuggestion: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 20,
  },

  // Section title
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },

  // Nutrient row
  nutrientRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  nutrientTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nutrientEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  nutrientInfo: {
    flex: 1,
    gap: 4,
  },
  nutrientName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  nutrientBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
  nutrientRight: {
    alignItems: 'flex-end',
    gap: 3,
    minWidth: 80,
  },
  nutrientAmountText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  nutrientUnitDivider: {
    color: Colors.textMuted,
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  percentBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  // Expanded section
  expandedSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  expandedDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  expandedLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
    minWidth: 80,
  },
  expandedValue: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
  },
  summaryCardInner: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryCardLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  summaryCardValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },

  // Focus / strengths card
  focusCard: {
    marginBottom: Spacing.md,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  focusEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  focusInfo: {
    flex: 1,
  },
  focusName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  focusSources: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Notice banner
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  noticeText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },

  bottomSpacer: { height: 120 },
});
