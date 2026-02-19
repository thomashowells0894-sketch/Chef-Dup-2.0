import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  CalendarDays,
  Utensils,
  Dumbbell,
  Droplets,
  Timer,
  Moon,
  ListChecks,
  Check,
  X,
  Zap,
  TrendingUp,
  Award,
  Trophy,
  Target,
  Star,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
  Gradients,
} from '../constants/theme';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import useActivityCalendar from '../hooks/useActivityCalendar';
import { format, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_PADDING = Spacing.md;
const CELL_GAP = 6;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - CALENDAR_PADDING * 2 - CELL_GAP * 6 - Spacing.md * 2) / 7);
const MINI_CELL_SIZE = 10;
const MINI_CELL_GAP = 3;

// Tiny cells for yearly overview
const YEAR_CELL_SIZE = 6;
const YEAR_CELL_GAP = 2;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LEVEL_COLORS = [
  'rgba(255,255,255,0.03)',   // Level 0 - barely visible
  'rgba(0, 212, 255, 0.2)',   // Level 1 - dim cyan
  'rgba(0, 212, 255, 0.4)',   // Level 2 - medium cyan
  'rgba(0, 212, 255, 0.7)',   // Level 3 - bright cyan
  'rgba(0, 230, 118, 0.9)',   // Level 4 - green (perfect)
];

const LEVEL_LABELS = [
  'No activity',
  'Light',
  'Moderate',
  'Active',
  'Perfect',
];

const TODAY_STR = format(new Date(), 'yyyy-MM-dd');

