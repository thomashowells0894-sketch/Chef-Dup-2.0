import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  Zap,
  Flame,
  Target,
  Info,
  ChevronDown,
  Calendar,
  PieChart,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
} from 'lucide-react-native';

import { Colors, Gradients, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { hapticLight } from '../lib/haptics';
import useCalorieCycling, { CYCLING_PATTERNS } from '../hooks/useCalorieCycling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Pattern Icon Map ─────────────────────────────────────────────────────────

const PATTERN_ICONS = {
  TrendingUp: TrendingUp,
  BarChart3: BarChart3,
  Zap: Zap,
};

// ─── Helper: Glass Card ───────────────────────────────────────────────────────

function GlassCard({ children, style }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

// ─── Helper: Section Header ───────────────────────────────────────────────────

function SectionHeader({ title, icon: Icon, iconColor }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconCircle, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={16} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Pattern Selector Card ────────────────────────────────────────────────────

function PatternCard({ pattern, isSelected, onSelect }) {
  const IconComponent = PATTERN_ICONS[pattern.icon] || TrendingUp;

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.patternCard,
        isSelected && { borderColor: pattern.color + '60' },
      ]}
    >
      <LinearGradient
        colors={
          isSelected
            ? [`${pattern.color}18`, `${pattern.color}06`]
            : [Colors.surfaceGlass, 'rgba(255, 255, 255, 0.02)']
        }
        style={styles.patternCardGradient}
      >
        <View style={[styles.patternIconCircle, { backgroundColor: `${pattern.color}20` }]}>
          <IconComponent size={20} color={pattern.color} strokeWidth={2} />
        </View>
        <Text style={[styles.patternLabel, isSelected && { color: pattern.color }]}>
          {pattern.shortDesc}
        </Text>
        <Text style={styles.patternDesc} numberOfLines={2}>
          {pattern.description}
        </Text>
        {isSelected && (
          <View style={[styles.patternCheckBadge, { backgroundColor: pattern.color }]}>
            <Check size={12} color={Colors.background} strokeWidth={3} />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ─── Weekly Calendar Day Block ────────────────────────────────────────────────

function DayBlock({ day, isToday, onPress, getDayTypeInfo }) {
  const typeInfo = getDayTypeInfo(day.dayType);

  return (
    <Pressable onPress={onPress} style={styles.dayBlockContainer}>
      <View
        style={[
          styles.dayBlock,
          { backgroundColor: typeInfo.bgColor },
          isToday && styles.dayBlockToday,
          isToday && { borderColor: typeInfo.color },
        ]}
      >
        <Text style={[styles.dayBlockLabel, isToday && { color: Colors.text, fontWeight: FontWeight.bold }]}>
          {day.day}
        </Text>
        <Text style={[styles.dayBlockCalories, { color: typeInfo.color }]}>
          {day.calories}
        </Text>
        <View style={[styles.dayBlockTypeBadge, { backgroundColor: typeInfo.color + '30' }]}>
          <Text style={[styles.dayBlockTypeText, { color: typeInfo.color }]}>
            {typeInfo.shortLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Macro Progress Bar ───────────────────────────────────────────────────────

function MacroProgressBar({ label, current, color, percentage }) {
  return (
    <View style={styles.macroProgressContainer}>
      <View style={styles.macroProgressHeader}>
        <Text style={styles.macroProgressLabel}>{label}</Text>
        <Text style={[styles.macroProgressValue, { color }]}>{current}g</Text>
      </View>
      <View style={styles.macroProgressTrack}>
        <View
          style={[
            styles.macroProgressFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.macroProgressPercent}>{percentage}%</Text>
    </View>
  );
}

// ─── Donut Chart Segment (simplified SVG-free) ───────────────────────────────

function MacroDonutChart({ macroSplit }) {
  const total = macroSplit.protein + macroSplit.carbs + macroSplit.fat;
  const proteinDeg = (macroSplit.protein / total) * 360;
  const carbsDeg = (macroSplit.carbs / total) * 360;

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutChart}>
        {/* Background ring */}
        <View style={styles.donutRing} />
        {/* Macro segments represented as colored arcs via bars */}
        <View style={styles.donutCenter}>
          <Text style={styles.donutCenterText}>Macro</Text>
          <Text style={styles.donutCenterSubtext}>Split</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        <View style={styles.donutLegendItem}>
          <View style={[styles.donutLegendDot, { backgroundColor: Colors.protein }]} />
          <Text style={styles.donutLegendLabel}>Protein</Text>
          <Text style={[styles.donutLegendValue, { color: Colors.protein }]}>{macroSplit.protein}%</Text>
        </View>
        <View style={styles.donutLegendItem}>
          <View style={[styles.donutLegendDot, { backgroundColor: Colors.carbs }]} />
          <Text style={styles.donutLegendLabel}>Carbs</Text>
          <Text style={[styles.donutLegendValue, { color: Colors.carbs }]}>{macroSplit.carbs}%</Text>
        </View>
        <View style={styles.donutLegendItem}>
          <View style={[styles.donutLegendDot, { backgroundColor: Colors.fat }]} />
          <Text style={styles.donutLegendLabel}>Fat</Text>
          <Text style={[styles.donutLegendValue, { color: Colors.fat }]}>{macroSplit.fat}%</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Macro Split Comparison Bars ──────────────────────────────────────────────

function MacroComparisonBars({ macroSplit, label }) {
  return (
    <View style={styles.comparisonBarsContainer}>
      <Text style={styles.comparisonBarsLabel}>{label}</Text>
      <View style={styles.comparisonBarRow}>
        <View style={[styles.comparisonBar, { flex: macroSplit.protein, backgroundColor: Colors.protein }]} />
        <View style={[styles.comparisonBar, { flex: macroSplit.carbs, backgroundColor: Colors.carbs }]} />
        <View style={[styles.comparisonBar, { flex: macroSplit.fat, backgroundColor: Colors.fat }]} />
      </View>
      <View style={styles.comparisonBarLabels}>
        <Text style={[styles.comparisonBarPercent, { color: Colors.protein }]}>{macroSplit.protein}% P</Text>
        <Text style={[styles.comparisonBarPercent, { color: Colors.carbs }]}>{macroSplit.carbs}% C</Text>
        <Text style={[styles.comparisonBarPercent, { color: Colors.fat }]}>{macroSplit.fat}% F</Text>
      </View>
    </View>
  );
}

// ─── Educational Expandable Card ──────────────────────────────────────────────

function EducationalCard({ title, content, icon: Icon, iconColor, delay }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async () => {
    await hapticLight();
    setExpanded(!expanded);
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}>
      <Pressable onPress={handleToggle}>
        <GlassCard style={styles.educationalCard}>
          <View style={styles.educationalHeader}>
            <View style={[styles.educationalIcon, { backgroundColor: `${iconColor}15` }]}>
              <Icon size={18} color={iconColor} strokeWidth={2} />
            </View>
            <Text style={styles.educationalTitle}>{title}</Text>
            <ChevronDown
              size={18}
              color={Colors.textSecondary}
              style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
            />
          </View>
          {expanded && (
            <Text style={styles.educationalContent}>{content}</Text>
          )}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalorieCyclingScreen() {
  const router = useRouter();
  const {
    selectedPattern,
    weekSchedule,
    isLoading,
    changePattern,
    toggleDayType,
    weeklyPlan,
    todaysTarget,
    todayIndex,
    weeklyStats,
    refeedRecommendation,
    comparisonToStandard,
    patterns,
    baseTDEE,
    baseCalorieGoal,
    getCurrentMacroSplit,
    getDayTypeInfo,
  } = useCalorieCycling();

  // Handle pattern selection
  const handlePatternSelect = useCallback(async (patternKey) => {
    await hapticLight();
    changePattern(patternKey);
  }, [changePattern]);

  // Handle day toggle
  const handleDayToggle = useCallback(async (dayIndex) => {
    await hapticLight();
    toggleDayType(dayIndex);
  }, [toggleDayType]);

  // Current day type info
  const todayTypeInfo = useMemo(() => {
    if (!todaysTarget) return null;
    return getDayTypeInfo(todaysTarget.dayType);
  }, [todaysTarget, getDayTypeInfo]);

  // Current macro split for today
  const todayMacroSplit = useMemo(() => {
    if (!todaysTarget) return { protein: 30, carbs: 40, fat: 30 };
    return getCurrentMacroSplit(todaysTarget.dayType);
  }, [todaysTarget, getCurrentMacroSplit]);

  // Standard macro split for comparison
  const standardMacroSplit = useMemo(() => {
    return { protein: 30, carbs: 40, fat: 30 };
  }, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading calorie cycling...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)} style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={async () => {
              await hapticLight();
              router.back();
            }}
          >
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Calorie Cycling</Text>
          </View>
          <View style={[styles.headerIconCircle, { backgroundColor: Colors.secondary + '20' }]}>
            <TrendingUp size={20} color={Colors.secondary} />
          </View>
        </Animated.View>

        {/* TDEE Reference */}
        <Animated.View entering={FadeInDown.delay(50).springify().mass(0.5).damping(10)}>
          <View style={styles.tdeeRefCard}>
            <View style={styles.tdeeRefRow}>
              <View style={styles.tdeeRefItem}>
                <Text style={styles.tdeeRefLabel}>Maintenance</Text>
                <Text style={styles.tdeeRefValue}>{baseTDEE}</Text>
                <Text style={styles.tdeeRefUnit}>kcal</Text>
              </View>
              <View style={styles.tdeeRefDivider} />
              <View style={styles.tdeeRefItem}>
                <Text style={styles.tdeeRefLabel}>Goal</Text>
                <Text style={[styles.tdeeRefValue, { color: Colors.primary }]}>{baseCalorieGoal}</Text>
                <Text style={styles.tdeeRefUnit}>kcal</Text>
              </View>
              <View style={styles.tdeeRefDivider} />
              <View style={styles.tdeeRefItem}>
                <Text style={styles.tdeeRefLabel}>Cycling Avg</Text>
                <Text style={[styles.tdeeRefValue, { color: Colors.secondary }]}>{weeklyStats.avgCalories}</Text>
                <Text style={styles.tdeeRefUnit}>kcal</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Pattern Selector */}
        <Animated.View entering={FadeInDown.delay(100).springify().mass(0.5).damping(10)}>
          <SectionHeader title="Cycling Pattern" icon={Target} iconColor={Colors.primary} />
          <View style={styles.patternRow}>
            {patterns.map((pattern) => (
              <PatternCard
                key={pattern.key}
                pattern={pattern}
                isSelected={selectedPattern === pattern.key}
                onSelect={() => handlePatternSelect(pattern.key)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Weekly Calendar View */}
        <Animated.View entering={FadeInDown.delay(200).springify().mass(0.5).damping(10)}>
          <SectionHeader title="Weekly Schedule" icon={Calendar} iconColor={Colors.warning} />
          <GlassCard>
            <Text style={styles.calendarHint}>Tap a day to change its type</Text>
            <View style={styles.weekRow}>
              {weeklyPlan.map((day, index) => (
                <DayBlock
                  key={index}
                  day={day}
                  isToday={index === todayIndex}
                  onPress={() => handleDayToggle(index)}
                  getDayTypeInfo={getDayTypeInfo}
                />
              ))}
            </View>
            {/* Day type legend */}
            <View style={styles.legendRow}>
              {selectedPattern === 'standard' && (
                <>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
                    <Text style={styles.legendText}>Training (High)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
                    <Text style={styles.legendText}>Rest (Low)</Text>
                  </View>
                </>
              )}
              {selectedPattern === 'carbCycling' && (
                <>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
                    <Text style={styles.legendText}>High</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00D4FF' }]} />
                    <Text style={styles.legendText}>Med</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
                    <Text style={styles.legendText}>Low</Text>
                  </View>
                </>
              )}
              {selectedPattern === 'aggressiveCut' && (
                <>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
                    <Text style={styles.legendText}>Train</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00D4FF' }]} />
                    <Text style={styles.legendText}>Med</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF6B35' }]} />
                    <Text style={styles.legendText}>Low</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
                    <Text style={styles.legendText}>Refeed</Text>
                  </View>
                </>
              )}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Today's Targets Card (Hero) */}
        {todaysTarget && todayTypeInfo && (
          <Animated.View entering={FadeInDown.delay(300).springify().mass(0.5).damping(10)}>
            <SectionHeader title="Today's Targets" icon={Flame} iconColor={Colors.warning} />
            <View style={styles.heroCard}>
              <LinearGradient
                colors={[`${todayTypeInfo.color}12`, `${todayTypeInfo.color}04`]}
                style={styles.heroCardGradient}
              >
                {/* Day type badge */}
                <View style={[styles.dayTypeBadge, { backgroundColor: todayTypeInfo.color + '25' }]}>
                  <View style={[styles.dayTypeDot, { backgroundColor: todayTypeInfo.color }]} />
                  <Text style={[styles.dayTypeBadgeText, { color: todayTypeInfo.color }]}>
                    {todayTypeInfo.label}
                  </Text>
                </View>

                {/* Calorie target */}
                <View style={styles.heroCalorieRow}>
                  <Text style={[styles.heroCalorieNumber, { color: todayTypeInfo.color }]}>
                    {todaysTarget.calories}
                  </Text>
                  <Text style={styles.heroCalorieUnit}>kcal</Text>
                </View>

                {/* Comparison to standard */}
                {comparisonToStandard && (
                  <View style={styles.comparisonRow}>
                    {comparisonToStandard.isHigher ? (
                      <ArrowUpRight size={14} color={Colors.success} />
                    ) : comparisonToStandard.difference < 0 ? (
                      <ArrowDownRight size={14} color={Colors.secondary} />
                    ) : (
                      <Minus size={14} color={Colors.textSecondary} />
                    )}
                    <Text style={[
                      styles.comparisonText,
                      { color: comparisonToStandard.isHigher ? Colors.success : comparisonToStandard.difference < 0 ? Colors.secondary : Colors.textSecondary },
                    ]}>
                      {comparisonToStandard.isHigher ? '+' : ''}{comparisonToStandard.difference} kcal vs standard ({comparisonToStandard.standardCalories})
                    </Text>
                  </View>
                )}

                {/* Macro targets */}
                <View style={styles.heroMacrosRow}>
                  <MacroProgressBar
                    label="Protein"
                    current={todaysTarget.protein}
                    color={Colors.protein}
                    percentage={todayMacroSplit.protein}
                  />
                  <MacroProgressBar
                    label="Carbs"
                    current={todaysTarget.carbs}
                    color={Colors.carbs}
                    percentage={todayMacroSplit.carbs}
                  />
                  <MacroProgressBar
                    label="Fat"
                    current={todaysTarget.fat}
                    color={Colors.fat}
                    percentage={todayMacroSplit.fat}
                  />
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* Weekly Overview */}
        <Animated.View entering={FadeInDown.delay(400).springify().mass(0.5).damping(10)}>
          <SectionHeader title="Weekly Overview" icon={BarChart3} iconColor={Colors.primary} />
          <GlassCard>
            <View style={styles.weeklyOverviewGrid}>
              <View style={styles.weeklyOverviewItem}>
                <Text style={styles.weeklyOverviewLabel}>Total Weekly</Text>
                <Text style={styles.weeklyOverviewValue}>{weeklyStats.totalCalories.toLocaleString()}</Text>
                <Text style={styles.weeklyOverviewUnit}>kcal</Text>
              </View>
              <View style={styles.weeklyOverviewItem}>
                <Text style={styles.weeklyOverviewLabel}>Daily Average</Text>
                <Text style={[styles.weeklyOverviewValue, { color: Colors.primary }]}>
                  {weeklyStats.avgCalories.toLocaleString()}
                </Text>
                <Text style={styles.weeklyOverviewUnit}>kcal/day</Text>
              </View>
              <View style={styles.weeklyOverviewItem}>
                <Text style={styles.weeklyOverviewLabel}>vs Maintenance</Text>
                <Text style={[
                  styles.weeklyOverviewValue,
                  { color: weeklyStats.isDeficit ? Colors.secondary : weeklyStats.isSurplus ? Colors.success : Colors.textSecondary },
                ]}>
                  {weeklyStats.isDeficit ? '-' : weeklyStats.isSurplus ? '+' : ''}{Math.abs(weeklyStats.weeklyDeficit).toLocaleString()}
                </Text>
                <Text style={styles.weeklyOverviewUnit}>kcal/week</Text>
              </View>
              <View style={styles.weeklyOverviewItem}>
                <Text style={styles.weeklyOverviewLabel}>Estimated Rate</Text>
                <Text style={[
                  styles.weeklyOverviewValue,
                  { color: Colors.warning },
                ]}>
                  {weeklyStats.lbsPerWeek}
                </Text>
                <Text style={styles.weeklyOverviewUnit}>
                  lbs/week {weeklyStats.isDeficit ? 'loss' : weeklyStats.isSurplus ? 'gain' : ''}
                </Text>
              </View>
            </View>

            {/* Calorie range visualization */}
            <View style={styles.rangeBar}>
              <Text style={styles.rangeLabel}>Calorie Range</Text>
              <View style={styles.rangeTrack}>
                <View style={styles.rangeTrackBg} />
                <View style={[styles.rangeMin, { left: '0%' }]}>
                  <Text style={styles.rangeMinText}>{weeklyStats.lowestDay}</Text>
                </View>
                <View style={[styles.rangeMax, { right: '0%' }]}>
                  <Text style={styles.rangeMaxText}>{weeklyStats.highestDay}</Text>
                </View>
              </View>
              <Text style={styles.rangeSpread}>
                {weeklyStats.calorieRange} kcal spread
              </Text>
            </View>

            {/* Day type breakdown */}
            <View style={styles.dayTypeBreakdown}>
              {weeklyStats.trainingDays > 0 && (
                <View style={[styles.dayTypeChip, { backgroundColor: 'rgba(0, 230, 118, 0.12)' }]}>
                  <View style={[styles.dayTypeChipDot, { backgroundColor: '#00E676' }]} />
                  <Text style={[styles.dayTypeChipText, { color: '#00E676' }]}>
                    {weeklyStats.trainingDays} Training
                  </Text>
                </View>
              )}
              {weeklyStats.mediumDays > 0 && (
                <View style={[styles.dayTypeChip, { backgroundColor: 'rgba(0, 212, 255, 0.12)' }]}>
                  <View style={[styles.dayTypeChipDot, { backgroundColor: '#00D4FF' }]} />
                  <Text style={[styles.dayTypeChipText, { color: '#00D4FF' }]}>
                    {weeklyStats.mediumDays} Medium
                  </Text>
                </View>
              )}
              {weeklyStats.restDays > 0 && (
                <View style={[styles.dayTypeChip, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                  <View style={[styles.dayTypeChipDot, { backgroundColor: '#FF6B35' }]} />
                  <Text style={[styles.dayTypeChipText, { color: '#FF6B35' }]}>
                    {weeklyStats.restDays} Rest
                  </Text>
                </View>
              )}
              {weeklyStats.refeedDays > 0 && (
                <View style={[styles.dayTypeChip, { backgroundColor: 'rgba(255, 215, 0, 0.12)' }]}>
                  <View style={[styles.dayTypeChipDot, { backgroundColor: '#FFD700' }]} />
                  <Text style={[styles.dayTypeChipText, { color: '#FFD700' }]}>
                    {weeklyStats.refeedDays} Refeed
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Macro Split Visualization */}
        <Animated.View entering={FadeInDown.delay(500).springify().mass(0.5).damping(10)}>
          <SectionHeader title="Macro Split Visualization" icon={PieChart} iconColor={Colors.protein} />
          <GlassCard>
            {/* Today's macro donut */}
            <MacroDonutChart macroSplit={todayMacroSplit} />

            {/* Comparison bars */}
            <View style={styles.comparisonSection}>
              <Text style={styles.comparisonSectionTitle}>Split Comparison</Text>
              <MacroComparisonBars
                macroSplit={todayMacroSplit}
                label={`Today (${todayTypeInfo?.label || 'Rest Day'})`}
              />
              <MacroComparisonBars
                macroSplit={standardMacroSplit}
                label="Standard Split"
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Refeed Recommendation (for aggressive cut) */}
        {selectedPattern === 'aggressiveCut' && (
          <Animated.View entering={FadeInDown.delay(550).springify().mass(0.5).damping(10)}>
            <SectionHeader title="Refeed Recommendation" icon={Zap} iconColor={Colors.gold} />
            <View style={styles.refeedCard}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.10)', 'rgba(255, 215, 0, 0.03)']}
                style={styles.refeedCardGradient}
              >
                <View style={styles.refeedHeader}>
                  <View style={styles.refeedBadge}>
                    <Zap size={16} color={Colors.gold} />
                    <Text style={styles.refeedBadgeText}>
                      Every {refeedRecommendation.frequencyDays} days
                    </Text>
                  </View>
                  <View style={[
                    styles.urgencyBadge,
                    {
                      backgroundColor: refeedRecommendation.urgency === 'high'
                        ? Colors.error + '20'
                        : refeedRecommendation.urgency === 'medium'
                          ? Colors.warning + '20'
                          : Colors.success + '20',
                    },
                  ]}>
                    <Text style={[
                      styles.urgencyText,
                      {
                        color: refeedRecommendation.urgency === 'high'
                          ? Colors.error
                          : refeedRecommendation.urgency === 'medium'
                            ? Colors.warning
                            : Colors.success,
                      },
                    ]}>
                      {refeedRecommendation.urgency.charAt(0).toUpperCase() + refeedRecommendation.urgency.slice(1)} Priority
                    </Text>
                  </View>
                </View>

                <Text style={styles.refeedMessage}>{refeedRecommendation.message}</Text>

                <View style={styles.refeedStatsRow}>
                  <View style={styles.refeedStatItem}>
                    <Text style={styles.refeedStatLabel}>Refeed Calories</Text>
                    <Text style={[styles.refeedStatValue, { color: Colors.gold }]}>
                      {refeedRecommendation.refeedCalories}
                    </Text>
                    <Text style={styles.refeedStatUnit}>kcal</Text>
                  </View>
                  <View style={styles.refeedStatDivider} />
                  <View style={styles.refeedStatItem}>
                    <Text style={styles.refeedStatLabel}>Refeed Carbs</Text>
                    <Text style={[styles.refeedStatValue, { color: Colors.carbs }]}>
                      {refeedRecommendation.refeedMacros.carbs}g
                    </Text>
                    <Text style={styles.refeedStatUnit}>60% of cals</Text>
                  </View>
                  <View style={styles.refeedStatDivider} />
                  <View style={styles.refeedStatItem}>
                    <Text style={styles.refeedStatLabel}>Deficit</Text>
                    <Text style={[styles.refeedStatValue, { color: Colors.secondary }]}>
                      {refeedRecommendation.deficitPercent}%
                    </Text>
                    <Text style={styles.refeedStatUnit}>below TDEE</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* Educational Cards */}
        <Animated.View entering={FadeInDown.delay(600).springify().mass(0.5).damping(10)}>
          <SectionHeader title="Learn More" icon={BookOpen} iconColor={Colors.primary} />
        </Animated.View>

        <EducationalCard
          title="What is Calorie Cycling?"
          icon={Info}
          iconColor={Colors.primary}
          delay={650}
          content={
            'Calorie cycling (also called calorie shifting) alternates between higher and lower calorie days throughout the week. ' +
            'Instead of eating the same amount every day, you eat more on active/training days and less on rest days. ' +
            'This approach can help prevent metabolic adaptation during a diet, improve workout performance on training days, ' +
            'and make a calorie deficit more sustainable by providing psychological relief on higher-calorie days. ' +
            'Your weekly average calories remain the same as a flat approach, but the variation can provide metabolic and performance benefits.'
          }
        />

        <EducationalCard
          title="Benefits of Refeed Days"
          icon={Zap}
          iconColor={Colors.gold}
          delay={700}
          content={
            'Refeed days are planned periods of higher calorie intake, primarily from carbohydrates, during a cutting phase. ' +
            'Benefits include: restoring leptin levels (the hormone that signals satiety), replenishing muscle glycogen for better workouts, ' +
            'providing a mental break from dieting, supporting thyroid function and metabolic rate, and reducing cortisol levels. ' +
            'Refeed days differ from "cheat days" because they are structured - calories are moderately above maintenance with a focus on carbs (60%), ' +
            'moderate protein (25%), and low fat (15%). The leaner you are, the more frequently you may benefit from refeeds.'
          }
        />

        <EducationalCard
          title="How to Choose Your Pattern"
          icon={Target}
          iconColor={Colors.success}
          delay={750}
          content={
            'Standard Cycling: Best for most people. Simple high/low day structure that matches training intensity. ' +
            'Great for maintaining muscle while in a moderate deficit.\n\n' +
            'Carb Cycling: Ideal for athletes and those who train with varying intensity. High carb days fuel intense sessions, ' +
            'medium days support moderate activity, and low carb days promote fat oxidation on rest days.\n\n' +
            'Aggressive Cut + Refeed: For experienced dieters in a significant deficit. The deep calorie restriction is offset by strategic refeed days ' +
            'that prevent metabolic adaptation. Not recommended for beginners or those new to tracking nutrition. ' +
            'Monitor energy levels and adjust if you feel excessively fatigued.'
          }
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // TDEE Reference
  tdeeRefCard: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tdeeRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdeeRefItem: {
    flex: 1,
    alignItems: 'center',
  },
  tdeeRefLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  tdeeRefValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  tdeeRefUnit: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  tdeeRefDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Pattern Cards
  patternRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  patternCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  patternCardGradient: {
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 130,
  },
  patternIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  patternLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  patternDesc: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
  },
  patternCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Weekly Calendar
  calendarHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing.md,
  },
  dayBlockContainer: {
    flex: 1,
  },
  dayBlock: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    gap: 4,
  },
  dayBlockToday: {
    borderWidth: 2,
  },
  dayBlockLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayBlockCalories: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  dayBlockTypeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dayBlockTypeText: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Hero Card (Today's Targets)
  heroCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.card,
  },
  heroCardGradient: {
    padding: Spacing.lg,
  },
  dayTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  dayTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayTypeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroCalorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  heroCalorieNumber: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black,
  },
  heroCalorieUnit: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.lg,
  },
  comparisonText: {
    fontSize: FontSize.sm,
  },
  heroMacrosRow: {
    gap: Spacing.md,
  },

  // Macro Progress
  macroProgressContainer: {
    marginBottom: Spacing.xs,
  },
  macroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  macroProgressLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  macroProgressValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  macroProgressTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroProgressPercent: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 2,
  },

  // Weekly Overview
  weeklyOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  weeklyOverviewItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2 - Spacing.md) / 2 - 2,
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  weeklyOverviewLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  weeklyOverviewValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  weeklyOverviewUnit: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Range bar
  rangeBar: {
    marginBottom: Spacing.lg,
  },
  rangeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  rangeTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    position: 'relative',
  },
  rangeTrackBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
  },
  rangeMin: {
    position: 'absolute',
    bottom: -18,
  },
  rangeMinText: {
    fontSize: 10,
    color: Colors.secondary,
    fontWeight: FontWeight.bold,
  },
  rangeMax: {
    position: 'absolute',
    bottom: -18,
  },
  rangeMaxText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: FontWeight.bold,
  },
  rangeSpread: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  // Day type breakdown chips
  dayTypeBreakdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dayTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  dayTypeChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayTypeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Donut Chart
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  donutChart: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 12,
    borderColor: Colors.surfaceElevated,
    borderTopColor: Colors.protein,
    borderRightColor: Colors.carbs,
    borderBottomColor: Colors.carbs,
    borderLeftColor: Colors.fat,
    transform: [{ rotate: '-45deg' }],
  },
  donutCenter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  donutCenterSubtext: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  donutLegend: {
    flex: 1,
    gap: Spacing.sm,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  donutLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutLegendLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  donutLegendValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },

  // Comparison bars
  comparisonSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  comparisonSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  comparisonBarsContainer: {
    gap: 6,
  },
  comparisonBarsLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  comparisonBarRow: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  comparisonBar: {
    borderRadius: 4,
  },
  comparisonBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonBarPercent: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },

  // Refeed Card
  refeedCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gold + '30',
  },
  refeedCardGradient: {
    padding: Spacing.lg,
  },
  refeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  refeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.gold + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  refeedBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  urgencyText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  refeedMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  refeedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refeedStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  refeedStatLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  refeedStatValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  refeedStatUnit: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  refeedStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },

  // Educational Cards
  educationalCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  educationalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  educationalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  educationalTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  educationalContent: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  bottomSpacer: {
    height: 120,
  },
});