// ---------------------------------------------------------------
// Header
// ---------------------------------------------------------------
const Header = memo(function Header({ onBack }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(0).springify().mass(0.5).damping(10)}
      style={styles.header}
    >
      <Pressable style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={22} color={Colors.text} />
      </Pressable>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <View style={styles.headerRight}>
        <Flame size={22} color={Colors.warning} />
      </View>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Month Navigator with Today button
// ---------------------------------------------------------------
const MonthNavigator = memo(function MonthNavigator({ currentMonth, onPrev, onNext, onToday }) {
  const label = format(currentMonth, 'MMMM yyyy');
  const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(60).springify().mass(0.5).damping(10)}
      style={styles.monthNav}
    >
      <LinearGradient
        colors={Gradients.card}
        style={styles.monthNavGradient}
      >
        <Pressable style={styles.monthNavArrow} onPress={onPrev}>
          <ChevronLeft size={22} color={Colors.text} />
        </Pressable>

        <View style={styles.monthNavCenter}>
          <Text style={styles.monthNavLabel}>{label}</Text>
          {!isCurrentMonth && (
            <Pressable style={styles.todayButton} onPress={onToday}>
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          )}
        </View>

        <Pressable style={styles.monthNavArrow} onPress={onNext}>
          <ChevronRight size={22} color={Colors.text} />
        </Pressable>
      </LinearGradient>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Single Day Cell
// ---------------------------------------------------------------
const DayCell = memo(function DayCell({ day, isToday, isSelected, onPress }) {
  const bgColor = LEVEL_COLORS[day.level];
  const isActive = day.level > 0;

  return (
    <Pressable
      style={[
        styles.dayCell,
        { backgroundColor: bgColor },
        isToday && styles.dayCellToday,
        isSelected && styles.dayCellSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dayCellText,
          isActive && styles.dayCellTextActive,
          isToday && styles.dayCellTextToday,
          day.level >= 4 && styles.dayCellTextPerfect,
        ]}
      >
        {day.dayOfMonth}
      </Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------
// Calendar Grid
// ---------------------------------------------------------------
const CalendarGrid = memo(function CalendarGrid({ monthData, selectedDate, onSelectDay }) {
  const firstDayOfWeek = monthData.length > 0 ? monthData[0].dayOfWeek : 0;

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(120).springify().mass(0.5).damping(10)}
      style={styles.calendarCard}
    >
      <LinearGradient colors={Gradients.card} style={styles.calendarCardGradient}>
        {/* Day-of-week header row */}
        <View style={styles.weekHeaderRow}>
          {DAY_LABELS.map((label, idx) => (
            <View key={idx} style={styles.weekHeaderCell}>
              <Text style={styles.weekHeaderText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Day cells */}
        <View style={styles.daysGrid}>
          {/* Leading blank cells for alignment */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <View key={`blank-${idx}`} style={styles.dayCell} />
          ))}

          {monthData.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              isToday={day.date === TODAY_STR}
              isSelected={day.date === selectedDate}
              onPress={() => onSelectDay(day.date)}
            />
          ))}
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Activity Detail Item
// ---------------------------------------------------------------
const DetailItem = memo(function DetailItem({ icon: Icon, iconColor, label, value, completed }) {
  return (
    <View style={styles.detailItem}>
      <View style={[styles.detailIconWrap, { backgroundColor: iconColor + '20' }]}>
        <Icon size={16} color={iconColor} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailRight}>
        {value !== undefined && value !== null && (
          <Text style={styles.detailValue}>{value}</Text>
        )}
        {completed === true && (
          <View style={[styles.detailStatusDot, { backgroundColor: Colors.success + '30' }]}>
            <Check size={12} color={Colors.success} />
          </View>
        )}
        {completed === false && (
          <View style={[styles.detailStatusDot, { backgroundColor: Colors.error + '30' }]}>
            <X size={12} color={Colors.error} />
          </View>
        )}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------
// Selected Day Detail Card (slides in)
// ---------------------------------------------------------------
const SelectedDayCard = memo(function SelectedDayCard({ selectedDate, details, level }) {
  if (!selectedDate) return null;

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(50).springify().mass(0.5).damping(10)}
      style={styles.detailCard}
    >
      <LinearGradient colors={Gradients.card} style={styles.detailCardGradient}>
        {/* Date Header */}
        <View style={styles.detailDateRow}>
          <CalendarDays size={18} color={Colors.primary} />
          <Text style={styles.detailDateText}>{formattedDate}</Text>
          <View style={[styles.detailLevelBadge, { backgroundColor: LEVEL_COLORS[level] }]}>
            <Text style={styles.detailLevelText}>{LEVEL_LABELS[level]}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.detailDivider} />

        {/* Activity breakdown */}
        {!details ? (
          <View style={styles.detailEmpty}>
            <Text style={styles.detailEmptyText}>No activity recorded for this day.</Text>
          </View>
        ) : (
          <View style={styles.detailList}>
            <DetailItem
              icon={Utensils}
              iconColor={Colors.secondary}
              label="Food Logged"
              completed={!!details.foodLogged}
            />
            <DetailItem
              icon={Dumbbell}
              iconColor={Colors.primary}
              label="Exercise"
              value={details.exerciseMinutes ? `${details.exerciseMinutes} min` : null}
              completed={!!(details.exerciseMinutes > 0 || details.exerciseLogged)}
            />
            <DetailItem
              icon={Droplets}
              iconColor="#64D2FF"
              label="Water Goal"
              completed={!!details.waterMet}
            />
            <DetailItem
              icon={Timer}
              iconColor={Colors.success}
              label="Fasting Completed"
              completed={!!details.fastCompleted}
            />
            <DetailItem
              icon={Moon}
              iconColor="#A78BFA"
              label="Sleep Logged"
              completed={!!details.sleepLogged}
            />
            <DetailItem
              icon={ListChecks}
              iconColor={Colors.primary}
              label="Habits"
              value={
                details.habitsTotal > 0
                  ? `${details.habitsCompleted || 0}/${details.habitsTotal}`
                  : null
              }
              completed={
                details.habitsTotal > 0
                  ? details.habitsCompleted >= details.habitsTotal
                  : undefined
              }
            />
          </View>
        )}

        {/* Activity list from aggregated activities array */}
        {details?.activities && details.activities.length > 0 && (
          <View style={styles.activityTagsContainer}>
            <View style={styles.activityTagsDivider} />
            <View style={styles.activityTags}>
              {details.activities.map((activity, idx) => (
                <View key={idx} style={styles.activityTag}>
                  <Text style={styles.activityTagText}>{activity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </LinearGradient>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Stat Card (individual)
// ---------------------------------------------------------------
const StatCard = memo(function StatCard({ icon: Icon, iconColor, label, value, suffix, delay }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(delay).springify().mass(0.5).damping(10)}
      style={styles.statCard}
    >
      <LinearGradient colors={Gradients.card} style={styles.statCardGradient}>
        <View style={[styles.statIconWrap, { backgroundColor: iconColor + '20' }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value}</Text>
          {suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Stats Row (4 glass cards)
// ---------------------------------------------------------------
const StatsRow = memo(function StatsRow({ currentStreak, bestStreak, monthActiveDays, monthScore }) {
  return (
    <View style={styles.statsSection}>
      <View style={styles.statsRow}>
        <StatCard
          icon={Flame}
          iconColor={Colors.warning}
          label="Current Streak"
          value={currentStreak}
          suffix="days"
          delay={180}
        />
        <StatCard
          icon={Trophy}
          iconColor={Colors.gold}
          label="Best Streak"
          value={bestStreak}
          suffix="days"
          delay={220}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon={TrendingUp}
          iconColor={Colors.primary}
          label="Active Days"
          value={monthActiveDays}
          suffix="this mo."
          delay={260}
        />
        <StatCard
          icon={Target}
          iconColor={Colors.success}
          label="Month Score"
          value={`${monthScore}%`}
          delay={300}
        />
      </View>
    </View>
  );
});

// ---------------------------------------------------------------
// Legend (Less [...] More)
// ---------------------------------------------------------------
const Legend = memo(function Legend() {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(340).springify().mass(0.5).damping(10)}
      style={styles.legendContainer}
    >
      <View style={styles.legendRow}>
        <Text style={styles.legendEdgeLabel}>Less</Text>
        {LEVEL_COLORS.map((color, idx) => (
          <View key={idx} style={[styles.legendSquare, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendEdgeLabel}>More</Text>
      </View>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Mini Heatmap (last 90 days)
// ---------------------------------------------------------------
const MiniHeatmap = memo(function MiniHeatmap({ getActivityLevel }) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      result.push({
        date: dateStr,
        level: getActivityLevel(dateStr),
        dayOfWeek: d.getDay(),
      });
    }
    return result;
  }, [getActivityLevel]);

  const columns = useMemo(() => {
    const cols = [];
    const firstDow = days[0].dayOfWeek;
    const paddedDays = [
      ...Array.from({ length: firstDow }, () => null),
      ...days,
    ];
    let col = [];
    for (let i = 0; i < paddedDays.length; i++) {
      col.push(paddedDays[i]);
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length > 0) {
      while (col.length < 7) col.push(null);
      cols.push(col);
    }
    return cols;
  }, [days]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(380).springify().mass(0.5).damping(10)}
      style={styles.miniHeatmapCard}
    >
      <LinearGradient colors={Gradients.card} style={styles.miniHeatmapGradient}>
        <View style={styles.miniHeatmapHeader}>
          <Zap size={16} color={Colors.primary} />
          <Text style={styles.miniHeatmapTitle}>Last 90 Days</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.miniHeatmapScrollContent}
        >
          {/* Day-of-week labels */}
          <View style={styles.miniDayLabels}>
            {['S', '', 'T', '', 'T', '', 'S'].map((label, idx) => (
              <View key={idx} style={styles.miniDayLabelCell}>
                <Text style={styles.miniDayLabelText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Heatmap columns */}
          {columns.map((col, colIdx) => (
            <View key={colIdx} style={styles.miniColumn}>
              {col.map((day, rowIdx) => (
                <View
                  key={`${colIdx}-${rowIdx}`}
                  style={[
                    styles.miniCell,
                    {
                      backgroundColor: day ? LEVEL_COLORS[day.level] : 'transparent',
                    },
                    day && day.date === TODAY_STR && styles.miniCellToday,
                  ]}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </LinearGradient>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Yearly Overview (compact 12-month mini view)
// ---------------------------------------------------------------
const YearlyOverview = memo(function YearlyOverview({ getActivityLevel, year }) {
  const yearData = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));
    const months = eachMonthOfInterval({ start, end });

    return months.map((monthDate, monthIdx) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      return {
        label: MONTH_LABELS[monthIdx],
        days: days.map(d => {
          const dateStr = format(d, 'yyyy-MM-dd');
          return {
            date: dateStr,
            level: getActivityLevel(dateStr),
            dayOfWeek: getDay(d),
            dayOfMonth: d.getDate(),
          };
        }),
      };
    });
  }, [getActivityLevel, year]);

  return (
    <ReAnimated.View
      entering={FadeInDown.delay(420).springify().mass(0.5).damping(10)}
      style={styles.yearlyCard}
    >
      <LinearGradient colors={Gradients.card} style={styles.yearlyGradient}>
        <View style={styles.yearlyHeader}>
          <CalendarDays size={16} color={Colors.primary} />
          <Text style={styles.yearlyTitle}>{year} Overview</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearlyScrollContent}
        >
          {yearData.map((month, monthIdx) => (
            <View key={monthIdx} style={styles.yearlyMonth}>
              <Text style={styles.yearlyMonthLabel}>{month.label}</Text>
              <View style={styles.yearlyMonthGrid}>
                {/* Render days as tiny dots in a 7-row grid */}
                {(() => {
                  const firstDow = month.days[0]?.dayOfWeek || 0;
                  const cells = [
                    ...Array.from({ length: firstDow }, () => null),
                    ...month.days,
                  ];
                  // Pad to fill complete weeks
                  while (cells.length % 7 !== 0) cells.push(null);

                  const weeks = [];
                  for (let i = 0; i < cells.length; i += 7) {
                    weeks.push(cells.slice(i, i + 7));
                  }

                  return weeks.map((week, wIdx) => (
                    <View key={wIdx} style={styles.yearlyWeekColumn}>
                      {week.map((day, dIdx) => (
                        <View
                          key={`${wIdx}-${dIdx}`}
                          style={[
                            styles.yearlyDot,
                            {
                              backgroundColor: day
                                ? LEVEL_COLORS[day.level]
                                : 'transparent',
                            },
                            day && day.date === TODAY_STR && styles.yearlyDotToday,
                          ]}
                        />
                      ))}
                    </View>
                  ));
                })()}
              </View>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Total Stats Banner
// ---------------------------------------------------------------
const TotalStatsBanner = memo(function TotalStatsBanner({ totalActiveDays }) {
  return (
    <ReAnimated.View
      entering={FadeInDown.delay(460).springify().mass(0.5).damping(10)}
      style={styles.totalBanner}
    >
      <LinearGradient
        colors={['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.03)']}
        style={styles.totalBannerGradient}
      >
        <View style={styles.totalBannerContent}>
          <View style={[styles.totalBannerIcon, { backgroundColor: Colors.primarySoft }]}>
            <Star size={20} color={Colors.primary} />
          </View>
          <View style={styles.totalBannerText}>
            <Text style={styles.totalBannerValue}>{totalActiveDays}</Text>
            <Text style={styles.totalBannerLabel}>Total Active Days</Text>
          </View>
        </View>
      </LinearGradient>
    </ReAnimated.View>
  );
});

// ---------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------
export default function ActivityCalendarScreen() {
  const router = useRouter();
  const {
    scores,
    isLoading,
    getActivityLevel,
    getMonthData,
    getCurrentStreak,
    getBestStreak,
    getMonthScore,
    getTotalActiveDays,
    getMonthActiveDays,
  } = useActivityCalendar();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Derived data
  const currentStreak = useMemo(() => getCurrentStreak(), [getCurrentStreak]);
  const bestStreak = useMemo(() => getBestStreak(), [getBestStreak]);
  const monthData = useMemo(() => getMonthData(currentMonth), [getMonthData, currentMonth]);
  const currentYear = currentMonth.getFullYear();
  const currentMonthIdx = currentMonth.getMonth();
  const monthScore = useMemo(
    () => getMonthScore(currentYear, currentMonthIdx),
    [getMonthScore, currentYear, currentMonthIdx]
  );
  const monthActiveDays = useMemo(
    () => getMonthActiveDays(currentYear, currentMonthIdx),
    [getMonthActiveDays, currentYear, currentMonthIdx]
  );
  const totalActiveDays = useMemo(() => getTotalActiveDays(), [getTotalActiveDays]);

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return {
      details: scores[selectedDate] || null,
      level: getActivityLevel(selectedDate),
    };
  }, [selectedDate, scores, getActivityLevel]);

  // Handlers
  const handleBack = useCallback(async () => {
    await hapticLight();
    router.back();
  }, [router]);

  const handlePrevMonth = useCallback(async () => {
    await hapticLight();
    setCurrentMonth(prev => subMonths(prev, 1));
    setSelectedDate(null);
  }, []);

  const handleNextMonth = useCallback(async () => {
    await hapticLight();
    setCurrentMonth(prev => addMonths(prev, 1));
    setSelectedDate(null);
  }, []);

  const handleToday = useCallback(async () => {
    await hapticSuccess();
    setCurrentMonth(new Date());
    setSelectedDate(TODAY_STR);
  }, []);

  const handleSelectDay = useCallback(async (dateStr) => {
    await hapticLight();
    setSelectedDate(prev => (prev === dateStr ? null : dateStr));
  }, []);

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
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
        <Header onBack={handleBack} />

        {/* Month Navigator */}
        <MonthNavigator
          currentMonth={currentMonth}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
          onToday={handleToday}
        />

        {/* Calendar Heatmap Grid */}
        <CalendarGrid
          monthData={monthData}
          selectedDate={selectedDate}
          onSelectDay={handleSelectDay}
        />

        {/* Selected Day Detail Panel */}
        {selectedDate && selectedDayData && (
          <SelectedDayCard
            selectedDate={selectedDate}
            details={selectedDayData.details}
            level={selectedDayData.level}
          />
        )}

        {/* Stats Row: 4 glass cards */}
        <StatsRow
          currentStreak={currentStreak}
          bestStreak={bestStreak}
          monthActiveDays={monthActiveDays}
          monthScore={monthScore}
        />

        {/* Legend: Less [0][1][2][3][4] More */}
        <Legend />

        {/* Mini Heatmap (last 90 days) */}
        <MiniHeatmap getActivityLevel={getActivityLevel} />

        {/* Yearly Overview */}
        <YearlyOverview
          getActivityLevel={getActivityLevel}
          year={new Date().getFullYear()}
        />

        {/* Total Active Days Banner */}
        <TotalStatsBanner totalActiveDays={totalActiveDays} />

        {/* Bottom spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ---------------------------------------------------------------
// Styles
// ---------------------------------------------------------------
const styles = StyleSheet.create({
  // Loading
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

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // -- Header --
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.warningSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // -- Month Navigator --
  monthNav: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthNavGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  monthNavArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavCenter: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  monthNavLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  todayButton: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  todayButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  // -- Calendar Grid --
  calendarCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarCardGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekHeaderCell: {
    width: CELL_SIZE,
    marginRight: CELL_GAP,
    alignItems: 'center',
  },
  weekHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: BorderRadius.xs,
    marginRight: CELL_GAP,
    marginBottom: CELL_GAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: Colors.text,
  },
  dayCellText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  dayCellTextActive: {
    color: Colors.text,
  },
  dayCellTextToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  dayCellTextPerfect: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },

  // -- Selected Day Detail Card --
  detailCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailCardGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailDateText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  detailLevelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  detailLevelText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  detailEmpty: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  detailEmptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  detailList: {
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  detailStatusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTagsContainer: {
    marginTop: Spacing.sm,
  },
  activityTagsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  activityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  activityTag: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  activityTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },

  // -- Stats Section --
  statsSection: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCardGradient: {
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statSuffix: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textTertiary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // -- Legend --
  legendContainer: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  legendEdgeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  legendSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },

  // -- Mini Heatmap --
  miniHeatmapCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniHeatmapGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  miniHeatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  miniHeatmapTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  miniHeatmapScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  miniDayLabels: {
    marginRight: MINI_CELL_GAP,
  },
  miniDayLabelCell: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    marginBottom: MINI_CELL_GAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniDayLabelText: {
    fontSize: 7,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  miniColumn: {
    marginRight: MINI_CELL_GAP,
  },
  miniCell: {
    width: MINI_CELL_SIZE,
    height: MINI_CELL_SIZE,
    borderRadius: 2,
    marginBottom: MINI_CELL_GAP,
  },
  miniCellToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  // -- Yearly Overview --
  yearlyCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  yearlyGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  yearlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  yearlyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  yearlyScrollContent: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  yearlyMonth: {
    alignItems: 'center',
  },
  yearlyMonthLabel: {
    fontSize: 9,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  yearlyMonthGrid: {
    flexDirection: 'row',
    gap: YEAR_CELL_GAP,
  },
  yearlyWeekColumn: {
    gap: YEAR_CELL_GAP,
  },
  yearlyDot: {
    width: YEAR_CELL_SIZE,
    height: YEAR_CELL_SIZE,
    borderRadius: 1,
  },
  yearlyDotToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 2,
  },

  // -- Total Stats Banner --
  totalBanner: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  totalBannerGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  totalBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  totalBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalBannerText: {
    flex: 1,
  },
  totalBannerValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  totalBannerLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Bottom
  bottomSpacer: {
    height: 120,
  },
});
